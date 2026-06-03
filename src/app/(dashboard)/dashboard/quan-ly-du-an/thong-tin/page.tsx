'use client';
import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { Eye, Search, X } from 'lucide-react';
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
    province: string | null;
    area: string;
    status: string;
    leadSource: string | null;
    depositDate: string | null;
    checkInDate: string | null;
    managedBranch: { id: string; name: string } | null;
    team: { id: string; name: string } | null;
    _count: { rooms: number };
}

interface Branch { id: string; name: string; }
interface Region { id: string; name: string; }

const STATUS_MAP: Record<string, { label: string; variant: 'secondary' | 'success' | 'warning' | 'destructive' }> = {
    DRAFT:     { label: 'Nháp',           variant: 'secondary' },
    ACTIVE:    { label: 'Đang hoạt động', variant: 'success' },
    ON_HOLD:   { label: 'Tạm dừng',       variant: 'warning' },
    CLOSED:    { label: 'Đã đóng',        variant: 'destructive' },
    CANCELLED: { label: 'Đã huỷ',        variant: 'secondary' },
};

const LEAD_SOURCE_MAP: Record<string, string> = {
    FACEBOOK: 'Facebook', TIKTOK: 'TikTok', THREADS: 'Threads',
    CHO_TOT: 'Chợ Tốt', BDS: 'BĐS', WALK_IN: 'Vãng Lai',
    REFERRAL: 'Giới Thiệu', ZALO: 'Zalo', OTHER: 'Khác',
};

