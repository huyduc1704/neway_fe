'use client';
import { useEffect, useState, useCallback } from 'react';
import { message } from 'antd';
import { useRouter } from 'next/navigation';
import { Eye, Trash2 } from 'lucide-react';
import { Button, DatePicker, Input, Select, Tag, Table, Card, Modal, Typography, Space } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined, SearchOutlined, CloseOutlined } from '@ant-design/icons';
import api from '@/lib/api';
import dayjs from 'dayjs';
import { useUser } from '@/context/UserContext';

const { Title } = Typography;

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

const STATUS_MAP: Record<string, { label: string; color: string }> = {
    PENDING:   { label: 'Chờ xử lý',         color: 'processing' },
    SUCCESS:   { label: 'Thành công',          color: 'success' },
    CANCELLED: { label: 'Huỷ cọc - Hoàn cọc', color: 'warning' },
    FAILED:    { label: 'Thất bại',            color: 'error' },
};

const COLLECTION_MAP: Record<string, { label: string; color: string }> = {
    COLLECTED:     { label: 'Đã thu',   color: 'success' },
    NOT_COLLECTED: { label: 'Chưa thu', color: 'default' },
};

const formatCurrency = (v: number | null) =>
    v != null ? new Intl.NumberFormat('vi-VN').format(v) + 'đ' : '—';

