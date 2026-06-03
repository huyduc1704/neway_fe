'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, Search, Filter, List } from 'lucide-react';
import PageHeader from '@/components/common/PageHeader';
import { DataTable, Column } from '@/components/ui/data-table';

interface RevenueEstimate {
    id: string;
    projectCode: string;
    estimatedList: number;
    estimatedTxRevenue: number;
    status: string;
    personnelCommission: number;
}

const formatCurrency = (v: number) =>
    new Intl.NumberFormat('vi-VN').format(v) + 'đ';

const getStatusColor = (status: string) => {
    if (status === 'Hoàn thành') return 'text-red-600';
    if (status === 'Đang giao dịch') return 'text-teal-500';
    if (status === 'Chờ') return 'text-[#E8890C]';
    if (status === 'Đang xem xét') return 'text-red-500';
    if (status === 'Đang xử lý') return 'text-[#E8890C]';
    if (status === 'Chờ xác nhận') return 'text-red-500';
    if (status === 'Tạm ngừng') return 'text-teal-500';
    if (status === 'Hoàn thành một phần') return 'text-red-500';
    if (status === 'Đang giao hàng') return 'text-[#E8890C]';
    return 'text-gray-700';
};

const dataSource: RevenueEstimate[] = [
    { id: '1', projectCode: '10195653', estimatedList: 536, estimatedTxRevenue: 877, status: 'Đang giao dịch', personnelCommission: 18000000 },
    { id: '2', projectCode: '10195662', estimatedList: 492, estimatedTxRevenue: 492, status: 'Hoàn thành', personnelCommission: 20500000 },
    { id: '3', projectCode: '10195659', estimatedList: 703, estimatedTxRevenue: 536, status: 'Chờ', personnelCommission: 21000000 },
    { id: '4', projectCode: '10195659', estimatedList: 994, estimatedTxRevenue: 826, status: 'Đang xem xét', personnelCommission: 17000000 },
    { id: '5', projectCode: '10195657', estimatedList: 196, estimatedTxRevenue: 816, status: 'Đang xử lý', personnelCommission: 22000000 },
    { id: '6', projectCode: '10195654', estimatedList: 177, estimatedTxRevenue: 561, status: 'Chờ xác nhận', personnelCommission: 19500000 },
    { id: '7', projectCode: '10195652', estimatedList: 826, estimatedTxRevenue: 429, status: 'Tạm ngừng', personnelCommission: 23000000 },
    { id: '8', projectCode: '10195662', estimatedList: 423, estimatedTxRevenue: 922, status: 'Hoàn thành một phần', personnelCommission: 16000000 },
    { id: '9', projectCode: '10195656', estimatedList: 600, estimatedTxRevenue: 994, status: 'Đang giao hàng', personnelCommission: 24000000 },
];

export default function DoanhThuDuAnPage() {
    const router = useRouter();
    const [mounted, setMounted] = useState(false);

    useEffect(() => setMounted(true), []);
    if (!mounted) return null;

    const columns: Column<RevenueEstimate>[] = [
        {
            key: 'projectCode', title: 'Mã dự án',
            render: (_, r) => <span className="font-medium">{r.projectCode}</span>,
        },
        {
            key: 'estimatedList', title: 'Danh sách ước tính',
            dataIndex: 'estimatedList',
        },
        {
            key: 'estimatedTxRevenue', title: 'DT ước tính giao dịch',
            dataIndex: 'estimatedTxRevenue',
        },
        {
            key: 'status', title: 'Trạng thái',
            render: (_, r) => (
                <span className={`font-medium ${getStatusColor(r.status)}`}>{r.status}</span>
            ),
        },
        {
            key: 'personnelCommission', title: 'Hoa hồng nhân sự',
            render: (_, r) => <span className="font-bold">{formatCurrency(r.personnelCommission)}</span>,
        },
        {
            key: 'view', title: 'Xem', align: 'center',
            render: (_, r) => (
                <button
                    className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-orange-50 hover:bg-orange-100 transition-colors"
                    onClick={() => router.push(`/dashboard/quan-ly-du-an/doanh-thu/${r.id}` as any)}
                >
                    <Eye className="h-4 w-4 text-[#E8890C]" />
                </button>
            ),
        },
    ];

    return (
        <div>
            <PageHeader title="Quản lý doanh thu / Danh sách" />

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {/* Toolbar */}
                <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
                    <button className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-800">
                        <List className="h-4 w-4" />
                        Tác vụ hàng loạt
                    </button>

                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1 rounded-full border border-gray-200 px-3 h-9 w-56">
                            <Search className="h-4 w-4 text-gray-400" />
                            <input
                                className="outline-none text-sm flex-1 bg-transparent placeholder-gray-400"
                                placeholder="Tìm kiếm"
                            />
                        </div>
                        <button className="flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-gray-800 px-2 py-1">
                            <Filter className="h-4 w-4" />
                            Fitter
                        </button>
                    </div>
                </div>

                {/* Table */}
                <div className="px-0">
                    <DataTable
                        columns={columns}
                        data={dataSource}
                        rowKey="id"
                        pageSize={10}
                    />
                </div>
            </div>
        </div>
    );
}
