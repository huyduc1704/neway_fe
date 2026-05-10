'use client';
import { useEffect, useState, useCallback } from 'react';
import { Table, Input, Button, Tag, Space, Popconfirm, message, Tooltip } from 'antd';
import { EditOutlined, DeleteOutlined } from '@ant-design/icons';
import type { TableColumnsType } from 'antd';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import PageHeader from '@/components/common/PageHeader';

interface Customer {
    id: string;
    code: string;
    fullName: string;
    phone: string;
    email: string | null;
    isActive: boolean;
    createdAt: string;
}

const TH = { style: { backgroundColor: '#FFF3E0', color: '#E8890C' } };

export default function DanhMucKhachHangPage() {
    const router = useRouter();
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
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
        try {
            await api.delete(`/customers/${id}`);
            message.success('Đã xoá khách hàng');
            fetchCustomers();
        } catch (err: any) {
            message.error(err?.response?.data?.message || 'Thao tác thất bại');
        }
    };

    const columns: TableColumnsType<Customer> = [
        {
            title: 'STT', width: 60, align: 'center',
            render: (_, __, i) => (pagination.page - 1) * pagination.limit + i + 1,
            onHeaderCell: () => TH,
        },
        {
            title: 'Mã KH', dataIndex: 'code', width: 120,
            render: (v) => <Tag color="orange">{v}</Tag>,
            onHeaderCell: () => TH,
        },
        {
            title: 'Họ tên', dataIndex: 'fullName',
            render: (v) => <span style={{ fontWeight: 500 }}>{v}</span>,
            onHeaderCell: () => TH,
        },
        {
            title: 'Số điện thoại', dataIndex: 'phone', width: 150,
            onHeaderCell: () => TH,
        },
        {
            title: 'Email', dataIndex: 'email', width: 220,
            render: (v) => v || '—',
            onHeaderCell: () => TH,
        },
        {
            title: 'Trạng thái', width: 140, align: 'center',
            render: (_, r) => (
                <Tag color={r.isActive ? 'success' : 'default'}>
                    {r.isActive ? 'Hoạt động' : 'Không hoạt động'}
                </Tag>
            ),
            onHeaderCell: () => TH,
        },
        {
            title: 'Thao tác', width: 100, align: 'center',
            onHeaderCell: () => TH,
            render: (_, r) => (
                <Space>
                    <Tooltip title="Chỉnh sửa">
                        <Button
                            type="text" icon={<EditOutlined />}
                            onClick={() => router.push(`/dashboard/he-thong/danh-muc-khach-hang/${r.id}` as any)}
                        />
                    </Tooltip>
                    <Tooltip title="Xoá">
                        <Popconfirm
                            title="Xoá khách hàng này?"
                            okText="Xác nhận" cancelText="Huỷ"
                            onConfirm={() => handleDelete(r.id)}
                        >
                            <Button type="text" danger icon={<DeleteOutlined />} />
                        </Popconfirm>
                    </Tooltip>
                </Space>
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

            <div style={{ background: '#fff', borderRadius: 8, padding: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                    <Input.Search
                        placeholder="Tìm theo mã hoặc họ tên..."
                        allowClear style={{ width: 300 }}
                        onSearch={(v) => { setSearch(v); setPagination((p) => ({ ...p, page: 1 })); }}
                    />
                </div>

                <Table
                    rowKey="id"
                    columns={columns}
                    dataSource={customers}
                    loading={loading}
                    pagination={{
                        current: pagination.page,
                        pageSize: pagination.limit,
                        total: pagination.total,
                        showSizeChanger: false,
                        onChange: (page) => setPagination((p) => ({ ...p, page })),
                        itemRender: (_, type, el) => {
                            if (type === 'prev') return <a>Trước</a>;
                            if (type === 'next') return <a>Sau</a>;
                            return el;
                        },
                    }}
                />
            </div>
        </>
    );
}
