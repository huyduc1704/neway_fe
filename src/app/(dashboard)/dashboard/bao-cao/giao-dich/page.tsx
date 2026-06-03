'use client';
import { useEffect, useState, useCallback } from 'react';
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

interface TransactionRow {
    id: string;
    transactionCode: string;
    actualValue: number;
    expectedRevenue: number | null;
    status: string;
    transactedAt: string;
    project: { id: string; code: string; ward: string; area: string } | null;
    room: { id: string; roomCode: string } | null;
    customer: { id: string; fullName: string; phone: string } | null;
    branch: { id: string; name: string } | null;
    team: { id: string; name: string } | null;
    assignments: {
        roleInProject: string;
        employee: { id: string; employeeCode: string; user: { fullName: string } };
    }[];
}

interface Summary {
    total: number;
    successCount: number;
    pendingCount: number;
    cancelledCount: number;
    totalRevenue: number;
}

interface Branch { id: string; name: string; }
interface Team { id: string; name: string; }
interface Project { id: string; code: string; }
interface EmployeeOption { id: string; employeeCode: string; fullName: string; }

const STATUS_MAP: Record<string, { label: string; variant: 'processing' | 'success' | 'secondary' | 'destructive' }> = {
    PENDING:   { label: 'Đang xử lý', variant: 'processing' },
    SUCCESS:   { label: 'Thành công', variant: 'success' },
    CANCELLED: { label: 'Đã huỷ',    variant: 'secondary' },
    FAILED:    { label: 'Thất bại',   variant: 'destructive' },
};

const formatCurrency = (v: number) => new Intl.NumberFormat('vi-VN').format(v) + 'đ';

const ROLE_COLOR: Record<string, string> = {
    LEADER: 'text-purple-600 bg-purple-50',
    SALES: 'text-blue-600 bg-blue-50',
};

