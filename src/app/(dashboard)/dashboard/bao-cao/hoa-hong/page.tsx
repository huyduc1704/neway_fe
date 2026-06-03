'use client';
import { useEffect, useState, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
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

type GroupBy = 'EMPLOYEE' | 'LEADER' | 'TEAM';

interface EmployeeInfo {
    id: string;
    employeeCode: string;
    user: { fullName: string };
    branch: { name: string } | null;
    team: { name: string } | null;
}

interface CommissionRow {
    employee?: EmployeeInfo;
    team?: { id: string | null; name: string } | null;
    totalCommission: number;
    recordCount: number;
}

interface Branch { id: string; name: string; }
interface Team { id: string; name: string; }
interface EmployeeOption { id: string; employeeCode: string; fullName: string; }

const formatCurrency = (v: number) => new Intl.NumberFormat('vi-VN').format(v) + 'đ';
const formatMillions = (v: number) => `${(v / 1_000_000).toFixed(0)}tr`;
const COLORS = ['#E8890C', '#F5B95A', '#C8720A', '#FAD99A', '#A0520A', '#FDECC8'];

const GROUP_OPTIONS = [
    { label: 'Nhân viên', value: 'EMPLOYEE' },
    { label: 'Leader', value: 'LEADER' },
    { label: 'Team', value: 'TEAM' },
];

const getRowName = (row: CommissionRow, groupBy: GroupBy): string => {
    if (groupBy === 'TEAM') return row.team?.name || 'N/A';
    return row.employee?.user?.fullName || 'N/A';
};

export default function BaoCaoHoaHongPage() {
    const [data, setData] = useState<CommissionRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [groupBy, setGroupBy] = useState<GroupBy>('EMPLOYEE');
    const [branches, setBranches] = useState<Branch[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);
    const [employees, setEmployees] = useState<EmployeeOption[]>([]);
    const [fromDate, setFromDate] = useState(dayjs().startOf('year').format('YYYY-MM-DD'));
    const [toDate, setToDate] = useState(dayjs().endOf('year').format('YYYY-MM-DD'));
    const [branchFilter, setBranchFilter] = useState<string>('');
    const [teamFilter, setTeamFilter] = useState<string>('');
    const [employeeFilter, setEmployeeFilter] = useState<string>('');

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const { data: res } = await api.get('/reports/commissions', {
                params: {
                    groupBy, fromDate, toDate,
                    branchId: branchFilter || undefined,
                    teamId: teamFilter || undefined,
                    employeeId: employeeFilter || undefined,
                },
            });
            setData(res);
        } catch {
            toast.error('Không thể tải báo cáo hoa hồng');
        } finally {
            setLoading(false);
        }
    }, [groupBy, fromDate, toDate, branchFilter, teamFilter, employeeFilter]);

    useEffect(() => { fetchData(); }, [fetchData]);

    useEffect(() => {
        api.get('/branches', { params: { limit: 100 } }).then(({ data }) => setBranches(data.data)).catch(() => {});
        api.get('/teams', { params: { limit: 100 } }).then(({ data }) => setTeams(data.data)).catch(() => {});
        api.get('/employees', { params: { limit: 200 } }).then(({ data }) => {
            setEmployees(data.data.map((e: any) => ({
                id: e.employeeProfile?.id,
                employeeCode: e.employeeProfile?.employeeCode,
                fullName: e.fullName,
            })).filter((e: any) => e.id));
        }).catch(() => {});
    }, []);

    const totalCommission = data.reduce((s, r) => s + r.totalCommission, 0);
    const totalRecords = data.reduce((s, r) => s + r.recordCount, 0);
    const sorted = [...data].sort((a, b) => b.totalCommission - a.totalCommission);
    const barData = sorted.slice(0, 10).map((r) => ({ name: getRowName(r, groupBy), value: r.totalCommission }));

    const nameColumn: Column<CommissionRow> = groupBy === 'TEAM'
        ? { key: 'team', title: 'Team', render: (_, r) => <span className="font-medium">{r.team?.name || 'N/A'}</span> }
        : {
            key: 'employee', title: 'Nhân viên',
            render: (_, r) => (
                <div>
                    <div className="font-medium">{r.employee?.user?.fullName || 'N/A'}</div>
                    <div className="text-xs text-gray-400">{r.employee?.employeeCode}</div>
                </div>
            ),
        };

    const branchTeamColumns: Column<CommissionRow>[] = groupBy !== 'TEAM' ? [
        { key: 'branch', title: 'Chi nhánh', width: 150, render: (_, r) => r.employee?.branch?.name || '—' },
        { key: 'empTeam', title: 'Team', width: 130, render: (_, r) => r.employee?.team?.name || '—' },
    ] : [];

    const columns: Column<CommissionRow>[] = [
        { key: 'stt', title: 'STT', width: 60, align: 'center', render: (_, __, i) => i + 1 },
        nameColumn,
        ...branchTeamColumns,
        {
            key: 'recordCount', title: 'Số bản ghi', width: 120, align: 'center',
            dataIndex: 'recordCount',
            render: (v) => <Badge variant="secondary">{v}</Badge>,
        },
        {
            key: 'totalCommission', title: 'Tổng hoa hồng', width: 200, align: 'right',
            render: (_, r) => <span className="font-semibold text-[#E8890C]">{formatCurrency(r.totalCommission)}</span>,
        },
        {
            key: 'pct', title: '% Tổng', width: 100, align: 'center',
            render: (_, r) => totalCommission > 0 ? `${((r.totalCommission / totalCommission) * 100).toFixed(1)}%` : '—',
        },
    ];

    const colSpan = groupBy !== 'TEAM' ? 4 : 2;
    const summaryRow = data.length > 0 ? (
        <>
            <td colSpan={colSpan} className="px-4 py-2"><strong>Tổng cộng</strong></td>
            <td className="px-4 py-2 text-center"><strong>{totalRecords}</strong></td>
            <td className="px-4 py-2 text-right"><strong className="text-[#E8890C]">{formatCurrency(totalCommission)}</strong></td>
            <td className="px-4 py-2 text-center"><strong>100%</strong></td>
        </>
    ) : undefined;

    return (
        <>
            <PageHeader title="Báo cáo / Hoa hồng" actions={
                <Button variant="outline" size="sm" onClick={async () => {
                    try {
                        await downloadExport('/reports/commissions/export', { groupBy, fromDate, toDate, branchId: branchFilter || undefined, teamId: teamFilter || undefined }, 'bao-cao-hoa-hong');
                    } catch { toast.error('Xuất file thất bại'); }
                }}>
                    <Download className="h-4 w-4" /> Xuất Excel
                </Button>
            } />

            {/* Filters */}
            <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex rounded-md border border-gray-200 overflow-hidden">
                        {GROUP_OPTIONS.map((opt) => (
                            <button
                                key={opt.value}
                                onClick={() => { setGroupBy(opt.value as GroupBy); setEmployeeFilter(''); }}
                                className={`px-4 py-1.5 text-sm font-medium transition-colors ${
                                    groupBy === opt.value ? 'bg-[#E8890C] text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
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
                            <SelectTrigger className="w-40"><SelectValue placeholder="Chi nhánh" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="">Tất cả</SelectItem>
                                {branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                            </SelectContent>
                        </Select>

                        <Select value={teamFilter} onValueChange={setTeamFilter}>
                            <SelectTrigger className="w-36"><SelectValue placeholder="Team" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="">Tất cả</SelectItem>
                                {teams.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                            </SelectContent>
                        </Select>

                        {groupBy !== 'TEAM' && (
                            <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
                                <SelectTrigger className="w-48"><SelectValue placeholder="Nhân viên" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="">Tất cả</SelectItem>
                                    {employees.map((e) => <SelectItem key={e.id} value={e.id}>{e.fullName} ({e.employeeCode})</SelectItem>)}
                                </SelectContent>
                            </Select>
                        )}
                    </div>
                </div>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                    <div className="text-xs text-gray-400 mb-1">Tổng hoa hồng</div>
                    <div className="text-2xl font-bold text-[#E8890C]">{formatCurrency(totalCommission)}</div>
                </div>
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                    <div className="text-xs text-gray-400 mb-1">Số {GROUP_OPTIONS.find((g) => g.value === groupBy)?.label}</div>
                    <div className="text-2xl font-bold text-[#1A2B5A]">{data.length}</div>
                </div>
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                    <div className="text-xs text-gray-400 mb-1">Số bản ghi hoa hồng</div>
                    <div className="text-2xl font-bold text-green-500">{totalRecords}</div>
                </div>
            </div>

            {/* Chart */}
            {barData.length > 0 && (
                <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
                    <h3 className="text-sm font-semibold text-[#1A2B5A] mb-3">
                        Top {Math.min(barData.length, 10)} hoa hồng cao nhất — theo {GROUP_OPTIONS.find((g) => g.value === groupBy)?.label}
                    </h3>
                    <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={barData} margin={{ top: 8, right: 32, left: 8, bottom: 8 }}>
                            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                            <YAxis tick={{ fontSize: 11 }} tickFormatter={formatMillions} />
                            <Tooltip formatter={(v) => [formatCurrency(Number(v)), 'Hoa hồng']} />
                            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                {barData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}

            {/* Table */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
                <DataTable
                    columns={columns}
                    data={sorted}
                    rowKey={(r) => r.employee?.id ?? r.team?.id ?? 'no-group'}
                    loading={loading}
                    pageSize={20}
                    summary={summaryRow}
                />
            </div>
        </>
    );
}
