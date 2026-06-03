'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
    Table, Input, Tag, Typography, Card, Space, Button, DatePicker, Tooltip, Popconfirm, message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '@/lib/api';

const { Title } = Typography;
const { RangePicker } = DatePicker;

interface Employee {
    id: string;
    stt: number;
    fullName: string;
    username: string;
    rawPassword: string;
    avatarUrl: string | null;
    roles: { role: { code: string; name: string; fixedSalary: string | null; commissionPercent: string | null } }[];
    employeeProfile: {
        employeeCode: string | null;
        employeeStatus: string;
        team: {
            id: string; name: string;
            branch: { id: string; name: string; region: { id: string; name: string } | null } | null;
        } | null;
    } | null;
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
    ACTIVE:    { label: 'Đang hoạt động', color: 'success' },
    SUSPENDED: { label: 'Tạm ngưng',      color: 'warning' },
    RESIGNED:  { label: 'Đã nghỉ',        color: 'default' },
};

const fmtCurrency = (v: string | null) =>
    v ? new Intl.NumberFormat('vi-VN').format(Number(v)) + 'đ' : '—';

export default function DanhMucNhanSuPage() {
    const router = useRouter();
    const [rows, setRows]       = useState<Employee[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch]   = useState('');
    const [dateRange, setDateRange] = useState<[string, string] | null>(null);
    const [total, setTotal]     = useState(0);
    const [page, setPage]       = useState(1);
    const limit = 20;

    const fetchData = useCallback(async (p = 1, q = search, dr = dateRange) => {
        setLoading(true);
        try {
            const { data } = await api.get('/employees', {
                params: {
                    page: p, limit,
                    search: q || undefined,
                    fromDate: dr?.[0] || undefined,
                    toDate: dr?.[1] || undefined,
                },
            });
            setRows(data.data);
            setTotal(data.meta.total);
        } catch {
            message.error('Không thể tải danh sách nhân sự');
        } finally {
            setLoading(false);
        }
    }, [search, dateRange]);

    useEffect(() => { fetchData(1); }, []);

    const handleDelete = async (id: string) => {
        try {
            await api.delete(`/employees/${id}`);
            message.success('Đã xoá nhân sự');
            fetchData(page);
        } catch (err: any) {
            message.error(err?.response?.data?.message || 'Xoá thất bại');
        }
    };

    const columns: ColumnsType<Employee> = [
        {
            title: 'STT', key: 'stt', width: 56, align: 'center' as const,
            render: (_, __, i) => (page - 1) * limit + i + 1,
        },
        {
            title: 'Mã nhân sự', key: 'code', width: 110,
            render: (_, r) => <Tag color="orange">{r.employeeProfile?.employeeCode || '—'}</Tag>,
        },
        {
            title: 'Tên nhân sự', key: 'fullName',
            render: (_, r) => <span style={{ fontWeight: 500 }}>{r.fullName}</span>,
        },
        { title: 'Tài khoản', dataIndex: 'username', key: 'username', width: 130 },
        {
            title: 'Mật khẩu', key: 'password', width: 130,
            render: (_, r) => (
                <Tooltip title={r.rawPassword}>
                    <span style={{ cursor: 'pointer', fontFamily: 'monospace', color: '#6b7280' }}>
                        {'•'.repeat(Math.min(r.rawPassword?.length ?? 6, 8))}
                    </span>
                </Tooltip>
            ),
        },
        {
            title: 'Vai trò', key: 'role', width: 150,
            render: (_, r) => r.roles?.[0]?.role?.name || '—',
        },
        {
            title: 'Lương cơ bản', key: 'salary', width: 140,
            render: (_, r) => (
                <span style={{ color: '#E8890C', fontWeight: 500 }}>
                    {fmtCurrency(r.roles?.[0]?.role?.fixedSalary ?? null)}
                </span>
            ),
        },
        {
            title: 'Hoa hồng', key: 'commission', width: 100, align: 'center' as const,
            render: (_, r) => {
                const v = r.roles?.[0]?.role?.commissionPercent;
                return v != null ? `${Number(v)}%` : '—';
            },
        },
        {
            title: 'Team', key: 'team', width: 120,
            render: (_, r) => r.employeeProfile?.team?.name || '—',
        },
        {
            title: 'Chi nhánh', key: 'branch', width: 140,
            render: (_, r) => r.employeeProfile?.team?.branch?.name || '—',
        },
        {
            title: 'Khu vực', key: 'region', width: 120,
            render: (_, r) => r.employeeProfile?.team?.branch?.region?.name || '—',
        },
        {
            title: 'Trạng thái', key: 'status', width: 140, align: 'center' as const,
            render: (_, r) => {
                const s = STATUS_MAP[r.employeeProfile?.employeeStatus ?? ''] ?? { label: '—', color: 'default' };
                return <Tag color={s.color}>{s.label}</Tag>;
            },
        },
        {
            title: 'Thao tác', key: 'actions', width: 90, align: 'center' as const,
            fixed: 'right' as const,
            render: (_, r) => (
                <Space size={4}>
                    <Tooltip title="Chỉnh sửa">
                        <Button size="small" icon={<EditOutlined />} type="text"
                            onClick={() => router.push(`/dashboard/he-thong/danh-muc-nhan-su/${r.id}`)} />
                    </Tooltip>
                    <Popconfirm title="Xác nhận xoá nhân sự này?" okText="Xoá" cancelText="Huỷ"
                        okButtonProps={{ danger: true }} onConfirm={() => handleDelete(r.id)}>
                        <Button size="small" icon={<DeleteOutlined />} type="text" danger />
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <>
            <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Title level={4} style={{ margin: 0 }}>Danh mục nhân sự</Title>
                <Button type="primary" icon={<PlusOutlined />}
                    style={{ background: '#E8890C', borderColor: '#E8890C' }}
                    onClick={() => router.push('/dashboard/he-thong/danh-muc-nhan-su/tao-moi')}>
                    Thêm nhân sự
                </Button>
            </div>

            <Card>
                {/* Search & Filter */}
                <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
                    <Input
                        prefix={<SearchOutlined style={{ color: '#9ca3af' }} />}
                        placeholder="Tìm theo mã hoặc tên nhân sự..."
                        style={{ width: 280 }}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onPressEnter={() => { setPage(1); fetchData(1, search, dateRange); }}
                        allowClear
                        onClear={() => { setSearch(''); fetchData(1, '', dateRange); }}
                    />
                    <RangePicker
                        placeholder={['Từ ngày nhận việc', 'Đến ngày']}
                        format="DD/MM/YYYY"
                        onChange={(_, strings) => {
                            const dr = strings[0] && strings[1]
                                ? [dayjs(strings[0], 'DD/MM/YYYY').toISOString(), dayjs(strings[1], 'DD/MM/YYYY').toISOString()] as [string, string]
                                : null;
                            setDateRange(dr);
                            setPage(1);
                            fetchData(1, search, dr);
                        }}
                    />
                </div>

                <Table
                    columns={columns}
                    dataSource={rows}
                    rowKey="id"
                    loading={loading}
                    size="small"
                    scroll={{ x: 1500 }}
                    pagination={{
                        current: page,
                        pageSize: limit,
                        total,
                        showSizeChanger: false,
                        showTotal: (t) => `Tổng: ${t} nhân sự`,
                        onChange: (p) => { setPage(p); fetchData(p); },
                    }}
                />
            </Card>
        </>
    );
}
