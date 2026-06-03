'use client';
import { useEffect, useState, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { message } from 'antd';
import { Select, Tag, Table, Card, Typography, Space, Row, Col, Statistic } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import api from '@/lib/api';
import dayjs from 'dayjs';

const { Title } = Typography;

type GroupBy = 'EMPLOYEE' | 'TEAM' | 'BRANCH';

interface EmployeeRow {
    employee: {
        id: string;
        employeeCode: string;
        fullName: string;
        roles: { code: string; name: string }[];
        branch: { name: string } | null;
        team: { name: string } | null;
    };
    totalRevenue: number;
    totalCommission: number;
    commissionByRole: Record<string, number>;
}

interface GroupRow {
    team?: { id: string; name: string } | null;
    branch?: { id: string; name: string } | null;
    totalRevenue: number;
    transactionCount: number;
    totalCommission: number;
}

type PayrollRow = EmployeeRow | GroupRow;

interface Branch { id: string; name: string; }
interface Team { id: string; name: string; }
interface EmployeeOption { id: string; employeeCode: string; fullName: string; }

const formatCurrency = (v: number) => new Intl.NumberFormat('vi-VN').format(v) + 'đ';
const formatMillions = (v: number) => `${(v / 1_000_000).toFixed(0)}tr`;
const COLORS = ['#E8890C', '#F5B95A', '#C8720A', '#FAD99A', '#A0520A', '#FDECC8'];

const GROUP_OPTIONS = [
    { label: 'Nhân viên', value: 'EMPLOYEE' },
    { label: 'Team', value: 'TEAM' },
    { label: 'Chi nhánh', value: 'BRANCH' },
];

const isEmployeeRow = (r: PayrollRow): r is EmployeeRow => 'employee' in r;

const getRowName = (r: PayrollRow, groupBy: GroupBy): string => {
    if (groupBy === 'EMPLOYEE' && isEmployeeRow(r)) return r.employee.fullName;
    const g = r as GroupRow;
    return (groupBy === 'TEAM' ? g.team?.name : g.branch?.name) || 'N/A';
};

export default function BaoCaoLuongPage() {
    const [data, setData] = useState<PayrollRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [groupBy, setGroupBy] = useState<GroupBy>('EMPLOYEE');
    const [branches, setBranches] = useState<Branch[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);
    const [employees, setEmployees] = useState<EmployeeOption[]>([]);
    const [fromDate, setFromDate] = useState(dayjs().startOf('year').format('YYYY-MM-DD'));
    const [toDate, setToDate] = useState(dayjs().endOf('year').format('YYYY-MM-DD'));
    const [branchFilter, setBranchFilter] = useState<string>('');
    const [teamFilter, setTeamFilter] = useState<string>('');
    const [employeeFilter, setEmployeeFilter] = useState<string>('');

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const { data: res } = await api.get('/reports/payroll', {
                params: {
                    groupBy, fromDate, toDate,
                    branchId: branchFilter || undefined,
                    teamId: teamFilter || undefined,
                    employeeId: groupBy === 'EMPLOYEE' ? (employeeFilter || undefined) : undefined,
                },
            });
            setData(res);
        } catch {
            message.error('Không thể tải báo cáo lương & hoa hồng');
        } finally {
            setLoading(false);
        }
    }, [groupBy, fromDate, toDate, branchFilter, teamFilter, employeeFilter]);

    useEffect(() => { fetchData(); }, [fetchData]);

    useEffect(() => {
        api.get('/branches', { params: { limit: 100 } }).then(({ data }) => setBranches(data.data)).catch(() => {});
        api.get('/teams', { params: { limit: 100 } }).then(({ data }) => setTeams(data.data)).catch(() => {});
        api.get('/employees', { params: { limit: 200 } }).then(({ data }) => {
            setEmployees(data.data.map((e: any) => ({
                id: e.employeeProfile?.id,
                employeeCode: e.employeeProfile?.employeeCode,
                fullName: e.fullName,
            })).filter((e: any) => e.id));
        }).catch(() => {});
    }, []);

    const totalRevenue = data.reduce((s, r) => s + r.totalRevenue, 0);
    const totalCommission = data.reduce((s, r) => s + r.totalCommission, 0);
    const sorted = [...data].sort((a, b) => b.totalCommission - a.totalCommission);
    const barData = sorted.slice(0, 10).map((r) => ({
        name: getRowName(r, groupBy),
        commission: r.totalCommission,
        revenue: r.totalRevenue,
    }));

    const employeeColumns: ColumnsType<PayrollRow> = [
        { title: 'STT', key: 'stt', width: 60, align: 'center', render: (_, __, i) => i + 1 },
        {
            title: 'Nhân viên', key: 'employee',
            render: (_, r) => {
                if (!isEmployeeRow(r)) return '—';
                return (
                    <div>
                        <div style={{ fontWeight: 500 }}>{r.employee.fullName}</div>
                        <div style={{ fontSize: 12, color: '#9ca3af' }}>{r.employee.employeeCode}</div>
                    </div>
                );
            },
        },
        {
            title: 'Vai trò', key: 'roles', width: 160,
            render: (_, r) => {
                if (!isEmployeeRow(r)) return '—';
                return (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {r.employee.roles.map((role) => (
                            <Tag key={role.code} color="orange">{role.name}</Tag>
                        ))}
                    </div>
                );
            },
        },
        { title: 'Chi nhánh', key: 'branch', width: 150, render: (_, r) => isEmployeeRow(r) ? r.employee.branch?.name || '—' : '—' },
        { title: 'Team', key: 'team', width: 130, render: (_, r) => isEmployeeRow(r) ? r.employee.team?.name || '—' : '—' },
        {
            title: 'DT đóng góp', key: 'totalRevenue', width: 160, align: 'right',
            render: (_, r) => <span style={{ fontWeight: 500, color: '#1A2B5A' }}>{formatCurrency(r.totalRevenue)}</span>,
        },
        {
            title: 'Hoa hồng', key: 'totalCommission', width: 160, align: 'right',
            render: (_, r) => <span style={{ fontWeight: 600, color: '#E8890C' }}>{formatCurrency(r.totalCommission)}</span>,
        },
        {
            title: '% HH/DT', key: 'pct', width: 100, align: 'center',
            render: (_, r) => r.totalRevenue > 0 ? `${((r.totalCommission / r.totalRevenue) * 100).toFixed(1)}%` : '—',
        },
    ];

    const groupColumns: ColumnsType<PayrollRow> = [
        { title: 'STT', key: 'stt', width: 60, align: 'center', render: (_, __, i) => i + 1 },
        {
            title: groupBy === 'TEAM' ? 'Team' : 'Chi nhánh', key: 'group',
            render: (_, r) => {
                const g = r as GroupRow;
                const name = (groupBy === 'TEAM' ? g.team?.name : g.branch?.name) || 'N/A';
                return <span style={{ fontWeight: 500 }}>{name}</span>;
            },
        },
        {
            title: 'Số GD', key: 'txCount', width: 100, align: 'center',
            render: (_, r) => <Tag color="default">{(r as GroupRow).transactionCount ?? 0}</Tag>,
        },
        {
            title: 'Tổng doanh thu', key: 'totalRevenue', width: 180, align: 'right',
            render: (_, r) => <span style={{ fontWeight: 500, color: '#1A2B5A' }}>{formatCurrency(r.totalRevenue)}</span>,
        },
        {
            title: 'Tổng hoa hồng', key: 'totalCommission', width: 180, align: 'right',
            render: (_, r) => <span style={{ fontWeight: 600, color: '#E8890C' }}>{formatCurrency(r.totalCommission)}</span>,
        },
        {
            title: '% HH/DT', key: 'pct', width: 100, align: 'center',
            render: (_, r) => r.totalRevenue > 0 ? `${((r.totalCommission / r.totalRevenue) * 100).toFixed(1)}%` : '—',
        },
    ];

    const columns = groupBy === 'EMPLOYEE' ? employeeColumns : groupColumns;
    const summaryColSpan = groupBy === 'EMPLOYEE' ? 5 : 3;

    const rowKey = (r: PayrollRow) => {
        if (isEmployeeRow(r)) return r.employee.id;
        const g = r as GroupRow;
        return g.team?.id ?? g.branch?.id ?? 'no-group';
    };

    const tableSummary = () => (
        data.length > 0 ? (
            <Table.Summary.Row>
                <Table.Summary.Cell index={0} colSpan={summaryColSpan}><strong>Tổng cộng</strong></Table.Summary.Cell>
                <Table.Summary.Cell index={summaryColSpan} align="right"><strong style={{ color: '#1A2B5A' }}>{formatCurrency(totalRevenue)}</strong></Table.Summary.Cell>
                <Table.Summary.Cell index={summaryColSpan + 1} align="right"><strong style={{ color: '#E8890C' }}>{formatCurrency(totalCommission)}</strong></Table.Summary.Cell>
                <Table.Summary.Cell index={summaryColSpan + 2} align="center">
                    <strong>{totalRevenue > 0 ? `${((totalCommission / totalRevenue) * 100).toFixed(1)}%` : '—'}</strong>
                </Table.Summary.Cell>
            </Table.Summary.Row>
        ) : null
    );

    return (
        <>
            {/* Page Header */}
            <div style={{ marginBottom: 24 }}>
                <Title level={4} style={{ margin: 0 }}>Báo cáo / Lương & Hoa hồng</Title>
            </div>

            {/* Filters */}
            <Card style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                    <div style={{ display: 'flex', borderRadius: 6, border: '1px solid #d9d9d9', overflow: 'hidden' }}>
                        {GROUP_OPTIONS.map((opt) => (
                            <button
                                key={opt.value}
                                onClick={() => { setGroupBy(opt.value as GroupBy); setEmployeeFilter(''); }}
                                style={{
                                    padding: '6px 16px', fontSize: 14, fontWeight: 500, cursor: 'pointer', border: 'none',
                                    background: groupBy === opt.value ? '#E8890C' : 'white',
                                    color: groupBy === opt.value ? 'white' : '#4b5563',
                                    transition: 'all 0.2s',
                                }}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>

                    <Space wrap>
                        <input type="date" style={{ height: 36, padding: '0 12px', borderRadius: 6, border: '1px solid #d9d9d9', fontSize: 14 }} value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
                        <span style={{ color: '#9ca3af' }}>→</span>
                        <input type="date" style={{ height: 36, padding: '0 12px', borderRadius: 6, border: '1px solid #d9d9d9', fontSize: 14 }} value={toDate} onChange={(e) => setToDate(e.target.value)} />

                        <Select
                            value={branchFilter || undefined}
                            onChange={(v) => setBranchFilter(v ?? '')}
                            placeholder="Chi nhánh"
                            style={{ width: 160 }}
                            allowClear
                            options={[{ value: '', label: 'Tất cả' }, ...branches.map((b) => ({ value: b.id, label: b.name }))]}
                        />
                        <Select
                            value={teamFilter || undefined}
                            onChange={(v) => setTeamFilter(v ?? '')}
                            placeholder="Team"
                            style={{ width: 144 }}
                            allowClear
                            options={[{ value: '', label: 'Tất cả' }, ...teams.map((t) => ({ value: t.id, label: t.name }))]}
                        />
                        {groupBy === 'EMPLOYEE' && (
                            <Select
                                value={employeeFilter || undefined}
                                onChange={(v) => setEmployeeFilter(v ?? '')}
                                placeholder="Nhân viên"
                                style={{ width: 208 }}
                                allowClear
                                options={[{ value: '', label: 'Tất cả' }, ...employees.map((e) => ({ value: e.id, label: `${e.fullName} (${e.employeeCode})` }))]}
                            />
                        )}
                    </Space>
                </div>
            </Card>

            {/* Summary */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
                <Col span={6}>
                    <Card>
                        <Statistic title={`Số ${GROUP_OPTIONS.find((g) => g.value === groupBy)?.label}`} value={data.length} valueStyle={{ color: '#1A2B5A', fontSize: 24, fontWeight: 700 }} />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card>
                        <Statistic title="Tổng doanh thu đóng góp" value={formatCurrency(totalRevenue)} formatter={(v) => String(v)} valueStyle={{ color: '#1A2B5A', fontSize: 20, fontWeight: 700 }} />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card>
                        <Statistic title="Tổng hoa hồng chi trả" value={formatCurrency(totalCommission)} formatter={(v) => String(v)} valueStyle={{ color: '#E8890C', fontSize: 20, fontWeight: 700 }} />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card>
                        <Statistic title="Tỷ lệ HH / Doanh thu" value={totalRevenue > 0 ? `${((totalCommission / totalRevenue) * 100).toFixed(1)}%` : '—'} formatter={(v) => String(v)} valueStyle={{ color: '#52c41a', fontSize: 24, fontWeight: 700 }} />
                    </Card>
                </Col>
            </Row>

            {/* Chart */}
            {barData.length > 0 && (
                <Card style={{ marginBottom: 16 }}>
                    <Title level={5} style={{ color: '#1A2B5A', marginBottom: 12 }}>
                        Doanh thu & Hoa hồng theo {GROUP_OPTIONS.find((g) => g.value === groupBy)?.label}
                    </Title>
                    <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={barData} margin={{ top: 8, right: 32, left: 8, bottom: 8 }}>
                            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                            <YAxis tick={{ fontSize: 11 }} tickFormatter={formatMillions} />
                            <Tooltip formatter={(v, name) => [formatCurrency(Number(v)), name === 'revenue' ? 'Doanh thu' : 'Hoa hồng']} />
                            <Bar dataKey="revenue" name="revenue" fill="#FAD99A" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="commission" name="commission" radius={[4, 4, 0, 0]}>
                                {barData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginTop: 4, fontSize: 12, color: '#9ca3af' }}>
                        <span><span style={{ display: 'inline-block', width: 12, height: 12, background: '#FAD99A', borderRadius: 2, marginRight: 4 }} />Doanh thu</span>
                        <span><span style={{ display: 'inline-block', width: 12, height: 12, background: '#E8890C', borderRadius: 2, marginRight: 4 }} />Hoa hồng</span>
                    </div>
                </Card>
            )}

            {/* Table */}
            <Card>
                <Table
                    columns={columns}
                    dataSource={sorted}
                    rowKey={rowKey}
                    loading={loading}
                    pagination={{ pageSize: 20 }}
                    summary={tableSummary}
                    size="small"
                />
            </Card>
        </>
    );
}
