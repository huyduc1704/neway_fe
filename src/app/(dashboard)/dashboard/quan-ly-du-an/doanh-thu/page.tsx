'use client';
import { useEffect, useState, useCallback } from 'react';
import { Table, Card, DatePicker, Select, Space, message, Statistic, Row, Col, Tag } from 'antd';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { TableColumnsType } from 'antd';
import api from '@/lib/api';
import PageHeader from '@/components/common/PageHeader';
import dayjs from 'dayjs';

interface RevenueRow {
    group: { id: string; code: string; ward: string; area: string } | null;
    totalRevenue: number;
    transactionCount: number;
}

interface Branch { id: string; name: string; }
interface Team { id: string; name: string; }

const formatCurrency = (v: number) =>
    new Intl.NumberFormat('vi-VN').format(v) + 'đ';

const COLORS = ['#E8890C', '#F5B95A', '#FAD99A', '#C8720A', '#FDECC8', '#A0520A'];

const TH = { style: { backgroundColor: '#FFF3E0', color: '#E8890C' } };

export default function DoanhThuDuAnPage() {
    const [data, setData] = useState<RevenueRow[]>([]);
    const [loading, setLoading] = useState(false);
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
                params: {
                    groupBy: 'PROJECT',
                    fromDate,
                    toDate,
                    branchId: branchFilter,
                    teamId: teamFilter,
                },
            });
            setData(res);
        } catch {
            message.error('Không thể tải báo cáo doanh thu');
        } finally {
            setLoading(false);
        }
    }, [fromDate, toDate, branchFilter, teamFilter]);

    useEffect(() => { fetchData(); }, [fetchData]);

    useEffect(() => {
        api.get('/branches', { params: { limit: 100 } }).then(({ data }) => setBranches(data.data)).catch(() => {});
        api.get('/teams', { params: { limit: 100 } }).then(({ data }) => setTeams(data.data)).catch(() => {});
    }, []);

    const totalRevenue = data.reduce((s, r) => s + r.totalRevenue, 0);
    const totalTransactions = data.reduce((s, r) => s + r.transactionCount, 0);

    const chartData = [...data]
        .sort((a, b) => b.totalRevenue - a.totalRevenue)
        .slice(0, 10)
        .map((r) => ({
            name: r.group?.code || 'N/A',
            value: r.totalRevenue,
        }));

    const columns: TableColumnsType<RevenueRow> = [
        {
            title: 'STT', width: 60, align: 'center',
            render: (_, __, i) => i + 1,
            onHeaderCell: () => TH,
        },
        {
            title: 'Mã dự án', width: 130,
            render: (_, r) => <Tag color="orange">{r.group?.code || 'N/A'}</Tag>,
            onHeaderCell: () => TH,
        },
        {
            title: 'Khu vực / Phường xã',
            render: (_, r) => r.group ? (
                <div>
                    <div style={{ fontWeight: 500 }}>{r.group.area}</div>
                    <div style={{ fontSize: 12, color: '#888' }}>{r.group.ward}</div>
                </div>
            ) : '—',
            onHeaderCell: () => TH,
        },
        {
            title: 'Số giao dịch', width: 130, align: 'center',
            dataIndex: 'transactionCount',
            render: (v) => <Tag color="blue">{v}</Tag>,
            onHeaderCell: () => TH,
        },
        {
            title: 'Doanh thu', width: 200, align: 'right',
            dataIndex: 'totalRevenue',
            sorter: (a, b) => a.totalRevenue - b.totalRevenue,
            defaultSortOrder: 'descend',
            render: (v) => (
                <span style={{ fontWeight: 600, color: '#E8890C' }}>{formatCurrency(v)}</span>
            ),
            onHeaderCell: () => TH,
        },
        {
            title: '% Tổng', width: 110, align: 'center',
            render: (_, r) => totalRevenue > 0
                ? `${((r.totalRevenue / totalRevenue) * 100).toFixed(1)}%`
                : '—',
            onHeaderCell: () => TH,
        },
    ];

    return (
        <>
            <PageHeader title="Quản lý dự án / Doanh thu" />

            {/* Filters */}
            <Card style={{ borderRadius: 8, marginBottom: 16 }}>
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
                        allowClear placeholder="Team" style={{ width: 180 }}
                        onChange={(v) => setTeamFilter(v)}
                        options={teams.map((t) => ({ value: t.id, label: t.name }))}
                    />
                </Space>
            </Card>

            {/* Summary */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
                <Col span={8}>
                    <Card style={{ borderRadius: 8 }}>
                        <Statistic
                            title="Tổng doanh thu"
                            value={totalRevenue}
                            formatter={(v) => formatCurrency(Number(v))}
                            styles={{ content: { color: '#E8890C', fontWeight: 700 } }}
                        />
                    </Card>
                </Col>
                <Col span={8}>
                    <Card style={{ borderRadius: 8 }}>
                        <Statistic
                            title="Số dự án có doanh thu"
                            value={data.length}
                            styles={{ content: { color: '#1A2B5A', fontWeight: 700 } }}
                        />
                    </Card>
                </Col>
                <Col span={8}>
                    <Card style={{ borderRadius: 8 }}>
                        <Statistic
                            title="Tổng giao dịch thành công"
                            value={totalTransactions}
                            styles={{ content: { color: '#52c41a', fontWeight: 700 } }}
                        />
                    </Card>
                </Col>
            </Row>

            {/* Chart */}
            {chartData.length > 0 && (
                <Card
                    title={<span style={{ color: '#1A2B5A', fontWeight: 600 }}>Top 10 dự án doanh thu cao nhất</span>}
                    style={{ borderRadius: 8, marginBottom: 16 }}
                >
                    <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={chartData} margin={{ top: 8, right: 32, left: 16, bottom: 8 }}>
                            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                            <YAxis
                                tick={{ fontSize: 11 }}
                                tickFormatter={(v) => `${(v / 1_000_000).toFixed(0)}tr`}
                            />
                            <Tooltip
                                formatter={(v) => [formatCurrency(Number(v)), 'Doanh thu']}
                            />
                            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                {chartData.map((_, i) => (
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
                    rowKey={(r) => r.group?.id ?? 'null'}
                    columns={columns}
                    dataSource={data}
                    loading={loading}
                    pagination={{ pageSize: 20, showSizeChanger: false }}
                    summary={() => data.length > 0 ? (
                        <Table.Summary.Row>
                            <Table.Summary.Cell index={0} colSpan={3}>
                                <strong>Tổng cộng</strong>
                            </Table.Summary.Cell>
                            <Table.Summary.Cell index={3} align="center">
                                <strong>{totalTransactions}</strong>
                            </Table.Summary.Cell>
                            <Table.Summary.Cell index={4} align="right">
                                <strong style={{ color: '#E8890C' }}>{formatCurrency(totalRevenue)}</strong>
                            </Table.Summary.Cell>
                            <Table.Summary.Cell index={5} align="center">
                                <strong>100%</strong>
                            </Table.Summary.Cell>
                        </Table.Summary.Row>
                    ) : null}
                />
            </Card>
        </>
    );
}
