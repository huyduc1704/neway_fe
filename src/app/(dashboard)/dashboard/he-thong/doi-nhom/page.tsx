'use client';
import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Pencil, Trash2, Search, PowerOff, Plus, X } from 'lucide-react';
import api from '@/lib/api';
import PageHeader from '@/components/common/PageHeader';
import { DataTable, Column } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import dayjs from 'dayjs';

interface Branch { id: string; name: string; }
interface Employee { id: string; fullName: string; }
interface Team {
    id: string; name: string; code: string; isActive: boolean; createdAt: string;
    branch: { id: string; name: string } | null;
    leader: { id: string; fullName: string } | null;
}

const EMPTY_FORM = { name: '', code: '', branchId: '', leaderId: '' };

export default function DoiNhomPage() {
    const [teams,    setTeams]    = useState<Team[]>([]);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading,  setLoading]  = useState(false);
    const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 });
    const [searchInput, setSearchInput] = useState('');
    const [search, setSearch]     = useState('');
    const [branchFilter, setBranchFilter] = useState('');

    const [dialogOpen,  setDialogOpen]  = useState(false);
    const [editingId,   setEditingId]   = useState<string | null>(null);
    const [form,        setForm]        = useState(EMPTY_FORM);
    const [saving,      setSaving]      = useState(false);
    const [formErrors,  setFormErrors]  = useState<Record<string, string>>({});

    const fetchTeams = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/teams', {
                params: { page: pagination.page, limit: pagination.limit, search: search || undefined, branchId: branchFilter || undefined },
            });
            setTeams(data.data ?? data);
            if (data.meta) setPagination(p => ({ ...p, total: data.meta.total }));
        } catch { toast.error('Không thể tải danh sách đội/nhóm'); }
        finally { setLoading(false); }
    }, [pagination.page, pagination.limit, search, branchFilter]);

    useEffect(() => { fetchTeams(); }, [fetchTeams]);
    useEffect(() => {
        api.get('/branches',  { params: { limit: 200 } }).then(({ data }) => setBranches(data.data ?? [])).catch(() => {});
        api.get('/employees', { params: { limit: 500 } }).then(({ data }) => setEmployees(data.data ?? [])).catch(() => {});
    }, []);

    const openCreate = () => { setEditingId(null); setForm(EMPTY_FORM); setFormErrors({}); setDialogOpen(true); };
    const openEdit   = (t: Team) => {
        setEditingId(t.id);
        setForm({ name: t.name, code: t.code ?? '', branchId: t.branch?.id ?? '', leaderId: t.leader?.id ?? '' });
        setFormErrors({});
        setDialogOpen(true);
    };

    const validate = () => {
        const e: Record<string, string> = {};
        if (!form.name.trim()) e.name = 'Nhập tên đội/nhóm';
        setFormErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSave = async () => {
        if (!validate()) return;
        setSaving(true);
        try {
            const payload = { name: form.name, code: form.code || undefined, branchId: form.branchId || undefined, leaderId: form.leaderId || undefined };
            if (editingId) {
                await api.patch(`/teams/${editingId}`, payload);
                toast.success('Cập nhật đội/nhóm thành công');
            } else {
                await api.post('/teams', payload);
                toast.success('Tạo đội/nhóm thành công');
            }
            setDialogOpen(false);
            fetchTeams();
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Thao tác thất bại');
        } finally { setSaving(false); }
    };

    const handleDeactivate = async (id: string, isActive: boolean) => {
        if (!window.confirm(isActive ? 'Vô hiệu hoá đội/nhóm này?' : 'Kích hoạt lại đội/nhóm này?')) return;
        try {
            await api.patch(`/teams/${id}/deactivate`);
            toast.success('Đã cập nhật trạng thái');
            fetchTeams();
        } catch (err: any) { toast.error(err?.response?.data?.message || 'Thao tác thất bại'); }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Xoá đội/nhóm này? Hành động không thể hoàn tác.')) return;
        try {
            await api.delete(`/teams/${id}`);
            toast.success('Đã xoá đội/nhóm');
            fetchTeams();
        } catch (err: any) { toast.error(err?.response?.data?.message || 'Thao tác thất bại'); }
    };

    const columns: Column<Team>[] = [
        { key: 'stt', title: 'STT', width: 52, align: 'center', render: (_, __, i) => (pagination.page - 1) * pagination.limit + i + 1 },
        { key: 'name', title: 'Tên đội/nhóm', render: (_, r) => <span className="font-medium">{r.name}</span> },
        { key: 'branch', title: 'Chi nhánh', width: 180, render: (_, r) => r.branch?.name || '—' },
        { key: 'leader', title: 'Leader', width: 180, render: (_, r) => r.leader?.fullName || '—' },
        { key: 'status', title: 'Trạng thái', width: 130, align: 'center', render: (_, r) => <Badge variant={r.isActive ? 'success' : 'secondary'}>{r.isActive ? 'Hoạt động' : 'Đã vô hiệu'}</Badge> },
        { key: 'createdAt', title: 'Ngày tạo', width: 120, align: 'center', render: (_, r) => dayjs(r.createdAt).format('DD/MM/YYYY') },
        {
            key: 'actions', title: 'Thao tác', width: 110, align: 'center',
            render: (_, r) => (
                <div className="flex items-center justify-center gap-1">
                    <button title="Chỉnh sửa" className="p-1.5 rounded hover:bg-orange-50 text-gray-500 hover:text-[#E8890C]" onClick={() => openEdit(r)}><Pencil className="h-4 w-4" /></button>
                    <button title={r.isActive ? 'Vô hiệu hoá' : 'Kích hoạt'} className={`p-1.5 rounded transition-colors ${r.isActive ? 'hover:bg-yellow-50 text-gray-500 hover:text-yellow-600' : 'hover:bg-green-50 text-gray-400 hover:text-green-600'}`} onClick={() => handleDeactivate(r.id, r.isActive)}><PowerOff className="h-4 w-4" /></button>
                    <button title="Xoá" className="p-1.5 rounded hover:bg-red-50 text-gray-500 hover:text-red-500" onClick={() => handleDelete(r.id)}><Trash2 className="h-4 w-4" /></button>
                </div>
            ),
        },
    ];

    return (
        <>
            <PageHeader title="Hệ thống / Quản lý đội nhóm" />
            <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex flex-wrap gap-2 mb-4">
                    <Select value={branchFilter} onValueChange={v => { setBranchFilter(v); setPagination(p => ({ ...p, page: 1 })); }}>
                        <SelectTrigger className="w-44 h-9"><SelectValue placeholder="Chi nhánh" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="">Tất cả chi nhánh</SelectItem>
                            {branches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    {branchFilter && <button onClick={() => setBranchFilter('')} className="flex items-center gap-1 h-9 px-2 rounded border border-gray-200 text-sm text-gray-500 hover:bg-gray-50"><X className="h-3.5 w-3.5" /></button>}
                    <div className="ml-auto flex items-center gap-1 rounded-full border border-gray-200 px-3 h-9 w-60">
                        <Search className="h-4 w-4 text-gray-400 shrink-0" />
                        <input className="outline-none text-sm flex-1 bg-transparent placeholder-gray-400" placeholder="Tìm theo tên..." value={searchInput} onChange={e => setSearchInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { setSearch(searchInput); setPagination(p => ({ ...p, page: 1 })); } }} />
                    </div>
                    <Button onClick={openCreate}><Plus className="h-4 w-4 mr-1" /> Thêm mới</Button>
                </div>

                <DataTable columns={columns} data={teams} rowKey="id" loading={loading} pageSize={pagination.limit} />

                {pagination.total > pagination.limit && (
                    <div className="flex items-center justify-between mt-3 text-sm text-gray-500">
                        <span>Tổng: {pagination.total}</span>
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
                    <DialogHeader><DialogTitle>{editingId ? 'Chỉnh sửa đội/nhóm' : 'Thêm đội/nhóm mới'}</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-2">
                        <div>
                            <Label>Tên đội/nhóm <span className="text-red-500">*</span></Label>
                            <Input className="mt-1" placeholder="VD: Team Hà Nội 1" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                            {formErrors.name && <p className="text-red-500 text-xs mt-1">{formErrors.name}</p>}
                        </div>
                        <div>
                            <Label>Mã đội (tuỳ chọn)</Label>
                            <Input className="mt-1 uppercase" placeholder="VD: HN01" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} />
                        </div>
                        <div>
                            <Label>Chi nhánh</Label>
                            <Select value={form.branchId} onValueChange={v => setForm(f => ({ ...f, branchId: v }))}>
                                <SelectTrigger className="mt-1"><SelectValue placeholder="Chọn chi nhánh" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="">Không chọn</SelectItem>
                                    {branches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Leader phụ trách</Label>
                            <Select value={form.leaderId} onValueChange={v => setForm(f => ({ ...f, leaderId: v }))}>
                                <SelectTrigger className="mt-1"><SelectValue placeholder="Chọn leader" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="">Không chọn</SelectItem>
                                    {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.fullName}</SelectItem>)}
                                </SelectContent>
                            </Select>
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
