'use client';
import { useEffect, useState, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts';
import { toast } from 'sonner';
import api from '@/lib/api';
import PageHeader from '@/components/common/PageHeader';
import { DataTable, Column } from '@/components/ui/data-table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import dayjs from 'dayjs';

type GroupBy = 'BRANCH' | 'REGION';

const LEAD_SOURCE_LABEL: Record<string, string> = {
    FACEBOOK: 'Facebook', TIKTOK: 'TikTok', THREADS: 'Threads',
    CHO_TOT: 'Chợ Tốt', BDS: 'BDS', WALK_IN: 'Walk-in',
    REFERRAL: 'Giới thiệu', ZALO: 'Zalo', OTHER: 'Khác',
};

const SOURCE_KEYS = ['FACEBOOK', 'TIKTOK', 'ZALO', 'THREADS', 'CHO_TOT', 'BDS', 'WALK_IN', 'REFERRAL', 'OTHER'];
const COLORS = ['#E8890C', '#1A2B5A', '#52c41a', '#1677ff', '#722ed1', '#fa8c16', '#13c2c2', '#eb2f96', '#8c8c8c'];

interface SourceRow {
    branch?: { id: string; code: string; name: string };
    region?: { id: string; name: string };
    sources: Record<string, number>;
    total: number;
}
interface GrandTotal { sources: Record<string, number>; total: number; }
interface Region { id: string; name: string; }
interface Branch { id: string; name: string; }

export default function BaoCaoNguonKhachPage() {
    const [data, setData] = useState<SourceRow[]>([]);
    const [grandTotal, setGrandTotal] = useState<GrandTotal | null>(null);
    const [loading, setLoading] = useState(false);
    const [groupBy, setGroupBy] = useState<GroupBy>('BRANCH');
    const [regions, setRegions] = useState<Region[]>([]);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [fromDate, setFromDate] = useState(dayjs().startOf('year').format('YYYY-MM-DD'));
    const [toDate, setToDate] = useState(dayjs().endOf('year').format('YYYY-MM-DD'));
    const [regionFilter, setRegionFilter] = useState('');
    const [branchFilter, setBranchFilter] = useState('');

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const { data: res } = await api.get('/reports/customer-sources', {
                params: { groupBy, fromDate, toDate, regionId: regionFilter || undefined, branchId: branchFilter || undefined },
            });
            if (groupBy === 'BRANCH') {
                setData(res.data ?? []);
                setGrandTotal(res.grandTotal ?? null);
            } else {
                setData(Array.isArray(res) ? res : []);
                setGrandTotal(null);
            }
        } catch { toast.error('Không thể tải báo cáo nguồn khách'); }
        finally { setLoading(false); }
    }, [groupBy, fromDate, toDate, regionFilter, branchFilter]);

    useEffect(() => { fetchData(); }, [fetchData]);
    useEffect(() => {
        api.get('/regions', { params: { limit: 100 } }).then(({ data }) => setRegions(data.data)).catch(() => {});
        api.get('/branches', { params: { limit: 100 } }).then(({ data }) => setBranches(data.data)).catch(() => {});
    }, []);

    // Dữ liệu chart: top nguồn theo tổng
    const chartData = SOURCE_KEYS.map((key, i) => ({
        name: LEAD_SOURCE_LABEL[key],
        value: grandTotal?.sources[key] ?? data.reduce((s, r) => s + (r.sources[key] ?? 0), 0),
        fill: COLORS[i],
    })).filter(d => d.value > 0).sort((a, b) => b.value - a.value);

    const columns: Column<SourceRow>[] = [
        { key: 'stt', title: 'STT', width: 60, align: 'center', render: (_, __, i) => i + 1 },
        groupBy === 'BRANCH'
            ? {
                key: 'region', title: 'Khu vực', width: 150,
                render: (_, r) => r.region?.name ?? <span className="text-gray-400">—</span>,
            }
            : {
                key: 'region', title: 'Khu vực',
                render: (_, r) => <span className="font-medium text-[#1A2B5A]">{r.region?.name ?? '—'}</span>,
            },
        ...(groupBy === 'BRANCH' ? [{
            key: 'branch', title: 'Chi nhánh',
            render: (_: any, r: SourceRow) => r.branch ? (
                <span className="font-medium text-[#1A2B5A]">{r.branch.name}</span>
            ) : <span className="text-gray-400">—</span>,
        }] : []),
        ...SOURCE_KEYS.map((key, i) => ({
            key, title: LEAD_SOURCE_LABEL[key], width: 95, align: 'center' as const,
            render: (_: any, r: SourceRow) => {
                const val = r.sources[key] ?? 0;
                return val > 0
                    ? <span className="font-bold" style={{ color: COLORS[i] }}>{val}</span>
                    : <span className="text-gray-300">0</span>;
            },
        })),
        {
            key: 'total', title: 'Tổng', width: 80, align: 'center',
            render: (_, r) => <span className="font-bold text-[#E8890C]">{r.total}</span>,
        },
    ];

    return (
        <>
            <PageHeader title="Báo cáo / Nguồn khách" description="Thống kê khách hàng theo kênh tiếp thị" />

            {/* Filters */}
            <Card className="mb-4">
                <CardContent className="p-4 flex flex-wrap items-center gap-3">
                    <div className="flex rounded-md border border-gray-200 overflow-hidden">
                        {(['BRANCH', 'REGION'] as GroupBy[]).map(opt => (
                            <button key={opt} onClick={() => setGroupBy(opt)}
                                className={`px-4 py-2 text-sm font-medium transition-colors ${groupBy === opt ? 'bg-[#E8890C] text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
                                {opt === 'BRANCH' ? 'Chi nhánh' : 'Khu vực'}
                            </button>
                        ))}
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">Từ</span>
                        <input type="date" className="h-9 px-3 rounded-md border border-gray-200 text-sm bg-white focus:ring-2 focus:ring-[#E8890C] focus:outline-none"
                            value={fromDate} onChange={e => setFromDate(e.target.value)} />
                        <span className="text-sm text-gray-500">đến</span>
                        <input type="date" className="h-9 px-3 rounded-md border border-gray-200 text-sm bg-white focus:ring-2 focus:ring-[#E8890C] focus:outline-none"
                            value={toDate} onChange={e => setToDate(e.target.value)} />
                    </div>
                    <Select value={regionFilter} onValueChange={v => setRegionFilter(v === '__all__' ? '' : v)}>
                        <SelectTrigger className="w-44"><SelectValue placeholder="Tất cả khu vực" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="__all__">Tất cả khu vực</SelectItem>
                            {regions.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    {groupBy === 'BRANCH' && (
                        <Select value={branchFilter} onValueChange={v => setBranchFilter(v === '__all__' ? '' : v)}>
                            <SelectTrigger className="w-44"><SelectValue placeholder="Tất cả chi nhánh" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="__all__">Tất cả chi nhánh</SelectItem>
                                {branches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    )}
                </CardContent>
            </Card>

            {/* Chart */}
            {chartData.length > 0 && (
                <Card className="mb-4">
                    <CardHeader><CardTitle className="text-base">Phân bổ nguồn khách</CardTitle></CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={260}>
                            <BarChart data={chartData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                                <YAxis tick={{ fontSize: 12 }} />
                                <Tooltip formatter={(v) => [`${v} khách`, 'Số lượng']} />
                                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                    {chartData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            )}

            {/* Summary chips */}
            {grandTotal && (
                <div className="flex flex-wrap gap-3 mb-4">
                    {SOURCE_KEYS.filter(k => (grandTotal.sources[k] ?? 0) > 0).map((key, i) => (
                        <div key={key} className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 px-4 py-2">
                            <div className="h-2.5 w-2.5 rounded-full" style={{ background: COLORS[i] }} />
                            <span className="text-sm text-gray-600">{LEAD_SOURCE_LABEL[key]}:</span>
                            <span className="font-bold text-sm" style={{ color: COLORS[i] }}>{grandTotal.sources[key]}</span>
                        </div>
                    ))}
                    <div className="flex items-center gap-2 bg-orange-50 rounded-lg border border-orange-200 px-4 py-2">
                        <span className="text-sm text-gray-600">Tổng:</span>
                        <span className="font-bold text-[#E8890C]">{grandTotal.total}</span>
                    </div>
                </div>
            )}

            <Card>
                <CardContent className="p-0">
                    <DataTable columns={columns} data={data} rowKey={(r) => r.branch?.id ?? r.region?.id ?? Math.random().toString()} loading={loading} pageSize={20} />
                </CardContent>
            </Card>
        </>
    );
}
