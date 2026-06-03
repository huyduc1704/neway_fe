'use client';
import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Trophy, TrendingUp, Users, Star } from 'lucide-react';
import api from '@/lib/api';
import PageHeader from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DataTable, Column } from '@/components/ui/data-table';
import { formatCurrency } from '@/lib/utils';
import dayjs from 'dayjs';

interface AwardsData {
    top3ByRevenue: { rank: number; employeeCode: string; fullName: string; eligibleRevenue: number }[];
    top1ByCount: { rank: number; employeeCode: string; fullName: string; eligibleCount: number } | null;
    eliteSummary: { stt: number; employeeCode: string; fullName: string; title: 'TINH_ANH' | 'TINH_HOA' }[];
    top1Team: { rank: number; teamCode: string; leaderCode: string; leaderName: string; eligibleRevenue: number } | null;
    employeeScores: { stt: number; employeeCode: string; teamCode: string; score: number }[];
}

interface Branch { id: string; name: string; }
interface Team { id: string; name: string; }

const RANK_STYLE = ['bg-yellow-400', 'bg-gray-300', 'bg-amber-600'];
const RANK_LABEL = ['🥇', '🥈', '🥉'];

export default function GiaiThuongPage() {
    const [awards, setAwards] = useState<AwardsData | null>(null);
    const [loading, setLoading] = useState(false);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);
    const [fromDate, setFromDate] = useState(dayjs().startOf('month').format('YYYY-MM-DD'));
    const [toDate, setToDate] = useState(dayjs().endOf('month').format('YYYY-MM-DD'));
    const [branchFilter, setBranchFilter] = useState('');
    const [teamFilter, setTeamFilter] = useState('');

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/reports/awards', {
                params: { fromDate, toDate, branchId: branchFilter || undefined, teamId: teamFilter || undefined },
            });
            setAwards(data);
        } catch { toast.error('Không thể tải dữ liệu giải thưởng'); }
        finally { setLoading(false); }
    }, [fromDate, toDate, branchFilter, teamFilter]);

    useEffect(() => { fetchData(); }, [fetchData]);
    useEffect(() => {
        api.get('/branches', { params: { limit: 100 } }).then(({ data }) => setBranches(data.data)).catch(() => {});
        api.get('/teams', { params: { limit: 100 } }).then(({ data }) => setTeams(data.data)).catch(() => {});
    }, []);

    const eliteColumns: Column<AwardsData['eliteSummary'][0]>[] = [
        { key: 'stt', title: 'STT', width: 60, align: 'center', dataIndex: 'stt' },
        { key: 'employeeCode', title: 'Mã NV', width: 120, render: (_, r) => <Badge variant="outline">{r.employeeCode}</Badge> },
        { key: 'fullName', title: 'Họ tên', render: (_, r) => <span className="font-medium">{r.fullName}</span> },
        {
            key: 'title', title: 'Danh hiệu', width: 130, align: 'center',
            render: (_, r) => (
                <Badge variant={r.title === 'TINH_ANH' ? 'navy' : 'default'}>
                    {r.title === 'TINH_ANH' ? '⭐ Tinh Anh' : '✨ Tinh Hoa'}
                </Badge>
            ),
        },
    ];

    const scoreColumns: Column<AwardsData['employeeScores'][0]>[] = [
        { key: 'stt', title: 'STT', width: 60, align: 'center', dataIndex: 'stt' },
        { key: 'employeeCode', title: 'Mã NV', width: 130, render: (_, r) => <Badge variant="outline">{r.employeeCode}</Badge> },
        { key: 'teamCode', title: 'Team', width: 120, render: (_, r) => r.teamCode ?? <span className="text-gray-400">—</span> },
        {
            key: 'score', title: 'Điểm', width: 100, align: 'center',
            render: (_, r) => <span className="font-bold text-[#E8890C] text-lg">{r.score}</span>,
        },
    ];

    return (
        <>
            <PageHeader title="Báo cáo / Giải thưởng" description="Top cá nhân xuất sắc, Tinh Hoa / Tinh Anh, điểm nhân sự" />

            {/* Filters */}
            <Card className="mb-5">
                <CardContent className="p-4 flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">Từ</span>
                        <input type="date" className="h-9 px-3 rounded-md border border-gray-200 text-sm bg-white focus:ring-2 focus:ring-[#E8890C] focus:outline-none"
                            value={fromDate} onChange={e => setFromDate(e.target.value)} />
                        <span className="text-sm text-gray-500">đến</span>
                        <input type="date" className="h-9 px-3 rounded-md border border-gray-200 text-sm bg-white focus:ring-2 focus:ring-[#E8890C] focus:outline-none"
                            value={toDate} onChange={e => setToDate(e.target.value)} />
                    </div>
                    <Select value={branchFilter} onValueChange={v => setBranchFilter(v === '__all__' ? '' : v)}>
                        <SelectTrigger className="w-44"><SelectValue placeholder="Tất cả chi nhánh" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="__all__">Tất cả chi nhánh</SelectItem>
                            {branches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Select value={teamFilter} onValueChange={v => setTeamFilter(v === '__all__' ? '' : v)}>
                        <SelectTrigger className="w-40"><SelectValue placeholder="Tất cả team" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="__all__">Tất cả team</SelectItem>
                            {teams.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </CardContent>
            </Card>

            {loading && <div className="flex justify-center py-12"><div className="h-8 w-8 rounded-full border-2 border-[#E8890C] border-t-transparent animate-spin" /></div>}

            {awards && !loading && (
                <div className="space-y-5">
                    {/* Top 3 cá nhân doanh thu + Top 1 giao dịch */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        {awards.top3ByRevenue.map((p, i) => (
                            <Card key={p.employeeCode} className={i === 0 ? 'border-yellow-400 border-2' : ''}>
                                <CardContent className="p-5">
                                    <div className="flex items-start justify-between mb-3">
                                        <span className="text-3xl">{RANK_LABEL[i]}</span>
                                        <div className={`h-7 w-7 rounded-full flex items-center justify-center text-white text-xs font-bold ${RANK_STYLE[i]}`}>
                                            {p.rank}
                                        </div>
                                    </div>
                                    <p className="font-bold text-[#1A2B5A] text-base leading-tight">{p.fullName}</p>
                                    <p className="text-gray-400 text-xs mb-2">{p.employeeCode}</p>
                                    <div className="flex items-center gap-1.5">
                                        <TrendingUp className="h-4 w-4 text-[#E8890C]" />
                                        <span className="font-bold text-[#E8890C]">{formatCurrency(p.eligibleRevenue)}</span>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* Top 1 team */}
                        {awards.top1Team && (
                            <Card className="border-[#1A2B5A] border-2">
                                <CardHeader className="pb-3">
                                    <CardTitle className="flex items-center gap-2 text-base">
                                        <Trophy className="h-5 w-5 text-[#E8890C]" /> Top 1 Team xuất sắc
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex items-center gap-4">
                                        <div className="h-14 w-14 rounded-full bg-[#1A2B5A] flex items-center justify-center text-white text-2xl font-bold">
                                            🏆
                                        </div>
                                        <div>
                                            <p className="text-lg font-bold text-[#1A2B5A]">{awards.top1Team.teamCode}</p>
                                            <p className="text-sm text-gray-500">Leader: {awards.top1Team.leaderName} ({awards.top1Team.leaderCode})</p>
                                            <p className="font-bold text-[#E8890C] mt-1">{formatCurrency(awards.top1Team.eligibleRevenue)}</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Top 1 số GD */}
                        {awards.top1ByCount && (
                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="flex items-center gap-2 text-base">
                                        <Star className="h-5 w-5 text-[#E8890C]" /> Top 1 Số giao dịch
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex items-center gap-4">
                                        <div className="h-14 w-14 rounded-full bg-[#E8890C] flex items-center justify-center text-white text-2xl">⚡</div>
                                        <div>
                                            <p className="text-lg font-bold text-[#1A2B5A]">{awards.top1ByCount.fullName}</p>
                                            <p className="text-sm text-gray-500">{awards.top1ByCount.employeeCode}</p>
                                            <p className="font-bold text-[#E8890C] mt-1">{awards.top1ByCount.eligibleCount} giao dịch</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    {/* Tinh Hoa / Tinh Anh */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                                <Users className="h-5 w-5 text-[#E8890C]" />
                                Tổng hợp Tinh Hoa / Tinh Anh
                                {awards.eliteSummary.length > 0 && (
                                    <Badge className="ml-2">{awards.eliteSummary.length} người</Badge>
                                )}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <DataTable columns={eliteColumns} data={awards.eliteSummary} rowKey="employeeCode"
                                emptyText="Chưa có nhân sự đạt danh hiệu trong kỳ này" />
                        </CardContent>
                    </Card>

                    {/* Điểm nhân sự */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                                <Star className="h-5 w-5 text-[#E8890C]" /> Điểm nhân sự
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <DataTable columns={scoreColumns} data={awards.employeeScores} rowKey="employeeCode"
                                emptyText="Chưa có dữ liệu điểm nhân sự" pageSize={10} />
                        </CardContent>
                    </Card>
                </div>
            )}
        </>
    );
}
