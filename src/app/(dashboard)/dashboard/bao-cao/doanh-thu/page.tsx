'use client';
import { useEffect, useState, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';
import { toast } from 'sonner';
import { Download } from 'lucide-react';
import api from '@/lib/api';
import { downloadExport } from '@/lib/export';
import PageHeader from '@/components/common/PageHeader';
import { DataTable, Column } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
    const [fromDate, setFromDate] = useState(dayjs().startOf('year').format('YYYY-MM-DD'));
    const [toDate, setToDate] = useState(dayjs().endOf('year').format('YYYY-MM-DD'));
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
            toast.error('Không thể tải báo cáo doanh thu');
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

    const columns: Column<RevenueRow>[] = [
        {
            key: 'stt', title: 'STT', width: 60, align: 'center',
            render: (_, __, i) => i + 1,
        },
        {
            key: 'group', title: groupBy === 'PROJECT' ? 'Mã dự án' : groupBy === 'BRANCH' ? 'Chi nhánh' : 'Team',
            render: (_, r) => {
                const name = getGroupName(r, groupBy);
                const sub = getGroupSub(r, groupBy);
                return (
                    <div>
                        <div className="font-medium">
                            {groupBy === 'PROJECT'
                                ? <Badge variant="warning">{name}</Badge>
                                : name}
                        </div>
                        {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
                    </div>
                );
            },
        },
        {
            key: 'transactionCount', title: 'Số GD thành công', width: 160, align: 'center',
            dataIndex: 'transactionCount',
            render: (v) => <Badge variant="secondary">{v}</Badge>,
        },
        {
            key: 'totalRevenue', title: 'Doanh thu', width: 200, align: 'right',
            render: (_, r) => (
                <span className="font-semibold text-[#E8890C]">{formatCurrency(r.totalRevenue)}</span>
            ),
        },
        {
            key: 'pct', title: '% Tổng', width: 100, align: 'center',
            render: (_, r) => totalRevenue > 0
                ? `${((r.totalRevenue / totalRevenue) * 100).toFixed(1)}%`
                : '—',
        },
    ];

    const summaryRow = data.length > 0 ? (
        <>
            <td colSpan={2} className="px-4 py-2"><strong>Tổng cộng</strong></td>
            <td className="px-4 py-2 text-center"><strong>{totalTransactions}</strong></td>
            <td className="px-4 py-2 text-right"><strong className="text-[#E8890C]">{formatCurrency(totalRevenue)}</strong></td>
            <td className="px-4 py-2 text-center"><strong>100%</strong></td>
        </>
    ) : undefined;

    return (
        <>
            <PageHeader title="Báo cáo / Doanh thu" actions={
                <Button variant="outline" size="sm" onClick={async () => {
                    try {
                        await downloadExport('/reports/revenue/export', { groupBy, fromDate, toDate, branchId: branchFilter || undefined, teamId: teamFilter || undefined }, 'bao-cao-doanh-thu');
                    } catch { toast.error('Xuất file thất bại'); }
                }}>
                    <Download className="h-4 w-4" /> Xuất Excel
                </Button>
            } />

            {/* Filters */}
            <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    {/* Group by tabs */}
                    <div className="flex rounded-md border border-gray-200 overflow-hidden">
                        {GROUP_OPTIONS.map((opt) => (
                            <button
                                key={opt.value}
                                onClick={() => setGroupBy(opt.value as GroupBy)}
                                className={`px-4 py-1.5 text-sm font-medium transition-colors ${
                                    groupBy === opt.value
                                        ? 'bg-[#E8890C] text-white'
                                        : 'bg-white text-gray-600 hover:bg-gray-50'
                                }`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <input type="date" className="h-9 px-3 rounded-md border border-gray-200 text-sm bg-white focus:ring-2 focus:ring-[#E8890C] focus:outline-none" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
                        <span className="text-gray-400">→</span>
                        <input type="date" className="h-9 px-3 rounded-md border border-gray-200 text-sm bg-white focus:ring-2 focus:ring-[#E8890C] focus:outline-none" value={toDate} onChange={(e) => setToDate(e.target.value)} />

                        <Select value={branchFilter} onValueChange={setBranchFilter}>
                            <SelectTrigger className="w-44"><SelectValue placeholder="Chi nhánh" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="">Tất cả chi nhánh</SelectItem>
                                {branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                            </SelectContent>
                        </Select>

                        <Select value={teamFilter} onValueChange={setTeamFilter}>
                            <SelectTrigger className="w-40"><SelectValue placeholder="Team" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="">Tất cả team</SelectItem>
                                {teams.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                    <div className="text-xs text-gray-400 mb-1">Tổng doanh thu</div>
                    <div className="text-2xl font-bold text-[#E8890C]">{formatCurrency(totalRevenue)}</div>
                </div>
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                    <div className="text-xs text-gray-400 mb-1">Số {GROUP_OPTIONS.find((g) => g.value === groupBy)?.label}</div>
                    <div className="text-2xl font-bold text-[#1A2B5A]">{data.length}</div>
                </div>
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                    <div className="text-xs text-gray-400 mb-1">Tổng GD thành công</div>
                    <div className="text-2xl font-bold text-green-500">{totalTransactions}</div>
                </div>
            </div>

            {/* Charts */}
            {data.length > 0 && (
                <div className="grid grid-cols-12 gap-4 mb-4">
                    <div className="col-span-8 bg-white rounded-lg border border-gray-200 p-4">
                        <h3 className="text-sm font-semibold text-[#1A2B5A] mb-3">
                            Doanh thu theo {GROUP_OPTIONS.find((g) => g.value === groupBy)?.label}
                        </h3>
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
                    </div>
                    <div className="col-span-4 bg-white rounded-lg border border-gray-200 p-4">
                        <h3 className="text-sm font-semibold text-[#1A2B5A] mb-3">Tỷ trọng doanh thu</h3>
                        <ResponsiveContainer width="100%" height={260}>
                            <PieChart>
                                <Pie data={pieData} cx="50%" cy="45%" innerRadius={55} outerRadius={90} dataKey="value"
                                    label={({ percent }) => `${((percent ?? 0) * 100).toFixed(0)}%`} labelLine={false}>
                                    {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                </Pie>
                                <Legend formatter={(v) => <span className="text-xs">{v}</span>} />
                                <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* Table */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
                <DataTable
                    columns={columns}
                    data={sorted}
                    rowKey={(r) => r.group?.id ?? r.group?.code ?? 'no-group'}
                    loading={loading}
                    pageSize={20}
                    summary={summaryRow}
                />
            </div>
        </>
    );
}
