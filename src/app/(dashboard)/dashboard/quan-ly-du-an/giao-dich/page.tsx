'use client';
import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { Eye, Trash2, Search, X } from 'lucide-react';
import api from '@/lib/api';
import PageHeader from '@/components/common/PageHeader';
import { DataTable, Column } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import dayjs from 'dayjs';

interface Transaction {
    id: string;
    transactionCode: string;
    actualValue: number;
    expectedRevenue: number | null;
    actualRevenue: number | null;
    status: string;
    collectionStatus: string;
    isMatched: boolean | null;
    accountantConfirmed: boolean;
    transactedAt: string;
    project: { id: string; code: string; ward: string } | null;
    room: { id: string; roomCode: string } | null;
    customer: { id: string; fullName: string } | null;
    branch: { id: string; name: string } | null;
}

const STATUS_MAP: Record<string, { label: string; variant: 'processing' | 'success' | 'secondary' | 'destructive' | 'warning' }> = {
    PENDING:   { label: 'Chờ xử lý',         variant: 'processing' },
    SUCCESS:   { label: 'Thành công',          variant: 'success' },
    CANCELLED: { label: 'Huỷ cọc - Hoàn cọc', variant: 'warning' },
    FAILED:    { label: 'Thất bại',            variant: 'destructive' },
};

const COLLECTION_MAP: Record<string, { label: string; variant: 'success' | 'secondary' }> = {
    COLLECTED:     { label: 'Đã thu',   variant: 'success' },
    NOT_COLLECTED: { label: 'Chưa thu', variant: 'secondary' },
};

const formatCurrency = (v: number | null) =>
    v != null ? new Intl.NumberFormat('vi-VN').format(v) + 'đ' : '—';

