'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Plus, Lock, LockOpen, Trash2, Pencil, CalendarDays, ArrowRight } from 'lucide-react';
import api from '@/lib/api';
import PageHeader from '@/components/common/PageHeader';
import { DataTable, Column } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { formatDate } from '@/lib/utils';

interface PayrollPeriod {
    id: string;
    code: string;
    periodStart: string;
    periodEnd: string;
    isLocked: boolean;
    createdAt: string;
    _count: { payrollLines: number };
}

const EMPTY_FORM = { code: '', periodStart: '', periodEnd: '' };

export default function KyLuongPage() {
    const router = useRouter();
    const [periods, setPeriods] = useState<PayrollPeriod[]>([]);
    const [loading, setLoading] = useState(false);
    const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 });
    const [lockedFilter, setLockedFilter] = useState<string>('');

    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);

    const fetchPeriods = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/payroll/periods', {
                params: {
                    page: pagination.page,
                    limit: pagination.limit,
                    isLocked: lockedFilter !== '' ? lockedFilter === 'true' : undefined,
                },
            });
            setPeriods(data.data);
            setPagination(p => ({ ...p, total: data.meta.total }));
        } catch { toast.error('Không thể tải danh sách kỳ lương'); }
        finally { setLoading(false); }
    }, [pagination.page, pagination.limit, lockedFilter]);

    useEffect(() => { fetchPeriods(); }, [fetchPeriods]);

    const openCreate = () => { setEditingId(null); setForm(EMPTY_FORM); setDialogOpen(true); };
    const openEdit = (p: PayrollPeriod) => {
        setEditingId(p.id);
        setForm({ code: p.code, periodStart: p.periodStart.slice(0, 10), periodEnd: p.periodEnd.slice(0, 10) });
        setDialogOpen(true);
    };

    const handleSave = async () => {
        if (!form.code.trim()) { toast.error('Mã kỳ lương không được để trống'); return; }
        if (!form.periodStart || !form.periodEnd) { toast.error('Vui lòng chọn ngày bắt đầu và kết thúc'); return; }
        setSaving(true);
        try {
            if (editingId) {
                await api.patch(`/payroll/periods/${editingId}`, {
                    periodStart: form.periodStart,
                    periodEnd: form.periodEnd,
                });
                toast.success('Cập nhật kỳ lương thành công');
            } else {
                await api.post('/payroll/periods', form);
                toast.success('Tạo kỳ lương thành công');
            }
            setDialogOpen(false);
            fetchPeriods();
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Thao tác thất bại');
        } finally { setSaving(false); }
    };

    const handleLock = async (p: PayrollPeriod) => {
        const action = p.isLocked ? 'Mở khoá' : 'Khoá';
        if (!window.confirm(`${action} kỳ lương "${p.code}"?`)) return;
        try {
            await api.post(`/payroll/periods/${p.id}/${p.isLocked ? 'unlock' : 'lock'}`);
            toast.success(`${action} kỳ lương thành công`);
            fetchPeriods();
        } catch (err: any) { toast.error(err?.response?.data?.message || 'Thao tác thất bại'); }
    };

    const handleDelete = async (p: PayrollPeriod) => {
        if (!window.confirm(`Xoá kỳ lương "${p.code}"? Thao tác không thể hoàn tác.`)) return;
        try {
            await api.delete(`/payroll/periods/${p.id}`);
            toast.success('Đã xoá kỳ lương');
            fetchPeriods();
        } catch (err: any) { toast.error(err?.response?.data?.message || 'Thao tác thất bại'); }
    };

    const columns: Column<PayrollPeriod>[] = [
        { key: 'stt', title: 'STT', width: 60, align: 'center', render: (_, __, i) => (pagination.page - 1) * pagination.limit + i + 1 },
        {
            key: 'code', title: 'Mã kỳ lương', width: 180,
            render: (_, r) => <span className="font-bold text-[#1A2B5A]">{r.code}</span>,
        },
        {
            key: 'period', title: 'Thời gian', width: 220,
            render: (_, r) => (
                <div className="flex items-center gap-2 text-sm">
                    <span>{formatDate(r.periodStart)}</span>
                    <ArrowRight className="h-3.5 w-3.5 text-gray-400" />
                    <span>{formatDate(r.periodEnd)}</span>
                </div>
            ),
        },
        {
            key: 'lines', title: 'Bảng lương', width: 120, align: 'center',
            render: (_, r) => (
                <Badge variant={r._count.payrollLines > 0 ? 'success' : 'secondary'}>
                    {r._count.payrollLines} nhân viên
                </Badge>
            ),
        },
        {
            key: 'status', title: 'Trạng thái', width: 130, align: 'center',
            render: (_, r) => (
                <Badge variant={r.isLocked ? 'navy' : 'warning'}>
                    {r.isLocked ? '🔒 Đã khoá' : '🔓 Đang mở'}
                </Badge>
            ),
        },
        {
            key: 'actions', title: 'Thao tác', width: 180, align: 'center',
            render: (_, r) => (
                <div className="flex items-center justify-center gap-1">
                    <Button variant="ghost" size="sm" className="h-8 gap-1 text-[#E8890C] hover:text-[#E8890C] hover:bg-orange-50 text-xs"
                        onClick={() => router.push(`/dashboard/tinh-luong/bang-luong?periodId=${r.id}` as any)}>
                        <CalendarDays className="h-3.5 w-3.5" /> Bảng lương
                    </Button>
                    {!r.isLocked && (
                        <button title="Chỉnh sửa" onClick={() => openEdit(r)}
                            className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-[#E8890C] transition-colors">
                            <Pencil className="h-4 w-4" />
                        </button>
                    )}
                    <button title={r.isLocked ? 'Mở khoá' : 'Khoá kỳ'} onClick={() => handleLock(r)}
                        className={`p-1.5 rounded transition-colors ${r.isLocked ? 'hover:bg-yellow-50 text-yellow-600' : 'hover:bg-blue-50 text-blue-500'}`}>
                        {r.isLocked ? <LockOpen className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                    </button>
                    {!r.isLocked && r._count.payrollLines === 0 && (
                        <button title="Xoá" onClick={() => handleDelete(r)}
                            className="p-1.5 rounded hover:bg-red-50 text-gray-500 hover:text-red-500 transition-colors">
                            <Trash2 className="h-4 w-4" />
                        </button>
                    )}
                </div>
            ),
        },
    ];

    return (
        <>
            <PageHeader
                title="Tính lương / Kỳ lương"
                description="Quản lý các kỳ lương và chốt bảng lương nhân sự"
                actions={<Button onClick={openCreate}><Plus className="h-4 w-4" /> Tạo kỳ lương</Button>}
            />

            {/* Filter */}
            <Card className="mb-4">
                <CardContent className="p-4 flex items-center gap-3">
                    <span className="text-sm text-gray-500">Lọc theo trạng thái:</span>
                    <div className="flex gap-1">
                        {[
                            { value: '', label: 'Tất cả' },
                            { value: 'false', label: '🔓 Đang mở' },
                            { value: 'true', label: '🔒 Đã khoá' },
                        ].map(opt => (
                            <button key={opt.value} onClick={() => { setLockedFilter(opt.value); setPagination(p => ({ ...p, page: 1 })); }}
                                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors border ${lockedFilter === opt.value ? 'bg-[#E8890C] text-white border-[#E8890C]' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="p-0">
                    <DataTable columns={columns} data={periods} rowKey="id" loading={loading} pageSize={pagination.limit} />
                </CardContent>
            </Card>

            {/* Create/Edit Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <CalendarDays className="h-5 w-5 text-[#E8890C]" />
                            {editingId ? 'Cập nhật kỳ lương' : 'Tạo kỳ lương mới'}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <Label>Mã kỳ lương <span className="text-red-500">*</span></Label>
                            <Input placeholder="VD: LUONG-2025-06" value={form.code}
                                onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                                disabled={!!editingId} />
                            <p className="text-xs text-gray-400">Gợi ý: LUONG-{new Date().getFullYear()}-{String(new Date().getMonth() + 1).padStart(2, '0')}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label>Từ ngày <span className="text-red-500">*</span></Label>
                                <input type="date" className="h-9 w-full px-3 rounded-md border border-gray-200 text-sm bg-white focus:ring-2 focus:ring-[#E8890C] focus:outline-none"
                                    value={form.periodStart} onChange={e => setForm(f => ({ ...f, periodStart: e.target.value }))} />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Đến ngày <span className="text-red-500">*</span></Label>
                                <input type="date" className="h-9 w-full px-3 rounded-md border border-gray-200 text-sm bg-white focus:ring-2 focus:ring-[#E8890C] focus:outline-none"
                                    value={form.periodEnd} onChange={e => setForm(f => ({ ...f, periodEnd: e.target.value }))} />
                            </div>
                        </div>
                        {form.periodStart && form.periodEnd && (
                            <div className="rounded-lg bg-orange-50 border border-orange-100 p-3 text-sm text-[#E8890C]">
                                <span className="font-medium">Kỳ lương:</span> {formatDate(form.periodStart)} → {formatDate(form.periodEnd)}
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>Huỷ</Button>
                        <Button onClick={handleSave} disabled={saving}>
                            {saving ? <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" /> : editingId ? 'Cập nhật' : 'Tạo kỳ lương'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
