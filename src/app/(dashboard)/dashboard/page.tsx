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
            <Row gutter={[24, 24]}> {/* Máng xối chia khoảng cách giữa 2 cột chính */}

                {/* =================== CỘT TRÁI (Bên dưới chiếm span 12 hoặc 11 tuỳ ý bạn) =================== */}
                <Col xs={24} lg={11}>
                    {/* 1. Lưới 4 Thống kê xếp 2x2 */}
                    <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                        <Col span={12}><StatCard title="Báo cáo doanh thu" value={stats.revenue} trend={2} isCurrency /></Col>
                        <Col span={12}><StatCard title="Báo cáo giao dịch" value={stats.transactions} trend={6} /></Col>
                        <Col span={12}><StatCard title="Giao dịch thành công" value={stats.success} trend={3} /></Col>
                        <Col span={12}><StatCard title="Giao dịch đã huỷ" value={stats.cancelled} trend={-12} /></Col>
                    </Row>

                    {/* 2. Biểu đồ Top 10 Doanh Thu Cá Nhân */}
                    <Card
                        title={<Title level={5} style={{ margin: 0, color: '#1A2B5A' }}>Top 10 doanh thu cá nhân</Title>}
                        style={{ borderRadius: 12 }} // Tăng độ bo góc xíu cho giống hình
                    >
                        <ResponsiveContainer width="100%" height={320}>
                            <BarChart data={PERSONAL_DATA} layout="vertical" margin={{ left: 8, right: 40 }}>
                                <XAxis type="number" unit=" triệu" tick={{ fontSize: 12 }} hide /> {/* Có thể hide XAxis cho gọn như hình */}
                                <YAxis type="category" dataKey="period" tick={{ fontSize: 12 }} width={110} axisLine={false} tickLine={false} />
                                <Tooltip formatter={(v) => [`${v ?? 0} triệu`, 'Doanh thu']} />
                                <Bar dataKey="value" fill="#E8890C" radius={[0, 4, 4, 0]}
                                    background={{ fill: '#f5f5f5', radius: 4 }} barSize={12} /> {/* Thu nhỏ thanh bar lại xíu */}
                            </BarChart>
                        </ResponsiveContainer>
                    </Card>
                </Col>

                {/* =================== CỘT PHẢI (Chiếm trọn chiều cao) =================== */}
                <Col xs={24} lg={13}>
                    <Card
                        title={<Title level={5} style={{ margin: 0, color: '#1A2B5A', fontSize: 22 }}>Doanh thu chi nhánh</Title>}
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
                        style={{ borderRadius: 12, height: '100%' }} // height: '100%' giúp cột này trải dài bằng cột trái
                    >
                        {branchRevenue.length > 0 ? (
                            <>
                                {/* Phần Biểu đồ tròn */}
                                <ResponsiveContainer width="100%" height={280}>
                                    <PieChart>
                                        <Pie data={branchRevenue} cx="50%" cy="50%"
                                            innerRadius={0} outerRadius={110} dataKey="value" // Xoá innerRadius để thành biểu đồ tròn đặc
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

                                {/* Bảng danh sách chi nhánh bên dưới */}
                                <div style={{ marginTop: 24 }}>
                                    {branchRevenue.map((item, i) => (
                                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #f5f5f5' }}>
                                            <Text style={{ fontSize: 14, fontWeight: 500, color: '#333' }}>{item.name}</Text>
                                            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                                                <Text strong style={{ color: '#1A2B5A', fontSize: 14 }}>
                                                    {formatCurrency(item.value)}
                                                </Text>
                                                <Text type="secondary" style={{ fontSize: 12, color: '#52c41a' }}>~ 2.5%</Text>
                                            </div>
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