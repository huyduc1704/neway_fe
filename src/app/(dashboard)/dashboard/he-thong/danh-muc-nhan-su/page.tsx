'use client';
import { useEffect, useState, useCallback } from 'react';
import { Table, Input, Button, Tag, Space, Popconfirm, message, Tooltip } from 'antd';
import { EditOutlined, DeleteOutlined } from '@ant-design/icons';
import type { TableColumnsType } from 'antd';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import PageHeader from '@/components/common/PageHeader';
import dayjs from 'dayjs';

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

const TH = { style: { backgroundColor: '#FFF3E0', color: '#E8890C' } };

export default function DanhMucNhanSuPage() {
    const router = useRouter();
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
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
        try {
            await api.delete(`/employees/${id}`);
            message.success('Đã xoá nhân viên');
            fetchEmployees();
        } catch (err: any) {
            message.error(err?.response?.data?.message || 'Thao tác thất bại');
        }
    };

    const columns: TableColumnsType<Employee> = [
        {
            title: 'STT', width: 60, align: 'center',
            render: (_, __, i) => (pagination.page - 1) * pagination.limit + i + 1,
            onHeaderCell: () => TH,
        },
        {
            title: 'Mã NV', width: 110,
            render: (_, r) => <Tag color="orange">{r.employeeProfile?.employeeCode || '—'}</Tag>,
            onHeaderCell: () => TH,
        },
        {
            title: 'Họ tên', dataIndex: 'fullName',
            render: (v) => <span style={{ fontWeight: 500 }}>{v}</span>,
            onHeaderCell: () => TH,
        },
        {
            title: 'Vai trò', width: 160,
            render: (_, r) => r.roles?.[0]?.role?.name || '—',
            onHeaderCell: () => TH,
        },
        {
            title: 'Chi nhánh', width: 160,
            render: (_, r) => r.employeeProfile?.branch?.name || '—',
            onHeaderCell: () => TH,
        },
        {
            title: 'Team', width: 140,
            render: (_, r) => r.employeeProfile?.team?.name || '—',
            onHeaderCell: () => TH,
        },
        {
            title: 'Ngày vào làm', width: 130, align: 'center',
            render: (_, r) => r.employeeProfile?.joinedAt
                ? dayjs(r.employeeProfile.joinedAt).format('DD/MM/YYYY')
                : '—',
            onHeaderCell: () => TH,
        },
        {
            title: 'Trạng thái', width: 140, align: 'center',
            render: (_, r) => (
                <Tag color={r.employeeProfile?.isActive ? 'success' : 'default'}>
                    {r.employeeProfile?.isActive ? 'Đang làm' : 'Đã nghỉ'}
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
                            onClick={() => router.push(`/dashboard/he-thong/danh-muc-nhan-su/${r.id}` as any)}
                        />
                    </Tooltip>
                    <Tooltip title="Xoá">
                        <Popconfirm
                            title="Xoá nhân viên này?"
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
                title="Danh mục nhân sự / Danh sách"
                createLabel="Thêm nhân viên"
                createPath="/dashboard/he-thong/danh-muc-nhan-su/tao-moi"
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
                    dataSource={employees}
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