export default function BaoCaoGiaoDichPage() {
    const [data, setData] = useState<TransactionRow[]>([]);
    const [summary, setSummary] = useState<Summary>({ total: 0, successCount: 0, pendingCount: 0, cancelledCount: 0, totalRevenue: 0 });
    const [loading, setLoading] = useState(false);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [employees, setEmployees] = useState<EmployeeOption[]>([]);
    const [fromDate, setFromDate] = useState(dayjs().startOf('year').format('YYYY-MM-DD'));
    const [toDate, setToDate] = useState(dayjs().endOf('year').format('YYYY-MM-DD'));
    const [branchFilter, setBranchFilter] = useState<string>('');
    const [teamFilter, setTeamFilter] = useState<string>('');
    const [projectFilter, setProjectFilter] = useState<string>('');
    const [statusFilter, setStatusFilter] = useState<string>('');
    const [employeeFilter, setEmployeeFilter] = useState<string>('');

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const { data: res } = await api.get('/reports/transactions', {
                params: {
                    fromDate, toDate,
                    branchId: branchFilter || undefined,
                    teamId: teamFilter || undefined,
                    projectId: projectFilter || undefined,
                    status: statusFilter || undefined,
                    employeeId: employeeFilter || undefined,
                },
            });
            setData(res.data);
            setSummary(res.summary);
        } catch {
            toast.error('Không thể tải báo cáo giao dịch');
        } finally {
            setLoading(false);
        }
    }, [fromDate, toDate, branchFilter, teamFilter, projectFilter, statusFilter, employeeFilter]);

    useEffect(() => { fetchData(); }, [fetchData]);

    useEffect(() => {
        api.get('/branches', { params: { limit: 100 } }).then(({ data }) => setBranches(data.data)).catch(() => {});
        api.get('/teams', { params: { limit: 100 } }).then(({ data }) => setTeams(data.data)).catch(() => {});
        api.get('/projects', { params: { limit: 200 } }).then(({ data }) => setProjects(data.data)).catch(() => {});
        api.get('/employees', { params: { limit: 200 } }).then(({ data }) => {
            setEmployees(data.data.map((e: any) => ({
                id: e.employeeProfile?.id,
                employeeCode: e.employeeProfile?.employeeCode,
                fullName: e.fullName,
            })).filter((e: any) => e.id));
        }).catch(() => {});
    }, []);

    const totalValue = data.reduce((s, r) => s + r.actualValue, 0);

    const columns: Column<TransactionRow>[] = [
        { key: 'stt', title: 'STT', width: 60, align: 'center', render: (_, __, i) => i + 1 },
        {
            key: 'transactionCode', title: 'Mã GD', width: 130,
            render: (_, r) => <Badge variant="warning">{r.transactionCode}</Badge>,
        },
        {
            key: 'project', title: 'Dự án / Phòng',
            render: (_, r) => (
                <div>
                    <div className="font-medium">{r.project?.code || '—'}</div>
                    {r.room && <div className="text-xs text-gray-400">Phòng: {r.room.roomCode}</div>}
                </div>
            ),
        },
        {
            key: 'customer', title: 'Khách hàng', width: 180,
            render: (_, r) => r.customer ? (
                <div>
                    <div className="font-medium">{r.customer.fullName}</div>
                    <div className="text-xs text-gray-400">{r.customer.phone}</div>
                </div>
            ) : '—',
        },
        {
            key: 'assignments', title: 'Nhân sự', width: 180,
            render: (_, r) => {
                if (!r.assignments?.length) return '—';
                return (
                    <div className="space-y-1">
                        {r.assignments.map((a, i) => (
                            <div key={i} className="flex items-center gap-1 text-xs">
                                <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${ROLE_COLOR[a.roleInProject] || 'text-green-600 bg-green-50'}`}>
                                    {a.roleInProject}
                                </span>
                                <span>{a.employee.user.fullName}</span>
                            </div>
                        ))}
                    </div>
                );
            },
        },
        {
            key: 'actualValue', title: 'Giá trị GD', width: 150, align: 'right',
            render: (_, r) => <span className="font-semibold text-[#1A2B5A]">{formatCurrency(r.actualValue)}</span>,
        },
        {
            key: 'transactedAt', title: 'Ngày GD', width: 110, align: 'center',
            render: (_, r) => dayjs(r.transactedAt).format('DD/MM/YYYY'),
        },
        {
            key: 'status', title: 'Trạng thái', width: 130, align: 'center',
            render: (_, r) => {
                const s = STATUS_MAP[r.status] ?? { label: r.status, variant: 'secondary' as const };
                return <Badge variant={s.variant}>{s.label}</Badge>;
            },
        },
    ];

    const summaryRow = data.length > 0 ? (
        <>
            <td colSpan={5} className="px-4 py-2"><strong>Tổng cộng ({data.length} giao dịch)</strong></td>
            <td className="px-4 py-2 text-right"><strong className="text-[#E8890C]">{formatCurrency(totalValue)}</strong></td>
            <td colSpan={2} />
        </>
    ) : undefined;

    return (
        <>
            <PageHeader title="Báo cáo / Giao dịch" actions={
                <Button variant="outline" size="sm" onClick={async () => {
                    try {
                        await downloadExport('/reports/transactions/export', { fromDate, toDate, branchId: branchFilter || undefined, teamId: teamFilter || undefined, status: statusFilter || undefined }, 'bao-cao-giao-dich');
                    } catch { toast.error('Xuất file thất bại'); }
                }}>
                    <Download className="h-4 w-4" /> Xuất Excel
                </Button>
            } />

            {/* Filters */}
            <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
                <div className="flex flex-wrap items-center gap-2">
                    <input type="date" className="h-9 px-3 rounded-md border border-gray-200 text-sm bg-white focus:ring-2 focus:ring-[#E8890C] focus:outline-none" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
                    <span className="text-gray-400">→</span>
                    <input type="date" className="h-9 px-3 rounded-md border border-gray-200 text-sm bg-white focus:ring-2 focus:ring-[#E8890C] focus:outline-none" value={toDate} onChange={(e) => setToDate(e.target.value)} />

                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-40"><SelectValue placeholder="Trạng thái" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="">Tất cả</SelectItem>
                            {Object.entries(STATUS_MAP).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                        </SelectContent>
                    </Select>

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

                    <Select value={projectFilter} onValueChange={setProjectFilter}>
                        <SelectTrigger className="w-36"><SelectValue placeholder="Dự án" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="">Tất cả</SelectItem>
                            {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.code}</SelectItem>)}
                        </SelectContent>
                    </Select>

                    <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
                        <SelectTrigger className="w-48"><SelectValue placeholder="Nhân viên" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="">Tất cả</SelectItem>
                            {employees.map((e) => <SelectItem key={e.id} value={e.id}>{e.fullName} ({e.employeeCode})</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-4 gap-4 mb-4">
                {[
                    { label: 'Tổng giao dịch', value: summary.total, color: 'text-[#1A2B5A]' },
                    { label: 'Thành công', value: summary.successCount, color: 'text-green-500' },
                    { label: 'Đang xử lý', value: summary.pendingCount, color: 'text-blue-500' },
                    { label: 'Đã huỷ', value: summary.cancelledCount, color: 'text-gray-400' },
                ].map((item) => (
                    <div key={item.label} className="bg-white rounded-lg border border-gray-200 p-4">
                        <div className="text-xs text-gray-400 mb-1">{item.label}</div>
                        <div className={`text-2xl font-bold ${item.color}`}>{item.value}</div>
                    </div>
                ))}
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
                <div className="text-xs text-gray-400 mb-1">Tổng doanh thu (GD thành công)</div>
                <div className="text-3xl font-bold text-[#E8890C]">{formatCurrency(summary.totalRevenue)}</div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
                <DataTable
                    columns={columns}
                    data={data}
                    rowKey="id"
                    loading={loading}
                    pageSize={20}
                    summary={summaryRow}
                />
            </div>
        </>
    );
}
