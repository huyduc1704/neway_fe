'use client';
import { useEffect, useState, useCallback } from 'react';
import { Card, DatePicker, Select, Space, message, Row, Col, Table, Tag, Segmented } from 'antd';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { TableColumnsType } from 'antd';
import api from '@/lib/api';
import PageHeader from '@/components/common/PageHeader';
import dayjs from 'dayjs';

type GroupBy = 'EMPLOYEE' | 'TEAM' | 'BRANCH';

// Response shape cho EMPLOYEE
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

// Response shape cho TEAM / BRANCH
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

const formatCurrency = (v: number) =>
    new Intl.NumberFormat('vi-VN').format(v) + 'đ';

const formatMillions = (v: number) => `${(v / 1_000_000).toFixed(0)}tr`;

const COLORS = ['#E8890C', '#F5B95A', '#C8720A', '#FAD99A', '#A0520A', '#FDECC8'];

const GROUP_OPTIONS = [
    { label: 'Nhân viên', value: 'EMPLOYEE' },
    { label: 'Team',      value: 'TEAM' },
    { label: 'Chi nhánh', value: 'BRANCH' },
];

const TH = { style: { backgroundColor: '#FFF3E0', color: '#E8890C' } };

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
    const [branchFilter, setBranchFilter] = useState<string | undefined>();
    const [teamFilter, setTeamFilter] = useState<string | undefined>();
    const [employeeFilter, setEmployeeFilter] = useState<string | undefined>();

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const { data: res } = await api.get('/reports/payroll', {
                params: {
                    groupBy, fromDate, toDate,
                    branchId: branchFilter,
                    teamId: teamFilter,
                    employeeId: groupBy === 'EMPLOYEE' ? employeeFilter : undefined,
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

    // ── Columns theo mode ───────────────────────────────────────────
    const employeeColumns: TableColumnsType<PayrollRow> = [
        {
            title: 'Nhân viên',
            render: (_, r) => {
                if (!isEmployeeRow(r)) return '—';
                return (
                    <div>
                        <div style={{ fontWeight: 500 }}>{r.employee.fullName}</div>
                        <div style={{ fontSize: 12, color: '#888' }}>{r.employee.employeeCode}</div>
                    </div>
                );
            },
            onHeaderCell: () => TH,
        },
        {
            title: 'Vai trò', width: 160,
            render: (_, r) => {
                if (!isEmployeeRow(r)) return '—';
                return r.employee.roles.map((role) => (
                    <Tag key={role.code} color="orange">{role.name}</Tag>
                ));
            },
            onHeaderCell: () => TH,
        },
        {
            title: 'Chi nhánh', width: 150,
            render: (_, r) => isEmployeeRow(r) ? r.employee.branch?.name || '—' : '—',
            onHeaderCell: () => TH,
        },
        {
            title: 'Team', width: 130,
            render: (_, r) => isEmployeeRow(r) ? r.employee.team?.name || '—' : '—',
            onHeaderCell: () => TH,
        },
        {
            title: 'DT đóng góp', width: 160, align: 'right',
            sorter: (a, b) => a.totalRevenue - b.totalRevenue,
            render: (_, r) => <span style={{ color: '#1A2B5A', fontWeight: 500 }}>{formatCurrency(r.totalRevenue)}</span>,
            onHeaderCell: () => TH,
        },
        {
            title: 'Hoa hồng', width: 160, align: 'right',
            sorter: (a, b) => a.totalCommission - b.totalCommission,
            defaultSortOrder: 'descend',
            render: (_, r) => <span style={{ fontWeight: 600, color: '#E8890C' }}>{formatCurrency(r.totalCommission)}</span>,
            onHeaderCell: () => TH,
        },
        {
            title: '% HH/DT', width: 100, align: 'center',
            render: (_, r) => r.totalRevenue > 0
                ? `${((r.totalCommission / r.totalRevenue) * 100).toFixed(1)}%`
                : '—',
            onHeaderCell: () => TH,
        },
    ];

    const groupColumns: TableColumnsType<PayrollRow> = [
        {
            title: groupBy === 'TEAM' ? 'Team' : 'Chi nhánh',
            render: (_, r) => {
                const g = r as GroupRow;
                const name = (groupBy === 'TEAM' ? g.team?.name : g.branch?.name) || 'N/A';
                return <span style={{ fontWeight: 500 }}>{name}</span>;
            },
            onHeaderCell: () => TH,
        },
        {
            title: 'Số GD', width: 100, align: 'center',
            render: (_, r) => <Tag color="blue">{(r as GroupRow).transactionCount ?? 0}</Tag>,
            onHeaderCell: () => TH,
        },
        {
            title: 'Tổng doanh thu', width: 180, align: 'right',
            sorter: (a, b) => a.totalRevenue - b.totalRevenue,
            render: (_, r) => <span style={{ fontWeight: 500, color: '#1A2B5A' }}>{formatCurrency(r.totalRevenue)}</span>,
            onHeaderCell: () => TH,
        },
        {
            title: 'Tổng hoa hồng', width: 180, align: 'right',
            sorter: (a, b) => a.totalCommission - b.totalCommission,
            defaultSortOrder: 'descend',
            render: (_, r) => <span style={{ fontWeight: 600, color: '#E8890C' }}>{formatCurrency(r.totalCommission)}</span>,
            onHeaderCell: () => TH,
        },
        {
            title: '% HH/DT', width: 100, align: 'center',
            render: (_, r) => r.totalRevenue > 0
                ? `${((r.totalCommission / r.totalRevenue) * 100).toFixed(1)}%`
                : '—',
            onHeaderCell: () => TH,
        },
    ];

    const columns = groupBy === 'EMPLOYEE' ? employeeColumns : groupColumns;
    const summaryColSpan = groupBy === 'EMPLOYEE' ? 5 : 3;

    const rowKey = (r: PayrollRow) => {
        if (isEmployeeRow(r)) return r.employee.id;
        const g = r as GroupRow;
        return g.team?.id ?? g.branch?.id ?? 'no-group';
    };

    return (
        <>
            <PageHeader title="Báo cáo / Lương & Hoa hồng" />

            {/* Filters */}
            <Card style={{ borderRadius: 8, marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                    <Segmented
                        options={GROUP_OPTIONS}
                        value={groupBy}
                        onChange={(v) => { setGroupBy(v as GroupBy); setEmployeeFilter(undefined); }}
                    />
                    <Space wrap>
                        <DatePicker.RangePicker
                            format="DD/MM/YYYY"
                            defaultValue={[dayjs().startOf('year'), dayjs().endOf('year')]}
                            onChange={(_, strings) => {
                                if (strings[0] && strings[1]) {
                                    setFromDate(dayjs(strings[0], 'DD/MM/YYYY').format('YYYY-MM-DD'));
                                    setToDate(dayjs(strings[1], 'DD/MM/YYYY').format('YYYY-MM-DD'));
                                }
                            }}
                        />
                        <Select
                            allowClear placeholder="Chi nhánh" style={{ width: 160 }}
                            onChange={(v) => setBranchFilter(v)}
                            options={branches.map((b) => ({ value: b.id, label: b.name }))}
                        />
                        <Select
                            allowClear placeholder="Team" style={{ width: 150 }}
                            onChange={(v) => setTeamFilter(v)}
                            options={teams.map((t) => ({ value: t.id, label: t.name }))}
                        />
                        {groupBy === 'EMPLOYEE' && (
                            <Select
                                allowClear showSearch placeholder="Nhân viên" style={{ width: 210 }}
                                onChange={(v) => setEmployeeFilter(v)}
                                filterOption={(input, opt) =>
                                    (opt?.label as string)?.toLowerCase().includes(input.toLowerCase())
                                }
                                options={employees.map((e) => ({
                                    value: e.id,
                                    label: `${e.fullName} (${e.employeeCode})`,
                                }))}
                            />
                        )}
                    </Space>
                </div>
            </Card>

            {/* Summary */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
                <Col span={6}>
                    <Card style={{ borderRadius: 8 }}>
                        <div style={{ fontSize: 13, color: '#888', marginBottom: 4 }}>
                            Số {GROUP_OPTIONS.find((g) => g.value === groupBy)?.label}
                        </div>
                        <div style={{ fontSize: 22, fontWeight: 700, color: '#1A2B5A' }}>{data.length}</div>
                    </Card>
                </Col>
                <Col span={6}>
                    <Card style={{ borderRadius: 8 }}>
                        <div style={{ fontSize: 13, color: '#888', marginBottom: 4 }}>Tổng doanh thu đóng góp</div>
                        <div style={{ fontSize: 20, fontWeight: 700, color: '#1A2B5A' }}>{formatCurrency(totalRevenue)}</div>
                    </Card>
                </Col>
                <Col span={6}>
                    <Card style={{ borderRadius: 8 }}>
                        <div style={{ fontSize: 13, color: '#888', marginBottom: 4 }}>Tổng hoa hồng chi trả</div>
                        <div style={{ fontSize: 20, fontWeight: 700, color: '#E8890C' }}>{formatCurrency(totalCommission)}</div>
                    </Card>
                </Col>
                <Col span={6}>
                    <Card style={{ borderRadius: 8 }}>
                        <div style={{ fontSize: 13, color: '#888', marginBottom: 4 }}>Tỷ lệ HH / Doanh thu</div>
                        <div style={{ fontSize: 22, fontWeight: 700, color: '#52c41a' }}>
                            {totalRevenue > 0 ? `${((totalCommission / totalRevenue) * 100).toFixed(1)}%` : '—'}
                        </div>
                    </Card>
                </Col>
            </Row>

            {/* Chart */}
            {barData.length > 0 && (
                <Card
                    title={
                        <span style={{ color: '#1A2B5A', fontWeight: 600 }}>
                            Doanh thu & Hoa hồng theo {GROUP_OPTIONS.find((g) => g.value === groupBy)?.label}
                        </span>
                    }
                    style={{ borderRadius: 8, marginBottom: 16 }}
                >
                    <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={barData} margin={{ top: 8, right: 32, left: 8, bottom: 8 }}>
                            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                            <YAxis tick={{ fontSize: 11 }} tickFormatter={formatMillions} />
                            <Tooltip
                                formatter={(v, name) => [
                                    formatCurrency(Number(v)),
                                    name === 'revenue' ? 'Doanh thu' : 'Hoa hồng',
                                ]}
                            />
                            <Bar dataKey="revenue" name="revenue" fill="#FAD99A" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="commission" name="commission" radius={[4, 4, 0, 0]}>
                                {barData.map((_, i) => (
                                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginTop: 4, fontSize: 12, color: '#888' }}>
                        <span><span style={{ display: 'inline-block', width: 12, height: 12, background: '#FAD99A', borderRadius: 2, marginRight: 4 }} />Doanh thu</span>
                        <span><span style={{ display: 'inline-block', width: 12, height: 12, background: '#E8890C', borderRadius: 2, marginRight: 4 }} />Hoa hồng</span>
                    </div>
                </Card>
            )}

            {/* Table */}
            <Card style={{ borderRadius: 8 }}>
                <Table
                    rowKey={rowKey}
                    columns={columns}
                    dataSource={sorted}
                    loading={loading}
                    pagination={{ pageSize: 20, showSizeChanger: false }}
                    summary={() => data.length > 0 ? (
                        <Table.Summary.Row>
                            <Table.Summary.Cell index={0} colSpan={summaryColSpan}>
                                <strong>Tổng cộng</strong>
                            </Table.Summary.Cell>
                            <Table.Summary.Cell index={1} align="right">
                                <strong style={{ color: '#1A2B5A' }}>{formatCurrency(totalRevenue)}</strong>
                            </Table.Summary.Cell>
                            <Table.Summary.Cell index={2} align="right">
                                <strong style={{ color: '#E8890C' }}>{formatCurrency(totalCommission)}</strong>
                            </Table.Summary.Cell>
                            <Table.Summary.Cell index={3} align="center">
                                <strong>
                                    {totalRevenue > 0 ? `${((totalCommission / totalRevenue) * 100).toFixed(1)}%` : '—'}
                                </strong>
                            </Table.Summary.Cell>
                        </Table.Summary.Row>
                    ) : null}
                />
            </Card>
        </>
    );
}