export default function ThongTinDuAnPage() {
    const router = useRouter();
    const [projects, setProjects] = useState<Project[]>([]);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [regions, setRegions] = useState<Region[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [searchInput, setSearchInput] = useState('');
    const [branchFilter, setBranchFilter] = useState('');
    const [regionFilter, setRegionFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 });

    const fetchProjects = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/projects', {
                params: {
                    page: pagination.page,
                    limit: pagination.limit,
                    search: search || undefined,
                    branchId: branchFilter || undefined,
                    regionId: regionFilter || undefined,
                    status: statusFilter || undefined,
                    fromDate: fromDate || undefined,
                    toDate: toDate || undefined,
                },
            });
            setProjects(data.data);
            setPagination(p => ({ ...p, total: data.meta.total }));
        } catch {
            toast.error('Không thể tải danh sách dự án');
        } finally {
            setLoading(false);
        }
    }, [pagination.page, pagination.limit, search, branchFilter, regionFilter, statusFilter, fromDate, toDate]);

    useEffect(() => { fetchProjects(); }, [fetchProjects]);

    useEffect(() => {
        api.get('/branches', { params: { limit: 100 } }).then(({ data }) => setBranches(data.data)).catch(() => {});
        api.get('/regions', { params: { limit: 100 } }).then(({ data }) => setRegions(data.data)).catch(() => {});
    }, []);

    const resetFilters = () => {
        setBranchFilter(''); setRegionFilter(''); setStatusFilter('');
        setFromDate(''); setToDate(''); setSearch(''); setSearchInput('');
        setPagination(p => ({ ...p, page: 1 }));
    };

    const hasFilter = branchFilter || regionFilter || statusFilter || fromDate || toDate || search;

    const columns: Column<Project>[] = [
        {
            key: 'stt', title: 'STT', width: 46, align: 'center',
            render: (_, __, i) => (pagination.page - 1) * pagination.limit + i + 1,
        },
        {
            key: 'code', title: 'Mã dự án', width: 160,
            render: (_, r) => <Badge variant="warning">{r.code}</Badge>,
        },
        {
            key: 'location', title: 'Địa điểm',
            render: (_, r) => (
                <div>
                    <div className="font-medium">{r.area || r.province || '—'}</div>
                    <div className="text-xs text-gray-400">{r.ward}</div>
                </div>
            ),
        },
        {
            key: 'branch', title: 'Chi nhánh', width: 160,
            render: (_, r) => r.managedBranch?.name || '—',
        },
        {
            key: 'team', title: 'Khu vực', width: 140,
            render: (_, r) => r.team?.name || '—',
        },
        {
            key: 'leadSource', title: 'Nguồn khách', width: 120, align: 'center',
            render: (_, r) => r.leadSource ? (LEAD_SOURCE_MAP[r.leadSource] ?? r.leadSource) : '—',
        },
        {
            key: 'depositDate', title: 'Ngày đặt cọc', width: 130, align: 'center',
            render: (_, r) => r.depositDate ? dayjs(r.depositDate).format('DD/MM/YYYY') : '—',
        },
        {
            key: 'status', title: 'Trạng thái', width: 140, align: 'center',
            render: (_, r) => {
                const s = STATUS_MAP[r.status] ?? { label: r.status, variant: 'secondary' as const };
                return <Badge variant={s.variant}>{s.label}</Badge>;
            },
        },
        {
            key: 'actions', title: 'Thao tác', width: 70, align: 'center',
            render: (_, r) => (
                <button
                    className="p-1.5 rounded hover:bg-orange-50 text-gray-500 hover:text-[#E8890C] transition-colors"
                    onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/quan-ly-du-an/thong-tin/${r.id}` as any); }}
                >
                    <Eye className="h-4 w-4" />
                </button>
            ),
        },
    ];

    return (
        <>
            <PageHeader
                title="Thông tin dự án / Danh sách"
                createLabel="Tạo mới dự án"
                createPath="/dashboard/quan-ly-du-an/thong-tin/create"
            />

            <div className="bg-white rounded-lg border border-gray-200 p-4">
                {/* Filters */}
                <div className="flex flex-wrap gap-2 mb-3">
                    <Select value={regionFilter} onValueChange={v => { setRegionFilter(v); setPagination(p => ({ ...p, page: 1 })); }}>
                        <SelectTrigger className="w-40 h-9"><SelectValue placeholder="Khu vực" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="">Tất cả khu vực</SelectItem>
                            {regions.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                        </SelectContent>
                    </Select>

                    <Select value={branchFilter} onValueChange={v => { setBranchFilter(v); setPagination(p => ({ ...p, page: 1 })); }}>
                        <SelectTrigger className="w-44 h-9"><SelectValue placeholder="Chi nhánh" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="">Tất cả chi nhánh</SelectItem>
                            {branches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                        </SelectContent>
                    </Select>

                    <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPagination(p => ({ ...p, page: 1 })); }}>
                        <SelectTrigger className="w-40 h-9"><SelectValue placeholder="Trạng thái" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="">Tất cả</SelectItem>
                            {Object.entries(STATUS_MAP).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                        </SelectContent>
                    </Select>

                    <div className="flex items-center gap-1">
                        <span className="text-sm text-gray-500 whitespace-nowrap">Từ ngày</span>
                        <input
                            type="date"
                            className="h-9 px-2 rounded-md border border-gray-200 text-sm focus:ring-2 focus:ring-[#E8890C] focus:outline-none"
                            value={fromDate}
                            onChange={e => { setFromDate(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
                        />
                        <span className="text-sm text-gray-500 whitespace-nowrap">đến ngày</span>
                        <input
                            type="date"
                            className="h-9 px-2 rounded-md border border-gray-200 text-sm focus:ring-2 focus:ring-[#E8890C] focus:outline-none"
                            value={toDate}
                            onChange={e => { setToDate(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
                        />
                    </div>

                    {hasFilter && (
                        <button
                            onClick={resetFilters}
                            className="flex items-center gap-1 h-9 px-3 rounded-md border border-gray-200 text-sm text-gray-500 hover:bg-gray-50"
                        >
                            <X className="h-3.5 w-3.5" /> Xoá lọc
                        </button>
                    )}

                    <div className="ml-auto flex items-center gap-1 rounded-full border border-gray-200 px-3 h-9 w-64">
                        <Search className="h-4 w-4 text-gray-400 shrink-0" />
                        <input
                            className="outline-none text-sm flex-1 bg-transparent placeholder-gray-400"
                            placeholder="Tìm theo mã dự án..."
                            value={searchInput}
                            onChange={e => setSearchInput(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === 'Enter') { setSearch(searchInput); setPagination(p => ({ ...p, page: 1 })); }
                            }}
                        />
                    </div>
                </div>

                <DataTable
                    columns={columns}
                    data={projects}
                    rowKey="id"
                    loading={loading}
                    pageSize={pagination.limit}
                    onRowClick={r => router.push(`/dashboard/quan-ly-du-an/thong-tin/${r.id}` as any)}
                />

                {pagination.total > pagination.limit && (
                    <div className="flex items-center justify-between mt-3 text-sm text-gray-500">
                        <span>Tổng: {pagination.total} dự án</span>
                        <div className="flex items-center gap-1">
                            <button className="px-3 py-1 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-40" disabled={pagination.page === 1} onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}>Trước</button>
                            <span className="px-3 py-1">{pagination.page}</span>
                            <button className="px-3 py-1 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-40" disabled={pagination.page * pagination.limit >= pagination.total} onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}>Sau</button>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
