'use client';
import { useEffect, useState, useCallback } from 'react';
import { message } from 'antd';
import { useRouter } from 'next/navigation';
import { Pencil, Trash2 } from 'lucide-react';
import { Button, Input, Select, Tag, Table, Card, Modal, Typography, Space } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import api from '@/lib/api';
import dayjs from 'dayjs';
import { useUser } from '@/context/UserContext';

const { Title } = Typography;

interface Project {
    id: string;
    code: string;
    ward: string;
    area: string;
    status: string;
    rentalStartAt: string | null;
    rentalEndAt: string | null;
    managedBranch: { id: string; name: string } | null;
    team: { id: string; name: string } | null;
    _count: { rooms: number };
}

interface Branch { id: string; name: string; }

const STATUS_MAP: Record<string, { label: string; color: string }> = {
    DRAFT:     { label: 'Nháp',           color: 'default' },
    ACTIVE:    { label: 'Đang hoạt động', color: 'success' },
    ON_HOLD:   { label: 'Tạm dừng',       color: 'warning' },
    CLOSED:    { label: 'Đã đóng',        color: 'error' },
    CANCELLED: { label: 'Đã huỷ',         color: 'default' },
};

export default function DanhMucDuAnPage() {
    const router = useRouter();
    const { can } = useUser();
    const [projects, setProjects] = useState<Project[]>([]);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [searchInput, setSearchInput] = useState('');
    const [branchFilter, setBranchFilter] = useState<string>('');
    const [statusFilter, setStatusFilter] = useState<string>('');
    const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 });

    const fetchProjects = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/projects', {
                params: {
                    page: pagination.page, limit: pagination.limit,
                    search: search || undefined,
                    branchId: branchFilter || undefined,
                    status: statusFilter || undefined,
                },
            });
            setProjects(data.data);
            setPagination((p) => ({ ...p, total: data.meta.total }));
        } catch {
            message.error('Không thể tải danh sách dự án');
        } finally {
            setLoading(false);
        }
    }, [pagination.page, pagination.limit, search, branchFilter, statusFilter]);

    useEffect(() => { fetchProjects(); }, [fetchProjects]);

    useEffect(() => {
        api.get('/branches', { params: { limit: 100 } }).then(({ data }) => setBranches(data.data)).catch(() => {});
    }, []);

    const handleDelete = (id: string) => {
        Modal.confirm({
            title: 'Xoá dự án này?',
            content: 'Thao tác không thể hoàn tác.',
            okText: 'Xoá',
            okType: 'danger',
            cancelText: 'Huỷ',
            onOk: async () => {
                try {
                    await api.delete(`/projects/${id}`);
                    message.success('Đã xoá dự án');
                    fetchProjects();
                } catch (err: any) {
                    message.error(err?.response?.data?.message || 'Thao tác thất bại');
                }
            },
        });
    };

    const columns: ColumnsType<Project> = [
        {
            title: 'STT', key: 'stt', width: 60, align: 'center',
            render: (_, __, i) => (pagination.page - 1) * pagination.limit + i + 1,
        },
        {
            title: 'Mã dự án', key: 'code', width: 120,
            render: (_, r) => <Tag color="orange">{r.code}</Tag>,
        },
        {
            title: 'Khu vực / Phường xã', key: 'area',
            render: (_, r) => (
                <div>
                    <div style={{ fontWeight: 500 }}>{r.area}</div>
                    <div style={{ fontSize: 12, color: '#9ca3af' }}>{r.ward}</div>
                </div>
            ),
        },
        { title: 'Chi nhánh', key: 'branch', width: 160, render: (_, r) => r.managedBranch?.name || '—' },
        { title: 'Team', key: 'team', width: 140, render: (_, r) => r.team?.name || '—' },
        {
            title: 'Thời gian thuê', key: 'rental', width: 190,
            render: (_, r) => {
                if (!r.rentalStartAt) return '—';
                const start = dayjs(r.rentalStartAt).format('DD/MM/YYYY');
                const end = r.rentalEndAt ? dayjs(r.rentalEndAt).format('DD/MM/YYYY') : '...';
                return `${start} → ${end}`;
            },
        },
        { title: 'Số phòng', key: 'rooms', width: 100, align: 'center', render: (_, r) => r._count?.rooms ?? 0 },
        {
            title: 'Trạng thái', key: 'status', width: 150, align: 'center',
            render: (_, r) => {
                const s = STATUS_MAP[r.status] ?? { label: r.status, color: 'default' };
                return <Tag color={s.color}>{s.label}</Tag>;
            },
        },
        {
            title: 'Thao tác', key: 'actions', width: 100, align: 'center',
            render: (_, r) => (
                <Space>
                    {can('PROJECT_EDIT') && (
                        <button title="Chỉnh sửa" style={{ padding: 6, background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}
                            onClick={() => router.push(`/dashboard/he-thong/danh-muc-du-an/${r.id}` as any)}>
                            <Pencil size={16} />
                        </button>
                    )}
                    {can('PROJECT_DELETE') && (
                        <button title="Xoá" style={{ padding: 6, background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}
                            onClick={() => handleDelete(r.id)}>
                            <Trash2 size={16} />
                        </button>
                    )}
                </Space>
            ),
        },
    ];

    return (
        <>
            {/* Page Header */}
            <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Title level={4} style={{ margin: 0 }}>Danh mục dự án / Danh sách</Title>
                {can('PROJECT_CREATE') && (
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => router.push('/dashboard/he-thong/danh-muc-du-an/tao-moi' as any)}>
                        Thêm dự án
                    </Button>
                )}
            </div>

            <Card>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
                    <Space wrap>
                        <Select
                            value={branchFilter || undefined}
                            onChange={(v) => { setBranchFilter(v ?? ''); setPagination((p) => ({ ...p, page: 1 })); }}
                            placeholder="Chi nhánh"
                            style={{ width: 176 }}
                            allowClear
                            options={[{ value: '', label: 'Tất cả chi nhánh' }, ...branches.map((b) => ({ value: b.id, label: b.name }))]}
                        />
                        <Select
                            value={statusFilter || undefined}
                            onChange={(v) => { setStatusFilter(v ?? ''); setPagination((p) => ({ ...p, page: 1 })); }}
                            placeholder="Trạng thái"
                            style={{ width: 160 }}
                            allowClear
                            options={[{ value: '', label: 'Tất cả' }, ...Object.entries(STATUS_MAP).map(([k, v]) => ({ value: k, label: v.label }))]}
                        />
                    </Space>
                    <Input
                        prefix={<SearchOutlined style={{ color: '#9ca3af' }} />}
                        placeholder="Tìm theo mã dự án..."
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        onPressEnter={() => { setSearch(searchInput); setPagination((p) => ({ ...p, page: 1 })); }}
                        style={{ width: 240 }}
                    />
                </div>

                <Table
                    columns={columns}
                    dataSource={projects}
                    rowKey="id"
                    loading={loading}
                    pagination={{ pageSize: pagination.limit, total: pagination.total, current: pagination.page, onChange: (page) => setPagination((p) => ({ ...p, page })), showTotal: (total) => `Tổng: ${total} dự án` }}
                    size="small"
                />
            </Card>
        </>
    );
}
