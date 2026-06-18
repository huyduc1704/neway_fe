'use client';
import { useEffect, useState, useCallback } from 'react';
import { message } from 'antd';
import { useRouter } from 'next/navigation';
import { Pencil, Ban, KeyRound, Trash2 } from 'lucide-react';
import { Button, Input, Select, Tag, Table, Card, Modal, Form, Typography, Space, Popconfirm } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined, SearchOutlined, FilterOutlined } from '@ant-design/icons';
import api from '@/lib/api';
import { useUser } from '@/context/UserContext';

const { Title } = Typography;

interface User {
    id: string;
    username: string;
    fullName: string;
    status: string;
    createdAt: string;
    roles: { role: { id: string; code: string; name: string } }[];
}

interface Role { id: string; code: string; name: string; }

export default function NguoiDungPage() {
    const router = useRouter();
    const { can } = useUser();
    const [users, setUsers] = useState<User[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [searchInput, setSearchInput] = useState('');
    const [roleFilter, setRoleFilter] = useState<string>('');
    const [showFilter, setShowFilter] = useState(false);
    const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 });

    const [pwDialog, setPwDialog]       = useState(false);
    const [pwUserId, setPwUserId]       = useState('');
    const [pwUserName, setPwUserName]   = useState('');
    const [pwSaving, setPwSaving]       = useState(false);
    const [pwForm] = Form.useForm();

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/users', {
                params: { page: pagination.page, limit: pagination.limit, search: search || undefined, roleId: roleFilter || undefined },
            });
            setUsers(data.data);
            setPagination((p) => ({ ...p, total: data.meta.total }));
        } catch {
            message.error('Không thể tải danh sách người dùng');
        } finally {
            setLoading(false);
        }
    }, [pagination.page, pagination.limit, search, roleFilter]);

    useEffect(() => { fetchUsers(); }, [fetchUsers]);

    useEffect(() => {
        api.get('/roles', { params: { limit: 100 } }).then(({ data }) => setRoles(data.data)).catch(() => {});
    }, []);

    const handleDelete = async (id: string) => {
        try {
            await api.delete(`/users/${id}`);
            message.success('Đã xoá người dùng');
            fetchUsers();
        } catch (err: any) {
            message.error(err?.response?.data?.message || 'Xoá thất bại');
        }
    };

    const handleDeactivate = async (id: string) => {
        if (!window.confirm('Vô hiệu hoá tài khoản này?')) return;
        try {
            await api.patch(`/users/${id}/disable`);
            message.success('Đã vô hiệu hoá tài khoản');
            fetchUsers();
        } catch {
            message.error('Thao tác thất bại');
        }
    };

    const openPwReset = (id: string, name: string) => {
        setPwUserId(id); setPwUserName(name); pwForm.resetFields(); setPwDialog(true);
    };
    const handlePwReset = async () => {
        try {
            const values = await pwForm.validateFields();
            if (values.newPassword.length < 6) {
                message.error('Mật khẩu tối thiểu 6 ký tự'); return;
            }
            setPwSaving(true);
            await api.patch(`/users/${pwUserId}/password`, { newPassword: values.newPassword });
            message.success('Đặt lại mật khẩu thành công');
            setPwDialog(false);
        } catch (err: any) {
            if (err?.response) message.error(err?.response?.data?.message || 'Thao tác thất bại');
        } finally {
            setPwSaving(false);
        }
    };

    const columns: ColumnsType<User> = [
        {
            title: 'STT', key: 'stt', width: 60, align: 'center',
            render: (_, __, i) => (pagination.page - 1) * pagination.limit + i + 1,
        },
        { title: 'Tên đăng nhập', key: 'fullName', render: (_, r) => <span style={{ fontWeight: 500 }}>{r.fullName || r.username}</span> },
        { title: 'Mật khẩu', key: 'password', width: 140, render: () => '************' },
        { title: 'Vai trò', key: 'role', width: 130, render: (_, r) => r.roles?.[0]?.role?.name || '—' },
        {
            title: 'Trạng thái', key: 'status', width: 150, align: 'center',
            render: (_, r) => (
                <Tag color={r.status === 'ACTIVE' ? 'success' : 'default'}>
                    {r.status === 'ACTIVE' ? 'Hoạt động' : 'Không hoạt động'}
                </Tag>
            ),
        },
        {
            title: 'Thao tác', key: 'actions', width: 150, align: 'center',
            render: (_, r) => (
                <Space>
                    {can('EMPLOYEE_EDIT') && (
                        <button title="Chỉnh sửa" style={{ padding: 6, background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}
                            onClick={() => router.push(`/dashboard/he-thong/nguoi-dung/${r.id}` as any)}>
                            <Pencil size={16} />
                        </button>
                    )}
                    {can('EMPLOYEE_EDIT') && (
                        <button title="Đặt lại mật khẩu" style={{ padding: 6, background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}
                            onClick={() => openPwReset(r.id, r.fullName || r.username)}>
                            <KeyRound size={16} />
                        </button>
                    )}
                    {can('EMPLOYEE_EDIT') && (
                        <button
                            title="Vô hiệu hoá"
                            style={{ padding: 6, background: 'none', border: 'none', cursor: r.status !== 'ACTIVE' ? 'not-allowed' : 'pointer', color: r.status !== 'ACTIVE' ? '#d1d5db' : '#6b7280', opacity: r.status !== 'ACTIVE' ? 0.4 : 1 }}
                            disabled={r.status !== 'ACTIVE'}
                            onClick={() => r.status === 'ACTIVE' && handleDeactivate(r.id)}
                        >
                            <Ban size={16} />
                        </button>
                    )}
                    {can('EMPLOYEE_DELETE') && (
                        <Popconfirm
                            title="Xoá người dùng này?"
                            description="Thao tác này không thể hoàn tác."
                            onConfirm={() => handleDelete(r.id)}
                            okText="Xoá" cancelText="Huỷ" okButtonProps={{ danger: true }}
                        >
                            <button title="Xoá" style={{ padding: 6, background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}>
                                <Trash2 size={16} />
                            </button>
                        </Popconfirm>
                    )}
                </Space>
            ),
        },
    ];

    return (
        <>
            <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Title level={4} style={{ margin: 0 }}>Người dùng / Danh sách</Title>
                {can('EMPLOYEE_CREATE') && (
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => router.push('/dashboard/he-thong/nguoi-dung/tao-moi' as any)}>
                        Tạo mới người dùng
                    </Button>
                )}
            </div>

            <Card>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <span style={{ fontSize: 12, color: '#9ca3af' }}>☰ Tác vụ hàng loạt</span>
                    <Space>
                        <Input
                            prefix={<SearchOutlined style={{ color: '#9ca3af' }} />}
                            placeholder="Tìm kiếm..."
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            onPressEnter={() => { setSearch(searchInput); setPagination((p) => ({ ...p, page: 1 })); }}
                            style={{ width: 240 }}
                        />
                        <Button
                            type={showFilter ? 'primary' : 'default'}
                            icon={<FilterOutlined />}
                            onClick={() => setShowFilter((v) => !v)}
                        >
                            Fitter
                        </Button>
                    </Space>
                </div>

                {showFilter && (
                    <div style={{ background: '#f9fafb', borderRadius: 6, padding: '12px 16px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontSize: 14, color: '#4b5563' }}>Vai trò:</span>
                        <Select
                            value={roleFilter || undefined}
                            onChange={(v) => { setRoleFilter(v ?? ''); setPagination((p) => ({ ...p, page: 1 })); }}
                            placeholder="Chọn vai trò"
                            style={{ width: 192 }}
                            allowClear
                            options={[{ value: '', label: 'Tất cả vai trò' }, ...roles.map((r) => ({ value: r.id, label: r.name }))]}
                        />
                    </div>
                )}

                <Table
                    columns={columns}
                    dataSource={users}
                    rowKey="id"
                    loading={loading}
                    pagination={{ pageSize: pagination.limit, total: pagination.total, current: pagination.page, onChange: (page) => setPagination((p) => ({ ...p, page })), showTotal: (total) => `Tổng: ${total} người dùng` }}
                    size="small"
                />
            </Card>

            {/* Password reset Modal */}
            <Modal
                open={pwDialog}
                onCancel={() => setPwDialog(false)}
                title="Đặt lại mật khẩu"
                width={400}
                footer={[
                    <Button key="cancel" onClick={() => setPwDialog(false)}>Huỷ</Button>,
                    <Button key="ok" type="primary" onClick={handlePwReset} loading={pwSaving}>Xác nhận</Button>,
                ]}
            >
                <Form form={pwForm} layout="vertical" style={{ marginTop: 16 }}>
                    <p style={{ fontSize: 14, color: '#4b5563', marginBottom: 12 }}>Tài khoản: <span style={{ fontWeight: 500 }}>{pwUserName}</span></p>
                    <Form.Item name="newPassword" label={<span>Mật khẩu mới <span style={{ color: 'red' }}>*</span></span>} rules={[{ required: true, message: 'Nhập mật khẩu mới' }]}>
                        <Input.Password placeholder="Tối thiểu 6 ký tự" />
                    </Form.Item>
                </Form>
            </Modal>
        </>
    );
}
