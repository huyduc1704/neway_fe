'use client';
import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Pencil, Trash2, Search, PowerOff, Plus, X, Building2 } from 'lucide-react';
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

interface Region { id: string; name: string; }
interface Branch {
    id: string; code: string; name: string;
    province: string | null; ward: string | null;
    regionId: string | null; isActive: boolean;
    region: { id: string; name: string } | null;
    createdAt: string;
}

const EMPTY_FORM = { code: '', name: '', province: '', ward: '', regionId: '' };

export default function ChiNhanhPage() {
    const [branches, setBranches] = useState<Branch[]>([]);
    const [regions, setRegions] = useState<Region[]>([]);
    const [loading, setLoading] = useState(false);
    const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 });

    const [searchInput, setSearchInput] = useState('');
    const [search, setSearch] = useState('');
    const [regionFilter, setRegionFilter] = useState('');
    const [activeFilter, setActiveFilter] = useState('');

    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);

    const fetchBranches = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/branches', {
                params: {
                    page: pagination.page, limit: pagination.limit,
                    search: search || undefined,
                    regionId: regionFilter || undefined,
                    isActive: activeFilter !== '' ? activeFilter === 'true' : undefined,
                },
            });
            setBranches(data.data);
            setPagination(p => ({ ...p, total: data.meta.total }));
        } catch { toast.error('Không thể tải danh sách chi nhánh'); }
        finally { setLoading(false); }
    }, [pagination.page, pagination.limit, search, regionFilter, activeFilter]);

    useEffect(() => { fetchBranches(); }, [fetchBranches]);

    useEffect(() => {
        api.get('/regions', { params: { limit: 100 } })
            .then(({ data }) => setRegions(data.data))
            .catch(() => {});
    }, []);

    const openCreate = () => { setEditingId(null); setForm(EMPTY_FORM); setDialogOpen(true); };
    const openEdit = (b: Branch) => {
        setEditingId(b.id);
        setForm({ code: b.code, name: b.name, province: b.province ?? '', ward: b.ward ?? '', regionId: b.regionId ?? '' });
        setDialogOpen(true);
    };

    const handleSave = async () => {
        if (!form.name.trim()) { toast.error('Tên chi nhánh không được để trống'); return; }
        if (!editingId && !form.code.trim()) { toast.error('Mã chi nhánh không được để trống'); return; }
        setSaving(true);
        try {
            if (editingId) {
                await api.patch(`/branches/${editingId}`, {
                    name: form.name, province: form.province || undefined,
                    ward: form.ward || undefined, regionId: form.regionId || undefined,
                });
                toast.success('Cập nhật chi nhánh thành công');
            } else {
                await api.post('/branches', {
                    code: form.code, name: form.name,
                    province: form.province || undefined,
                    ward: form.ward || undefined,
                    regionId: form.regionId || undefined,
                });
                toast.success('Tạo chi nhánh thành công');
            }
            setDialogOpen(false);
            fetchBranches();
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Thao tác thất bại');
        } finally { setSaving(false); }
    };

    const handleDeactivate = async (id: string, name: string) => {
        if (!window.confirm(`Vô hiệu hoá chi nhánh "${name}"?`)) return;
        try {
            await api.patch(`/branches/${id}/deactivate`);
            toast.success('Đã vô hiệu hoá chi nhánh');
            fetchBranches();
        } catch (err: any) { toast.error(err?.response?.data?.message || 'Thao tác thất bại'); }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!window.confirm(`Xoá chi nhánh "${name}"? Thao tác không thể hoàn tác.`)) return;
        try {
            await api.delete(`/branches/${id}`);
            toast.success('Đã xoá chi nhánh');
            fetchBranches();
        } catch (err: any) { toast.error(err?.response?.data?.message || 'Thao tác thất bại'); }
    };

    const columns: Column<Branch>[] = [
        { key: 'stt', title: 'STT', width: 60, align: 'center', render: (_, __, i) => (pagination.page - 1) * pagination.limit + i + 1 },
        { key: 'code', title: 'Mã CN', width: 110, render: (_, r) => <Badge variant="default">{r.code}</Badge> },
        { key: 'name', title: 'Tên chi nhánh', render: (_, r) => <span className="font-medium text-[#1A2B5A]">{r.name}</span> },
        { key: 'region', title: 'Khu vực', width: 160, render: (_, r) => r.region?.name ?? <span className="text-gray-400">—</span> },
        { key: 'province', title: 'Tỉnh/TP', width: 160, render: (_, r) => r.province ?? <span className="text-gray-400">—</span> },
        { key: 'ward', title: 'Phường/Xã', width: 160, render: (_, r) => r.ward ?? <span className="text-gray-400">—</span> },
        {
            key: 'status', title: 'Trạng thái', width: 140, align: 'center',
            render: (_, r) => <Badge variant={r.isActive ? 'success' : 'secondary'}>{r.isActive ? 'Hoạt động' : 'Vô hiệu'}</Badge>,
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
            <PageHeader title="Quản lý Chi nhánh" description="Danh sách chi nhánh trong hệ thống"
                actions={
                    <Button onClick={openCreate}>
                        <Plus className="h-4 w-4" /> Thêm chi nhánh
                    </Button>
                }
            />

            {/* Filters */}
            <Card className="mb-4">
                <CardContent className="p-4 flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 h-9 flex-1 min-w-[200px]">
                        <Search className="h-4 w-4 text-gray-400 shrink-0" />
                        <input className="outline-none text-sm w-full bg-transparent placeholder-gray-400"
                            placeholder="Tìm mã hoặc tên chi nhánh..." value={searchInput}
                            onChange={e => setSearchInput(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') { setSearch(searchInput); setPagination(p => ({ ...p, page: 1 })); } }} />
                        {searchInput && <button onClick={() => { setSearchInput(''); setSearch(''); }}><X className="h-3.5 w-3.5 text-gray-400" /></button>}
                    </div>
                    <Select value={regionFilter} onValueChange={v => { setRegionFilter(v === '__all__' ? '' : v); setPagination(p => ({ ...p, page: 1 })); }}>
                        <SelectTrigger className="w-44"><SelectValue placeholder="Tất cả khu vực" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="__all__">Tất cả khu vực</SelectItem>
                            {regions.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Select value={activeFilter} onValueChange={v => { setActiveFilter(v === '__all__' ? '' : v); setPagination(p => ({ ...p, page: 1 })); }}>
                        <SelectTrigger className="w-44"><SelectValue placeholder="Tất cả trạng thái" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="__all__">Tất cả trạng thái</SelectItem>
                            <SelectItem value="true">Hoạt động</SelectItem>
                            <SelectItem value="false">Vô hiệu</SelectItem>
                        </SelectContent>
                    </Select>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="p-0">
                    <DataTable columns={columns} data={branches} rowKey="id" loading={loading} pageSize={pagination.limit} />
                </CardContent>
            </Card>

            {/* Create/Edit Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Building2 className="h-5 w-5 text-[#E8890C]" />
                            {editingId ? 'Cập nhật chi nhánh' : 'Thêm chi nhánh mới'}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label>Mã chi nhánh <span className="text-red-500">*</span></Label>
                                <Input placeholder="VD: HN01" value={form.code}
                                    onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                                    disabled={!!editingId} />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Khu vực</Label>
                                <Select value={form.regionId} onValueChange={v => setForm(f => ({ ...f, regionId: v === '__none__' ? '' : v }))}>
                                    <SelectTrigger><SelectValue placeholder="Chọn khu vực" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="__none__">Không chọn</SelectItem>
                                        {regions.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label>Tên chi nhánh <span className="text-red-500">*</span></Label>
                            <Input placeholder="VD: Chi nhánh Hà Nội 1" value={form.name}
                                onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label>Tỉnh / Thành phố</Label>
                                <Input placeholder="VD: Hà Nội" value={form.province}
                                    onChange={e => setForm(f => ({ ...f, province: e.target.value }))} />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Phường / Xã</Label>
                                <Input placeholder="VD: Phú Thạnh" value={form.ward}
                                    onChange={e => setForm(f => ({ ...f, ward: e.target.value }))} />
                            </div>
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
