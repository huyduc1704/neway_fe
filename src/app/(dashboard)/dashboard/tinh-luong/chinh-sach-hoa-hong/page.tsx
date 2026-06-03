'use client';
import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Pencil, Trash2, Search, PowerOff, Plus, X, BadgePercent } from 'lucide-react';
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
import { formatCurrency, formatDate } from '@/lib/utils';

interface Policy {
    id: string; code: string; name: string;
    valueType: 'PERCENT' | 'FIXED'; value: string;
    effectiveFrom: string; effectiveTo: string | null;
    isActive: boolean; note: string | null;
    role: { id: string; code: string; name: string };
    branch: { id: string; code: string; name: string } | null;
    team: { id: string; code: string; name: string } | null;
}
interface Role { id: string; code: string; name: string; }
interface Branch { id: string; code: string; name: string; }
interface Team { id: string; code: string; name: string; }

const EMPTY_FORM = {
    code: '', name: '', roleId: '', branchId: '', teamId: '',
    valueType: 'PERCENT' as 'PERCENT' | 'FIXED', value: '',
    effectiveFrom: '', effectiveTo: '', note: '',
};

export default function ChinhSachHoaHongPage() {
    const [policies, setPolicies] = useState<Policy[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);
    const [loading, setLoading] = useState(false);
    const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 });

    const [searchInput, setSearchInput] = useState('');
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [branchFilter, setBranchFilter] = useState('');
    const [teamFilter, setTeamFilter] = useState('');
    const [activeFilter, setActiveFilter] = useState('');

    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);

    const fetchPolicies = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/commission-policies', {
                params: {
                    page: pagination.page, limit: pagination.limit,
                    search: search || undefined,
                    roleId: roleFilter || undefined,
                    branchId: branchFilter || undefined,
                    teamId: teamFilter || undefined,
                    isActive: activeFilter !== '' ? activeFilter === 'true' : undefined,
                },
            });
            setPolicies(data.data);
            setPagination(p => ({ ...p, total: data.meta.total }));
        } catch { toast.error('Không thể tải danh sách chính sách hoa hồng'); }
        finally { setLoading(false); }
    }, [pagination.page, pagination.limit, search, roleFilter, branchFilter, teamFilter, activeFilter]);

    useEffect(() => { fetchPolicies(); }, [fetchPolicies]);

    useEffect(() => {
        api.get('/roles', { params: { limit: 100 } }).then(({ data }) => setRoles(data.data)).catch(() => {});
        api.get('/branches', { params: { limit: 100 } }).then(({ data }) => setBranches(data.data)).catch(() => {});
        api.get('/teams', { params: { limit: 100 } }).then(({ data }) => setTeams(data.data)).catch(() => {});
    }, []);

    const openCreate = () => { setEditingId(null); setForm(EMPTY_FORM); setDialogOpen(true); };
    const openEdit = (p: Policy) => {
        setEditingId(p.id);
        setForm({
            code: p.code, name: p.name, roleId: p.role.id,
            branchId: p.branch?.id ?? '', teamId: p.team?.id ?? '',
            valueType: p.valueType, value: p.value,
            effectiveFrom: p.effectiveFrom?.slice(0, 10) ?? '',
            effectiveTo: p.effectiveTo?.slice(0, 10) ?? '',
            note: p.note ?? '',
        });
        setDialogOpen(true);
    };

    const handleSave = async () => {
        if (!form.name.trim()) { toast.error('Tên chính sách không được để trống'); return; }
        if (!form.effectiveFrom) { toast.error('Ngày hiệu lực không được để trống'); return; }
        if (!editingId && !form.code.trim()) { toast.error('Mã chính sách không được để trống'); return; }
        if (!editingId && !form.roleId) { toast.error('Vui lòng chọn vai trò'); return; }
        setSaving(true);
        try {
            if (editingId) {
                await api.patch(`/commission-policies/${editingId}`, {
                    name: form.name,
                    branchId: form.branchId || undefined,
                    teamId: form.teamId || undefined,
                    effectiveFrom: form.effectiveFrom,
                    effectiveTo: form.effectiveTo || undefined,
                    note: form.note || undefined,
                });
                toast.success('Cập nhật chính sách thành công');
            } else {
                await api.post('/commission-policies', {
                    code: form.code, name: form.name, roleId: form.roleId,
                    branchId: form.branchId || undefined, teamId: form.teamId || undefined,
                    valueType: form.valueType, value: Number(form.value),
                    effectiveFrom: form.effectiveFrom,
                    effectiveTo: form.effectiveTo || undefined,
                    note: form.note || undefined,
                });
                toast.success('Tạo chính sách thành công');
            }
            setDialogOpen(false); fetchPolicies();
        } catch (err: any) { toast.error(err?.response?.data?.message || 'Thao tác thất bại'); }
        finally { setSaving(false); }
    };

    const handleDeactivate = async (id: string, name: string) => {
        if (!window.confirm(`Vô hiệu hoá chính sách "${name}"?`)) return;
        try {
            await api.patch(`/commission-policies/${id}/deactivate`);
            toast.success('Đã vô hiệu hoá chính sách');
            fetchPolicies();
        } catch (err: any) { toast.error(err?.response?.data?.message || 'Thao tác thất bại'); }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!window.confirm(`Xoá chính sách "${name}"?`)) return;
        try {
            await api.delete(`/commission-policies/${id}`);
            toast.success('Đã xoá chính sách');
            fetchPolicies();
        } catch (err: any) { toast.error(err?.response?.data?.message || 'Thao tác thất bại'); }
    };

    const formatValue = (p: Policy) => {
        if (p.valueType === 'PERCENT') return `${Number(p.value)}%`;
        return formatCurrency(Number(p.value));
    };

    const formatScope = (p: Policy) => {
        if (p.branch && p.team) return `${p.branch.name} / ${p.team.name}`;
        if (p.branch) return p.branch.name;
        if (p.team) return p.team.name;
        return <span className="text-gray-400 italic">Toàn hệ thống</span>;
    };

    const columns: Column<Policy>[] = [
        { key: 'stt', title: 'STT', width: 60, align: 'center', render: (_, __, i) => (pagination.page - 1) * pagination.limit + i + 1 },
        { key: 'code', title: 'Mã policy', width: 130, render: (_, r) => <Badge variant="outline">{r.code}</Badge> },
        { key: 'name', title: 'Tên chính sách', render: (_, r) => <span className="font-medium text-[#1A2B5A]">{r.name}</span> },
        { key: 'role', title: 'Vai trò', width: 140, render: (_, r) => <Badge variant="secondary">{r.role.name}</Badge> },
        { key: 'scope', title: 'Áp dụng cho', width: 200, render: (_, r) => formatScope(r) },
        {
            key: 'valueType', title: 'Loại', width: 90, align: 'center',
            render: (_, r) => <Badge variant={r.valueType === 'PERCENT' ? 'processing' : 'warning'}>{r.valueType === 'PERCENT' ? '%' : 'VNĐ'}</Badge>,
        },
        { key: 'value', title: 'Giá trị', width: 130, align: 'right', render: (_, r) => <span className="font-bold text-[#E8890C]">{formatValue(r)}</span> },
        { key: 'effectiveFrom', title: 'Hiệu lực từ', width: 120, align: 'center', render: (_, r) => formatDate(r.effectiveFrom) },
        { key: 'effectiveTo', title: 'Đến ngày', width: 120, align: 'center', render: (_, r) => r.effectiveTo ? formatDate(r.effectiveTo) : <span className="text-gray-400">—</span> },
        {
            key: 'status', title: 'Trạng thái', width: 130, align: 'center',
            render: (_, r) => <Badge variant={r.isActive ? 'success' : 'secondary'}>{r.isActive ? 'Đang áp dụng' : 'Vô hiệu'}</Badge>,
        },
        {
            key: 'actions', title: 'Thao tác', width: 120, align: 'center',
            render: (_, r) => (
                <div className="flex items-center justify-center gap-1">
                    <button title="Chỉnh sửa" onClick={() => openEdit(r)}
                        className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-[#E8890C] transition-colors">
                        <Pencil className="h-4 w-4" />
                    </button>
                    {r.isActive && (
                        <button title="Vô hiệu hoá" onClick={() => handleDeactivate(r.id, r.name)}
                            className="p-1.5 rounded hover:bg-yellow-50 text-gray-500 hover:text-yellow-600 transition-colors">
                            <PowerOff className="h-4 w-4" />
                        </button>
                    )}
                    <button title="Xoá" onClick={() => handleDelete(r.id, r.name)}
                        className="p-1.5 rounded hover:bg-red-50 text-gray-500 hover:text-red-500 transition-colors">
                        <Trash2 className="h-4 w-4" />
                    </button>
                </div>
            ),
        },
    ];

    return (
        <>
            <PageHeader title="Chính sách hoa hồng" description="Quản lý tỷ lệ hoa hồng theo vai trò, chi nhánh, team"
                actions={<Button onClick={openCreate}><Plus className="h-4 w-4" /> Thêm chính sách</Button>}
            />

            {/* Filters */}
            <Card className="mb-4">
                <CardContent className="p-4 flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 h-9 min-w-[220px]">
                        <Search className="h-4 w-4 text-gray-400 shrink-0" />
                        <input className="outline-none text-sm w-full bg-transparent placeholder-gray-400"
                            placeholder="Tìm mã hoặc tên chính sách..."
                            value={searchInput} onChange={e => setSearchInput(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') { setSearch(searchInput); setPagination(p => ({ ...p, page: 1 })); } }} />
                        {searchInput && <button onClick={() => { setSearchInput(''); setSearch(''); }}><X className="h-3.5 w-3.5 text-gray-400" /></button>}
                    </div>
                    <Select value={roleFilter} onValueChange={v => { setRoleFilter(v === '__all__' ? '' : v); setPagination(p => ({ ...p, page: 1 })); }}>
                        <SelectTrigger className="w-40"><SelectValue placeholder="Tất cả vai trò" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="__all__">Tất cả vai trò</SelectItem>
                            {roles.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
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
                    <Select value={activeFilter} onValueChange={v => { setActiveFilter(v === '__all__' ? '' : v); setPagination(p => ({ ...p, page: 1 })); }}>
                        <SelectTrigger className="w-40"><SelectValue placeholder="Tất cả trạng thái" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="__all__">Tất cả trạng thái</SelectItem>
                            <SelectItem value="true">Đang áp dụng</SelectItem>
                            <SelectItem value="false">Vô hiệu</SelectItem>
                        </SelectContent>
                    </Select>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="p-0">
                    <DataTable columns={columns} data={policies} rowKey="id" loading={loading} pageSize={pagination.limit} />
                </CardContent>
            </Card>

            {/* Create/Edit Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <BadgePercent className="h-5 w-5 text-[#E8890C]" />
                            {editingId ? 'Cập nhật chính sách hoa hồng' : 'Thêm chính sách hoa hồng'}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label>Mã chính sách <span className="text-red-500">*</span></Label>
                                <Input placeholder="VD: POL-SALE-HN" value={form.code}
                                    onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                                    disabled={!!editingId} />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Vai trò <span className="text-red-500">*</span></Label>
                                <Select value={form.roleId} onValueChange={v => setForm(f => ({ ...f, roleId: v }))} disabled={!!editingId}>
                                    <SelectTrigger><SelectValue placeholder="Chọn vai trò" /></SelectTrigger>
                                    <SelectContent>
                                        {roles.map(r => <SelectItem key={r.id} value={r.id}>{r.name} ({r.code})</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label>Tên chính sách <span className="text-red-500">*</span></Label>
                            <Input placeholder="VD: Hoa hồng Sale Hà Nội 2025" value={form.name}
                                onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label>Chi nhánh áp dụng</Label>
                                <Select value={form.branchId} onValueChange={v => setForm(f => ({ ...f, branchId: v === '__none__' ? '' : v }))}>
                                    <SelectTrigger><SelectValue placeholder="Tất cả chi nhánh" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="__none__">Tất cả chi nhánh</SelectItem>
                                        {branches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label>Team áp dụng</Label>
                                <Select value={form.teamId} onValueChange={v => setForm(f => ({ ...f, teamId: v === '__none__' ? '' : v }))}>
                                    <SelectTrigger><SelectValue placeholder="Tất cả team" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="__none__">Tất cả team</SelectItem>
                                        {teams.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label>Loại giá trị <span className="text-red-500">*</span></Label>
                                <Select value={form.valueType} onValueChange={v => setForm(f => ({ ...f, valueType: v as any }))} disabled={!!editingId}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="PERCENT">Phần trăm (%)</SelectItem>
                                        <SelectItem value="FIXED">Cố định (VNĐ)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label>Giá trị <span className="text-red-500">*</span></Label>
                                <Input type="number" min={0} max={form.valueType === 'PERCENT' ? 100 : undefined}
                                    placeholder={form.valueType === 'PERCENT' ? 'VD: 15 (= 15%)' : 'VD: 500000'}
                                    value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))}
                                    disabled={!!editingId} />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label>Hiệu lực từ <span className="text-red-500">*</span></Label>
                                <input type="date" className="h-9 w-full px-3 rounded-md border border-gray-200 text-sm bg-white focus:ring-2 focus:ring-[#E8890C] focus:outline-none"
                                    value={form.effectiveFrom} onChange={e => setForm(f => ({ ...f, effectiveFrom: e.target.value }))} />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Hiệu lực đến <span className="text-gray-400 text-xs">(để trống = không hạn)</span></Label>
                                <input type="date" className="h-9 w-full px-3 rounded-md border border-gray-200 text-sm bg-white focus:ring-2 focus:ring-[#E8890C] focus:outline-none"
                                    value={form.effectiveTo} onChange={e => setForm(f => ({ ...f, effectiveTo: e.target.value }))} />
                            </div>
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
        </>
    );
}
