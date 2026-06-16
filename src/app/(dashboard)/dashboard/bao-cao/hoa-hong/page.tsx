'use client';
import { useEffect, useState, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { message } from 'antd';
import { Button, DatePicker, Select, Tag, Table, Card, Typography, Space, Row, Col, Statistic } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { DownloadOutlined } from '@ant-design/icons';
import api from '@/lib/api';
import { downloadExport } from '@/lib/export';
import dayjs from 'dayjs';

const { Title } = Typography;

type GroupBy = 'EMPLOYEE' | 'LEADER' | 'TEAM';

interface EmployeeInfo {
    id: string;
    employeeCode: string;
    user: { fullName: string };
    branch: { name: string } | null;
    team: { name: string } | null;
}

interface CommissionRow {
    employee?: EmployeeInfo;
    team?: { id: string | null; name: string } | null;
    totalCommission: number;
    recordCount: number;
}

interface Branch { id: string; name: string; }
interface Team { id: string; name: string; }
interface EmployeeOption { id: string; employeeCode: string; fullName: string; }

const formatCurrency = (v: number) => new Intl.NumberFormat('vi-VN').format(v) + 'đ';
const formatMillions = (v: number) => `${(v / 1_000_000).toFixed(0)}tr`;
const COLORS = ['#E8890C', '#F5B95A', '#C8720A', '#FAD99A', '#A0520A', '#FDECC8'];

const GROUP_OPTIONS = [
    { label: 'Nhân viên', value: 'EMPLOYEE' },
    { label: 'Leader', value: 'LEADER' },
    { label: 'Team', value: 'TEAM' },
];

const getRowName = (row: CommissionRow, groupBy: GroupBy): string => {
    if (groupBy === 'TEAM') return row.team?.name || 'N/A';
    return row.employee?.user?.fullName || 'N/A';
};

export default function BaoCaoHoaHongPage() {
    const [data, setData] = useState<CommissionRow[]>([]);
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
            const { data: res } = await api.get('/reports/commissions', {
                params: {
                    groupBy, fromDate, toDate,
                    branchId: branchFilter || undefined,
                    teamId: teamFilter || undefined,
                    employeeId: employeeFilter || undefined,
                },
            });
            setData(res);
        } catch {
            message.error('Không thể tải báo cáo hoa hồng');
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

    const totalCommission = data.reduce((s, r) => s + r.totalCommission, 0);
    const totalRecords = data.reduce((s, r) => s + r.recordCount, 0);
    const sorted = [...data].sort((a, b) => b.totalCommission - a.totalCommission);
    const barData = sorted.slice(0, 10).map((r) => ({ name: getRowName(r, groupBy), value: r.totalCommission }));

    const nameColumn: ColumnsType<CommissionRow>[0] = groupBy === 'TEAM'
        ? { title: 'Team', key: 'team', render: (_, r) => <span style={{ fontWeight: 500 }}>{r.team?.name || 'N/A'}</span> }
        : {
            title: 'Nhân viên', key: 'employee',
            render: (_, r) => (
                <div>
                    <div style={{ fontWeight: 500 }}>{r.employee?.user?.fullName || 'N/A'}</div>
                    <div style={{ fontSize: 12, color: '#9ca3af' }}>{r.employee?.employeeCode}</div>
                </div>
            ),
        };

    const branchTeamColumns: ColumnsType<CommissionRow> = groupBy !== 'TEAM' ? [
        { title: 'Chi nhánh', key: 'branch', width: 150, render: (_, r) => r.employee?.branch?.name || '—' },
        { title: 'Team', key: 'empTeam', width: 130, render: (_, r) => r.employee?.team?.name || '—' },
    ] : [];

    const columns: ColumnsType<CommissionRow> = [
        { title: 'STT', key: 'stt', width: 60, align: 'center', render: (_, __, i) => i + 1 },
        nameColumn,
        ...branchTeamColumns,
        {
            title: 'Số bản ghi', key: 'recordCount', width: 120, align: 'center',
            dataIndex: 'recordCount',
            render: (v) => <Tag color="default">{v}</Tag>,
        },
        {
            title: 'Tổng hoa hồng', key: 'totalCommission', width: 200, align: 'right',
            render: (_, r) => <span style={{ fontWeight: 600, color: '#E8890C' }}>{formatCurrency(r.totalCommission)}</span>,
        },
        {
            title: '% Tổng', key: 'pct', width: 100, align: 'center',
            render: (_, r) => totalCommission > 0 ? `${((r.totalCommission / totalCommission) * 100).toFixed(1)}%` : '—',
        },
    ];

    const colSpan = groupBy !== 'TEAM' ? 4 : 2;
    const tableSummary = () => (
        data.length > 0 ? (
            <Table.Summary.Row>
                <Table.Summary.Cell index={0} colSpan={colSpan}><strong>Tổng cộng</strong></Table.Summary.Cell>
                <Table.Summary.Cell index={colSpan} align="center"><strong>{totalRecords}</strong></Table.Summary.Cell>
                <Table.Summary.Cell index={colSpan + 1} align="right"><strong style={{ color: '#E8890C' }}>{formatCurrency(totalCommission)}</strong></Table.Summary.Cell>
                <Table.Summary.Cell index={colSpan + 2} align="center"><strong>100%</strong></Table.Summary.Cell>
            </Table.Summary.Row>
        ) : null
    );

    return (
        <>
            {/* Page Header */}
            <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Title level={4} style={{ margin: 0 }}>Báo cáo / Hoa hồng</Title>
                <Button icon={<DownloadOutlined />} onClick={async () => {
                    try {
                        await downloadExport('/reports/commissions/export', { groupBy, fromDate, toDate, branchId: branchFilter || undefined, teamId: teamFilter || undefined }, 'bao-cao-hoa-hong');
                    } catch { message.error('Xuất file thất bại'); }
                }}>
                    Xuất Excel
                </Button>
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
                        <DatePicker value={fromDate ? dayjs(fromDate) : null} onChange={(d) => setFromDate(d ? d.format('YYYY-MM-DD') : '')} format="DD/MM/YYYY" style={{ height: 36 }} />
                        <span style={{ color: '#9ca3af' }}>→</span>
                        <DatePicker value={toDate ? dayjs(toDate) : null} onChange={(d) => setToDate(d ? d.format('YYYY-MM-DD') : '')} format="DD/MM/YYYY" style={{ height: 36 }} />

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
                        {groupBy !== 'TEAM' && (
                            <Select
                                value={employeeFilter || undefined}
                                onChange={(v) => setEmployeeFilter(v ?? '')}
                                placeholder="Nhân viên"
                                style={{ width: 192 }}
                                allowClear
                                options={[{ value: '', label: 'Tất cả' }, ...employees.map((e) => ({ value: e.id, label: `${e.fullName} (${e.employeeCode})` }))]}
                            />
                        )}
                    </Space>
                </div>
            </Card>

            {/* Summary */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
                <Col span={8}>
                    <Card>
                        <Statistic title="Tổng hoa hồng" value={formatCurrency(totalCommission)} formatter={(v) => String(v)} valueStyle={{ color: '#E8890C', fontSize: 24, fontWeight: 700 }} />
                    </Card>
                </Col>
                <Col span={8}>
                    <Card>
                        <Statistic title={`Số ${GROUP_OPTIONS.find((g) => g.value === groupBy)?.label}`} value={data.length} valueStyle={{ color: '#1A2B5A', fontSize: 24, fontWeight: 700 }} />
                    </Card>
                </Col>
                <Col span={8}>
                    <Card>
                        <Statistic title="Số bản ghi hoa hồng" value={totalRecords} valueStyle={{ color: '#52c41a', fontSize: 24, fontWeight: 700 }} />
                    </Card>
                </Col>
            </Row>

            {/* Chart */}
            {barData.length > 0 && (
                <Card style={{ marginBottom: 16 }}>
                    <Title level={5} style={{ color: '#1A2B5A', marginBottom: 12 }}>
                        Top {Math.min(barData.length, 10)} hoa hồng cao nhất — theo {GROUP_OPTIONS.find((g) => g.value === groupBy)?.label}
                    </Title>
                    <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={barData} margin={{ top: 8, right: 32, left: 8, bottom: 8 }}>
                            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                            <YAxis tick={{ fontSize: 11 }} tickFormatter={formatMillions} />
                            <Tooltip formatter={(v) => [formatCurrency(Number(v)), 'Hoa hồng']} />
                            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                {barData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </Card>
            )}

            {/* Table */}
            <Card>
                <Table
                    columns={columns}
                    dataSource={sorted}
                    rowKey={(r) => r.employee?.id ?? r.team?.id ?? 'no-group'}
                    loading={loading}
                    pagination={{ pageSize: 20 }}
                    summary={tableSummary}
                    size="small"
                />
            </Card>
        </>
    );
}
