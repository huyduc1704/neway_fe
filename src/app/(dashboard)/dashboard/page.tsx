'use client';
import { useEffect, useState } from 'react';
import { Row, Col, Card, Typography, DatePicker, Spin } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell,
} from 'recharts';
import api from '@/lib/api';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const PIE_COLORS = ['#E8890C', '#F5B95A', '#FAD99A', '#FDECC8', '#C8720A'];

const formatCurrency = (value: number) =>
    new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(value) + 'đ';

function StatCard({ title, value, trend, isCurrency }: {
    title: string; value: number; trend: number; isCurrency?: boolean;
}) {
    const isUp = trend >= 0;
    return (
        <Card style={{ borderRadius: 8, height: '100%' }}>
            <Text type="secondary" style={{ fontSize: 13 }}>{title}</Text>
            <div style={{ marginTop: 6 }}>
                <span style={{ fontSize: 20, fontWeight: 700, color: '#1A2B5A' }}>
                    {isCurrency ? formatCurrency(value) : value}
                </span>
            </div>
            <div style={{ marginTop: 4, fontSize: 12, color: isUp ? '#52c41a' : '#ff4d4f' }}>
                {isUp ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                {' ~'}{Math.abs(trend)}%
            </div>
        </Card>
    );
}

// Mock data cho Top 10 cá nhân — thay bằng API khi có endpoint thống kê cá nhân
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
                // giữ state rỗng
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        run();
        return () => { cancelled = true; };
    }, [fromDate, toDate]);

    return (
        <Spin spinning={loading}>
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col span={6}><StatCard title="Báo cáo doanh thu" value={stats.revenue} trend={2} isCurrency /></Col>
                <Col span={6}><StatCard title="Báo cáo giao dịch" value={stats.transactions} trend={6} /></Col>
                <Col span={6}><StatCard title="Giao dịch thành công" value={stats.success} trend={3} /></Col>
                <Col span={6}><StatCard title="Giao dịch đã huỷ" value={stats.cancelled} trend={-12} /></Col>
            </Row>

            <Row gutter={16}>
                <Col span={14}>
                    <Card
                        title={<Title level={5} style={{ margin: 0, color: '#1A2B5A' }}>Top 10 doanh thu cá nhân</Title>}
                        style={{ borderRadius: 8 }}
                    >
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={PERSONAL_DATA} layout="vertical" margin={{ left: 8, right: 40 }}>
                                <XAxis type="number" unit=" triệu" tick={{ fontSize: 12 }} />
                                <YAxis type="category" dataKey="period" tick={{ fontSize: 12 }} width={110} />
                                <Tooltip formatter={(v) => [`${v ?? 0} triệu`, 'Doanh thu']} />
                                <Bar dataKey="value" fill="#E8890C" radius={[0, 4, 4, 0]}
                                    background={{ fill: '#f5f5f5', radius: 4 }} />
                            </BarChart>
                        </ResponsiveContainer>
                    </Card>
                </Col>

                <Col span={10}>
                    <Card
                        title={<Title level={5} style={{ margin: 0, color: '#1A2B5A' }}>Doanh thu chi nhánh</Title>}
                        extra={
                            <DatePicker.RangePicker
                                size="small"
                                format="DD/MM/YYYY"
                                onChange={(_, strings) => {
                                    if (strings[0] && strings[1]) {
                                        setFromDate(strings[0]);
                                        setToDate(strings[1]);
                                    }
                                }}
                            />
                        }
                        style={{ borderRadius: 8 }}
                    >
                        {branchRevenue.length > 0 ? (
                            <>
                                <ResponsiveContainer width="100%" height={200}>
                                    <PieChart>
                                        <Pie data={branchRevenue} cx="50%" cy="50%"
                                            innerRadius={50} outerRadius={88} dataKey="value"
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

                                <div style={{ marginTop: 8 }}>
                                    {branchRevenue.map((item, i) => (
                                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f5f5f5' }}>
                                            <Text style={{ fontSize: 13 }}>
                                                <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: PIE_COLORS[i % PIE_COLORS.length], marginRight: 8 }} />
                                                {item.name}
                                            </Text>
                                            <Text strong style={{ color: '#1A2B5A', fontSize: 13 }}>
                                                {formatCurrency(item.value)}
                                            </Text>
                                        </div>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <div style={{ textAlign: 'center', padding: '60px 0', color: '#bbb' }}>
                                Chưa có dữ liệu doanh thu
                            </div>
                        )}
                    </Card>
                </Col>
            </Row>
        </Spin>
    );
}