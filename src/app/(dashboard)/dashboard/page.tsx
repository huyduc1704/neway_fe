'use client';
import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import api from '@/lib/api';
import dayjs from 'dayjs';

const PIE_COLORS = ['#E8890C', '#F5B95A', '#FAD99A', '#FDECC8', '#C8720A'];

const formatCurrency = (value: number) =>
    new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(value) + 'đ';

function MiniStatCard({ title, value, trend, isCurrency }: {
    title: string; value: number; trend: number; isCurrency?: boolean;
}) {
    const isUp = trend >= 0;
    return (
        <div className="bg-white rounded-lg border border-gray-200 p-4 h-full">
            <p className="text-xs text-gray-500">{title}</p>
            <div className="mt-1">
                <span className="text-xl font-bold text-[#1A2B5A]">
                    {isCurrency ? formatCurrency(value) : value}
                </span>
            </div>
            <div className={`mt-1 text-xs ${isUp ? 'text-green-500' : 'text-red-500'}`}>
                {isUp ? '↑' : '↓'} ~{Math.abs(trend)}%
            </div>
        </div>
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
        <div className={`relative ${loading ? 'opacity-60 pointer-events-none' : ''}`}>
            {loading && (
                <div className="absolute inset-0 flex items-center justify-center z-10">
                    <div className="h-8 w-8 rounded-full border-2 border-[#E8890C] border-t-transparent animate-spin" />
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-11 gap-6">
                {/* Left column */}
                <div className="lg:col-span-5 flex flex-col gap-6">
                    {/* 2x2 stat grid */}
                    <div className="grid grid-cols-2 gap-4">
                        <MiniStatCard title="Báo cáo doanh thu" value={stats.revenue} trend={2} isCurrency />
                        <MiniStatCard title="Báo cáo giao dịch" value={stats.transactions} trend={6} />
                        <MiniStatCard title="Giao dịch thành công" value={stats.success} trend={3} />
                        <MiniStatCard title="Giao dịch đã huỷ" value={stats.cancelled} trend={-12} />
                    </div>

                    {/* Bar chart */}
                    <div className="bg-white rounded-xl border border-gray-200 p-4">
                        <h3 className="text-sm font-semibold text-[#1A2B5A] mb-3">Top 10 doanh thu cá nhân</h3>
                        <ResponsiveContainer width="100%" height={320}>
                            <BarChart data={PERSONAL_DATA} layout="vertical" margin={{ left: 8, right: 40 }}>
                                <XAxis type="number" unit=" triệu" tick={{ fontSize: 12 }} hide />
                                <YAxis type="category" dataKey="period" tick={{ fontSize: 12 }} width={110} axisLine={false} tickLine={false} />
                                <Tooltip formatter={(v) => [`${v ?? 0} triệu`, 'Doanh thu']} />
                                <Bar dataKey="value" fill="#E8890C" radius={[0, 4, 4, 0]}
                                    background={{ fill: '#f5f5f5', radius: 4 }} barSize={12} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Right column */}
                <div className="lg:col-span-6">
                    <div className="bg-white rounded-xl border border-gray-200 p-4 h-full">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-[#1A2B5A]">Doanh thu chi nhánh</h2>
                            <div className="flex items-center gap-2">
                                <input
                                    type="date"
                                    className="h-8 px-2 rounded-md border border-gray-200 text-xs bg-white focus:ring-2 focus:ring-[#E8890C] focus:outline-none"
                                    defaultValue={fromDate}
                                    onChange={(e) => setFromDate(e.target.value)}
                                />
                                <span className="text-gray-400 text-xs">→</span>
                                <input
                                    type="date"
                                    className="h-8 px-2 rounded-md border border-gray-200 text-xs bg-white focus:ring-2 focus:ring-[#E8890C] focus:outline-none"
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

                                <div className="mt-6 space-y-0">
                                    {branchRevenue.map((item, i) => (
                                        <div key={i} className="flex justify-between items-center py-3 border-b border-gray-100 last:border-0">
                                            <span className="text-sm font-medium text-gray-700">{item.name}</span>
                                            <div className="flex items-center gap-4">
                                                <span className="text-sm font-bold text-[#1A2B5A]">{formatCurrency(item.value)}</span>
                                                <span className="text-xs text-green-500">~ 2.5%</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <div className="text-center py-16 text-gray-300">Chưa có dữ liệu doanh thu</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
