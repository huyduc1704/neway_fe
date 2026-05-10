'use client';
import { useEffect, useState, useCallback } from 'react';
import { Table, Input, Button, Tag, Space, Popconfirm, message, Tooltip } from 'antd';
import { EditOutlined, DeleteOutlined } from '@ant-design/icons';
import type { TableColumnsType } from 'antd';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import PageHeader from '@/components/common/PageHeader';

interface Role {
    id: string;
    code: string;
    name: string;
    description: string;
    isActive: boolean;
    createdAt: string;
    _count: { users: number };
}

const TH = { style: { backgroundColor: '#FFF3E0', color: '#E8890C' } };

export default function VaiTroPage() {
    const router = useRouter();
    const [roles, setRoles] = useState<Role[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
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
            message.error('Không thể tải danh sách vai trò');
        } finally {
            setLoading(false);
        }
    }, [pagination.page, pagination.limit, search]);

    useEffect(() => { fetchRoles(); }, [fetchRoles]);

    const handleDelete = async (id: string) => {
        try {
            await api.delete(`/roles/${id}`);
            message.success('Đã xoá vai trò');
            fetchRoles();
        } catch (err: any) {
            message.error(err?.response?.data?.message || 'Thao tác thất bại');
        }
    };

    const columns: TableColumnsType<Role> = [
        {
            title: 'STT', width: 60, align: 'center',
            render: (_, __, i) => (pagination.page - 1) * pagination.limit + i + 1,
            onHeaderCell: () => TH,
        },
        {
            title: 'Mã vai trò', dataIndex: 'code', width: 140,
            render: (v) => <Tag color="orange">{v}</Tag>,
            onHeaderCell: () => TH,
        },
        {
            title: 'Tên vai trò', dataIndex: 'name',
            render: (v) => <span style={{ fontWeight: 500 }}>{v}</span>,
            onHeaderCell: () => TH,
        },
        {
            title: 'Mô tả', dataIndex: 'description',
            render: (v) => v || '—',
            onHeaderCell: () => TH,
        },
        {
            title: 'Số người dùng', width: 130, align: 'center',
            render: (_, r) => r._count?.users ?? 0,
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
                            onClick={() => router.push(`/dashboard/he-thong/vai-tro/${r.id}` as any)}
                        />
                    </Tooltip>
                    <Tooltip title="Xoá">
                        <Popconfirm
                            title={r._count?.users > 0
                                ? `Vai trò đang được gán cho ${r._count.users} người dùng, không thể xoá`
                                : 'Xoá vai trò này?'}
                            okText="Xác nhận" cancelText="Huỷ"
                            onConfirm={() => handleDelete(r.id)}
                            disabled={r._count?.users > 0}
                        >
                            <Button
                                type="text" danger icon={<DeleteOutlined />}
                                disabled={r._count?.users > 0}
                            />
                        </Popconfirm>
                    </Tooltip>
                </Space>
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

            <div style={{ background: '#fff', borderRadius: 8, padding: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                    <Input.Search
                        placeholder="Tìm kiếm mã hoặc tên vai trò..."
                        allowClear
                        style={{ width: 300 }}
                        onSearch={(v) => { setSearch(v); setPagination((p) => ({ ...p, page: 1 })); }}
                    />
                </div>

                <Table
                    rowKey="id"
                    columns={columns}
                    dataSource={roles}
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
