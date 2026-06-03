'use client';
import { useEffect, useState, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { toast } from 'sonner';
import api from '@/lib/api';
import PageHeader from '@/components/common/PageHeader';
import { DataTable, Column } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import dayjs from 'dayjs';

type GroupBy = 'EMPLOYEE' | 'TEAM' | 'BRANCH';

interface EmployeeRow {
    employee: {
        id: string;
        employeeCode: string;
        fullName: string;
        roles: { code: string; name: string }[];
        branch: { name: string } | null;
        team: { name: string } | null;
    };
    totalRevenue: number;
    totalCommission: number;
    commissionByRole: Record<string, number>;
}

interface GroupRow {
    team?: { id: string; name: string } | null;
    branch?: { id: string; name: string } | null;
    totalRevenue: number;
    transactionCount: number;
    totalCommission: number;
}

type PayrollRow = EmployeeRow | GroupRow;

interface Branch { id: string; name: string; }
interface Team { id: string; name: string; }
interface EmployeeOption { id: string; employeeCode: string; fullName: string; }

const formatCurrency = (v: number) => new Intl.NumberFormat('vi-VN').format(v) + 'đ';
const formatMillions = (v: number) => `${(v / 1_000_000).toFixed(0)}tr`;
const COLORS = ['#E8890C', '#F5B95A', '#C8720A', '#FAD99A', '#A0520A', '#FDECC8'];

const GROUP_OPTIONS = [
    { label: 'Nhân viên', value: 'EMPLOYEE' },
    { label: 'Team', value: 'TEAM' },
    { label: 'Chi nhánh', value: 'BRANCH' },
];

const isEmployeeRow = (r: PayrollRow): r is EmployeeRow => 'employee' in r;

const getRowName = (r: PayrollRow, groupBy: GroupBy): string => {
    if (groupBy === 'EMPLOYEE' && isEmployeeRow(r)) return r.employee.fullName;
    const g = r as GroupRow;
    return (groupBy === 'TEAM' ? g.team?.name : g.branch?.name) || 'N/A';
};

export default function BaoCaoLuongPage() {
    const [data, setData] = useState<PayrollRow[]>([]);
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
            const { data: res } = await api.get('/reports/payroll', {
                params: {
                    groupBy, fromDate, toDate,
                    branchId: branchFilter || undefined,
                    teamId: teamFilter || undefined,
                    employeeId: groupBy === 'EMPLOYEE' ? (employeeFilter || undefined) : undefined,
                },
            });
            setData(res);
        } catch {
            toast.error('Không thể tải báo cáo lương & hoa hồng');
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

    const totalRevenue = data.reduce((s, r) => s + r.totalRevenue, 0);
    const totalCommission = data.reduce((s, r) => s + r.totalCommission, 0);
    const sorted = [...data].sort((a, b) => b.totalCommission - a.totalCommission);
    const barData = sorted.slice(0, 10).map((r) => ({
        name: getRowName(r, groupBy),
        commission: r.totalCommission,
        revenue: r.totalRevenue,
    }));

    const employeeColumns: Column<PayrollRow>[] = [
        { key: 'stt', title: 'STT', width: 60, align: 'center', render: (_, __, i) => i + 1 },
        {
            key: 'employee', title: 'Nhân viên',
            render: (_, r) => {
                if (!isEmployeeRow(r)) return '—';
                return (
                    <div>
                        <div className="font-medium">{r.employee.fullName}</div>
                        <div className="text-xs text-gray-400">{r.employee.employeeCode}</div>
                    </div>
                );
            },
        },
        {
            key: 'roles', title: 'Vai trò', width: 160,
            render: (_, r) => {
                if (!isEmployeeRow(r)) return '—';
                return (
                    <div className="flex flex-wrap gap-1">
                        {r.employee.roles.map((role) => (
                            <Badge key={role.code} variant="warning">{role.name}</Badge>
                        ))}
                    </div>
                );
            },
        },
        { key: 'branch', title: 'Chi nhánh', width: 150, render: (_, r) => isEmployeeRow(r) ? r.employee.branch?.name || '—' : '—' },
        { key: 'team', title: 'Team', width: 130, render: (_, r) => isEmployeeRow(r) ? r.employee.team?.name || '—' : '—' },
        {
            key: 'totalRevenue', title: 'DT đóng góp', width: 160, align: 'right',
            render: (_, r) => <span className="font-medium text-[#1A2B5A]">{formatCurrency(r.totalRevenue)}</span>,
        },
        {
            key: 'totalCommission', title: 'Hoa hồng', width: 160, align: 'right',
            render: (_, r) => <span className="font-semibold text-[#E8890C]">{formatCurrency(r.totalCommission)}</span>,
        },
        {
            key: 'pct', title: '% HH/DT', width: 100, align: 'center',
            render: (_, r) => r.totalRevenue > 0 ? `${((r.totalCommission / r.totalRevenue) * 100).toFixed(1)}%` : '—',
        },
    ];

    const groupColumns: Column<PayrollRow>[] = [
        { key: 'stt', title: 'STT', width: 60, align: 'center', render: (_, __, i) => i + 1 },
        {
            key: 'group', title: groupBy === 'TEAM' ? 'Team' : 'Chi nhánh',
            render: (_, r) => {
                const g = r as GroupRow;
                const name = (groupBy === 'TEAM' ? g.team?.name : g.branch?.name) || 'N/A';
                return <span className="font-medium">{name}</span>;
            },
        },
        {
            key: 'txCount', title: 'Số GD', width: 100, align: 'center',
            render: (_, r) => <Badge variant="secondary">{(r as GroupRow).transactionCount ?? 0}</Badge>,
        },
        {
            key: 'totalRevenue', title: 'Tổng doanh thu', width: 180, align: 'right',
            render: (_, r) => <span className="font-medium text-[#1A2B5A]">{formatCurrency(r.totalRevenue)}</span>,
        },
        {
            key: 'totalCommission', title: 'Tổng hoa hồng', width: 180, align: 'right',
            render: (_, r) => <span className="font-semibold text-[#E8890C]">{formatCurrency(r.totalCommission)}</span>,
        },
        {
            key: 'pct', title: '% HH/DT', width: 100, align: 'center',
            render: (_, r) => r.totalRevenue > 0 ? `${((r.totalCommission / r.totalRevenue) * 100).toFixed(1)}%` : '—',
        },
    ];

    const columns = groupBy === 'EMPLOYEE' ? employeeColumns : groupColumns;
    const summaryColSpan = groupBy === 'EMPLOYEE' ? 5 : 3;

    const rowKey = (r: PayrollRow) => {
        if (isEmployeeRow(r)) return r.employee.id;
        const g = r as GroupRow;
        return g.team?.id ?? g.branch?.id ?? 'no-group';
    };

    const summaryRow = data.length > 0 ? (
        <>
            <td colSpan={summaryColSpan} className="px-4 py-2"><strong>Tổng cộng</strong></td>
            <td className="px-4 py-2 text-right"><strong className="text-[#1A2B5A]">{formatCurrency(totalRevenue)}</strong></td>
            <td className="px-4 py-2 text-right"><strong className="text-[#E8890C]">{formatCurrency(totalCommission)}</strong></td>
            <td className="px-4 py-2 text-center">
                <strong>{totalRevenue > 0 ? `${((totalCommission / totalRevenue) * 100).toFixed(1)}%` : '—'}</strong>
            </td>
        </>
    ) : undefined;

    return (
        <>
            <PageHeader title="Báo cáo / Lương & Hoa hồng" />

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

                        {groupBy === 'EMPLOYEE' && (
                            <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
                                <SelectTrigger className="w-52"><SelectValue placeholder="Nhân viên" /></SelectTrigger>
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
            <div className="grid grid-cols-4 gap-4 mb-4">
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                    <div className="text-xs text-gray-400 mb-1">Số {GROUP_OPTIONS.find((g) => g.value === groupBy)?.label}</div>
                    <div className="text-2xl font-bold text-[#1A2B5A]">{data.length}</div>
                </div>
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                    <div className="text-xs text-gray-400 mb-1">Tổng doanh thu đóng góp</div>
                    <div className="text-xl font-bold text-[#1A2B5A]">{formatCurrency(totalRevenue)}</div>
                </div>
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                    <div className="text-xs text-gray-400 mb-1">Tổng hoa hồng chi trả</div>
                    <div className="text-xl font-bold text-[#E8890C]">{formatCurrency(totalCommission)}</div>
                </div>
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                    <div className="text-xs text-gray-400 mb-1">Tỷ lệ HH / Doanh thu</div>
                    <div className="text-2xl font-bold text-green-500">
                        {totalRevenue > 0 ? `${((totalCommission / totalRevenue) * 100).toFixed(1)}%` : '—'}
                    </div>
                </div>
            </div>

            {/* Chart */}
            {barData.length > 0 && (
                <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
                    <h3 className="text-sm font-semibold text-[#1A2B5A] mb-3">
                        Doanh thu & Hoa hồng theo {GROUP_OPTIONS.find((g) => g.value === groupBy)?.label}
                    </h3>
                    <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={barData} margin={{ top: 8, right: 32, left: 8, bottom: 8 }}>
                            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                            <YAxis tick={{ fontSize: 11 }} tickFormatter={formatMillions} />
                            <Tooltip formatter={(v, name) => [formatCurrency(Number(v)), name === 'revenue' ? 'Doanh thu' : 'Hoa hồng']} />
                            <Bar dataKey="revenue" name="revenue" fill="#FAD99A" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="commission" name="commission" radius={[4, 4, 0, 0]}>
                                {barData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                    <div className="flex justify-center gap-6 mt-1 text-xs text-gray-400">
                        <span><span className="inline-block w-3 h-3 bg-[#FAD99A] rounded-sm mr-1" />Doanh thu</span>
                        <span><span className="inline-block w-3 h-3 bg-[#E8890C] rounded-sm mr-1" />Hoa hồng</span>
                    </div>
                </div>
            )}

            {/* Table */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
                <DataTable
                    columns={columns}
                    data={sorted}
                    rowKey={rowKey}
                    loading={loading}
                    pageSize={20}
                    summary={summaryRow}
                />
            </div>
        </>
    );
}