export default function GiaoDichPage() {
    const router = useRouter();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [searchInput, setSearchInput] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 });

    const fetchTransactions = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/transactions', {
                params: {
                    page: pagination.page,
                    limit: pagination.limit,
                    search: search || undefined,
                    status: statusFilter || undefined,
                    fromDate: fromDate || undefined,
                    toDate: toDate || undefined,
                },
            });
            setTransactions(data.data);
            setPagination(p => ({ ...p, total: data.meta.total }));
        } catch {
            toast.error('Không thể tải danh sách giao dịch');
        } finally {
            setLoading(false);
        }
    }, [pagination.page, pagination.limit, search, statusFilter, fromDate, toDate]);

    useEffect(() => { fetchTransactions(); }, [fetchTransactions]);

    const handleDelete = async (id: string) => {
        if (!window.confirm('Xoá giao dịch này?')) return;
        try {
            await api.delete(`/transactions/${id}`);
            toast.success('Đã xoá giao dịch');
            fetchTransactions();
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Thao tác thất bại');
        }
    };

    const resetFilters = () => {
        setStatusFilter(''); setFromDate(''); setToDate('');
        setSearch(''); setSearchInput(''); setPagination(p => ({ ...p, page: 1 }));
    };
    const hasFilter = statusFilter || fromDate || toDate || search;

    const columns: Column<Transaction>[] = [
        {
            key: 'stt', title: 'STT', width: 46, align: 'center',
            render: (_, __, i) => (pagination.page - 1) * pagination.limit + i + 1,
        },
        {
            key: 'transactionCode', title: 'Mã giao dịch', width: 140,
            render: (_, r) => <Badge variant="warning">{r.transactionCode}</Badge>,
        },
        {
            key: 'project', title: 'Dự án / Phòng',
            render: (_, r) => (
                <div>
                    <div className="font-medium">{r.project?.code || '—'}</div>
                    {r.room && <div className="text-xs text-gray-400">Phòng: {r.room.roomCode}</div>}
                </div>
            ),
        },
        {
            key: 'customer', title: 'Khách hàng', width: 160,
            render: (_, r) => r.customer?.fullName || '—',
        },
        {
            key: 'actualRevenue', title: 'Doanh thu TT', width: 150, align: 'right',
            render: (_, r) => (
                <span className="font-medium text-[#1A2B5A]">{formatCurrency(r.actualRevenue ?? r.actualValue)}</span>
            ),
        },
        {
            key: 'transactedAt', title: 'Ngày GD', width: 110, align: 'center',
            render: (_, r) => dayjs(r.transactedAt).format('DD/MM/YYYY'),
        },
        {
            key: 'isMatched', title: 'Khớp lệnh', width: 100, align: 'center',
            render: (_, r) => r.isMatched == null
                ? <span className="text-gray-400 text-xs">—</span>
                : <Badge variant={r.isMatched ? 'success' : 'destructive'}>{r.isMatched ? 'Khớp' : 'Không khớp'}</Badge>,
        },
        {
            key: 'collectionStatus', title: 'Trạng thái thu', width: 110, align: 'center',
            render: (_, r) => {
                const c = COLLECTION_MAP[r.collectionStatus];
                return c ? <Badge variant={c.variant}>{c.label}</Badge> : <span className="text-gray-400 text-xs">—</span>;
            },
        },
        {
            key: 'status', title: 'Tình trạng', width: 160, align: 'center',
            render: (_, r) => {
                const s = STATUS_MAP[r.status] ?? { label: r.status, variant: 'secondary' as const };
                return <Badge variant={s.variant as any}>{s.label}</Badge>;
            },
        },
        {
            key: 'confirmed', title: 'KT xác nhận', width: 110, align: 'center',
            render: (_, r) => (
                <Badge variant={r.accountantConfirmed ? 'success' : 'secondary'}>
                    {r.accountantConfirmed ? 'Đã xác nhận' : 'Chưa xác nhận'}
                </Badge>
            ),
        },
        {
            key: 'actions', title: 'Thao tác', width: 80, align: 'center',
            render: (_, r) => (
                <div className="flex items-center justify-center gap-1" onClick={e => e.stopPropagation()}>
                    <button
                        className="p-1.5 rounded hover:bg-orange-50 text-gray-500 hover:text-[#E8890C]"
                        onClick={() => router.push(`/dashboard/quan-ly-du-an/giao-dich/${r.id}` as any)}
                    >
                        <Eye className="h-4 w-4" />
                    </button>
                    <button
                        className={`p-1.5 rounded transition-colors ${r.status === 'SUCCESS' ? 'opacity-30 cursor-not-allowed text-gray-300' : 'hover:bg-red-50 text-gray-500 hover:text-red-500'}`}
                        disabled={r.status === 'SUCCESS'}
                        onClick={() => r.status !== 'SUCCESS' && handleDelete(r.id)}
                    >
                        <Trash2 className="h-4 w-4" />
                    </button>
                </div>
            ),
        },
    ];

    return (
        <>
            <PageHeader title="Quản lý dự án / Giao dịch" />

            <div className="bg-white rounded-lg border border-gray-200 p-4">
                {/* Filters */}
                <div className="flex flex-wrap gap-2 mb-4">
                    <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPagination(p => ({ ...p, page: 1 })); }}>
                        <SelectTrigger className="w-44 h-9"><SelectValue placeholder="Tình trạng" /></SelectTrigger>
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
                        <button onClick={resetFilters} className="flex items-center gap-1 h-9 px-3 rounded-md border border-gray-200 text-sm text-gray-500 hover:bg-gray-50">
                            <X className="h-3.5 w-3.5" /> Xoá lọc
                        </button>
                    )}

                    <div className="ml-auto flex items-center gap-1 rounded-full border border-gray-200 px-3 h-9 w-64">
                        <Search className="h-4 w-4 text-gray-400 shrink-0" />
                        <input
                            className="outline-none text-sm flex-1 bg-transparent placeholder-gray-400"
                            placeholder="Tìm theo mã giao dịch..."
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
                    data={transactions}
                    rowKey="id"
                    loading={loading}
                    pageSize={pagination.limit}
                    onRowClick={r => router.push(`/dashboard/quan-ly-du-an/giao-dich/${r.id}` as any)}
                />

                {pagination.total > pagination.limit && (
                    <div className="flex items-center justify-between mt-3 text-sm text-gray-500">
                        <span>Tổng: {pagination.total} giao dịch</span>
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
