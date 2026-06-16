'use client';
import { useEffect, useState, useCallback } from 'react';
import { message } from 'antd';
import { useRouter } from 'next/navigation';
import { Pencil, Trash2 } from 'lucide-react';
import { Button, Input, Tag, Table, Card, Typography, Space, message as antMessage } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined, SearchOutlined, DownloadOutlined } from '@ant-design/icons';
import api from '@/lib/api';
import { downloadExport } from '@/lib/export';

const { Title } = Typography;

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
            message.error('Không thể tải danh sách khách hàng');
        } finally {
            setLoading(false);
        }
    }, [pagination.page, pagination.limit, search]);

    useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

    const handleDelete = async (id: string) => {
        if (!window.confirm('Xoá khách hàng này?')) return;
        try {
            await api.delete(`/customers/${id}`);
            message.success('Đã xoá khách hàng');
            fetchCustomers();
        } catch (err: any) {
            message.error(err?.response?.data?.message || 'Thao tác thất bại');
        }
    };

    const columns: ColumnsType<Customer> = [
        {
            title: 'STT', key: 'stt', width: 60, align: 'center',
            render: (_, __, i) => (pagination.page - 1) * pagination.limit + i + 1,
        },
        { title: 'Mã KH', key: 'code', width: 120, render: (_, r) => <Tag color="orange">{r.code}</Tag> },
        { title: 'Họ tên', key: 'fullName', render: (_, r) => <span style={{ fontWeight: 500 }}>{r.fullName}</span> },
        { title: 'Số điện thoại', key: 'phone', width: 150, dataIndex: 'phone' },
        { title: 'Email', key: 'email', width: 220, render: (_, r) => r.email || '—' },
        {
            title: 'Trạng thái', key: 'status', width: 140, align: 'center',
            render: (_, r) => (
                <Tag color={r.isActive ? 'success' : 'default'}>
                    {r.isActive ? 'Hoạt động' : 'Không hoạt động'}
                </Tag>
            ),
        },
        {
            title: 'Thao tác', key: 'actions', width: 100, align: 'center',
            render: (_, r) => (
                <Space>
                    <button title="Chỉnh sửa" style={{ padding: 6, background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}
                        onClick={() => router.push(`/dashboard/he-thong/danh-muc-khach-hang/${r.id}` as any)}>
                        <Pencil size={16} />
                    </button>
                    <button title="Xoá" style={{ padding: 6, background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}
                        onClick={() => handleDelete(r.id)}>
                        <Trash2 size={16} />
                    </button>
                </Space>
            ),
        },
    ];

    return (
        <>
            <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Title level={4} style={{ margin: 0 }}>Danh mục khách hàng / Danh sách</Title>
                <Space>
                    <Button icon={<DownloadOutlined />} onClick={async () => {
                        try { await downloadExport('/customers/export', { search: search || undefined }, 'danh-muc-khach-hang'); }
                        catch { antMessage.error('Xuất file thất bại'); }
                    }}>Xuất Excel</Button>
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => router.push('/dashboard/he-thong/danh-muc-khach-hang/tao-moi' as any)}>
                        Thêm khách hàng
                    </Button>
                </Space>
            </div>

            <Card>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                    <Input
                        prefix={<SearchOutlined style={{ color: '#9ca3af' }} />}
                        placeholder="Tìm theo mã hoặc họ tên..."
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        onPressEnter={() => { setSearch(searchInput); setPagination((p) => ({ ...p, page: 1 })); }}
                        style={{ width: 320 }}
                    />
                </div>

                <Table
                    columns={columns}
                    dataSource={customers}
                    rowKey="id"
                    loading={loading}
                    pagination={{ pageSize: pagination.limit, total: pagination.total, current: pagination.page, onChange: (page) => setPagination((p) => ({ ...p, page })), showTotal: (total) => `Tổng: ${total} khách hàng` }}
                    size="small"
                />
            </Card>
        </>
    );
}
