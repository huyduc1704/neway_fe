'use client';
import { useEffect, useState, useCallback } from 'react';
import { Card, DatePicker, Select, Space, message, Row, Col, Table, Tag, Segmented } from 'antd';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';
import type { TableColumnsType } from 'antd';
import api from '@/lib/api';
import PageHeader from '@/components/common/PageHeader';
import dayjs from 'dayjs';

type GroupBy = 'BRANCH' | 'TEAM' | 'PROJECT';

interface RevenueRow {
    group: { id: string | null; code?: string; name?: string; ward?: string; area?: string } | null;
    totalRevenue: number;
    transactionCount: number;
}

interface Branch { id: string; name: string; }
interface Team { id: string; name: string; }

const formatCurrency = (v: number) =>
    new Intl.NumberFormat('vi-VN').format(v) + 'đ';

const formatMillions = (v: number) =>
    `${(v / 1_000_000).toFixed(0)}tr`;

const COLORS = ['#E8890C', '#F5B95A', '#C8720A', '#FAD99A', '#A0520A', '#FDECC8'];

const GROUP_OPTIONS = [
    { label: 'Chi nhánh', value: 'BRANCH' },
    { label: 'Team',      value: 'TEAM' },
    { label: 'Dự án',     value: 'PROJECT' },
];

const TH = { style: { backgroundColor: '#FFF3E0', color: '#E8890C' } };

const getGroupName = (row: RevenueRow, groupBy: GroupBy) => {
    const g = row.group;
    if (!g) return 'N/A';
    if (groupBy === 'PROJECT') return g.code || 'N/A';
    return g.name || 'N/A';
};

const getGroupSub = (row: RevenueRow, groupBy: GroupBy) => {
    if (groupBy === 'PROJECT' && row.group) return `${row.group.area || ''} — ${row.group.ward || ''}`;
    return null;
};

