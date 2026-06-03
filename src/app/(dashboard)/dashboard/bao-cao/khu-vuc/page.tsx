'use client';
import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { ChevronDown, ChevronRight, Users, TrendingUp, Building2, BarChart3 } from 'lucide-react';
import api from '@/lib/api';
import PageHeader from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DataTable, Column } from '@/components/ui/data-table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency } from '@/lib/utils';
import dayjs from 'dayjs';

type Tab = 'teams' | 'branches' | 'company';

interface TeamReport {
    teamId: string; teamCode: string; teamName: string;
    leader: { id: string; employeeCode: string; fullName: string; roles: { code: string; name: string }[] } | null;
    kpi: number; estimatedRevenue: number; overdueCheckin: number; mismatched: number;
    staffCountDiff: number; finalEstimatedRevenue: number; progress: number | null;
    totalTransactions: number; totalStaff: number; competitionRevenue: number;
    yesterday: { estimatedRevenue: number; transactionCount: number };
}
interface BranchReport {
    branchId: string; branchCode: string; branchName: string;
    region: { id: string | null; name: string };
    estimatedRevenue: number; txCountDiff: number; badDebt: number;
    finalRevenue: number; kpi: number; completionRate: number | null;
}
interface RegionTotal { region: { id: string | null; name: string }; estimatedRevenue: number; finalRevenue: number; branchCount: number; }
interface CompanyReport {
    totalContracts: number;
    byDuration: { lessThan6Months: number; exactly6Months: number; between6And12Months: number; exactly12Months: number; moreThan12Months: number };
}
interface Region { id: string; name: string; }
interface Branch { id: string; name: string; }
interface Team { id: string; name: string; }

const DURATION_LABELS = [
    { key: 'lessThan6Months', label: '< 6 tháng', color: '#E8890C' },
    { key: 'exactly6Months', label: '6 tháng', color: '#1A2B5A' },
    { key: 'between6And12Months', label: '6 - 12 tháng', color: '#52c41a' },
    { key: 'exactly12Months', label: '12 tháng', color: '#1677ff' },
    { key: 'moreThan12Months', label: '> 12 tháng', color: '#722ed1' },
];

