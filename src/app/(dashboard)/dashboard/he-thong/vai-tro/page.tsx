'use client';
import { useEffect, useState, useCallback } from 'react';
import { message } from 'antd';
import { useRouter } from 'next/navigation';
import { Pencil, Trash2 } from 'lucide-react';
import { Button, Input, Tag, Table, Card, Typography, Space } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import api from '@/lib/api';

const { Title } = Typography;

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
            message.error('Không thể tải danh sách vai trò');
        } finally {
            setLoading(false);
        }
    }, [pagination.page, pagination.limit, search]);

    useEffect(() => { fetchRoles(); }, [fetchRoles]);

    const handleDelete = async (id: string, userCount: number) => {
        if (userCount > 0) {
            message.error(`Vai trò đang được gán cho ${userCount} người dùng, không thể xoá`);
            return;
        }
        if (!window.confirm('Xoá vai trò này?')) return;
        try {
            await api.delete(`/roles/${id}`);
            message.success('Đã xoá vai trò');
            fetchRoles();
        } catch (err: any) {
            message.error(err?.response?.data?.message || 'Thao tác thất bại');
        }
    };

    const columns: ColumnsType<Role> = [
        {
            title: 'STT', key: 'stt', width: 60, align: 'center',
            render: (_, __, i) => (pagination.page - 1) * pagination.limit + i + 1,
        },
        { title: 'Mã vai trò', key: 'code', width: 140, render: (_, r) => <Tag color="orange">{r.code}</Tag> },
        { title: 'Tên vai trò', key: 'name', render: (_, r) => <span style={{ fontWeight: 500 }}>{r.name}</span> },
        { title: 'Mô tả', key: 'description', render: (_, r) => r.description || '—' },
        { title: 'Số người dùng', key: 'userCount', width: 130, align: 'center', render: (_, r) => r._count?.users ?? 0 },
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
                        onClick={() => router.push(`/dashboard/he-thong/vai-tro/${r.id}` as any)}>
                        <Pencil size={16} />
                    </button>
                    <button title="Xoá" style={{ padding: 6, background: 'none', border: 'none', cursor: r._count?.users > 0 ? 'not-allowed' : 'pointer', color: r._count?.users > 0 ? '#d1d5db' : '#6b7280', opacity: r._count?.users > 0 ? 0.4 : 1 }}
                        onClick={() => handleDelete(r.id, r._count?.users ?? 0)}>
                        <Trash2 size={16} />
                    </button>
                </Space>
            ),
        },
    ];

    return (
        <>
            <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Title level={4} style={{ margin: 0 }}>Vai trò / Danh sách</Title>
                <Button type="primary" icon={<PlusOutlined />} onClick={() => router.push('/dashboard/he-thong/vai-tro/tao-moi' as any)}>
                    Tạo mới vai trò
                </Button>
            </div>

            <Card>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                    <Input
                        prefix={<SearchOutlined style={{ color: '#9ca3af' }} />}
                        placeholder="Tìm kiếm mã hoặc tên vai trò..."
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        onPressEnter={() => { setSearch(searchInput); setPagination((p) => ({ ...p, page: 1 })); }}
                        style={{ width: 320 }}
                    />
                </div>

                <Table
                    columns={columns}
                    dataSource={roles}
                    rowKey="id"
                    loading={loading}
                    pagination={{ pageSize: pagination.limit, total: pagination.total, current: pagination.page, onChange: (page) => setPagination((p) => ({ ...p, page })), showTotal: (total) => `Tổng: ${total} vai trò` }}
                    size="small"
                />
            </Card>
        </>
    );
}
