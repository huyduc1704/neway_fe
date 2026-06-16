'use client';
import { useEffect, useState, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';
import { message } from 'antd';
import { Button, DatePicker, Select, Tag, Table, Card, Typography, Space, Row, Col, Statistic } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { DownloadOutlined } from '@ant-design/icons';
import api from '@/lib/api';
import { downloadExport } from '@/lib/export';
import dayjs from 'dayjs';

const { Title } = Typography;

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
    { label: 'Team', value: 'TEAM' },
    { label: 'Dự án', value: 'PROJECT' },
];

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
    const [fromDate, setFromDate] = useState(dayjs().startOf('month').format('YYYY-MM-DD'));
    const [toDate, setToDate] = useState(dayjs().endOf('month').format('YYYY-MM-DD'));
    const [branchFilter, setBranchFilter] = useState<string>('');
    const [teamFilter, setTeamFilter] = useState<string>('');

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const { data: res } = await api.get('/reports/revenue', {
                params: { groupBy, fromDate, toDate, branchId: branchFilter || undefined, teamId: teamFilter || undefined },
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
    const barData = sorted.slice(0, 10).map((r) => ({ name: getGroupName(r, groupBy), value: r.totalRevenue }));
    const pieData = sorted.slice(0, 6).map((r) => ({ name: getGroupName(r, groupBy), value: r.totalRevenue }));

    const columns: ColumnsType<RevenueRow> = [
        {
            title: 'STT', key: 'stt', width: 60, align: 'center',
            render: (_, __, i) => i + 1,
        },
        {
            title: groupBy === 'PROJECT' ? 'Mã dự án' : groupBy === 'BRANCH' ? 'Chi nhánh' : 'Team',
            key: 'group',
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
                        {sub && <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>{sub}</div>}
                    </div>
                );
            },
        },
        {
            title: 'Số GD thành công', key: 'transactionCount', width: 160, align: 'center',
            dataIndex: 'transactionCount',
            render: (v) => <Tag color="default">{v}</Tag>,
        },
        {
            title: 'Doanh thu', key: 'totalRevenue', width: 200, align: 'right',
            render: (_, r) => (
                <span style={{ fontWeight: 600, color: '#E8890C' }}>{formatCurrency(r.totalRevenue)}</span>
            ),
        },
        {
            title: '% Tổng', key: 'pct', width: 100, align: 'center',
            render: (_, r) => totalRevenue > 0
                ? `${((r.totalRevenue / totalRevenue) * 100).toFixed(1)}%`
                : '—',
        },
    ];

    const summary = () => (
        data.length > 0 ? (
            <Table.Summary.Row>
                <Table.Summary.Cell index={0} colSpan={2}><strong>Tổng cộng</strong></Table.Summary.Cell>
                <Table.Summary.Cell index={2} align="center"><strong>{totalTransactions}</strong></Table.Summary.Cell>
                <Table.Summary.Cell index={3} align="right"><strong style={{ color: '#E8890C' }}>{formatCurrency(totalRevenue)}</strong></Table.Summary.Cell>
                <Table.Summary.Cell index={4} align="center"><strong>100%</strong></Table.Summary.Cell>
            </Table.Summary.Row>
        ) : null
    );

    return (
        <>
            {/* Page Header */}
            <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Title level={4} style={{ margin: 0 }}>Báo cáo / Doanh thu</Title>
                <Button icon={<DownloadOutlined />} onClick={async () => {
                    try {
                        await downloadExport('/reports/revenue/export', { groupBy, fromDate, toDate, branchId: branchFilter || undefined, teamId: teamFilter || undefined }, 'bao-cao-doanh-thu');
                    } catch { message.error('Xuất file thất bại'); }
                }}>
                    Xuất Excel
                </Button>
            </div>

            {/* Filters */}
            <Card style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                    {/* Group by tabs */}
                    <div style={{ display: 'flex', borderRadius: 6, border: '1px solid #d9d9d9', overflow: 'hidden' }}>
                        {GROUP_OPTIONS.map((opt) => (
                            <button
                                key={opt.value}
                                onClick={() => setGroupBy(opt.value as GroupBy)}
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
                            style={{ width: 176 }}
                            allowClear
                            options={[{ value: '', label: 'Tất cả chi nhánh' }, ...branches.map((b) => ({ value: b.id, label: b.name }))]}
                        />

                        <Select
                            value={teamFilter || undefined}
                            onChange={(v) => setTeamFilter(v ?? '')}
                            placeholder="Team"
                            style={{ width: 160 }}
                            allowClear
                            options={[{ value: '', label: 'Tất cả team' }, ...teams.map((t) => ({ value: t.id, label: t.name }))]}
                        />
                    </Space>
                </div>
            </Card>

            {/* Summary cards */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
                <Col span={8}>
                    <Card>
                        <Statistic title="Tổng doanh thu" value={formatCurrency(totalRevenue)} formatter={(v) => String(v)} valueStyle={{ color: '#E8890C', fontSize: 24, fontWeight: 700 }} />
                    </Card>
                </Col>
                <Col span={8}>
                    <Card>
                        <Statistic title={`Số ${GROUP_OPTIONS.find((g) => g.value === groupBy)?.label}`} value={data.length} valueStyle={{ color: '#1A2B5A', fontSize: 24, fontWeight: 700 }} />
                    </Card>
                </Col>
                <Col span={8}>
                    <Card>
                        <Statistic title="Tổng GD thành công" value={totalTransactions} valueStyle={{ color: '#52c41a', fontSize: 24, fontWeight: 700 }} />
                    </Card>
                </Col>
            </Row>

            {/* Charts */}
            {data.length > 0 && (
                <Row gutter={16} style={{ marginBottom: 16 }}>
                    <Col span={16}>
                        <Card>
                            <Title level={5} style={{ color: '#1A2B5A', marginBottom: 12 }}>
                                Doanh thu theo {GROUP_OPTIONS.find((g) => g.value === groupBy)?.label}
                            </Title>
                            <ResponsiveContainer width="100%" height={260}>
                                <BarChart data={barData} margin={{ top: 8, right: 32, left: 8, bottom: 8 }}>
                                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                                    <YAxis tick={{ fontSize: 11 }} tickFormatter={formatMillions} />
                                    <Tooltip formatter={(v) => [formatCurrency(Number(v)), 'Doanh thu']} />
                                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                        {barData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </Card>
                    </Col>
                    <Col span={8}>
                        <Card>
                            <Title level={5} style={{ color: '#1A2B5A', marginBottom: 12 }}>Tỷ trọng doanh thu</Title>
                            <ResponsiveContainer width="100%" height={260}>
                                <PieChart>
                                    <Pie data={pieData} cx="50%" cy="45%" innerRadius={55} outerRadius={90} dataKey="value"
                                        label={({ percent }) => `${((percent ?? 0) * 100).toFixed(0)}%`} labelLine={false}>
                                        {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                    </Pie>
                                    <Legend formatter={(v) => <span style={{ fontSize: 12 }}>{v}</span>} />
                                    <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                                </PieChart>
                            </ResponsiveContainer>
                        </Card>
                    </Col>
                </Row>
            )}

            {/* Table */}
            <Card>
                <Table
                    columns={columns}
                    dataSource={sorted}
                    rowKey={(r) => r.group?.id ?? r.group?.code ?? 'no-group'}
                    loading={loading}
                    pagination={{ pageSize: 20 }}
                    summary={summary}
                    size="small"
                />
            </Card>
        </>
    );
}
