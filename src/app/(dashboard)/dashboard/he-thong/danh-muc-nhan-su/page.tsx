'use client';
import { useEffect, useState, useCallback } from 'react';
import { message } from 'antd';
import { useRouter } from 'next/navigation';
import { Pencil, Trash2 } from 'lucide-react';
import { Button, Input, Tag, Table, Card, Typography, Space } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import api from '@/lib/api';
import dayjs from 'dayjs';

const { Title } = Typography;

interface Employee {
    id: string;
    fullName: string;
    status: string;
    roles: { role: { code: string; name: string } }[];
    employeeProfile: {
        id: string;
        employeeCode: string;
        isActive: boolean;
        joinedAt: string | null;
        branch: { id: string; name: string } | null;
        team: { id: string; name: string } | null;
        directManager: { id: string; user: { fullName: string } } | null;
    } | null;
}

export default function DanhMucNhanSuPage() {
    const router = useRouter();
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [searchInput, setSearchInput] = useState('');
    const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 });

    const fetchEmployees = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/employees', {
                params: { page: pagination.page, limit: pagination.limit, search: search || undefined },
            });
            setEmployees(data.data);
            setPagination((p) => ({ ...p, total: data.meta.total }));
        } catch {
            message.error('Không thể tải danh sách nhân sự');
        } finally {
            setLoading(false);
        }
    }, [pagination.page, pagination.limit, search]);

    useEffect(() => { fetchEmployees(); }, [fetchEmployees]);

    const handleDelete = async (id: string) => {
        if (!window.confirm('Xoá nhân viên này?')) return;
        try {
            await api.delete(`/employees/${id}`);
            message.success('Đã xoá nhân viên');
            fetchEmployees();
        } catch (err: any) {
            message.error(err?.response?.data?.message || 'Thao tác thất bại');
        }
    };

    const columns: ColumnsType<Employee> = [
        {
            title: 'STT', key: 'stt', width: 60, align: 'center',
            render: (_, __, i) => (pagination.page - 1) * pagination.limit + i + 1,
        },
        { title: 'Mã NV', key: 'code', width: 110, render: (_, r) => <Tag color="orange">{r.employeeProfile?.employeeCode || '—'}</Tag> },
        { title: 'Họ tên', key: 'fullName', render: (_, r) => <span style={{ fontWeight: 500 }}>{r.fullName}</span> },
        { title: 'Vai trò', key: 'role', width: 160, render: (_, r) => r.roles?.[0]?.role?.name || '—' },
        { title: 'Chi nhánh', key: 'branch', width: 160, render: (_, r) => r.employeeProfile?.branch?.name || '—' },
        { title: 'Team', key: 'team', width: 140, render: (_, r) => r.employeeProfile?.team?.name || '—' },
        {
            title: 'Ngày vào làm', key: 'joinedAt', width: 130, align: 'center',
            render: (_, r) => r.employeeProfile?.joinedAt
                ? dayjs(r.employeeProfile.joinedAt).format('DD/MM/YYYY')
                : '—',
        },
        {
            title: 'Trạng thái', key: 'status', width: 140, align: 'center',
            render: (_, r) => (
                <Tag color={r.employeeProfile?.isActive ? 'success' : 'default'}>
                    {r.employeeProfile?.isActive ? 'Đang làm' : 'Đã nghỉ'}
                </Tag>
            ),
        },
        {
            title: 'Thao tác', key: 'actions', width: 100, align: 'center',
            render: (_, r) => (
                <Space>
                    <button title="Chỉnh sửa" style={{ padding: 6, background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}
                        onClick={() => router.push(`/dashboard/he-thong/danh-muc-nhan-su/${r.id}` as any)}>
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
                <Title level={4} style={{ margin: 0 }}>Danh mục nhân sự / Danh sách</Title>
                <Button type="primary" icon={<PlusOutlined />} onClick={() => router.push('/dashboard/he-thong/danh-muc-nhan-su/tao-moi' as any)}>
                    Thêm nhân viên
                </Button>
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
                    dataSource={employees}
                    rowKey="id"
                    loading={loading}
                    pagination={{ pageSize: pagination.limit, total: pagination.total, current: pagination.page, onChange: (page) => setPagination((p) => ({ ...p, page })), showTotal: (total) => `Tổng: ${total} nhân viên` }}
                    size="small"
                />
            </Card>
        </>
    );
}
