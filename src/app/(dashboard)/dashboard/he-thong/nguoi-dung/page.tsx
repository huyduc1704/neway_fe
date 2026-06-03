'use client';
import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { Pencil, Ban, Filter, Search, KeyRound } from 'lucide-react';
import api from '@/lib/api';
import PageHeader from '@/components/common/PageHeader';
import { DataTable, Column } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

interface User {
    id: string;
    username: string;
    fullName: string;
    status: string;
    createdAt: string;
    roles: { role: { id: string; code: string; name: string } }[];
}

interface Role { id: string; code: string; name: string; }

export default function NguoiDungPage() {
    const router = useRouter();
    const [users, setUsers] = useState<User[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [searchInput, setSearchInput] = useState('');
    const [roleFilter, setRoleFilter] = useState<string>('');
    const [showFilter, setShowFilter] = useState(false);
    const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 });

    // Password reset dialog
    const [pwDialog, setPwDialog]       = useState(false);
    const [pwUserId, setPwUserId]       = useState('');
    const [pwUserName, setPwUserName]   = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [pwSaving, setPwSaving]       = useState(false);

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/users', {
                params: { page: pagination.page, limit: pagination.limit, search: search || undefined, roleId: roleFilter || undefined },
            });
            setUsers(data.data);
            setPagination((p) => ({ ...p, total: data.meta.total }));
        } catch {
            toast.error('Không thể tải danh sách người dùng');
        } finally {
            setLoading(false);
        }
    }, [pagination.page, pagination.limit, search, roleFilter]);

    useEffect(() => { fetchUsers(); }, [fetchUsers]);

    useEffect(() => {
        api.get('/roles', { params: { limit: 100 } }).then(({ data }) => setRoles(data.data)).catch(() => {});
    }, []);

    const handleDeactivate = async (id: string) => {
        if (!window.confirm('Vô hiệu hoá tài khoản này?')) return;
        try {
            await api.patch(`/users/${id}/disable`);
            toast.success('Đã vô hiệu hoá tài khoản');
            fetchUsers();
        } catch {
            toast.error('Thao tác thất bại');
        }
    };

    const openPwReset = (id: string, name: string) => {
        setPwUserId(id); setPwUserName(name); setNewPassword(''); setPwDialog(true);
    };
    const handlePwReset = async () => {
        if (!newPassword.trim() || newPassword.length < 6) {
            toast.error('Mật khẩu tối thiểu 6 ký tự'); return;
        }
        setPwSaving(true);
        try {
            await api.patch(`/users/${pwUserId}/password`, { newPassword });
            toast.success('Đặt lại mật khẩu thành công');
            setPwDialog(false);
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Thao tác thất bại');
        } finally {
            setPwSaving(false);
        }
    };

    const columns: Column<User>[] = [
        {
            key: 'stt', title: 'STT', width: 60, align: 'center',
            render: (_, __, i) => (pagination.page - 1) * pagination.limit + i + 1,
        },
        {
            key: 'fullName', title: 'Tên đăng nhập',
            render: (_, r) => <span className="font-medium">{r.fullName || r.username}</span>,
        },
        {
            key: 'password', title: 'Mật khẩu', width: 140,
            render: () => '************',
        },
        {
            key: 'role', title: 'Vai trò', width: 130,
            render: (_, r) => r.roles?.[0]?.role?.name || '—',
        },
        {
            key: 'status', title: 'Trạng thái', width: 150, align: 'center',
            render: (_, r) => (
                <Badge variant={r.status === 'ACTIVE' ? 'success' : 'secondary'}>
                    {r.status === 'ACTIVE' ? 'Hoạt động' : 'Không hoạt động'}
                </Badge>
            ),
        },
        {
            key: 'actions', title: 'Thao tác', width: 130, align: 'center',
            render: (_, r) => (
                <div className="flex items-center justify-center gap-1">
                    <button
                        title="Chỉnh sửa"
                        className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-[#E8890C] transition-colors"
                        onClick={() => router.push(`/dashboard/he-thong/nguoi-dung/${r.id}` as any)}
                    >
                        <Pencil className="h-4 w-4" />
                    </button>
                    <button
                        title="Đặt lại mật khẩu"
                        className="p-1.5 rounded hover:bg-blue-50 text-gray-500 hover:text-blue-600 transition-colors"
                        onClick={() => openPwReset(r.id, r.fullName || r.username)}
                    >
                        <KeyRound className="h-4 w-4" />
                    </button>
                    <button
                        title="Vô hiệu hoá"
                        className={`p-1.5 rounded transition-colors ${r.status !== 'ACTIVE' ? 'opacity-40 cursor-not-allowed text-gray-300' : 'hover:bg-red-50 text-gray-500 hover:text-red-500'}`}
                        disabled={r.status !== 'ACTIVE'}
                        onClick={() => r.status === 'ACTIVE' && handleDeactivate(r.id)}
                    >
                        <Ban className="h-4 w-4" />
                    </button>
                </div>
            ),
        },
    ];

    return (
        <>
            <PageHeader
                title="Người dùng / Danh sách"
                createLabel="Tạo mới người dùng"
                createPath="/dashboard/he-thong/nguoi-dung/tao-moi"
            />

            <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex justify-between items-center mb-4">
                    <span className="text-xs text-gray-400">☰ Tác vụ hàng loạt</span>
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 rounded-md border border-gray-200 px-3 h-9">
                            <Search className="h-4 w-4 text-gray-400" />
                            <input
                                className="outline-none text-sm w-52 bg-transparent placeholder-gray-400"
                                placeholder="Tìm kiếm..."
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        setSearch(searchInput);
                                        setPagination((p) => ({ ...p, page: 1 }));
                                    }
                                }}
                            />
                        </div>
                        <Button
                            variant={showFilter ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setShowFilter((v) => !v)}
                        >
                            <Filter className="h-4 w-4 mr-1" /> Fitter
                        </Button>
                    </div>
                </div>

                {showFilter && (
                    <div className="bg-gray-50 rounded-md px-4 py-3 mb-3 flex items-center gap-3">
                        <span className="text-sm text-gray-600">Vai trò:</span>
                        <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v); setPagination((p) => ({ ...p, page: 1 })); }}>
                            <SelectTrigger className="w-48"><SelectValue placeholder="Chọn vai trò" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="">Tất cả vai trò</SelectItem>
                                {roles.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                )}

                <DataTable
                    columns={columns}
                    data={users}
                    rowKey="id"
                    loading={loading}
                    pageSize={pagination.limit}
                />

                {/* Pagination */}
                {pagination.total > pagination.limit && (
                    <div className="flex items-center justify-between mt-3 text-sm text-gray-500">
                        <span>Tổng: {pagination.total} người dùng</span>
                        <div className="flex items-center gap-1">
                            <button
                                className="px-3 py-1 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-40"
                                disabled={pagination.page === 1}
                                onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
                            >Trước</button>
                            <span className="px-3 py-1">{pagination.page}</span>
                            <button
                                className="px-3 py-1 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-40"
                                disabled={pagination.page * pagination.limit >= pagination.total}
                                onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
                            >Sau</button>
                        </div>
                    </div>
                )}
            </div>
            {/* Password reset dialog */}
            <Dialog open={pwDialog} onOpenChange={setPwDialog}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Đặt lại mật khẩu</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3 py-2">
                        <p className="text-sm text-gray-600">Tài khoản: <span className="font-medium">{pwUserName}</span></p>
                        <div>
                            <Label>Mật khẩu mới <span className="text-red-500">*</span></Label>
                            <Input
                                type="password"
                                className="mt-1"
                                placeholder="Tối thiểu 6 ký tự"
                                value={newPassword}
                                onChange={e => setNewPassword(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handlePwReset()}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setPwDialog(false)}>Huỷ</Button>
                        <Button onClick={handlePwReset} disabled={pwSaving}>
                            {pwSaving && <span className="mr-2 h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin inline-block" />}
                            Xác nhận
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