export default function BaoCaoDoanhThuPage() {
    const [data, setData] = useState<RevenueRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [groupBy, setGroupBy] = useState<GroupBy>('BRANCH');
    const [branches, setBranches] = useState<Branch[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);
    const [fromDate, setFromDate] = useState(dayjs().startOf('year').format('YYYY-MM-DD'));
    const [toDate, setToDate] = useState(dayjs().endOf('year').format('YYYY-MM-DD'));
    const [branchFilter, setBranchFilter] = useState<string | undefined>();
    const [teamFilter, setTeamFilter] = useState<string | undefined>();

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const { data: res } = await api.get('/reports/revenue', {
                params: { groupBy, fromDate, toDate, branchId: branchFilter, teamId: teamFilter },
            });
            setData(res);
        } catch {
            message.error('Không thể tải báo cáo doanh thu');
        } finally {
            setLoading(false);
        }
    }, [groupBy, fromDate, toDate, branchFilter, teamFilter]);

    useEffect(() => { fetchData(); }, [fetchData]);

    useEffect(() => {
        api.get('/branches', { params: { limit: 100 } }).then(({ data }) => setBranches(data.data)).catch(() => {});
        api.get('/teams', { params: { limit: 100 } }).then(({ data }) => setTeams(data.data)).catch(() => {});
    }, []);

    const totalRevenue = data.reduce((s, r) => s + r.totalRevenue, 0);
    const totalTransactions = data.reduce((s, r) => s + r.transactionCount, 0);

    const sorted = [...data].sort((a, b) => b.totalRevenue - a.totalRevenue);

    const barData = sorted.slice(0, 10).map((r) => ({
        name: getGroupName(r, groupBy),
        value: r.totalRevenue,
    }));

    const pieData = sorted.slice(0, 6).map((r) => ({
        name: getGroupName(r, groupBy),
        value: r.totalRevenue,
    }));

    const columns: TableColumnsType<RevenueRow> = [
        {
            title: 'STT', width: 60, align: 'center',
            render: (_, __, i) => i + 1,
            onHeaderCell: () => TH,
        },
        {
            title: groupBy === 'PROJECT' ? 'Mã dự án' : groupBy === 'BRANCH' ? 'Chi nhánh' : 'Team',
            render: (_, r) => {
                const name = getGroupName(r, groupBy);
                const sub = getGroupSub(r, groupBy);
                return (
                    <div>
                        <div style={{ fontWeight: 500 }}>
                            {groupBy === 'PROJECT'
                                ? <Tag color="orange">{name}</Tag>
                                : name}
                        </div>
                        {sub && <div style={{ fontSize: 12, color: '#888' }}>{sub}</div>}
                    </div>
                );
            },
            onHeaderCell: () => TH,
        },
        {
            title: 'Số GD thành công', width: 160, align: 'center',
            dataIndex: 'transactionCount',
            render: (v) => <Tag color="blue">{v}</Tag>,
            onHeaderCell: () => TH,
        },
        {
            title: 'Doanh thu', width: 200, align: 'right',
            sorter: (a, b) => a.totalRevenue - b.totalRevenue,
            defaultSortOrder: 'descend',
            render: (_, r) => (
                <span style={{ fontWeight: 600, color: '#E8890C' }}>
                    {formatCurrency(r.totalRevenue)}
                </span>
            ),
            onHeaderCell: () => TH,
        },
        {
            title: '% Tổng', width: 100, align: 'center',
            render: (_, r) => totalRevenue > 0
                ? `${((r.totalRevenue / totalRevenue) * 100).toFixed(1)}%`
                : '—',
            onHeaderCell: () => TH,
        },
    ];

    return (
        <>
            <PageHeader title="Báo cáo / Doanh thu" />

            {/* Filters */}
            <Card style={{ borderRadius: 8, marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                    <Segmented
                        options={GROUP_OPTIONS}
                        value={groupBy}
                        onChange={(v) => setGroupBy(v as GroupBy)}
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
                            allowClear placeholder="Chi nhánh" style={{ width: 180 }}
                            onChange={(v) => setBranchFilter(v)}
                            options={branches.map((b) => ({ value: b.id, label: b.name }))}
                        />
                        <Select
                            allowClear placeholder="Team" style={{ width: 160 }}
                            onChange={(v) => setTeamFilter(v)}
                            options={teams.map((t) => ({ value: t.id, label: t.name }))}
                        />
                    </Space>
                </div>
            </Card>

            {/* Summary cards */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
                <Col span={8}>
                    <Card style={{ borderRadius: 8 }}>
                        <div style={{ fontSize: 13, color: '#888', marginBottom: 4 }}>Tổng doanh thu</div>
                        <div style={{ fontSize: 22, fontWeight: 700, color: '#E8890C' }}>
                            {formatCurrency(totalRevenue)}
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
                        <div style={{ fontSize: 13, color: '#888', marginBottom: 4 }}>Tổng GD thành công</div>
                        <div style={{ fontSize: 22, fontWeight: 700, color: '#52c41a' }}>
                            {totalTransactions}
                        </div>
                    </Card>
                </Col>
            </Row>

            {/* Charts */}
            {data.length > 0 && (
                <Row gutter={16} style={{ marginBottom: 16 }}>
                    <Col span={15}>
                        <Card
                            title={<span style={{ color: '#1A2B5A', fontWeight: 600 }}>
                                Doanh thu theo {GROUP_OPTIONS.find((g) => g.value === groupBy)?.label}
                            </span>}
                            style={{ borderRadius: 8 }}
                        >
                            <ResponsiveContainer width="100%" height={260}>
                                <BarChart data={barData} margin={{ top: 8, right: 32, left: 8, bottom: 8 }}>
                                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                                    <YAxis tick={{ fontSize: 11 }} tickFormatter={formatMillions} />
                                    <Tooltip formatter={(v) => [formatCurrency(Number(v)), 'Doanh thu']} />
                                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                        {barData.map((_, i) => (
                                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </Card>
                    </Col>
                    <Col span={9}>
                        <Card
                            title={<span style={{ color: '#1A2B5A', fontWeight: 600 }}>Tỷ trọng doanh thu</span>}
                            style={{ borderRadius: 8 }}
                        >
                            <ResponsiveContainer width="100%" height={260}>
                                <PieChart>
                                    <Pie
                                        data={pieData} cx="50%" cy="45%"
                                        innerRadius={55} outerRadius={90}
                                        dataKey="value"
                                        label={({ percent }) => `${((percent ?? 0) * 100).toFixed(0)}%`}
                                        labelLine={false}
                                    >
                                        {pieData.map((_, i) => (
                                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Legend
                                        formatter={(v) => <span style={{ fontSize: 12 }}>{v}</span>}
                                    />
                                    <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                                </PieChart>
                            </ResponsiveContainer>
                        </Card>
                    </Col>
                </Row>
            )}

            {/* Table */}
            <Card style={{ borderRadius: 8 }}>
                <Table
                    rowKey={(r) => r.group?.id ?? r.group?.code ?? 'no-group'}
                    columns={columns}
                    dataSource={sorted}
                    loading={loading}
                    pagination={{ pageSize: 20, showSizeChanger: false }}
                    summary={() => data.length > 0 ? (
                        <Table.Summary.Row>
                            <Table.Summary.Cell index={0} colSpan={2}>
                                <strong>Tổng cộng</strong>
                            </Table.Summary.Cell>
                            <Table.Summary.Cell index={2} align="center">
                                <strong>{totalTransactions}</strong>
                            </Table.Summary.Cell>
                            <Table.Summary.Cell index={3} align="right">
                                <strong style={{ color: '#E8890C' }}>{formatCurrency(totalRevenue)}</strong>
                            </Table.Summary.Cell>
                            <Table.Summary.Cell index={4} align="center">
                                <strong>100%</strong>
                            </Table.Summary.Cell>
                        </Table.Summary.Row>
                    ) : null}
                />
            </Card>
        </>
    );
}