export default function KhuVucPage() {
    const [tab, setTab] = useState<Tab>('teams');
    const [teamsData, setTeamsData] = useState<TeamReport[]>([]);
    const [branchesData, setBranchesData] = useState<BranchReport[]>([]);
    const [regionTotals, setRegionTotals] = useState<RegionTotal[]>([]);
    const [companyData, setCompanyData] = useState<CompanyReport | null>(null);
    const [expandedTeam, setExpandedTeam] = useState<string | null>(null);
    const [memberData, setMemberData] = useState<Record<string, any[]>>({});
    const [loading, setLoading] = useState(false);

    const [regions, setRegions] = useState<Region[]>([]);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);
    const [fromDate, setFromDate] = useState(dayjs().startOf('month').format('YYYY-MM-DD'));
    const [toDate, setToDate] = useState(dayjs().endOf('month').format('YYYY-MM-DD'));
    const [regionFilter, setRegionFilter] = useState('');
    const [branchFilter, setBranchFilter] = useState('');
    const [teamFilter, setTeamFilter] = useState('');

    const params = { fromDate, toDate, regionId: regionFilter || undefined, branchId: branchFilter || undefined, teamId: teamFilter || undefined };

    const fetchTab = useCallback(async () => {
        setLoading(true);
        try {
            if (tab === 'teams') {
                const { data } = await api.get('/reports/regional/teams', { params });
                setTeamsData(Array.isArray(data) ? data : []);
            } else if (tab === 'branches') {
                const { data } = await api.get('/reports/regional/branches', { params });
                setBranchesData(data.data ?? []);
                setRegionTotals(data.regionTotals ?? []);
            } else {
                const { data } = await api.get('/reports/regional/company', { params: { fromDate, toDate } });
                setCompanyData(data);
            }
        } catch { toast.error('Không thể tải báo cáo khu vực'); }
        finally { setLoading(false); }
    }, [tab, fromDate, toDate, regionFilter, branchFilter, teamFilter]);

    useEffect(() => { fetchTab(); }, [fetchTab]);
    useEffect(() => {
        api.get('/regions', { params: { limit: 100 } }).then(({ data }) => setRegions(data.data)).catch(() => {});
        api.get('/branches', { params: { limit: 100 } }).then(({ data }) => setBranches(data.data)).catch(() => {});
        api.get('/teams', { params: { limit: 100 } }).then(({ data }) => setTeams(data.data)).catch(() => {});
    }, []);

    const loadMembers = async (teamId: string) => {
        if (memberData[teamId]) { setExpandedTeam(expandedTeam === teamId ? null : teamId); return; }
        try {
            const { data } = await api.get(`/reports/regional/teams/${teamId}/members`, { params: { fromDate, toDate } });
            setMemberData(prev => ({ ...prev, [teamId]: data }));
            setExpandedTeam(teamId);
        } catch { toast.error('Không thể tải danh sách nhân sự'); }
    };

    const progressColor = (pct: number | null) => {
        if (pct === null) return 'text-gray-400';
        if (pct >= 80) return 'text-green-600';
        if (pct >= 60) return 'text-yellow-600';
        return 'text-red-500';
    };

    const teamColumns: Column<TeamReport>[] = [
        {
            key: 'expand', title: '', width: 40, align: 'center',
            render: (_, r) => (
                <button onClick={() => loadMembers(r.teamId)} className="p-1 rounded hover:bg-gray-100 text-gray-400">
                    {expandedTeam === r.teamId ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </button>
            ),
        },
        { key: 'teamCode', title: 'Mã Team', width: 100, render: (_, r) => <Badge variant="outline">{r.teamCode}</Badge> },
        {
            key: 'leader', title: 'Leader', width: 180,
            render: (_, r) => r.leader ? (
                <div><p className="font-medium text-[#1A2B5A]">{r.leader.fullName}</p>
                    <p className="text-xs text-gray-400">{r.leader.employeeCode}</p></div>
            ) : <span className="text-gray-400">—</span>,
        },
        { key: 'kpi', title: 'KPI', width: 140, align: 'right', render: (_, r) => r.kpi > 0 ? <span className="text-[#1A2B5A] font-medium">{formatCurrency(r.kpi)}</span> : <span className="text-gray-400">Chưa có</span> },
        { key: 'estimatedRevenue', title: 'DT ước tính', width: 150, align: 'right', render: (_, r) => <span className="font-medium text-[#E8890C]">{formatCurrency(r.estimatedRevenue)}</span> },
        { key: 'overdueCheckin', title: 'Quá hạn', width: 130, align: 'right', render: (_, r) => r.overdueCheckin > 0 ? <span className="text-red-500">{formatCurrency(r.overdueCheckin)}</span> : <span className="text-gray-300">0đ</span> },
        { key: 'mismatched', title: 'Không khớp', width: 130, align: 'right', render: (_, r) => r.mismatched > 0 ? <span className="text-orange-500">{formatCurrency(r.mismatched)}</span> : <span className="text-gray-300">0đ</span> },
        { key: 'finalEstimatedRevenue', title: 'DT cuối cùng', width: 150, align: 'right', render: (_, r) => <span className="font-bold text-[#1A2B5A]">{formatCurrency(r.finalEstimatedRevenue)}</span> },
        {
            key: 'progress', title: 'Tiến độ', width: 100, align: 'center',
            render: (_, r) => r.progress !== null ? (
                <div className="space-y-1">
                    <span className={`font-bold text-sm ${progressColor(r.progress)}`}>{r.progress.toFixed(1)}%</span>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden w-full">
                        <div className="h-full rounded-full bg-[#E8890C] transition-all" style={{ width: `${Math.min(r.progress, 100)}%` }} />
                    </div>
                </div>
            ) : <span className="text-gray-400">—</span>,
        },
        { key: 'totalTransactions', title: 'Số GD', width: 80, align: 'center', render: (_, r) => <span className="font-medium">{r.totalTransactions}</span> },
        { key: 'totalStaff', title: 'Nhân sự', width: 80, align: 'center', render: (_, r) => <span className="font-medium">{r.totalStaff}</span> },
        {
            key: 'yesterday', title: 'Hôm qua', width: 150, align: 'right',
            render: (_, r) => (
                <div className="text-xs">
                    <p className="font-medium text-[#E8890C]">{formatCurrency(r.yesterday.estimatedRevenue)}</p>
                    <p className="text-gray-400">{r.yesterday.transactionCount} GD</p>
                </div>
            ),
        },
    ];

    const branchColumns: Column<BranchReport>[] = [
        { key: 'region', title: 'Khu vực', width: 150, render: (_, r) => r.region.name },
        { key: 'code', title: 'Mã CN', width: 100, render: (_, r) => <Badge variant="default">{r.branchCode}</Badge> },
        { key: 'name', title: 'Chi nhánh', render: (_, r) => <span className="font-medium text-[#1A2B5A]">{r.branchName}</span> },
        { key: 'estimatedRevenue', title: 'DT ước tính', width: 150, align: 'right', render: (_, r) => <span className="font-medium text-[#E8890C]">{formatCurrency(r.estimatedRevenue)}</span> },
        { key: 'txCountDiff', title: 'Số GD', width: 80, align: 'center', render: (_, r) => r.txCountDiff },
        { key: 'badDebt', title: 'Nợ xấu', width: 130, align: 'right', render: (_, r) => r.badDebt > 0 ? <span className="text-red-500">{formatCurrency(r.badDebt)}</span> : <span className="text-gray-300">0đ</span> },
        { key: 'finalRevenue', title: 'DT cuối', width: 150, align: 'right', render: (_, r) => <span className="font-bold text-[#1A2B5A]">{formatCurrency(r.finalRevenue)}</span> },
        { key: 'kpi', title: 'KPI', width: 130, align: 'right', render: (_, r) => r.kpi > 0 ? formatCurrency(r.kpi) : <span className="text-gray-400">—</span> },
        {
            key: 'completionRate', title: 'Tỉ lệ HT', width: 100, align: 'center',
            render: (_, r) => r.completionRate !== null
                ? <span className={`font-bold ${progressColor(r.completionRate)}`}>{r.completionRate.toFixed(1)}%</span>
                : <span className="text-gray-400">—</span>,
        },
    ];

    const memberColumns: Column<any>[] = [
        { key: 'stt', title: 'STT', width: 50, align: 'center', dataIndex: 'stt' },
        { key: 'fullName', title: 'Họ tên', render: (_, r) => <span className="font-medium">{r.fullName}</span> },
        { key: 'employeeCode', title: 'Mã NV', width: 110, render: (_, r) => <Badge variant="outline">{r.employeeCode}</Badge> },
        { key: 'roles', title: 'Vai trò', width: 120, render: (_, r) => r.roles?.map((role: any) => role.code).join(', ') || '—' },
        { key: 'eliteTitle', title: 'Danh hiệu', width: 120, align: 'center', render: (_, r) => r.eliteTitle ? <Badge variant={r.eliteTitle === 'TINH_ANH' ? 'navy' : 'default'}>{r.eliteTitle === 'TINH_ANH' ? '⭐ Tinh Anh' : '✨ Tinh Hoa'}</Badge> : <span className="text-gray-300">—</span> },
        { key: 'transactionCount', title: 'Số GD', width: 80, align: 'center', dataIndex: 'transactionCount' },
        { key: 'estimatedRevenue', title: 'DT ước tính', width: 150, align: 'right', render: (_, r) => <span className="text-[#E8890C] font-medium">{formatCurrency(r.estimatedRevenue)}</span> },
        { key: 'revenueDiff', title: 'Chênh lệch', width: 130, align: 'right', render: (_, r) => <span className={r.revenueDiff > 0 ? 'text-orange-500' : 'text-green-600'}>{formatCurrency(r.revenueDiff)}</span> },
        { key: 'successRevenue', title: 'GD Thành công', width: 150, align: 'right', render: (_, r) => <span className="font-bold text-green-600">{formatCurrency(r.successRevenue)}</span> },
    ];

    const TABS = [
        { key: 'teams', label: 'Danh sách Team', icon: <Users className="h-4 w-4" /> },
        { key: 'branches', label: 'Danh sách Chi nhánh', icon: <Building2 className="h-4 w-4" /> },
        { key: 'company', label: 'Tổng Công ty', icon: <BarChart3 className="h-4 w-4" /> },
    ];

    return (
        <>
            <PageHeader title="Báo cáo / Khu vực" description="Tổng quan hiệu suất theo team, chi nhánh và toàn công ty" />

            {/* Filters */}
            <Card className="mb-4">
                <CardContent className="p-4 flex flex-wrap items-center gap-3">
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

            {/* Tabs */}
            <div className="flex gap-1 mb-4 bg-white rounded-lg border border-gray-200 p-1 w-fit">
                {TABS.map(t => (
                    <button key={t.key} onClick={() => setTab(t.key as Tab)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === t.key ? 'bg-[#E8890C] text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'}`}>
                        {t.icon}{t.label}
                    </button>
                ))}
            </div>

            {loading && <div className="flex justify-center py-12"><div className="h-8 w-8 rounded-full border-2 border-[#E8890C] border-t-transparent animate-spin" /></div>}

            {!loading && tab === 'teams' && (
                <Card>
                    <CardContent className="p-0">
                        <DataTable columns={teamColumns} data={teamsData} rowKey="teamId" pageSize={20}
                            emptyText="Không có dữ liệu team trong kỳ này" />
                        {/* Member rows */}
                        {teamsData.map(team => expandedTeam === team.teamId && memberData[team.teamId] && (
                            <div key={`members-${team.teamId}`} className="border-t border-dashed border-orange-200 bg-orange-50/30 px-6 py-4">
                                <p className="text-sm font-semibold text-[#1A2B5A] mb-3 flex items-center gap-2">
                                    <Users className="h-4 w-4 text-[#E8890C]" /> Nhân sự Team {team.teamCode}
                                </p>
                                <DataTable columns={memberColumns} data={memberData[team.teamId]} rowKey="id" pageSize={10} />
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}

            {!loading && tab === 'branches' && (
                <div className="space-y-4">
                    <Card>
                        <CardContent className="p-0">
                            <DataTable columns={branchColumns} data={branchesData} rowKey="branchId" pageSize={20} emptyText="Không có dữ liệu chi nhánh" />
                        </CardContent>
                    </Card>
                    {regionTotals.length > 0 && (
                        <Card>
                            <CardHeader><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4 text-[#E8890C]" /> Tổng theo Khu vực</CardTitle></CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {regionTotals.map((rt, i) => (
                                        <div key={i} className="p-4 rounded-lg border border-gray-200 bg-gray-50">
                                            <p className="font-semibold text-[#1A2B5A] mb-2">{rt.region.name}</p>
                                            <p className="text-sm text-gray-500">DT ước tính: <span className="font-bold text-[#E8890C]">{formatCurrency(rt.estimatedRevenue)}</span></p>
                                            <p className="text-sm text-gray-500">DT cuối: <span className="font-bold text-[#1A2B5A]">{formatCurrency(rt.finalRevenue)}</span></p>
                                            <p className="text-xs text-gray-400 mt-1">{rt.branchCount} chi nhánh</p>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            )}

            {!loading && tab === 'company' && companyData && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <Card>
                        <CardHeader><CardTitle className="text-base flex items-center gap-2"><BarChart3 className="h-4 w-4 text-[#E8890C]" /> Hợp đồng theo thời hạn</CardTitle></CardHeader>
                        <CardContent>
                            <p className="text-3xl font-bold text-[#1A2B5A] mb-5">{companyData.totalContracts} <span className="text-base font-normal text-gray-400">hợp đồng</span></p>
                            <div className="space-y-3">
                                {DURATION_LABELS.map(({ key, label, color }) => {
                                    const val = (companyData.byDuration as any)[key] ?? 0;
                                    const pct = companyData.totalContracts > 0 ? (val / companyData.totalContracts) * 100 : 0;
                                    return (
                                        <div key={key}>
                                            <div className="flex justify-between text-sm mb-1">
                                                <span className="text-gray-600">{label}</span>
                                                <span className="font-bold" style={{ color }}>{val} ({pct.toFixed(1)}%)</span>
                                            </div>
                                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                                <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader><CardTitle className="text-base">Phân bổ thời hạn HĐ</CardTitle></CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 gap-3">
                                {DURATION_LABELS.map(({ key, label, color }) => {
                                    const val = (companyData.byDuration as any)[key] ?? 0;
                                    return (
                                        <div key={key} className="flex items-center justify-between p-3 rounded-lg" style={{ background: `${color}15`, border: `1px solid ${color}30` }}>
                                            <div className="flex items-center gap-2">
                                                <div className="h-3 w-3 rounded-full" style={{ background: color }} />
                                                <span className="text-sm text-gray-700">{label}</span>
                                            </div>
                                            <span className="text-xl font-bold" style={{ color }}>{val}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </>
    );
}
