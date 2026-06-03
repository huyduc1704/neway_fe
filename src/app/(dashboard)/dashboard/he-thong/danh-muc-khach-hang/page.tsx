'use client';
import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { Pencil, Trash2, Search } from 'lucide-react';
import api from '@/lib/api';
import PageHeader from '@/components/common/PageHeader';
import { DataTable, Column } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';

interface Customer {
    id: string;
    code: string;
    fullName: string;
    phone: string;
    email: string | null;
    isActive: boolean;
    createdAt: string;
}

export default function DanhMucKhachHangPage() {
    const router = useRouter();
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [searchInput, setSearchInput] = useState('');
    const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 });

    const fetchCustomers = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/customers', {
                params: { page: pagination.page, limit: pagination.limit, search: search || undefined },
            });
            setCustomers(data.data);
            setPagination((p) => ({ ...p, total: data.meta.total }));
        } catch {
            toast.error('Không thể tải danh sách khách hàng');
        } finally {
            setLoading(false);
        }
    }, [pagination.page, pagination.limit, search]);

    useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

    const handleDelete = async (id: string) => {
        if (!window.confirm('Xoá khách hàng này?')) return;
        try {
            await api.delete(`/customers/${id}`);
            toast.success('Đã xoá khách hàng');
            fetchCustomers();
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Thao tác thất bại');
        }
    };

    const columns: Column<Customer>[] = [
        {
            key: 'stt', title: 'STT', width: 60, align: 'center',
            render: (_, __, i) => (pagination.page - 1) * pagination.limit + i + 1,
        },
        {
            key: 'code', title: 'Mã KH', width: 120,
            render: (_, r) => <Badge variant="warning">{r.code}</Badge>,
        },
        {
            key: 'fullName', title: 'Họ tên',
            render: (_, r) => <span className="font-medium">{r.fullName}</span>,
        },
        {
            key: 'phone', title: 'Số điện thoại', width: 150,
            dataIndex: 'phone',
        },
        {
            key: 'email', title: 'Email', width: 220,
            render: (_, r) => r.email || '—',
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
                        onClick={() => router.push(`/dashboard/he-thong/danh-muc-khach-hang/${r.id}` as any)}
                    >
                        <Pencil className="h-4 w-4" />
                    </button>
                    <button
                        title="Xoá"
                        className="p-1.5 rounded hover:bg-red-50 text-gray-500 hover:text-red-500 transition-colors"
                        onClick={() => handleDelete(r.id)}
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
                title="Danh mục khách hàng / Danh sách"
                createLabel="Thêm khách hàng"
                createPath="/dashboard/he-thong/danh-muc-khach-hang/tao-moi"
            />

            <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex justify-end mb-4">
                    <div className="flex items-center gap-1 rounded-md border border-gray-200 px-3 h-9">
                        <Search className="h-4 w-4 text-gray-400" />
                        <input
                            className="outline-none text-sm w-64 bg-transparent placeholder-gray-400"
                            placeholder="Tìm theo mã hoặc họ tên..."
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

                <DataTable columns={columns} data={customers} rowKey="id" loading={loading} pageSize={pagination.limit} />

                {pagination.total > pagination.limit && (
                    <div className="flex items-center justify-between mt-3 text-sm text-gray-500">
                        <span>Tổng: {pagination.total} khách hàng</span>
                        <div className="flex items-center gap-1">
                            <button className="px-3 py-1 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-40" disabled={pagination.page === 1} onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}>Trước</button>
                            <span className="px-3 py-1">{pagination.page}</span>
                            <button className="px-3 py-1 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-40" disabled={pagination.page * pagination.limit >= pagination.total} onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}>Sau</button>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
