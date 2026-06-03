'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Table, Input, Tag, Typography, Card, Space } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { SearchOutlined, EyeOutlined } from '@ant-design/icons';
import api from '@/lib/api';
import dayjs from 'dayjs';

const { Title } = Typography;

interface Project {
    id: string;
    code: string;
    status: string | null;
    estimatedRevenue: string | null;
    createdAt: string;
    _count: { rooms: number };
    managedBranch: { name: string } | null;
    team: { name: string } | null;
}

const formatCurrency = (v: number) =>
    new Intl.NumberFormat('vi-VN').format(v) + 'đ';

const STATUS_MAP: Record<string, { label: string; color: string }> = {
    DRAFT:     { label: 'Nháp',            color: 'default' },
    ACTIVE:    { label: 'Đang hoạt động',  color: 'success' },
    ON_HOLD:   { label: 'Tạm dừng',        color: 'warning' },
    CLOSED:    { label: 'Đã đóng',         color: 'blue' },
    CANCELLED: { label: 'Đã hủy',          color: 'error' },
};

export default function DoanhThuDuAnPage() {
    const router = useRouter();
    const [rows, setRows] = useState<Project[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);

    const fetchData = useCallback(async (p = 1, q = search) => {
        setLoading(true);
        try {
            const { data } = await api.get('/projects', {
                params: { page: p, limit: 20, search: q || undefined },
            });
            setRows(data.data);
            setTotal(data.meta.total);
        } finally {
            setLoading(false);
        }
    }, [search]);

    useEffect(() => { fetchData(1); }, []);

    const columns: ColumnsType<Project> = [
        {
            title: 'Mã dự án',
            dataIndex: 'code',
            key: 'code',
            render: (v) => <span style={{ fontWeight: 500 }}>{v}</span>,
        },
        {
            title: 'Chi nhánh',
            key: 'branch',
            render: (_, r) => r.managedBranch?.name ?? '—',
        },
        {
            title: 'Team',
            key: 'team',
            render: (_, r) => r.team?.name ?? '—',
        },
        {
            title: 'Số phòng',
            key: 'rooms',
            align: 'center',
            render: (_, r) => r._count.rooms,
        },
        {
            title: 'Doanh thu ước tính',
            key: 'estimatedRevenue',
            render: (_, r) => r.estimatedRevenue
                ? <span style={{ fontWeight: 700, color: '#E8890C' }}>{formatCurrency(Number(r.estimatedRevenue))}</span>
                : <span style={{ color: '#9ca3af' }}>—</span>,
        },
        {
            title: 'Ngày tạo',
            key: 'createdAt',
            render: (_, r) => dayjs(r.createdAt).format('DD/MM/YYYY'),
        },
        {
            title: 'Trạng thái',
            key: 'status',
            render: (_, r) => {
                const s = STATUS_MAP[r.status ?? ''] ?? { label: r.status ?? '—', color: 'default' };
                return <Tag color={s.color}>{s.label}</Tag>;
            },
        },
        {
            title: '',
            key: 'action',
            align: 'center',
            render: (_, r) => (
                <EyeOutlined
                    style={{ fontSize: 16, color: '#E8890C', cursor: 'pointer' }}
                    onClick={() => router.push(`/dashboard/quan-ly-du-an/doanh-thu/${r.id}`)}
                />
            ),
        },
    ];

    return (
        <div>
            <div style={{ marginBottom: 24 }}>
                <Title level={4} style={{ margin: 0 }}>Quản lý doanh thu</Title>
            </div>

            <Card>
                <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
                    <Space>
                        <Input
                            prefix={<SearchOutlined style={{ color: '#9ca3af' }} />}
                            placeholder="Tìm theo mã dự án"
                            style={{ width: 240 }}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onPressEnter={() => { setPage(1); fetchData(1, search); }}
                            allowClear
                            onClear={() => { setSearch(''); fetchData(1, ''); }}
                        />
                    </Space>
                </div>

                <Table
                    columns={columns}
                    dataSource={rows}
                    rowKey="id"
                    loading={loading}
                    size="small"
                    pagination={{
                        current: page,
                        pageSize: 20,
                        total,
                        showSizeChanger: false,
                        onChange: (p) => { setPage(p); fetchData(p); },
                    }}
                />
            </Card>
        </div>
    );
}
