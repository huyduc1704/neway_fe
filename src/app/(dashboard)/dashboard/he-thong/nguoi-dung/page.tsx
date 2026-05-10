'use client';
import { useEffect, useState, useCallback } from 'react';
import { Table, Input, Button, Tag, Space, Popconfirm, message, Tooltip, Select } from 'antd';
import { EditOutlined, StopOutlined, FilterOutlined } from '@ant-design/icons';
import type { TableColumnsType } from 'antd';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import PageHeader from '@/components/common/PageHeader';

interface User {
    id: string;
    username: string;
    fullName: string;
    status: string;
    createdAt: string;
    roles: { role: { id: string; code: string; name: string } }[];
}

interface Role { id: string; code: string; name: string; }

const TH = { style: { backgroundColor: '#FFF3E0', color: '#E8890C' } };

export default function NguoiDungPage() {
    const router = useRouter();
    const [users, setUsers] = useState<User[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState<string | undefined>();
    const [showFilter, setShowFilter] = useState(false);
    const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
    const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 });

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/users', {
                params: { page: pagination.page, limit: pagination.limit, search: search || undefined, roleId: roleFilter },
            });
            setUsers(data.data);
            setPagination((p) => ({ ...p, total: data.meta.total }));
        } catch { message.error('Không thể tải danh sách người dùng'); }
        finally { setLoading(false); }
    }, [pagination.page, pagination.limit, search, roleFilter]);

    useEffect(() => { fetchUsers(); }, [fetchUsers]);

    useEffect(() => {
        api.get('/roles', { params: { limit: 100 } })
            .then(({ data }) => setRoles(data.data))
            .catch(() => {});
    }, []);

    const handleDeactivate = async (id: string) => {
        try {
            await api.patch(`/users/${id}/deactivate`);
            message.success('Đã vô hiệu hoá tài khoản');
            fetchUsers();
        } catch { message.error('Thao tác thất bại'); }
    };

    const columns: TableColumnsType<User> = [
        {
            title: 'STT', width: 60, align: 'center',
            render: (_, __, i) => (pagination.page - 1) * pagination.limit + i + 1,
            onHeaderCell: () => TH,
        },
        {
            title: 'Tên đăng nhập', dataIndex: 'username',
            render: (v, r) => <span style={{ fontWeight: 500 }}>{r.fullName || v}</span>,
            onHeaderCell: () => TH,
        },
        {
            title: 'Mật khẩu', width: 140,
            render: () => '************',
            onHeaderCell: () => TH,
        },
        {
            title: 'Vai trò', width: 130,
            render: (_, r) => r.roles?.[0]?.role?.name || '—',
            onHeaderCell: () => TH,
        },
        {
            title: 'Trạng thái', width: 150, align: 'center',
            render: (_, r) => (
                <Tag color={r.status === 'ACTIVE' ? 'success' : 'default'}>
                    {r.status === 'ACTIVE' ? 'Hoạt động' : 'Không hoạt động'}
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
                        <Button type="text" icon={<EditOutlined />}
                            onClick={() => router.push(`/dashboard/he-thong/nguoi-dung/${r.id}` as any)} />
                    </Tooltip>
                    <Tooltip title="Vô hiệu hoá">
                        <Popconfirm
                            title="Vô hiệu hoá tài khoản này?"
                            okText="Xác nhận" cancelText="Huỷ"
                            onConfirm={() => handleDeactivate(r.id)}
                            disabled={r.status !== 'ACTIVE'}
                        >
                            <Button type="text" danger icon={<StopOutlined />} disabled={r.status !== 'ACTIVE'} />
                        </Popconfirm>
                    </Tooltip>
                </Space>
            ),
        },
    ];

    return (
        <>
            <PageHeader
                title="Người dùng / Danh sách"
                createLabel="Tạo mới người dùng"
                createPath="/dashboard/he-thong/nguoi-dung/tao-moi"
            />

            <div style={{ background: '#fff', borderRadius: 8, padding: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <span style={{ color: '#888', fontSize: 13 }}>☰ Tác vụ hàng loạt</span>
                    <Space>
                        <Input.Search
                            placeholder="Tìm kiếm..."
                            allowClear
                            style={{ width: 260 }}
                            onSearch={(v) => { setSearch(v); setPagination((p) => ({ ...p, page: 1 })); }}
                        />
                        <Button
                            icon={<FilterOutlined />}
                            onClick={() => setShowFilter((v) => !v)}
                            type={showFilter ? 'primary' : 'default'}
                        >
                            Fitter
                        </Button>
                    </Space>
                </div>

                {showFilter && (
                    <div style={{ background: '#fafafa', padding: '12px 16px', borderRadius: 6, marginBottom: 12 }}>
                        <Space>
                            <span style={{ fontSize: 13 }}>Vai trò:</span>
                            <Select
                                allowClear placeholder="Chọn vai trò" style={{ width: 200 }}
                                onChange={(v) => { setRoleFilter(v); setPagination((p) => ({ ...p, page: 1 })); }}
                                options={roles.map((r) => ({ value: r.id, label: r.name }))}
                            />
                        </Space>
                    </div>
                )}

                <Table
                    rowKey="id"
                    columns={columns}
                    dataSource={users}
                    loading={loading}
                    rowSelection={{
                        selectedRowKeys,
                        onChange: (keys) => setSelectedRowKeys(keys as string[]),
                    }}
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
