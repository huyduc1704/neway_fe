'use client';
import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { Pencil, Trash2, Search } from 'lucide-react';
import api from '@/lib/api';
import PageHeader from '@/components/common/PageHeader';
import { DataTable, Column } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import dayjs from 'dayjs';

interface Project {
    id: string;
    code: string;
    ward: string;
    area: string;
    status: string;
    rentalStartAt: string | null;
    rentalEndAt: string | null;
    managedBranch: { id: string; name: string } | null;
    team: { id: string; name: string } | null;
    _count: { rooms: number };
}

interface Branch { id: string; name: string; }

const STATUS_MAP: Record<string, { label: string; variant: 'secondary' | 'success' | 'warning' | 'destructive' }> = {
    DRAFT:     { label: 'Nháp',           variant: 'secondary' },
    ACTIVE:    { label: 'Đang hoạt động', variant: 'success' },
    ON_HOLD:   { label: 'Tạm dừng',       variant: 'warning' },
    CLOSED:    { label: 'Đã đóng',        variant: 'destructive' },
    CANCELLED: { label: 'Đã huỷ',         variant: 'secondary' },
};

export default function DanhMucDuAnPage() {
    const router = useRouter();
    const [projects, setProjects] = useState<Project[]>([]);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [searchInput, setSearchInput] = useState('');
    const [branchFilter, setBranchFilter] = useState<string>('');
    const [statusFilter, setStatusFilter] = useState<string>('');
    const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 });

    const fetchProjects = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/projects', {
                params: {
                    page: pagination.page, limit: pagination.limit,
                    search: search || undefined,
                    branchId: branchFilter || undefined,
                    status: statusFilter || undefined,
                },
            });
            setProjects(data.data);
            setPagination((p) => ({ ...p, total: data.meta.total }));
        } catch {
            toast.error('Không thể tải danh sách dự án');
        } finally {
            setLoading(false);
        }
    }, [pagination.page, pagination.limit, search, branchFilter, statusFilter]);

    useEffect(() => { fetchProjects(); }, [fetchProjects]);

    useEffect(() => {
        api.get('/branches', { params: { limit: 100 } }).then(({ data }) => setBranches(data.data)).catch(() => {});
    }, []);

    const handleDelete = async (id: string) => {
        if (!window.confirm('Xoá dự án này?')) return;
        try {
            await api.delete(`/projects/${id}`);
            toast.success('Đã xoá dự án');
            fetchProjects();
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Thao tác thất bại');
        }
    };

    const columns: Column<Project>[] = [
        {
            key: 'stt', title: 'STT', width: 60, align: 'center',
            render: (_, __, i) => (pagination.page - 1) * pagination.limit + i + 1,
        },
        {
            key: 'code', title: 'Mã dự án', width: 120,
            render: (_, r) => <Badge variant="warning">{r.code}</Badge>,
        },
        {
            key: 'area', title: 'Khu vực / Phường xã',
            render: (_, r) => (
                <div>
                    <div className="font-medium">{r.area}</div>
                    <div className="text-xs text-gray-400">{r.ward}</div>
                </div>
            ),
        },
        {
            key: 'branch', title: 'Chi nhánh', width: 160,
            render: (_, r) => r.managedBranch?.name || '—',
        },
        {
            key: 'team', title: 'Team', width: 140,
            render: (_, r) => r.team?.name || '—',
        },
        {
            key: 'rental', title: 'Thời gian thuê', width: 190,
            render: (_, r) => {
                if (!r.rentalStartAt) return '—';
                const start = dayjs(r.rentalStartAt).format('DD/MM/YYYY');
                const end = r.rentalEndAt ? dayjs(r.rentalEndAt).format('DD/MM/YYYY') : '...';
                return `${start} → ${end}`;
            },
        },
        {
            key: 'rooms', title: 'Số phòng', width: 100, align: 'center',
            render: (_, r) => r._count?.rooms ?? 0,
        },
        {
            key: 'status', title: 'Trạng thái', width: 150, align: 'center',
            render: (_, r) => {
                const s = STATUS_MAP[r.status] ?? { label: r.status, variant: 'secondary' as const };
                return <Badge variant={s.variant}>{s.label}</Badge>;
            },
        },
        {
            key: 'actions', title: 'Thao tác', width: 100, align: 'center',
            render: (_, r) => (
                <div className="flex items-center justify-center gap-1">
                    <button
                        title="Chỉnh sửa"
                        className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-[#E8890C] transition-colors"
                        onClick={() => router.push(`/dashboard/he-thong/danh-muc-du-an/${r.id}` as any)}
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
                title="Danh mục dự án / Danh sách"
                createLabel="Thêm dự án"
                createPath="/dashboard/he-thong/danh-muc-du-an/tao-moi"
            />

            <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex flex-wrap justify-between items-center mb-4 gap-2">
                    <div className="flex items-center gap-2">
                        <Select value={branchFilter} onValueChange={(v) => { setBranchFilter(v); setPagination((p) => ({ ...p, page: 1 })); }}>
                            <SelectTrigger className="w-44"><SelectValue placeholder="Chi nhánh" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="">Tất cả chi nhánh</SelectItem>
                                {branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPagination((p) => ({ ...p, page: 1 })); }}>
                            <SelectTrigger className="w-40"><SelectValue placeholder="Trạng thái" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="">Tất cả</SelectItem>
                                {Object.entries(STATUS_MAP).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex items-center gap-1 rounded-md border border-gray-200 px-3 h-9">
                        <Search className="h-4 w-4 text-gray-400" />
                        <input
                            className="outline-none text-sm w-52 bg-transparent placeholder-gray-400"
                            placeholder="Tìm theo mã dự án..."
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

                <DataTable columns={columns} data={projects} rowKey="id" loading={loading} pageSize={pagination.limit} />

                {pagination.total > pagination.limit && (
                    <div className="flex items-center justify-between mt-3 text-sm text-gray-500">
                        <span>Tổng: {pagination.total} dự án</span>
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
