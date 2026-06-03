'use client';
import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
    Calculator, Download, ChevronRight, Pencil, FileText,
    RefreshCw, Lock, TrendingUp, DollarSign, Receipt, Users
} from 'lucide-react';
import api from '@/lib/api';
import PageHeader from '@/components/common/PageHeader';
import { DataTable, Column } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatCard } from '@/components/ui/stat-card';
import { downloadExport } from '@/lib/export';
import { formatCurrency } from '@/lib/utils';

type Tab = 'lines' | 'transactions';

interface Period { id: string; code: string; periodStart: string; periodEnd: string; isLocked: boolean; }
interface PayrollLine {
    id: string;
    grossRevenue: string; netRevenue: string;
    fixedSalarySnapshot: string; taskSalaryAmount: string;
    commissionPercent: string; commissionAmount: string;
    bonus: string; advancePayment: string;
    isTaxExempt: boolean;
    preTaxIncome: string; taxAmount: string;
    socialInsuranceAmount: string; finalNetIncome: string;
    note: string | null;
    employee: { id: string; employeeCode: string; user: { fullName: string }; branch: { code: string; name: string } | null; team: { code: string; name: string } | null; };
    role: { code: string; name: string } | null;
}
interface Summary {
    grossRevenue: number; netRevenue: number; commissionAmount: number;
    bonus: number; advancePayment: number; taxAmount: number;
    socialInsuranceAmount: number; finalNetIncome: number;
}
interface TxSlot { employeeCode: string | null; rate: number; revenue: number; }
interface TxRow {
    transactionCode: string; transactedAt: string; actualValue: number;
    grossRevenue: number; netRevenue: number;
    project: { code: string; ward: string };
    slots: Record<string, TxSlot>;
}

const SLOT_LABELS: Record<string, string> = { m: 'M', m1: 'M1', m2: 'M2', s1: 'S1', s2: 'S2', mLeader: 'M Lớn', m1Leader: 'M1 Lớn', m2Leader: 'M2 Lớn', s1Leader: 'S1 Lớn', s2Leader: 'S2 Lớn' };

function BangLuongContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [periodId, setPeriodId] = useState(searchParams.get('periodId') ?? '');
    const [periods, setPeriods] = useState<Period[]>([]);
    const [period, setPeriod] = useState<Period | null>(null);
    const [lines, setLines] = useState<PayrollLine[]>([]);
    const [summary, setSummary] = useState<Summary | null>(null);
    const [txData, setTxData] = useState<TxRow[]>([]);
    const [txSummary, setTxSummary] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [tab, setTab] = useState<Tab>('lines');

    // Calculate dialog
    const [calcOpen, setCalcOpen] = useState(false);
    const [calcForm, setCalcForm] = useState({ overwrite: false, branchId: '', teamId: '' });
    const [calculating, setCalculating] = useState(false);
    const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
    const [teams, setTeams] = useState<{ id: string; name: string }[]>([]);

    // Edit line dialog
    const [editOpen, setEditOpen] = useState(false);
    const [editLine, setEditLine] = useState<PayrollLine | null>(null);
    const [editForm, setEditForm] = useState({ bonus: '', advancePayment: '', isTaxExempt: false, note: '' });
    const [editSaving, setEditSaving] = useState(false);

    // Manager breakdown dialog
    const [breakdownOpen, setBreakdownOpen] = useState(false);
    const [breakdown, setBreakdown] = useState<any>(null);
    const [breakdownLoading, setBreakdownLoading] = useState(false);

    useEffect(() => {
        api.get('/payroll/periods', { params: { limit: 100, isLocked: undefined } })
            .then(({ data }) => setPeriods(data.data)).catch(() => {});
        api.get('/branches', { params: { limit: 100 } }).then(({ data }) => setBranches(data.data)).catch(() => {});
        api.get('/teams', { params: { limit: 100 } }).then(({ data }) => setTeams(data.data)).catch(() => {});
    }, []);

    useEffect(() => {
        if (!periodId) return;
        const found = periods.find(p => p.id === periodId) ?? null;
        setPeriod(found);
    }, [periodId, periods]);

    const fetchLines = useCallback(async () => {
        if (!periodId) return;
        setLoading(true);
        try {
            const { data } = await api.get(`/payroll/periods/${periodId}/lines`);
            setLines(data.data ?? []);
            setSummary(data.summary ?? null);
            if (!period) setPeriod(data.period);
        } catch { toast.error('Không thể tải bảng lương'); }
        finally { setLoading(false); }
    }, [periodId]);

    const fetchTransactions = useCallback(async () => {
        if (!periodId) return;
        setLoading(true);
        try {
            const { data } = await api.get(`/payroll/periods/${periodId}/transactions`, { params: { periodOnly: true } });
            setTxData(data.data ?? []);
            setTxSummary(data.summary ?? null);
        } catch { toast.error('Không thể tải giao dịch'); }
        finally { setLoading(false); }
    }, [periodId]);

    useEffect(() => {
        if (!periodId) return;
        if (tab === 'lines') fetchLines();
        else fetchTransactions();
    }, [periodId, tab, fetchLines, fetchTransactions]);

    const handleCalculate = async () => {
        setCalculating(true);
        try {
            const { data } = await api.post(`/payroll/periods/${periodId}/calculate`, {
                overwrite: calcForm.overwrite,
                branchId: calcForm.branchId || undefined,
                teamId: calcForm.teamId || undefined,
            });
            toast.success(data.message ?? 'Tính lương thành công');
            setCalcOpen(false);
            fetchLines();
        } catch (err: any) { toast.error(err?.response?.data?.message || 'Tính lương thất bại'); }
        finally { setCalculating(false); }
    };

    const openEditLine = (l: PayrollLine) => {
        setEditLine(l);
        setEditForm({ bonus: String(Number(l.bonus)), advancePayment: String(Number(l.advancePayment)), isTaxExempt: l.isTaxExempt, note: l.note ?? '' });
        setEditOpen(true);
    };

    const handleEditSave = async () => {
        if (!editLine) return;
        setEditSaving(true);
        try {
            await api.patch(`/payroll/lines/${editLine.id}`, {
                bonus: Number(editForm.bonus) || 0,
                advancePayment: Number(editForm.advancePayment) || 0,
                isTaxExempt: editForm.isTaxExempt,
                note: editForm.note || undefined,
            });
            toast.success('Cập nhật bảng lương thành công');
            setEditOpen(false);
            fetchLines();
        } catch (err: any) { toast.error(err?.response?.data?.message || 'Thao tác thất bại'); }
        finally { setEditSaving(false); }
    };

    const openBreakdown = async (lineId: string) => {
        setBreakdownLoading(true);
        setBreakdownOpen(true);
        try {
            const { data } = await api.get(`/payroll/lines/${lineId}/manager-breakdown`);
            setBreakdown(data);
        } catch { toast.error('Không thể tải chi tiết lương'); }
        finally { setBreakdownLoading(false); }
    };

    const handleExport = async (format: 'excel' | 'pdf', groupBy: string) => {
        try {
            await downloadExport(`/payroll/periods/${periodId}/export`, { groupBy, format }, `bang-luong-${groupBy.toLowerCase()}`);
        } catch { toast.error('Xuất file thất bại'); }
    };

    // ── Columns ──────────────────────────────────────────────────────────────

    const lineColumns: Column<PayrollLine>[] = [
        { key: 'stt', title: 'STT', width: 55, align: 'center', render: (_, __, i) => i + 1 },
        {
            key: 'employee', title: 'Nhân viên', width: 200,
            render: (_, r) => (
                <div>
                    <p className="font-medium text-[#1A2B5A]">{r.employee.user.fullName}</p>
                    <p className="text-xs text-gray-400">{r.employee.employeeCode} · {r.role?.name ?? '—'}</p>
                </div>
            ),
        },
        {
            key: 'dept', title: 'Chi nhánh / Team', width: 170,
            render: (_, r) => (
                <div className="text-xs">
                    {r.employee.branch && <p className="text-gray-600">{r.employee.branch.name}</p>}
                    {r.employee.team && <p className="text-gray-400">{r.employee.team.name}</p>}
                </div>
            ),
        },
        { key: 'grossRevenue', title: 'Gross', width: 140, align: 'right', render: (_, r) => <span className="text-gray-600">{formatCurrency(Number(r.grossRevenue))}</span> },
        { key: 'netRevenue', title: 'Net', width: 140, align: 'right', render: (_, r) => <span className="text-gray-600">{formatCurrency(Number(r.netRevenue))}</span> },
        {
            key: 'commission', title: 'Hoa hồng', width: 155, align: 'right',
            render: (_, r) => (
                <div className="text-right">
                    <p className="font-medium text-[#E8890C]">{formatCurrency(Number(r.commissionAmount))}</p>
                    <p className="text-xs text-gray-400">{Number(r.commissionPercent).toFixed(2)}%</p>
                </div>
            ),
        },
        { key: 'bonus', title: 'Thưởng', width: 120, align: 'right', render: (_, r) => Number(r.bonus) > 0 ? <span className="text-green-600 font-medium">{formatCurrency(Number(r.bonus))}</span> : <span className="text-gray-300">—</span> },
        { key: 'advancePayment', title: 'Ứng lương', width: 120, align: 'right', render: (_, r) => Number(r.advancePayment) > 0 ? <span className="text-orange-500 font-medium">{formatCurrency(Number(r.advancePayment))}</span> : <span className="text-gray-300">—</span> },
        { key: 'preTaxIncome', title: 'Trước thuế', width: 150, align: 'right', render: (_, r) => <span className="font-medium text-[#1A2B5A]">{formatCurrency(Number(r.preTaxIncome))}</span> },
        {
            key: 'tax', title: 'Thuế', width: 120, align: 'right',
            render: (_, r) => r.isTaxExempt
                ? <Badge variant="success">Miễn thuế</Badge>
                : <span className="text-red-500">{formatCurrency(Number(r.taxAmount))}</span>,
        },
        { key: 'socialInsuranceAmount', title: 'BHXH', width: 120, align: 'right', render: (_, r) => Number(r.socialInsuranceAmount) > 0 ? formatCurrency(Number(r.socialInsuranceAmount)) : <span className="text-gray-300">—</span> },
        {
            key: 'finalNetIncome', title: 'Thực nhận', width: 155, align: 'right',
            render: (_, r) => <span className="font-bold text-[#E8890C] text-base">{formatCurrency(Number(r.finalNetIncome))}</span>,
        },
        {
            key: 'actions', title: '', width: 100, align: 'center',
            render: (_, r) => (
                <div className="flex items-center justify-center gap-1">
                    {!period?.isLocked && (
                        <button title="Điều chỉnh" onClick={() => openEditLine(r)}
                            className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-[#E8890C] transition-colors">
                            <Pencil className="h-4 w-4" />
                        </button>
                    )}
                    <button title="Chi tiết lương" onClick={() => openBreakdown(r.id)}
                        className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-[#1A2B5A] transition-colors">
                        <FileText className="h-4 w-4" />
                    </button>
                </div>
            ),
        },
    ];

    const txColumns: Column<TxRow>[] = [
        { key: 'stt', title: 'STT', width: 55, align: 'center', render: (_, __, i) => i + 1 },
        {
            key: 'transactionCode', title: 'Mã GD', width: 140,
            render: (_, r) => <Badge variant="outline">{r.transactionCode}</Badge>,
        },
        {
            key: 'project', title: 'Dự án', width: 160,
            render: (_, r) => (
                <div>
                    <p className="font-medium">{r.project.code}</p>
                    <p className="text-xs text-gray-400">{r.project.ward}</p>
                </div>
            ),
        },
        { key: 'actualValue', title: 'Giá trị GD', width: 150, align: 'right', render: (_, r) => <span className="font-medium text-[#1A2B5A]">{formatCurrency(r.actualValue)}</span> },
        ...['m', 'm1', 'm2', 's1', 's2'].flatMap(key => [
            {
                key: `${key}_emp`, title: `Mã ${SLOT_LABELS[key]}`, width: 90, align: 'center' as const,
                render: (_: any, r: TxRow) => r.slots[key]?.employeeCode
                    ? <span className="text-xs font-medium text-[#1A2B5A]">{r.slots[key].employeeCode}</span>
                    : <span className="text-gray-200">—</span>,
            },
            {
                key: `${key}_rate`, title: `Tỉ lệ ${SLOT_LABELS[key]}`, width: 80, align: 'center' as const,
                render: (_: any, r: TxRow) => r.slots[key]?.rate > 0
                    ? <span className="text-xs text-gray-600">{(r.slots[key].rate * 100).toFixed(0)}%</span>
                    : <span className="text-gray-200">—</span>,
            },
            {
                key: `${key}_rev`, title: `DT ${SLOT_LABELS[key]}`, width: 120, align: 'right' as const,
                render: (_: any, r: TxRow) => r.slots[key]?.revenue > 0
                    ? <span className="text-xs text-[#E8890C]">{formatCurrency(r.slots[key].revenue)}</span>
                    : <span className="text-gray-200">—</span>,
            },
        ]),
        { key: 'grossRevenue', title: 'Gross', width: 140, align: 'right', render: (_, r) => <span className="font-bold text-[#E8890C]">{formatCurrency(r.grossRevenue)}</span> },
        { key: 'netRevenue', title: 'Net (÷1.1)', width: 140, align: 'right', render: (_, r) => <span className="font-bold text-[#1A2B5A]">{formatCurrency(r.netRevenue)}</span> },
    ];

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <>
            <PageHeader
                title="Tính lương / Bảng lương"
                description="Tính toán và quản lý bảng lương theo kỳ"
                actions={
                    <div className="flex items-center gap-2">
                        {periodId && !period?.isLocked && (
                            <Button onClick={() => setCalcOpen(true)}>
                                <Calculator className="h-4 w-4" /> Tính lương
                            </Button>
                        )}
                        {periodId && lines.length > 0 && (
                            <div className="flex gap-1">
                                {['EMPLOYEE', 'TEAM', 'BRANCH'].map(g => (
                                    <Button key={g} variant="outline" size="sm" onClick={() => handleExport('excel', g)}>
                                        <Download className="h-3.5 w-3.5" /> {g === 'EMPLOYEE' ? 'NV' : g === 'TEAM' ? 'Team' : 'CN'}
                                    </Button>
                                ))}
                            </div>
                        )}
                    </div>
                }
            />

            {/* Period selector */}
            <Card className="mb-4">
                <CardContent className="p-4 flex items-center gap-4">
                    <div className="flex items-center gap-3 flex-1">
                        <Label className="whitespace-nowrap">Chọn kỳ lương:</Label>
                        <Select value={periodId} onValueChange={v => { setPeriodId(v); router.replace(`/dashboard/tinh-luong/bang-luong?periodId=${v}` as any); }}>
                            <SelectTrigger className="w-80">
                                <SelectValue placeholder="-- Chọn kỳ lương --" />
                            </SelectTrigger>
                            <SelectContent>
                                {periods.map(p => (
                                    <SelectItem key={p.id} value={p.id}>
                                        {p.code} ({new Date(p.periodStart).toLocaleDateString('vi-VN')} → {new Date(p.periodEnd).toLocaleDateString('vi-VN')})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    {period && (
                        <Badge variant={period.isLocked ? 'navy' : 'warning'} className="ml-auto">
                            {period.isLocked ? <><Lock className="h-3.5 w-3.5 mr-1" /> Đã khoá</> : '🔓 Đang mở'}
                        </Badge>
                    )}
                </CardContent>
            </Card>

            {!periodId && (
                <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                    <Calculator className="h-12 w-12 mb-3 opacity-30" />
                    <p className="text-base">Chọn kỳ lương để xem bảng lương</p>
                    <Button variant="outline" className="mt-4" onClick={() => router.push('/dashboard/tinh-luong/ky-luong' as any)}>
                        <ChevronRight className="h-4 w-4" /> Quản lý kỳ lương
                    </Button>
                </div>
            )}

            {periodId && (
                <>
                    {/* Summary */}
                    {summary && (
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                            <StatCard label="Tổng Gross" value={formatCurrency(summary.grossRevenue)} icon={<TrendingUp className="h-5 w-5" />} />
                            <StatCard label="Tổng Hoa hồng" value={formatCurrency(summary.commissionAmount)} icon={<DollarSign className="h-5 w-5" />} color="#1A2B5A" />
                            <StatCard label="Tổng Thuế TNCN" value={formatCurrency(summary.taxAmount)} icon={<Receipt className="h-5 w-5" />} color="#ef4444" />
                            <StatCard label="Tổng Thực nhận" value={formatCurrency(summary.finalNetIncome)} icon={<Users className="h-5 w-5" />} color="#16a34a" />
                        </div>
                    )}

                    {/* Tabs */}
                    <div className="flex gap-1 mb-4 bg-white rounded-lg border border-gray-200 p-1 w-fit">
                        {[
                            { key: 'lines', label: 'Bảng lương', icon: <Receipt className="h-4 w-4" /> },
                            { key: 'transactions', label: 'GD đã thu', icon: <FileText className="h-4 w-4" /> },
                        ].map(t => (
                            <button key={t.key} onClick={() => setTab(t.key as Tab)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === t.key ? 'bg-[#E8890C] text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'}`}>
                                {t.icon}{t.label}
                            </button>
                        ))}
                    </div>

                    <Card>
                        <CardContent className="p-0 overflow-x-auto">
                            {tab === 'lines' && (
                                <DataTable columns={lineColumns} data={lines} rowKey="id" loading={loading}
                                    pageSize={20} emptyText={period?.isLocked ? 'Kỳ lương chưa có bảng lương' : 'Chưa tính lương — nhấn "Tính lương" để bắt đầu'} />
                            )}
                            {tab === 'transactions' && (
                                <div>
                                    {txSummary && (
                                        <div className="flex gap-4 p-4 border-b border-gray-100 text-sm">
                                            <span className="text-gray-500">{txSummary.transactionCount} giao dịch</span>
                                            <span className="text-gray-500">Gross: <strong className="text-[#E8890C]">{formatCurrency(txSummary.totalGross)}</strong></span>
                                            <span className="text-gray-500">Net: <strong className="text-[#1A2B5A]">{formatCurrency(txSummary.totalNet)}</strong></span>
                                        </div>
                                    )}
                                    <DataTable columns={txColumns} data={txData} rowKey="transactionCode" loading={loading}
                                        pageSize={20} emptyText="Không có giao dịch đã thu trong kỳ này" />
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </>
            )}

            {/* Calculate Dialog */}
            <Dialog open={calcOpen} onOpenChange={setCalcOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Calculator className="h-5 w-5 text-[#E8890C]" /> Tính lương tự động
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="rounded-lg bg-blue-50 border border-blue-100 p-3 text-sm text-blue-700">
                            Hệ thống sẽ tự động tính: Gross → Net → Hoa hồng → Lương CB → Lương NV → Thuế → BHXH → Thực nhận cho từng nhân viên.
                        </div>
                        <div className="space-y-1.5">
                            <Label>Giới hạn theo chi nhánh (tuỳ chọn)</Label>
                            <Select value={calcForm.branchId} onValueChange={v => setCalcForm(f => ({ ...f, branchId: v === '__all__' ? '' : v }))}>
                                <SelectTrigger><SelectValue placeholder="Tất cả chi nhánh" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="__all__">Tất cả chi nhánh</SelectItem>
                                    {branches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label>Giới hạn theo team (tuỳ chọn)</Label>
                            <Select value={calcForm.teamId} onValueChange={v => setCalcForm(f => ({ ...f, teamId: v === '__all__' ? '' : v }))}>
                                <SelectTrigger><SelectValue placeholder="Tất cả team" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="__all__">Tất cả team</SelectItem>
                                    {teams.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex items-center gap-3 p-3 rounded-lg border border-gray-200">
                            <input type="checkbox" id="overwrite" checked={calcForm.overwrite}
                                onChange={e => setCalcForm(f => ({ ...f, overwrite: e.target.checked }))}
                                className="h-4 w-4 accent-[#E8890C]" />
                            <div>
                                <label htmlFor="overwrite" className="text-sm font-medium cursor-pointer">Ghi đè bảng lương đã có</label>
                                <p className="text-xs text-gray-400">Bonus / Ứng lương đã nhập sẽ được giữ nguyên</p>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCalcOpen(false)}>Huỷ</Button>
                        <Button onClick={handleCalculate} disabled={calculating}>
                            {calculating ? <><div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin mr-2" />Đang tính...</> : <><Calculator className="h-4 w-4" /> Bắt đầu tính</>}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Line Dialog */}
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Pencil className="h-5 w-5 text-[#E8890C]" /> Điều chỉnh bảng lương
                        </DialogTitle>
                    </DialogHeader>
                    {editLine && (
                        <div className="space-y-4 py-2">
                            <div className="p-3 rounded-lg bg-gray-50 border">
                                <p className="font-semibold text-[#1A2B5A]">{editLine.employee.user.fullName}</p>
                                <p className="text-sm text-gray-500">{editLine.employee.employeeCode} · {editLine.role?.name ?? '—'}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label>Thưởng / Bonus (VNĐ)</Label>
                                    <Input type="number" min={0} value={editForm.bonus}
                                        onChange={e => setEditForm(f => ({ ...f, bonus: e.target.value }))} />
                                    {Number(editForm.bonus) > 0 && <p className="text-xs text-green-600">{formatCurrency(Number(editForm.bonus))}</p>}
                                </div>
                                <div className="space-y-1.5">
                                    <Label>Ứng Lương / Trừ tiền (VNĐ)</Label>
                                    <Input type="number" min={0} value={editForm.advancePayment}
                                        onChange={e => setEditForm(f => ({ ...f, advancePayment: e.target.value }))} />
                                    {Number(editForm.advancePayment) > 0 && <p className="text-xs text-orange-500">{formatCurrency(Number(editForm.advancePayment))}</p>}
                                </div>
                            </div>
                            <div className="flex items-center gap-3 p-3 rounded-lg border border-gray-200">
                                <input type="checkbox" id="taxExempt" checked={editForm.isTaxExempt}
                                    onChange={e => setEditForm(f => ({ ...f, isTaxExempt: e.target.checked }))}
                                    className="h-4 w-4 accent-[#E8890C]" />
                                <label htmlFor="taxExempt" className="text-sm font-medium cursor-pointer">Miễn thuế TNCN (có hợp đồng / cam kết)</label>
                            </div>
                            <div className="space-y-1.5">
                                <Label>Ghi chú</Label>
                                <Input placeholder="Ghi chú điều chỉnh..." value={editForm.note}
                                    onChange={e => setEditForm(f => ({ ...f, note: e.target.value }))} />
                            </div>
                            <div className="p-3 rounded-lg bg-orange-50 border border-orange-100 text-sm space-y-1">
                                <p className="text-gray-500">Hoa hồng: <strong className="text-[#E8890C]">{formatCurrency(Number(editLine.commissionAmount))}</strong></p>
                                <p className="text-gray-500">Lương CB: <strong>{formatCurrency(Number(editLine.fixedSalarySnapshot))}</strong></p>
                                <p className="text-gray-500 font-medium">→ Tính lại ngay sau khi lưu</p>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditOpen(false)}>Huỷ</Button>
                        <Button onClick={handleEditSave} disabled={editSaving}>
                            {editSaving ? <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" /> : 'Lưu điều chỉnh'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Manager Breakdown Dialog */}
            <Dialog open={breakdownOpen} onOpenChange={setBreakdownOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5 text-[#E8890C]" /> Tab Lương Quản Lý
                        </DialogTitle>
                    </DialogHeader>
                    {breakdownLoading && <div className="flex justify-center py-8"><div className="h-6 w-6 rounded-full border-2 border-[#E8890C] border-t-transparent animate-spin" /></div>}
                    {breakdown && !breakdownLoading && (
                        <div className="space-y-3 py-2">
                            <div className="p-3 rounded-lg bg-gray-50 border">
                                <p className="font-semibold text-[#1A2B5A]">{breakdown.employee?.user?.fullName}</p>
                                <p className="text-sm text-gray-500">{breakdown.employee?.employeeCode} · {breakdown.role?.name}</p>
                                {breakdown.role?.commissionPercent && <p className="text-xs text-[#E8890C] mt-0.5">% HH: {Number(breakdown.role.commissionPercent).toFixed(2)}%</p>}
                            </div>
                            <div className="space-y-2 text-sm">
                                {[
                                    { label: 'Lương CB', value: breakdown.fixedSalary, color: '#1A2B5A' },
                                    { label: 'Lương Nhiệm Vụ', value: breakdown.taskSalaryTotal, color: '#1A2B5A' },
                                    { label: 'Hoa hồng (Net × %)', value: breakdown.commissionAmount, color: '#E8890C' },
                                ].map(item => (
                                    <div key={item.label} className="flex justify-between items-center py-2 border-b border-dashed border-gray-100">
                                        <span className="text-gray-600">{item.label}</span>
                                        <span className="font-bold" style={{ color: item.color }}>{formatCurrency(item.value)}</span>
                                    </div>
                                ))}
                                {breakdown.taskSalaryLines?.length > 0 && (
                                    <div className="pl-3 space-y-1">
                                        {breakdown.taskSalaryLines.map((ts: any, i: number) => (
                                            <div key={i} className="flex justify-between text-xs text-gray-500 py-0.5">
                                                <span className={ts.status !== 'ACHIEVED' ? 'line-through opacity-50' : ''}>{ts.content}</span>
                                                <span>{ts.status === 'ACHIEVED' ? formatCurrency(ts.salary) : '—'}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                <div className="flex justify-between items-center py-2 font-medium">
                                    <span>+ Thưởng</span>
                                    <span className="text-green-600">+{formatCurrency(breakdown.bonus)}</span>
                                </div>
                                <div className="flex justify-between items-center py-2 font-medium">
                                    <span>− Ứng lương</span>
                                    <span className="text-orange-500">-{formatCurrency(breakdown.advancePayment)}</span>
                                </div>
                                <div className="flex justify-between items-center py-2 bg-blue-50 rounded-lg px-3 font-bold">
                                    <span className="text-[#1A2B5A]">Tổng Trước Thuế</span>
                                    <span className="text-[#1A2B5A] text-base">{formatCurrency(breakdown.preTaxIncome)}</span>
                                </div>
                                <div className="flex justify-between items-center py-2 text-red-500">
                                    <span>− Thuế TNCN {breakdown.isTaxExempt && <Badge variant="success" className="ml-1 text-xs">Miễn</Badge>}</span>
                                    <span>-{formatCurrency(breakdown.taxAmount)}</span>
                                </div>
                                <div className="flex justify-between items-center py-2 text-gray-600">
                                    <span>− BHXH ({breakdown.role?.socialInsurancePercent ?? 0}%)</span>
                                    <span>-{formatCurrency(breakdown.socialInsurance)}</span>
                                </div>
                                <div className="flex justify-between items-center py-3 bg-orange-50 rounded-lg px-3 border border-orange-200">
                                    <span className="font-bold text-[#E8890C] text-base">Thu nhập sau thuế</span>
                                    <span className="font-bold text-[#E8890C] text-xl">{formatCurrency(breakdown.finalNetIncome)}</span>
                                </div>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setBreakdownOpen(false)}>Đóng</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

export default function BangLuongPage() {
    return (
        <Suspense fallback={<div className="flex justify-center py-20"><div className="h-8 w-8 rounded-full border-2 border-[#E8890C] border-t-transparent animate-spin" /></div>}>
            <BangLuongContent />
        </Suspense>
    );
}