export default function GiaoDichPage() {
    const router = useRouter();
    const { can } = useUser();
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
            message.error('Không thể tải danh sách giao dịch');
        } finally {
            setLoading(false);
        }
    }, [pagination.page, pagination.limit, search, statusFilter, fromDate, toDate]);

    useEffect(() => { fetchTransactions(); }, [fetchTransactions]);

    const handleDelete = (id: string) => {
        Modal.confirm({
            title: 'Xoá giao dịch này?',
            content: 'Thao tác không thể hoàn tác.',
            okText: 'Xoá',
            okType: 'danger',
            cancelText: 'Huỷ',
            onOk: async () => {
                try {
                    await api.delete(`/transactions/${id}`);
                    message.success('Đã xoá giao dịch');
                    fetchTransactions();
                } catch (err: any) {
                    message.error(err?.response?.data?.message || 'Thao tác thất bại');
                }
            },
        });
    };

    const resetFilters = () => {
        setStatusFilter(''); setFromDate(''); setToDate('');
        setSearch(''); setSearchInput(''); setPagination(p => ({ ...p, page: 1 }));
    };
    const hasFilter = statusFilter || fromDate || toDate || search;

    const columns: ColumnsType<Transaction> = [
        { title: 'STT', key: 'stt', width: 46, align: 'center', render: (_, __, i) => (pagination.page - 1) * pagination.limit + i + 1 },
        { title: 'Mã giao dịch', key: 'transactionCode', width: 140, render: (_, r) => <Tag color="orange">{r.transactionCode}</Tag> },
        {
            title: 'Dự án / Phòng', key: 'project',
            render: (_, r) => (
                <div>
                    <div style={{ fontWeight: 500 }}>{r.project?.code || '—'}</div>
                    {r.room && <div style={{ fontSize: 12, color: '#9ca3af' }}>Phòng: {r.room.roomCode}</div>}
                </div>
            ),
        },
        { title: 'Khách hàng', key: 'customer', width: 160, render: (_, r) => r.customer?.fullName || '—' },
        {
            title: 'Doanh thu TT', key: 'actualRevenue', width: 150, align: 'right',
            render: (_, r) => <span style={{ fontWeight: 500, color: '#1A2B5A' }}>{formatCurrency(r.actualRevenue ?? r.actualValue)}</span>,
        },
        { title: 'Ngày GD', key: 'transactedAt', width: 110, align: 'center', render: (_, r) => dayjs(r.transactedAt).format('DD/MM/YYYY') },
        {
            title: 'Khớp lệnh', key: 'isMatched', width: 100, align: 'center',
            render: (_, r) => r.isMatched == null
                ? <span style={{ color: '#9ca3af', fontSize: 12 }}>—</span>
                : <Tag color={r.isMatched ? 'success' : 'error'}>{r.isMatched ? 'Khớp' : 'Không khớp'}</Tag>,
        },
        {
            title: 'Trạng thái thu', key: 'collectionStatus', width: 110, align: 'center',
            render: (_, r) => {
                const c = COLLECTION_MAP[r.collectionStatus];
                return c ? <Tag color={c.color}>{c.label}</Tag> : <span style={{ color: '#9ca3af', fontSize: 12 }}>—</span>;
            },
        },
        {
            title: 'Tình trạng', key: 'status', width: 160, align: 'center',
            render: (_, r) => {
                const s = STATUS_MAP[r.status] ?? { label: r.status, color: 'default' };
                return <Tag color={s.color}>{s.label}</Tag>;
            },
        },
        {
            title: 'KT xác nhận', key: 'confirmed', width: 110, align: 'center',
            render: (_, r) => (
                <Tag color={r.accountantConfirmed ? 'success' : 'default'}>
                    {r.accountantConfirmed ? 'Đã xác nhận' : 'Chưa xác nhận'}
                </Tag>
            ),
        },
        {
            title: 'Thao tác', key: 'actions', width: 80, align: 'center',
            render: (_, r) => (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }} onClick={e => e.stopPropagation()}>
                    <button style={{ padding: 6, background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}
                        onClick={() => router.push(`/dashboard/quan-ly-du-an/giao-dich/${r.id}` as any)}>
                        <Eye size={16} />
                    </button>
                    {can('TRANSACTION_DELETE') && (
                        <button
                            style={{ padding: 6, background: 'none', border: 'none', cursor: r.status === 'SUCCESS' ? 'not-allowed' : 'pointer', color: r.status === 'SUCCESS' ? '#d1d5db' : '#6b7280', opacity: r.status === 'SUCCESS' ? 0.3 : 1 }}
                            disabled={r.status === 'SUCCESS'}
                            onClick={() => r.status !== 'SUCCESS' && handleDelete(r.id)}
                        >
                            <Trash2 size={16} />
                        </button>
                    )}
                </div>
            ),
        },
    ];

    return (
        <>
            <div style={{ marginBottom: 24 }}>
                <Title level={4} style={{ margin: 0 }}>Quản lý dự án / Giao dịch</Title>
            </div>

            <Card>
                <Space wrap style={{ marginBottom: 16 }}>
                    <Select value={statusFilter || undefined} onChange={v => { setStatusFilter(v ?? ''); setPagination(p => ({ ...p, page: 1 })); }} placeholder="Tình trạng" style={{ width: 176 }} allowClear options={[{ value: '', label: 'Tất cả' }, ...Object.entries(STATUS_MAP).map(([k, v]) => ({ value: k, label: v.label }))]} />
                    <span style={{ fontSize: 14, color: '#6b7280' }}>Từ ngày</span>
                    <DatePicker value={fromDate ? dayjs(fromDate) : null} onChange={(d) => { setFromDate(d ? d.format('YYYY-MM-DD') : ''); setPagination(p => ({ ...p, page: 1 })); }} format="DD/MM/YYYY" style={{ height: 32 }} />
                    <span style={{ fontSize: 14, color: '#6b7280' }}>đến ngày</span>
                    <DatePicker value={toDate ? dayjs(toDate) : null} onChange={(d) => { setToDate(d ? d.format('YYYY-MM-DD') : ''); setPagination(p => ({ ...p, page: 1 })); }} format="DD/MM/YYYY" style={{ height: 32 }} />
                    {hasFilter && (
                        <Button icon={<CloseOutlined />} onClick={resetFilters}>Xoá lọc</Button>
                    )}
                    <Input
                        prefix={<SearchOutlined style={{ color: '#9ca3af' }} />}
                        placeholder="Tìm theo mã giao dịch..."
                        value={searchInput}
                        onChange={e => setSearchInput(e.target.value)}
                        onPressEnter={() => { setSearch(searchInput); setPagination(p => ({ ...p, page: 1 })); }}
                        style={{ width: 256 }}
                    />
                </Space>

                <Table
                    columns={columns}
                    dataSource={transactions}
                    rowKey="id"
                    loading={loading}
                    pagination={{ pageSize: pagination.limit, total: pagination.total, current: pagination.page, onChange: (page) => setPagination(p => ({ ...p, page })), showTotal: (total) => `Tổng: ${total} giao dịch` }}
                    onRow={(r) => ({ onClick: () => router.push(`/dashboard/quan-ly-du-an/giao-dich/${r.id}` as any) })}
                    size="small"
                />
            </Card>
        </>
    );
}
