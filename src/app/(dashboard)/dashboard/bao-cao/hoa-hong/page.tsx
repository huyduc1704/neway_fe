'use client';
import { useEffect, useState, useCallback } from 'react';
import { Card, DatePicker, Select, Space, message, Row, Col, Table, Tag, Segmented } from 'antd';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { TableColumnsType } from 'antd';
import api from '@/lib/api';
import PageHeader from '@/components/common/PageHeader';
import dayjs from 'dayjs';

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

const formatCurrency = (v: number) =>
    new Intl.NumberFormat('vi-VN').format(v) + 'đ';

const formatMillions = (v: number) => `${(v / 1_000_000).toFixed(0)}tr`;

const COLORS = ['#E8890C', '#F5B95A', '#C8720A', '#FAD99A', '#A0520A', '#FDECC8'];

const GROUP_OPTIONS = [
    { label: 'Nhân viên', value: 'EMPLOYEE' },
    { label: 'Leader',    value: 'LEADER' },
    { label: 'Team',      value: 'TEAM' },
];

const TH = { style: { backgroundColor: '#FFF3E0', color: '#E8890C' } };

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
    const [branchFilter, setBranchFilter] = useState<string | undefined>();
    const [teamFilter, setTeamFilter] = useState<string | undefined>();
    const [employeeFilter, setEmployeeFilter] = useState<string | undefined>();

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const { data: res } = await api.get('/reports/commissions', {
                params: {
                    groupBy, fromDate, toDate,
                    branchId: branchFilter,
                    teamId: teamFilter,
                    employeeId: employeeFilter,
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

    const barData = sorted.slice(0, 10).map((r) => ({
        name: getRowName(r, groupBy),
        value: r.totalCommission,
    }));

    // Columns thay đổi theo groupBy
    const nameColumn: TableColumnsType<CommissionRow>[0] = groupBy === 'TEAM'
        ? {
            title: 'Team',
            render: (_, r) => <span style={{ fontWeight: 500 }}>{r.team?.name || 'N/A'}</span>,
            onHeaderCell: () => TH,
        }
        : {
            title: 'Nhân viên',
            render: (_, r) => (
                <div>
                    <div style={{ fontWeight: 500 }}>{r.employee?.user?.fullName || 'N/A'}</div>
                    <div style={{ fontSize: 12, color: '#888' }}>{r.employee?.employeeCode}</div>
                </div>
            ),
            onHeaderCell: () => TH,
        };

    const branchTeamColumns: TableColumnsType<CommissionRow> = groupBy !== 'TEAM' ? [
        {
            title: 'Chi nhánh', width: 150,
            render: (_, r) => r.employee?.branch?.name || '—',
            onHeaderCell: () => TH,
        },
        {
            title: 'Team', width: 130,
            render: (_, r) => r.employee?.team?.name || '—',
            onHeaderCell: () => TH,
        },
    ] : [];

    const columns: TableColumnsType<CommissionRow> = [
        {
            title: 'STT', width: 60, align: 'center',
            render: (_, __, i) => i + 1,
            onHeaderCell: () => TH,
        },
        nameColumn,
        ...branchTeamColumns,
        {
            title: 'Số bản ghi', width: 120, align: 'center',
            dataIndex: 'recordCount',
            render: (v) => <Tag color="blue">{v}</Tag>,
            onHeaderCell: () => TH,
        },
        {
            title: 'Tổng hoa hồng', width: 200, align: 'right',
            sorter: (a, b) => a.totalCommission - b.totalCommission,
            defaultSortOrder: 'descend',
            render: (_, r) => (
                <span style={{ fontWeight: 600, color: '#E8890C' }}>
                    {formatCurrency(r.totalCommission)}
                </span>
            ),
            onHeaderCell: () => TH,
        },
        {
            title: '% Tổng', width: 100, align: 'center',
            render: (_, r) => totalCommission > 0
                ? `${((r.totalCommission / totalCommission) * 100).toFixed(1)}%`
                : '—',
            onHeaderCell: () => TH,
        },
    ];

    return (
        <>
            <PageHeader title="Báo cáo / Hoa hồng" />

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
                        {groupBy !== 'TEAM' && (
                            <Select
                                allowClear showSearch placeholder="Nhân viên" style={{ width: 200 }}
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
                <Col span={8}>
                    <Card style={{ borderRadius: 8 }}>
                        <div style={{ fontSize: 13, color: '#888', marginBottom: 4 }}>Tổng hoa hồng</div>
                        <div style={{ fontSize: 22, fontWeight: 700, color: '#E8890C' }}>
                            {formatCurrency(totalCommission)}
                        </div>
                    </Card>
                </Col>
                <Col span={8}>
                    <Card style={{ borderRadius: 8 }}>
                        <div style={{ fontSize: 13, color: '#888', marginBottom: 4 }}>
                            Số {GROUP_OPTIONS.find((g) => g.value === groupBy)?.label}
                        </div>
                        <div style={{ fontSize: 22, fontWeight: 700, color: '#1A2B5A' }}>
                            {data.length}
                        </div>
                    </Card>
                </Col>
                <Col span={8}>
                    <Card style={{ borderRadius: 8 }}>
                        <div style={{ fontSize: 13, color: '#888', marginBottom: 4 }}>Số bản ghi hoa hồng</div>
                        <div style={{ fontSize: 22, fontWeight: 700, color: '#52c41a' }}>
                            {totalRecords}
                        </div>
                    </Card>
                </Col>
            </Row>

            {/* Chart */}
            {barData.length > 0 && (
                <Card
                    title={
                        <span style={{ color: '#1A2B5A', fontWeight: 600 }}>
                            Top {Math.min(barData.length, 10)} hoa hồng cao nhất — theo {GROUP_OPTIONS.find((g) => g.value === groupBy)?.label}
                        </span>
                    }
                    style={{ borderRadius: 8, marginBottom: 16 }}
                >
                    <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={barData} margin={{ top: 8, right: 32, left: 8, bottom: 8 }}>
                            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                            <YAxis tick={{ fontSize: 11 }} tickFormatter={formatMillions} />
                            <Tooltip formatter={(v) => [formatCurrency(Number(v)), 'Hoa hồng']} />
                            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                {barData.map((_, i) => (
                                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </Card>
            )}

            {/* Table */}
            <Card style={{ borderRadius: 8 }}>
                <Table
                    rowKey={(r) => r.employee?.id ?? r.team?.id ?? 'no-group'}
                    columns={columns}
                    dataSource={sorted}
                    loading={loading}
                    pagination={{ pageSize: 20, showSizeChanger: false }}
                    summary={() => data.length > 0 ? (
                        <Table.Summary.Row>
                            <Table.Summary.Cell index={0} colSpan={groupBy !== 'TEAM' ? 4 : 2}>
                                <strong>Tổng cộng</strong>
                            </Table.Summary.Cell>
                            <Table.Summary.Cell index={1} align="center">
                                <strong>{totalRecords}</strong>
                            </Table.Summary.Cell>
                            <Table.Summary.Cell index={2} align="right">
                                <strong style={{ color: '#E8890C' }}>{formatCurrency(totalCommission)}</strong>
                            </Table.Summary.Cell>
                            <Table.Summary.Cell index={3} align="center">
                                <strong>100%</strong>
                            </Table.Summary.Cell>
                        </Table.Summary.Row>
                    ) : null}
                />
            </Card>
        </>
    );
}
