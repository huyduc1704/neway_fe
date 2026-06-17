'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Table, Input, Tag, Typography, Card, Space, Button, Tooltip, Popconfirm, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import api from '@/lib/api';
import { useUser } from '@/context/UserContext';

const { Title } = Typography;

interface Role {
    id: string;
    code: string;
    name: string;
    description: string | null;
    commissionPercent: string | null;
    fixedSalary: string | null;
    kpi: string | null;
    isActive: boolean;
    taskSalaries: { id: string }[];
    _count: { users: number };
}

const fmtCurrency = (v: string | null) =>
    v ? new Intl.NumberFormat('vi-VN').format(Number(v)) + 'đ' : '—';

export default function VaiTroPage() {
    const router = useRouter();
    const { can } = useUser();
    const [roles, setRoles]     = useState<Role[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch]   = useState('');
    const [total, setTotal]     = useState(0);
    const [page, setPage]       = useState(1);
    const limit = 20;

    const fetchRoles = useCallback(async (p = 1, q = search) => {
        setLoading(true);
        try {
            const { data } = await api.get('/roles', {
                params: { page: p, limit, search: q || undefined },
            });
            setRoles(data.data);
            setTotal(data.meta.total);
        } catch {
            message.error('Không thể tải danh sách vai trò');
        } finally {
            setLoading(false);
        }
    }, [search]);

    useEffect(() => { fetchRoles(1); }, []);

    const handleDelete = async (id: string, userCount: number) => {
        if (userCount > 0) {
            message.error(`Vai trò đang có ${userCount} người dùng, không thể xoá`);
            return;
        }
        try {
            await api.delete(`/roles/${id}`);
            message.success('Đã xoá vai trò');
            fetchRoles(page);
        } catch (err: any) {
            message.error(err?.response?.data?.message || 'Xoá thất bại');
        }
    };

    const columns: ColumnsType<Role> = [
        {
            title: 'STT', key: 'stt', width: 56, align: 'center' as const,
            render: (_, __, i) => (page - 1) * limit + i + 1,
        },
        {
            title: 'Tên vai trò', key: 'name',
            render: (_, r) => (
                <div>
                    <div style={{ fontWeight: 600 }}>{r.name}</div>
                    <div style={{ fontSize: 12, color: '#9ca3af' }}>{r.code}</div>
                </div>
            ),
        },
        {
            title: 'Lương cố định', key: 'fixedSalary', width: 160,
            render: (_, r) => (
                <span style={{ color: '#E8890C', fontWeight: 500 }}>
                    {fmtCurrency(r.fixedSalary)}
                </span>
            ),
        },
        {
            title: 'Hoa hồng', key: 'commission', width: 100, align: 'center' as const,
            render: (_, r) => r.commissionPercent != null
                ? <Tag color="orange">{Number(r.commissionPercent)}%</Tag>
                : '—',
        },
        {
            title: 'Lương Nhiệm Vụ', key: 'taskSalaries', width: 140, align: 'center' as const,
            render: (_, r) => r.taskSalaries?.length
                ? <Tag color="blue">{r.taskSalaries.length} nhiệm vụ</Tag>
                : <span style={{ color: '#d1d5db' }}>—</span>,
        },
        {
            title: 'KPI', key: 'kpi', width: 200,
            render: (_, r) => r.kpi
                ? <Tooltip title={r.kpi}><span style={{ fontSize: 13 }}>{r.kpi.length > 40 ? r.kpi.slice(0, 40) + '…' : r.kpi}</span></Tooltip>
                : '—',
        },
        {
            title: 'Ghi chú', key: 'description', width: 200,
            render: (_, r) => r.description
                ? <Tooltip title={r.description}><span style={{ fontSize: 13, color: '#6b7280' }}>{r.description.length > 40 ? r.description.slice(0, 40) + '…' : r.description}</span></Tooltip>
                : '—',
        },
        {
            title: 'Thao tác', key: 'actions', width: 90, align: 'center' as const,
            render: (_, r) => (
                <Space size={4}>
                    {can('ROLE_EDIT') && (
                        <Tooltip title="Chỉnh sửa">
                            <Button size="small" type="text" icon={<EditOutlined />}
                                onClick={() => router.push(`/dashboard/he-thong/vai-tro/${r.id}`)} />
                        </Tooltip>
                    )}
                    {can('ROLE_DELETE') && (
                        <Popconfirm
                            title={r._count?.users > 0
                                ? `Vai trò đang có ${r._count.users} người dùng, không thể xoá`
                                : 'Xác nhận xoá vai trò này?'}
                            okText="Xoá" cancelText="Huỷ"
                            okButtonProps={{ danger: true, disabled: r._count?.users > 0 }}
                            onConfirm={() => handleDelete(r.id, r._count?.users ?? 0)}>
                            <Button size="small" type="text" icon={<DeleteOutlined />} danger
                                disabled={r._count?.users > 0} />
                        </Popconfirm>
                    )}
                </Space>
            ),
        },
    ];

    return (
        <>
            <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Title level={4} style={{ margin: 0 }}>Quản lý vai trò</Title>
                {can('ROLE_CREATE') && (
                    <Button type="primary" icon={<PlusOutlined />}
                        style={{ background: '#E8890C', borderColor: '#E8890C' }}
                        onClick={() => router.push('/dashboard/he-thong/vai-tro/tao-moi')}>
                        Tạo vai trò mới
                    </Button>
                )}
            </div>

            <Card>
                <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
                    <Input
                        prefix={<SearchOutlined style={{ color: '#9ca3af' }} />}
                        placeholder="Tìm mã hoặc tên vai trò..."
                        style={{ width: 280 }}
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        onPressEnter={() => { setPage(1); fetchRoles(1, search); }}
                        allowClear
                        onClear={() => { setSearch(''); fetchRoles(1, ''); }}
                    />
                </div>
                <Table
                    columns={columns}
                    dataSource={roles}
                    rowKey="id"
                    loading={loading}
                    size="small"
                    pagination={{
                        current: page, pageSize: limit, total,
                        showSizeChanger: false,
                        showTotal: t => `Tổng: ${t} vai trò`,
                        onChange: p => { setPage(p); fetchRoles(p); },
                    }}
                />
            </Card>
        </>
    );
}
