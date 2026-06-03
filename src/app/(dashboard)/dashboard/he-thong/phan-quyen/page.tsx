'use client';
import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Plus, Trash2, ShieldCheck } from 'lucide-react';
import api from '@/lib/api';
import PageHeader from '@/components/common/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

interface Permission { id: string; action: string; resource: string; description: string | null; }
interface Role       { id: string; code: string; name: string; isActive: boolean; }

export default function PhanQuyenPage() {
    const [roles,        setRoles]        = useState<Role[]>([]);
    const [permissions,  setPermissions]  = useState<Permission[]>([]);
    const [selectedRole, setSelectedRole] = useState<Role | null>(null);
    const [loadingPerms, setLoadingPerms] = useState(false);
    const [saving,       setSaving]       = useState(false);
    const [checkedIds,   setCheckedIds]   = useState<Set<string>>(new Set());

    const [addDialog,   setAddDialog]   = useState(false);
    const [newAction,   setNewAction]   = useState('');
    const [newResource, setNewResource] = useState('');
    const [newDesc,     setNewDesc]     = useState('');
    const [creating,    setCreating]    = useState(false);

    useEffect(() => {
        api.get('/roles',       { params: { limit: 200 } }).then(({ data }) => setRoles(data.data ?? [])).catch(() => {});
        api.get('/permissions').then(({ data }) => setPermissions(data.data ?? data ?? [])).catch(() => {});
    }, []);

    const loadRolePerms = useCallback(async (role: Role) => {
        setSelectedRole(role);
        setLoadingPerms(true);
        try {
            const { data } = await api.get(`/roles/${role.id}/permissions`);
            const perms: Permission[] = data.data ?? data ?? [];
            setRolePerms(perms);
            setCheckedIds(new Set(perms.map((p: Permission) => p.id)));
        } catch { toast.error('Không thể tải quyền của vai trò'); }
        finally { setLoadingPerms(false); }
    }, []);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [_rolePerms, setRolePerms] = useState<Permission[]>([]);

    const togglePerm = (id: string) => {
        setCheckedIds(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const handleSave = async () => {
        if (!selectedRole) return;
        setSaving(true);
        try {
            await api.put(`/roles/${selectedRole.id}/permissions`, { permissionIds: [...checkedIds] });
            toast.success(`Đã cập nhật quyền cho vai trò "${selectedRole.name}"`);
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Lưu thất bại');
        } finally { setSaving(false); }
    };

    const handleCreatePermission = async () => {
        if (!newAction.trim() || !newResource.trim()) { toast.error('Nhập đủ action và resource'); return; }
        setCreating(true);
        try {
            await api.post('/permissions', { action: newAction.trim().toUpperCase(), resource: newResource.trim().toUpperCase(), description: newDesc || undefined });
            toast.success('Đã thêm permission');
            const { data } = await api.get('/permissions');
            setPermissions(data.data ?? data ?? []);
            setNewAction(''); setNewResource(''); setNewDesc(''); setAddDialog(false);
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Tạo thất bại');
        } finally { setCreating(false); }
    };

    const handleDeletePermission = async (id: string) => {
        if (!window.confirm('Xoá permission này?')) return;
        try {
            await api.delete(`/permissions/${id}`);
            toast.success('Đã xoá permission');
            setPermissions(p => p.filter(x => x.id !== id));
            setCheckedIds(prev => { const n = new Set(prev); n.delete(id); return n; });
        } catch (err: any) { toast.error(err?.response?.data?.message || 'Xoá thất bại'); }
    };

    const grouped = permissions.reduce<Record<string, Permission[]>>((acc, p) => {
        const key = p.resource || 'Khác';
        (acc[key] ??= []).push(p);
        return acc;
    }, {});

    return (
        <>
            <PageHeader title="Hệ thống / Phân quyền" />

            <div className="grid grid-cols-[280px_1fr] gap-4">
                {/* Danh sách vai trò */}
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                    <h3 className="text-sm font-semibold text-[#1A2B5A] mb-3">Chọn vai trò</h3>
                    <div className="space-y-1">
                        {roles.map(r => (
                            <button
                                key={r.id}
                                onClick={() => loadRolePerms(r)}
                                className={`w-full text-left px-3 py-2.5 rounded-md text-sm transition-colors flex items-center justify-between ${selectedRole?.id === r.id ? 'bg-orange-50 text-[#E8890C] font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
                            >
                                <span className="flex items-center gap-2">
                                    <ShieldCheck className="h-4 w-4 shrink-0" />
                                    {r.name}
                                </span>
                                <Badge variant={r.isActive ? 'success' : 'secondary'} className="text-xs">
                                    {r.isActive ? 'Active' : 'Off'}
                                </Badge>
                            </button>
                        ))}
                        {roles.length === 0 && <p className="text-sm text-gray-400 text-center py-4">Chưa có vai trò</p>}
                    </div>
                </div>

                {/* Phân quyền */}
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                    {!selectedRole ? (
                        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                            <ShieldCheck className="h-10 w-10 mb-3 opacity-30" />
                            <p className="text-sm">Chọn một vai trò bên trái để phân quyền</p>
                        </div>
                    ) : (
                        <>
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h3 className="text-sm font-semibold text-[#1A2B5A]">
                                        Quyền của: <span className="text-[#E8890C]">{selectedRole.name}</span>
                                    </h3>
                                    <p className="text-xs text-gray-400 mt-0.5">{checkedIds.size} / {permissions.length} quyền được chọn</p>
                                </div>
                                <div className="flex gap-2">
                                    <Button variant="outline" size="sm" onClick={() => setAddDialog(true)}>
                                        <Plus className="h-4 w-4 mr-1" /> Thêm permission
                                    </Button>
                                    <Button size="sm" onClick={handleSave} disabled={saving} className="bg-[#E8890C] hover:bg-[#C8720A]">
                                        {saving && <span className="mr-2 h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin inline-block" />}
                                        Lưu thay đổi
                                    </Button>
                                </div>
                            </div>

                            {loadingPerms ? (
                                <div className="flex justify-center py-10">
                                    <div className="h-5 w-5 rounded-full border-2 border-[#E8890C] border-t-transparent animate-spin" />
                                </div>
                            ) : (
                                <div className="space-y-4 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
                                    {Object.entries(grouped).sort().map(([resource, perms]) => (
                                        <div key={resource}>
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{resource}</span>
                                                <div className="flex-1 h-px bg-gray-100" />
                                                <button
                                                    className="text-xs text-[#E8890C] hover:underline whitespace-nowrap"
                                                    onClick={() => {
                                                        const allChecked = perms.every(p => checkedIds.has(p.id));
                                                        setCheckedIds(prev => {
                                                            const next = new Set(prev);
                                                            perms.forEach(p => allChecked ? next.delete(p.id) : next.add(p.id));
                                                            return next;
                                                        });
                                                    }}
                                                >
                                                    {perms.every(p => checkedIds.has(p.id)) ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                                                </button>
                                            </div>
                                            <div className="grid grid-cols-2 gap-1.5">
                                                {perms.map(p => (
                                                    <label key={p.id} className="flex items-start gap-2 px-3 py-2 rounded-md border border-gray-100 hover:bg-gray-50 cursor-pointer group">
                                                        <input
                                                            type="checkbox"
                                                            className="mt-0.5 h-4 w-4 accent-[#E8890C] shrink-0"
                                                            checked={checkedIds.has(p.id)}
                                                            onChange={() => togglePerm(p.id)}
                                                        />
                                                        <div className="flex-1 min-w-0">
                                                            <div className="text-sm font-medium text-gray-800">{p.action}</div>
                                                            {p.description && <div className="text-xs text-gray-400 truncate">{p.description}</div>}
                                                        </div>
                                                        <button
                                                            className="opacity-0 group-hover:opacity-100 p-0.5 text-gray-400 hover:text-red-500 shrink-0"
                                                            title="Xoá permission"
                                                            onClick={e => { e.preventDefault(); handleDeletePermission(p.id); }}
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </button>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                    {permissions.length === 0 && (
                                        <div className="text-center py-10 text-gray-400 text-sm">
                                            Chưa có permission nào. Nhấn "Thêm permission" để bắt đầu.
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Add Permission Dialog */}
            <Dialog open={addDialog} onOpenChange={setAddDialog}>
                <DialogContent className="max-w-sm">
                    <DialogHeader><DialogTitle>Thêm permission mới</DialogTitle></DialogHeader>
                    <div className="space-y-3 py-2">
                        <div>
                            <Label>Resource <span className="text-red-500">*</span></Label>
                            <Input className="mt-1 uppercase" placeholder="VD: PROJECT, USER..." value={newResource} onChange={e => setNewResource(e.target.value.toUpperCase())} />
                        </div>
                        <div>
                            <Label>Action <span className="text-red-500">*</span></Label>
                            <Input className="mt-1 uppercase" placeholder="VD: READ, CREATE, UPDATE..." value={newAction} onChange={e => setNewAction(e.target.value.toUpperCase())} />
                        </div>
                        <div>
                            <Label>Mô tả</Label>
                            <Input className="mt-1" placeholder="Mô tả ngắn về quyền này..." value={newDesc} onChange={e => setNewDesc(e.target.value)} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setAddDialog(false)}>Huỷ</Button>
                        <Button onClick={handleCreatePermission} disabled={creating}>
                            {creating && <span className="mr-2 h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin inline-block" />}
                            Tạo
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
