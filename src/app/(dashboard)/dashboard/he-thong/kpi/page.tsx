'use client';
import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Pencil, Trash2, Plus, Copy, Target } from 'lucide-react';
import api from '@/lib/api';
import PageHeader from '@/components/common/PageHeader';
import { DataTable, Column } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency } from '@/lib/utils';

interface KpiTarget {
    id: string; targetType: 'TEAM' | 'BRANCH';
    periodYear: number; periodMonth: number;
    targetValue: string; note: string | null;
    team: { id: string; code: string; name: string } | null;
    branch: { id: string; code: string; name: string } | null;
    createdAt: string;
}
interface Branch { id: string; code: string; name: string; }
interface Team { id: string; code: string; name: string; }

const MONTHS = Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: `Tháng ${i + 1}` }));
const EMPTY_FORM = { targetType: 'TEAM' as 'TEAM' | 'BRANCH', teamId: '', branchId: '', periodYear: new Date().getFullYear(), periodMonth: new Date().getMonth() + 1, targetValue: '', note: '' };
const EMPTY_COPY = { fromYear: new Date().getFullYear(), fromMonth: new Date().getMonth(), toYear: new Date().getFullYear(), toMonth: new Date().getMonth() + 1 };

export default function KpiPage() {
    const [kpis, setKpis] = useState<KpiTarget[]>([]);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);
    const [loading, setLoading] = useState(false);
    const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 });

    const [typeFilter, setTypeFilter] = useState('');
    const [branchFilter, setBranchFilter] = useState('');
    const [teamFilter, setTeamFilter] = useState('');
    const [yearFilter, setYearFilter] = useState('');
    const [monthFilter, setMonthFilter] = useState('');

    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);

    const [copyOpen, setCopyOpen] = useState(false);
    const [copyForm, setCopyForm] = useState(EMPTY_COPY);
    const [copying, setCopying] = useState(false);

    const fetchKpis = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/kpi-targets', {
                params: {
                    page: pagination.page, limit: pagination.limit,
                    targetType: typeFilter || undefined,
                    branchId: branchFilter || undefined,
                    teamId: teamFilter || undefined,
                    periodYear: yearFilter || undefined,
                    periodMonth: monthFilter || undefined,
                },
            });
            setKpis(data.data);
            setPagination(p => ({ ...p, total: data.meta.total }));
        } catch { toast.error('Không thể tải danh sách KPI'); }
        finally { setLoading(false); }
    }, [pagination.page, pagination.limit, typeFilter, branchFilter, teamFilter, yearFilter, monthFilter]);

    useEffect(() => { fetchKpis(); }, [fetchKpis]);

    useEffect(() => {
        api.get('/branches', { params: { limit: 100 } }).then(({ data }) => setBranches(data.data)).catch(() => {});
        api.get('/teams', { params: { limit: 100 } }).then(({ data }) => setTeams(data.data)).catch(() => {});
    }, []);

    const openCreate = () => { setEditingId(null); setForm(EMPTY_FORM); setDialogOpen(true); };
    const openEdit = (k: KpiTarget) => {
        setEditingId(k.id);
        setForm({ targetType: k.targetType, teamId: k.team?.id ?? '', branchId: k.branch?.id ?? '', periodYear: k.periodYear, periodMonth: k.periodMonth, targetValue: k.targetValue, note: k.note ?? '' });
        setDialogOpen(true);
    };

    const handleSave = async () => {
        if (!form.targetValue || Number(form.targetValue) <= 0) { toast.error('Giá trị KPI phải lớn hơn 0'); return; }
        setSaving(true);
        try {
            if (editingId) {
                await api.patch(`/kpi-targets/${editingId}`, { targetValue: Number(form.targetValue), note: form.note || undefined });
                toast.success('Cập nhật KPI thành công');
            } else {
                await api.post('/kpi-targets', {
                    targetType: form.targetType,
                    teamId: form.targetType === 'TEAM' ? form.teamId || undefined : undefined,
                    branchId: form.targetType === 'BRANCH' ? form.branchId || undefined : undefined,
                    periodYear: form.periodYear, periodMonth: form.periodMonth,
                    targetValue: Number(form.targetValue), note: form.note || undefined,
                });
                toast.success('Tạo KPI thành công');
            }
            setDialogOpen(false); fetchKpis();
        } catch (err: any) { toast.error(err?.response?.data?.message || 'Thao tác thất bại'); }
        finally { setSaving(false); }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Xoá KPI target này?')) return;
        try {
            await api.delete(`/kpi-targets/${id}`);
            toast.success('Đã xoá KPI');
            fetchKpis();
        } catch (err: any) { toast.error(err?.response?.data?.message || 'Thao tác thất bại'); }
    };

    const handleCopy = async () => {
        setCopying(true);
        try {
            const res = await api.post('/kpi-targets/copy', {
                fromYear: copyForm.fromYear, fromMonth: copyForm.fromMonth,
                toYear: copyForm.toYear, toMonth: copyForm.toMonth,
            });
            toast.success(res.data.message);
            setCopyOpen(false); fetchKpis();
        } catch (err: any) { toast.error(err?.response?.data?.message || 'Copy thất bại'); }
        finally { setCopying(false); }
    };

    const columns: Column<KpiTarget>[] = [
        { key: 'stt', title: 'STT', width: 60, align: 'center', render: (_, __, i) => (pagination.page - 1) * pagination.limit + i + 1 },
        {
            key: 'type', title: 'Loại', width: 100, align: 'center',
            render: (_, r) => <Badge variant={r.targetType === 'TEAM' ? 'navy' : 'default'}>{r.targetType}</Badge>,
        },
        {
            key: 'target', title: 'Đối tượng',
            render: (_, r) => {
                const entity = r.targetType === 'TEAM' ? r.team : r.branch;
                return entity ? (
                    <div>
                        <span className="font-medium text-[#1A2B5A]">{entity.name}</span>
                        <span className="text-xs text-gray-400 ml-1.5">({entity.code})</span>
                    </div>
                ) : <span className="text-gray-400">—</span>;
            },
        },
        {
            key: 'period', title: 'Kỳ', width: 120, align: 'center',
            render: (_, r) => <span className="font-medium">T{r.periodMonth}/{r.periodYear}</span>,
        },
        {
            key: 'targetValue', title: 'KPI', width: 180, align: 'right',
            render: (_, r) => <span className="font-bold text-[#E8890C]">{formatCurrency(Number(r.targetValue))}</span>,
        },
        { key: 'note', title: 'Ghi chú', render: (_, r) => r.note ?? <span className="text-gray-400">—</span> },
        {
            key: 'actions', title: 'Thao tác', width: 100, align: 'center',
            render: (_, r) => (
                <div className="flex items-center justify-center gap-1">
                    <button title="Chỉnh sửa" onClick={() => openEdit(r)}
                        className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-[#E8890C] transition-colors">
                        <Pencil className="h-4 w-4" />
                    </button>
                    <button title="Xoá" onClick={() => handleDelete(r.id)}
                        className="p-1.5 rounded hover:bg-red-50 text-gray-500 hover:text-red-500 transition-colors">
                        <Trash2 className="h-4 w-4" />
                    </button>
                </div>
            ),
        },
    ];

    return (
        <>
            <PageHeader title="Quản lý KPI" description="Thiết lập chỉ tiêu KPI theo kỳ cho team và chi nhánh"
                actions={
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => { setCopyForm(EMPTY_COPY); setCopyOpen(true); }}>
                            <Copy className="h-4 w-4" /> Copy từ tháng trước
                        </Button>
                        <Button onClick={openCreate}>
                            <Plus className="h-4 w-4" /> Thêm KPI
                        </Button>
                    </div>
                }
            />

            {/* Filters */}
            <Card className="mb-4">
                <CardContent className="p-4 flex flex-wrap items-center gap-3">
                    <Select value={typeFilter} onValueChange={v => { setTypeFilter(v === '__all__' ? '' : v); setPagination(p => ({ ...p, page: 1 })); }}>
                        <SelectTrigger className="w-36"><SelectValue placeholder="Tất cả loại" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="__all__">Tất cả loại</SelectItem>
                            <SelectItem value="TEAM">Team</SelectItem>
                            <SelectItem value="BRANCH">Chi nhánh</SelectItem>
                        </SelectContent>
                    </Select>
                    <Select value={branchFilter} onValueChange={v => { setBranchFilter(v === '__all__' ? '' : v); setPagination(p => ({ ...p, page: 1 })); }}>
                        <SelectTrigger className="w-44"><SelectValue placeholder="Tất cả chi nhánh" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="__all__">Tất cả chi nhánh</SelectItem>
                            {branches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Select value={teamFilter} onValueChange={v => { setTeamFilter(v === '__all__' ? '' : v); setPagination(p => ({ ...p, page: 1 })); }}>
                        <SelectTrigger className="w-40"><SelectValue placeholder="Tất cả team" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="__all__">Tất cả team</SelectItem>
                            {teams.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Input type="number" placeholder="Năm" className="w-24" value={yearFilter}
                        onChange={e => { setYearFilter(e.target.value); setPagination(p => ({ ...p, page: 1 })); }} />
                    <Select value={monthFilter} onValueChange={v => { setMonthFilter(v === '__all__' ? '' : v); setPagination(p => ({ ...p, page: 1 })); }}>
                        <SelectTrigger className="w-32"><SelectValue placeholder="Tháng" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="__all__">Tất cả tháng</SelectItem>
                            {MONTHS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="p-0">
                    <DataTable columns={columns} data={kpis} rowKey="id" loading={loading} pageSize={pagination.limit} />
                </CardContent>
            </Card>

            {/* Create/Edit Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Target className="h-5 w-5 text-[#E8890C]" />
                            {editingId ? 'Cập nhật KPI' : 'Thêm KPI mới'}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        {!editingId && (
                            <div className="space-y-1.5">
                                <Label>Loại đối tượng <span className="text-red-500">*</span></Label>
                                <Select value={form.targetType} onValueChange={v => setForm(f => ({ ...f, targetType: v as any, teamId: '', branchId: '' }))}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="TEAM">Team</SelectItem>
                                        <SelectItem value="BRANCH">Chi nhánh</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                        {!editingId && form.targetType === 'TEAM' && (
                            <div className="space-y-1.5">
                                <Label>Team <span className="text-red-500">*</span></Label>
                                <Select value={form.teamId} onValueChange={v => setForm(f => ({ ...f, teamId: v }))}>
                                    <SelectTrigger><SelectValue placeholder="Chọn team" /></SelectTrigger>
                                    <SelectContent>
                                        {teams.map(t => <SelectItem key={t.id} value={t.id}>{t.name} ({t.code})</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                        {!editingId && form.targetType === 'BRANCH' && (
                            <div className="space-y-1.5">
                                <Label>Chi nhánh <span className="text-red-500">*</span></Label>
                                <Select value={form.branchId} onValueChange={v => setForm(f => ({ ...f, branchId: v }))}>
                                    <SelectTrigger><SelectValue placeholder="Chọn chi nhánh" /></SelectTrigger>
                                    <SelectContent>
                                        {branches.map(b => <SelectItem key={b.id} value={b.id}>{b.name} ({b.code})</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                        {!editingId && (
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label>Năm <span className="text-red-500">*</span></Label>
                                    <Input type="number" min={2020} max={2100} value={form.periodYear}
                                        onChange={e => setForm(f => ({ ...f, periodYear: Number(e.target.value) }))} />
                                </div>
                                <div className="space-y-1.5">
                                    <Label>Tháng <span className="text-red-500">*</span></Label>
                                    <Select value={String(form.periodMonth)} onValueChange={v => setForm(f => ({ ...f, periodMonth: Number(v) }))}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {MONTHS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        )}
                        <div className="space-y-1.5">
                            <Label>Giá trị KPI (VNĐ) <span className="text-red-500">*</span></Label>
                            <Input type="number" min={0} placeholder="VD: 500000000" value={form.targetValue}
                                onChange={e => setForm(f => ({ ...f, targetValue: e.target.value }))} />
                            {form.targetValue && Number(form.targetValue) > 0 && (
                                <p className="text-xs text-[#E8890C] font-medium">= {formatCurrency(Number(form.targetValue))}</p>
                            )}
                        </div>
                        <div className="space-y-1.5">
                            <Label>Ghi chú</Label>
                            <Input placeholder="Ghi chú thêm (tuỳ chọn)" value={form.note}
                                onChange={e => setForm(f => ({ ...f, note: e.target.value }))} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>Huỷ</Button>
                        <Button onClick={handleSave} disabled={saving}>
                            {saving ? <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" /> : editingId ? 'Cập nhật' : 'Tạo mới'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Copy Dialog */}
            <Dialog open={copyOpen} onOpenChange={setCopyOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Copy className="h-5 w-5 text-[#E8890C]" /> Copy KPI từ tháng trước
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <p className="text-sm text-gray-500">Copy toàn bộ KPI từ kỳ nguồn sang kỳ đích. Các KPI đã tồn tại ở kỳ đích sẽ được bỏ qua.</p>
                        <div className="p-3 rounded-lg bg-gray-50 space-y-3">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Kỳ nguồn</p>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label>Năm</Label>
                                    <Input type="number" min={2020} value={copyForm.fromYear}
                                        onChange={e => setCopyForm(f => ({ ...f, fromYear: Number(e.target.value) }))} />
                                </div>
                                <div className="space-y-1.5">
                                    <Label>Tháng</Label>
                                    <Select value={String(copyForm.fromMonth)} onValueChange={v => setCopyForm(f => ({ ...f, fromMonth: Number(v) }))}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>{MONTHS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>
                        <div className="p-3 rounded-lg bg-orange-50 space-y-3">
                            <p className="text-xs font-semibold text-[#E8890C] uppercase tracking-wide">Kỳ đích</p>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label>Năm</Label>
                                    <Input type="number" min={2020} value={copyForm.toYear}
                                        onChange={e => setCopyForm(f => ({ ...f, toYear: Number(e.target.value) }))} />
                                </div>
                                <div className="space-y-1.5">
                                    <Label>Tháng</Label>
                                    <Select value={String(copyForm.toMonth)} onValueChange={v => setCopyForm(f => ({ ...f, toMonth: Number(v) }))}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>{MONTHS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCopyOpen(false)}>Huỷ</Button>
                        <Button onClick={handleCopy} disabled={copying}>
                            {copying ? <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" /> : 'Copy KPI'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
