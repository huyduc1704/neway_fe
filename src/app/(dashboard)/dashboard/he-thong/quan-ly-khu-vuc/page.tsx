'use client';
import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Pencil, Trash2, Search, Plus, X } from 'lucide-react';
import api from '@/lib/api';
import PageHeader from '@/components/common/PageHeader';
import { DataTable, Column } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import dayjs from 'dayjs';

interface Branch  { id: string; name: string; }
interface Region  {
    id: string; name: string; createdAt: string;
    branches: Branch[];
    _count?: { branches: number };
}

const EMPTY_FORM = { name: '', branchIds: [] as string[] };

export default function QuanLyKhuVucPage() {
    const [regions,  setRegions]  = useState<Region[]>([]);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [loading,  setLoading]  = useState(false);
    const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 });
    const [searchInput, setSearchInput] = useState('');
    const [search, setSearch]     = useState('');

    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingId,  setEditingId]  = useState<string | null>(null);
    const [form,       setForm]       = useState(EMPTY_FORM);
    const [saving,     setSaving]     = useState(false);
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});

    const fetchRegions = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/regions', { params: { page: pagination.page, limit: pagination.limit, search: search || undefined } });
            setRegions(data.data ?? data);
            if (data.meta) setPagination(p => ({ ...p, total: data.meta.total }));
        } catch { toast.error('Không thể tải danh sách khu vực'); }
        finally { setLoading(false); }
    }, [pagination.page, pagination.limit, search]);

    useEffect(() => { fetchRegions(); }, [fetchRegions]);
    useEffect(() => {
        api.get('/branches', { params: { limit: 200 } }).then(({ data }) => setBranches(data.data ?? [])).catch(() => {});
    }, []);

    const openCreate = () => { setEditingId(null); setForm(EMPTY_FORM); setFormErrors({}); setDialogOpen(true); };
    const openEdit   = async (r: Region) => {
        setEditingId(r.id);
        try {
            const { data } = await api.get(`/regions/${r.id}`);
            setForm({ name: data.name, branchIds: data.branches?.map((b: Branch) => b.id) ?? [] });
        } catch {
            setForm({ name: r.name, branchIds: r.branches?.map(b => b.id) ?? [] });
        }
        setFormErrors({});
        setDialogOpen(true);
    };

    const validate = () => {
        const e: Record<string, string> = {};
        if (!form.name.trim()) e.name = 'Nhập tên khu vực';
        setFormErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSave = async () => {
        if (!validate()) return;
        setSaving(true);
        try {
            const payload = { name: form.name, branchIds: form.branchIds };
            if (editingId) {
                await api.patch(`/regions/${editingId}`, payload);
                toast.success('Cập nhật khu vực thành công');
            } else {
                await api.post('/regions', payload);
                toast.success('Tạo khu vực thành công');
            }
            setDialogOpen(false);
            fetchRegions();
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Thao tác thất bại');
        } finally { setSaving(false); }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Xoá khu vực này? Hành động không thể hoàn tác.')) return;
        try {
            await api.delete(`/regions/${id}`);
            toast.success('Đã xoá khu vực');
            fetchRegions();
        } catch (err: any) { toast.error(err?.response?.data?.message || 'Thao tác thất bại'); }
    };

    const toggleBranch = (id: string) => {
        setForm(f => ({
            ...f,
            branchIds: f.branchIds.includes(id) ? f.branchIds.filter(b => b !== id) : [...f.branchIds, id],
        }));
    };

    const columns: Column<Region>[] = [
        { key: 'stt', title: 'STT', width: 52, align: 'center', render: (_, __, i) => (pagination.page - 1) * pagination.limit + i + 1 },
        { key: 'name', title: 'Tên khu vực', render: (_, r) => <span className="font-medium">{r.name}</span> },
        {
            key: 'branches', title: 'Chi nhánh trực thuộc',
            render: (_, r) => {
                const list = r.branches ?? [];
                if (!list.length) return <span className="text-gray-400 text-sm">—</span>;
                return (
                    <div className="flex flex-wrap gap-1">
                        {list.slice(0, 3).map(b => <Badge key={b.id} variant="secondary" className="text-xs">{b.name}</Badge>)}
                        {list.length > 3 && <Badge variant="secondary" className="text-xs">+{list.length - 3}</Badge>}
                    </div>
                );
            },
        },
        { key: 'createdAt', title: 'Ngày tạo', width: 120, align: 'center', render: (_, r) => dayjs(r.createdAt).format('DD/MM/YYYY') },
        {
            key: 'actions', title: 'Thao tác', width: 90, align: 'center',
            render: (_, r) => (
                <div className="flex items-center justify-center gap-1">
                    <button title="Chỉnh sửa" className="p-1.5 rounded hover:bg-orange-50 text-gray-500 hover:text-[#E8890C]" onClick={() => openEdit(r)}><Pencil className="h-4 w-4" /></button>
                    <button title="Xoá" className="p-1.5 rounded hover:bg-red-50 text-gray-500 hover:text-red-500" onClick={() => handleDelete(r.id)}><Trash2 className="h-4 w-4" /></button>
                </div>
            ),
        },
    ];

    return (
        <>
            <PageHeader title="Hệ thống / Quản lý khu vực" />
            <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex gap-2 mb-4">
                    <div className="flex items-center gap-1 rounded-full border border-gray-200 px-3 h-9 w-60">
                        <Search className="h-4 w-4 text-gray-400 shrink-0" />
                        <input className="outline-none text-sm flex-1 bg-transparent placeholder-gray-400" placeholder="Tìm theo tên khu vực..." value={searchInput} onChange={e => setSearchInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { setSearch(searchInput); setPagination(p => ({ ...p, page: 1 })); } }} />
                        {searchInput && <button onClick={() => { setSearchInput(''); setSearch(''); }}><X className="h-3.5 w-3.5 text-gray-400" /></button>}
                    </div>
                    <Button className="ml-auto" onClick={openCreate}><Plus className="h-4 w-4 mr-1" /> Thêm mới</Button>
                </div>

                <DataTable columns={columns} data={regions} rowKey="id" loading={loading} pageSize={pagination.limit} />

                {pagination.total > pagination.limit && (
                    <div className="flex items-center justify-between mt-3 text-sm text-gray-500">
                        <span>Tổng: {pagination.total} khu vực</span>
                        <div className="flex items-center gap-1">
                            <button className="px-3 py-1 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-40" disabled={pagination.page === 1} onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}>Trước</button>
                            <span className="px-3 py-1">{pagination.page}</span>
                            <button className="px-3 py-1 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-40" disabled={pagination.page * pagination.limit >= pagination.total} onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}>Sau</button>
                        </div>
                    </div>
                )}
            </div>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader><DialogTitle>{editingId ? 'Chỉnh sửa khu vực' : 'Thêm khu vực mới'}</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-2">
                        <div>
                            <Label>Tên khu vực <span className="text-red-500">*</span></Label>
                            <Input className="mt-1" placeholder="VD: Khu vực Hà Nội" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                            {formErrors.name && <p className="text-red-500 text-xs mt-1">{formErrors.name}</p>}
                        </div>
                        <div>
                            <Label>Chi nhánh trực thuộc</Label>
                            <div className="mt-2 border border-gray-200 rounded-md max-h-48 overflow-y-auto">
                                {branches.length === 0 && <p className="text-sm text-gray-400 px-3 py-2">Chưa có chi nhánh</p>}
                                {branches.map(b => (
                                    <label key={b.id} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer text-sm">
                                        <input
                                            type="checkbox"
                                            className="h-4 w-4 accent-[#E8890C]"
                                            checked={form.branchIds.includes(b.id)}
                                            onChange={() => toggleBranch(b.id)}
                                        />
                                        {b.name}
                                    </label>
                                ))}
                            </div>
                            {form.branchIds.length > 0 && (
                                <p className="text-xs text-gray-400 mt-1">Đã chọn {form.branchIds.length} chi nhánh</p>
                            )}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>Huỷ</Button>
                        <Button onClick={handleSave} disabled={saving}>
                            {saving && <span className="mr-2 h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin inline-block" />}
                            Lưu
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
