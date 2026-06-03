'use client';
import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { Pencil, Trash2, Search } from 'lucide-react';
import api from '@/lib/api';
import PageHeader from '@/components/common/PageHeader';
import { DataTable, Column } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';

interface Role {
    id: string;
    code: string;
    name: string;
    description: string;
    isActive: boolean;
    createdAt: string;
    _count: { users: number };
}

export default function VaiTroPage() {
    const router = useRouter();
    const [roles, setRoles] = useState<Role[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [searchInput, setSearchInput] = useState('');
    const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 });

    const fetchRoles = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/roles', {
                params: { page: pagination.page, limit: pagination.limit, search: search || undefined },
            });
            setRoles(data.data);
            setPagination((p) => ({ ...p, total: data.meta.total }));
        } catch {
            toast.error('Không thể tải danh sách vai trò');
        } finally {
            setLoading(false);
        }
    }, [pagination.page, pagination.limit, search]);

    useEffect(() => { fetchRoles(); }, [fetchRoles]);

    const handleDelete = async (id: string, userCount: number) => {
        if (userCount > 0) {
            toast.error(`Vai trò đang được gán cho ${userCount} người dùng, không thể xoá`);
            return;
        }
        if (!window.confirm('Xoá vai trò này?')) return;
        try {
            await api.delete(`/roles/${id}`);
            toast.success('Đã xoá vai trò');
            fetchRoles();
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Thao tác thất bại');
        }
    };

    const columns: Column<Role>[] = [
        {
            key: 'stt', title: 'STT', width: 60, align: 'center',
            render: (_, __, i) => (pagination.page - 1) * pagination.limit + i + 1,
        },
        {
            key: 'code', title: 'Mã vai trò', width: 140,
            render: (_, r) => <Badge variant="warning">{r.code}</Badge>,
        },
        {
            key: 'name', title: 'Tên vai trò',
            render: (_, r) => <span className="font-medium">{r.name}</span>,
        },
        {
            key: 'description', title: 'Mô tả',
            render: (_, r) => r.description || '—',
        },
        {
            key: 'userCount', title: 'Số người dùng', width: 130, align: 'center',
            render: (_, r) => r._count?.users ?? 0,
        },
        {
            key: 'status', title: 'Trạng thái', width: 140, align: 'center',
            render: (_, r) => (
                <Badge variant={r.isActive ? 'success' : 'secondary'}>
                    {r.isActive ? 'Hoạt động' : 'Không hoạt động'}
                </Badge>
            ),
        },
        {
            key: 'actions', title: 'Thao tác', width: 100, align: 'center',
            render: (_, r) => (
                <div className="flex items-center justify-center gap-1">
                    <button
                        title="Chỉnh sửa"
                        className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-[#E8890C] transition-colors"
                        onClick={() => router.push(`/dashboard/he-thong/vai-tro/${r.id}` as any)}
                    >
                        <Pencil className="h-4 w-4" />
                    </button>
                    <button
                        title="Xoá"
                        className={`p-1.5 rounded transition-colors ${r._count?.users > 0 ? 'opacity-40 cursor-not-allowed text-gray-300' : 'hover:bg-red-50 text-gray-500 hover:text-red-500'}`}
                        onClick={() => handleDelete(r.id, r._count?.users ?? 0)}
                    >
                        <Trash2 className="h-4 w-4" />
                    </button>
                </div>
            ),
        },
    ];

    return (
        <>
            <PageHeader
                title="Vai trò / Danh sách"
                createLabel="Tạo mới vai trò"
                createPath="/dashboard/he-thong/vai-tro/tao-moi"
            />

            <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex justify-end mb-4">
                    <div className="flex items-center gap-1 rounded-md border border-gray-200 px-3 h-9">
                        <Search className="h-4 w-4 text-gray-400" />
                        <input
                            className="outline-none text-sm w-64 bg-transparent placeholder-gray-400"
                            placeholder="Tìm kiếm mã hoặc tên vai trò..."
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
                </div>

                <DataTable
                    columns={columns}
                    data={roles}
                    rowKey="id"
                    loading={loading}
                    pageSize={pagination.limit}
                />

                {pagination.total > pagination.limit && (
                    <div className="flex items-center justify-between mt-3 text-sm text-gray-500">
                        <span>Tổng: {pagination.total} vai trò</span>
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
        </>
    );
}
