'use client';
import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Card, Statistic, Spin, Row, Col, Typography } from 'antd';
import api from '@/lib/api';
import dayjs from 'dayjs';

const { Title } = Typography;

const PIE_COLORS = ['#E8890C', '#F5B95A', '#FAD99A', '#FDECC8', '#C8720A'];

const formatCurrency = (value: number) =>
    new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(value) + 'đ';

function MiniStatCard({ title, value, trend, isCurrency }: {
    title: string; value: number; trend: number; isCurrency?: boolean;
}) {
    const isUp = trend >= 0;
    return (
        <Card size="small" style={{ height: '100%' }}>
            <Statistic
                title={title}
                value={isCurrency ? formatCurrency(value) : value}
                formatter={isCurrency ? (val) => String(val) : undefined}
                suffix={
                    <span style={{ fontSize: 12, color: isUp ? '#52c41a' : '#ff4d4f' }}>
                        {isUp ? '↑' : '↓'} ~{Math.abs(trend)}%
                    </span>
                }
                valueStyle={{ fontSize: 20, fontWeight: 700, color: '#1A2B5A' }}
            />
        </Card>
    );
}

const PERSONAL_DATA = [
    { period: 'DT năm tới', value: 150 },
    { period: 'DT Quý 4', value: 45 },
    { period: 'DT năm nay', value: 130 },
    { period: 'DT Quý 3', value: 35 },
    { period: 'DT Quý 2', value: 40 },
    { period: 'DT Quý 1', value: 30 },
    { period: 'DT tháng này', value: 25 },
];

export default function DashboardPage() {
    const [loading, setLoading] = useState(true);
    const [branchRevenue, setBranchRevenue] = useState<{ name: string; value: number }[]>([]);
    const [stats, setStats] = useState({ revenue: 0, transactions: 0, success: 0, cancelled: 0 });
    const [fromDate, setFromDate] = useState(dayjs().startOf('year').format('YYYY-MM-DD'));
    const [toDate, setToDate] = useState(dayjs().endOf('year').format('YYYY-MM-DD'));

    useEffect(() => {
        let cancelled = false;
        const run = async () => {
            setLoading(true);
            try {
                const [revenueRes, totalRes, successRes, cancelledRes] = await Promise.all([
                    api.get('/reports/revenue', { params: { groupBy: 'BRANCH', fromDate, toDate } }),
                    api.get('/transactions', { params: { limit: 1 } }),
                    api.get('/transactions', { params: { limit: 1, status: 'SUCCESS' } }),
                    api.get('/transactions', { params: { limit: 1, status: 'CANCELLED' } }),
                ]);
                if (cancelled) return;
                const branchData: any[] = revenueRes.data?.data || [];
                setBranchRevenue(branchData.map((item: any) => ({
                    name: item.branchName || 'N/A',
                    value: Number(item.totalRevenue || 0),
                })));
                setStats({
                    revenue: branchData.reduce((s: number, b: any) => s + Number(b.totalRevenue || 0), 0),
                    transactions: totalRes.data?.meta?.total || 0,
                    success: successRes.data?.meta?.total || 0,
                    cancelled: cancelledRes.data?.meta?.total || 0,
                });
            } catch {
                // keep empty state
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        run();
        return () => { cancelled = true; };
    }, [fromDate, toDate]);

    return (
        <Spin spinning={loading}>
            <Row gutter={[24, 24]}>
                {/* Left column */}
                <Col xs={24} lg={11}>
                    <Row gutter={[16, 16]}>
                        <Col span={12}>
                            <MiniStatCard title="Báo cáo doanh thu" value={stats.revenue} trend={2} isCurrency />
                        </Col>
                        <Col span={12}>
                            <MiniStatCard title="Báo cáo giao dịch" value={stats.transactions} trend={6} />
                        </Col>
                        <Col span={12}>
                            <MiniStatCard title="Giao dịch thành công" value={stats.success} trend={3} />
                        </Col>
                        <Col span={12}>
                            <MiniStatCard title="Giao dịch đã huỷ" value={stats.cancelled} trend={-12} />
                        </Col>
                    </Row>

                    <Card style={{ marginTop: 24 }}>
                        <Title level={5} style={{ color: '#1A2B5A', marginBottom: 12 }}>Top 10 doanh thu cá nhân</Title>
                        <ResponsiveContainer width="100%" height={320}>
                            <BarChart data={PERSONAL_DATA} layout="vertical" margin={{ left: 8, right: 40 }}>
                                <XAxis type="number" unit=" triệu" tick={{ fontSize: 12 }} hide />
                                <YAxis type="category" dataKey="period" tick={{ fontSize: 12 }} width={110} axisLine={false} tickLine={false} />
                                <Tooltip formatter={(v) => [`${v ?? 0} triệu`, 'Doanh thu']} />
                                <Bar dataKey="value" fill="#E8890C" radius={[0, 4, 4, 0]}
                                    background={{ fill: '#f5f5f5', radius: 4 }} barSize={12} />
                            </BarChart>
                        </ResponsiveContainer>
                    </Card>
                </Col>

                {/* Right column */}
                <Col xs={24} lg={13}>
                    <Card style={{ height: '100%' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                            <Title level={5} style={{ color: '#1A2B5A', margin: 0 }}>Doanh thu chi nhánh</Title>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <input
                                    type="date"
                                    style={{ height: 32, padding: '0 8px', borderRadius: 6, border: '1px solid #d9d9d9', fontSize: 12, background: 'white' }}
                                    defaultValue={fromDate}
                                    onChange={(e) => setFromDate(e.target.value)}
                                />
                                <span style={{ color: '#999', fontSize: 12 }}>→</span>
                                <input
                                    type="date"
                                    style={{ height: 32, padding: '0 8px', borderRadius: 6, border: '1px solid #d9d9d9', fontSize: 12, background: 'white' }}
                                    defaultValue={toDate}
                                    onChange={(e) => setToDate(e.target.value)}
                                />
                            </div>
                        </div>

                        {branchRevenue.length > 0 ? (
                            <>
                                <ResponsiveContainer width="100%" height={280}>
                                    <PieChart>
                                        <Pie
                                            data={branchRevenue} cx="50%" cy="50%"
                                            innerRadius={0} outerRadius={110} dataKey="value"
                                            label={({ percent }) => `${((percent ?? 0) * 100).toFixed(0)}%`}
                                            labelLine={false}
                                        >
                                            {branchRevenue.map((_, i) => (
                                                <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip formatter={(v) => formatCurrency(Number(v ?? 0))} />
                                    </PieChart>
                                </ResponsiveContainer>

                                <div style={{ marginTop: 24 }}>
                                    {branchRevenue.map((item, i) => (
                                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: i < branchRevenue.length - 1 ? '1px solid #f0f0f0' : 'none' }}>
                                            <span style={{ fontSize: 14, fontWeight: 500, color: '#374151' }}>{item.name}</span>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                                <span style={{ fontSize: 14, fontWeight: 700, color: '#1A2B5A' }}>{formatCurrency(item.value)}</span>
                                                <span style={{ fontSize: 12, color: '#52c41a' }}>~ 2.5%</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <div style={{ textAlign: 'center', padding: '64px 0', color: '#d1d5db' }}>Chưa có dữ liệu doanh thu</div>
                        )}
                    </Card>
                </Col>
            </Row>
        </Spin>
    );
}
