'use client';
import { useEffect, useState, useCallback } from 'react';
import { Table, Input, Button, Tag, Space, Popconfirm, message, Tooltip, Select } from 'antd';
import { EditOutlined, DeleteOutlined } from '@ant-design/icons';
import type { TableColumnsType } from 'antd';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import PageHeader from '@/components/common/PageHeader';
import dayjs from 'dayjs';

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
    DRAFT:     { label: 'Nháp',        color: 'default' },
    ACTIVE:    { label: 'Đang hoạt động', color: 'success' },
    ON_HOLD:   { label: 'Tạm dừng',    color: 'warning' },
    CLOSED:    { label: 'Đã đóng',     color: 'error' },
    CANCELLED: { label: 'Đã huỷ',      color: 'default' },
};

const TH = { style: { backgroundColor: '#FFF3E0', color: '#E8890C' } };

export default function DanhMucDuAnPage() {
    const router = useRouter();
    const [projects, setProjects] = useState<Project[]>([]);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [branchFilter, setBranchFilter] = useState<string | undefined>();
    const [statusFilter, setStatusFilter] = useState<string | undefined>();
    const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 });

    const fetchProjects = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/projects', {
                params: {
                    page: pagination.page,
                    limit: pagination.limit,
                    search: search || undefined,
                    branchId: branchFilter,
                    status: statusFilter,
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
        api.get('/branches', { params: { limit: 100 } })
            .then(({ data }) => setBranches(data.data))
            .catch(() => {});
    }, []);

    const handleDelete = async (id: string) => {
        try {
            await api.delete(`/projects/${id}`);
            message.success('Đã xoá dự án');
            fetchProjects();
        } catch (err: any) {
            message.error(err?.response?.data?.message || 'Thao tác thất bại');
        }
    };

    const columns: TableColumnsType<Project> = [
        {
            title: 'STT', width: 60, align: 'center',
            render: (_, __, i) => (pagination.page - 1) * pagination.limit + i + 1,
            onHeaderCell: () => TH,
        },
        {
            title: 'Mã dự án', dataIndex: 'code', width: 120,
            render: (v) => <Tag color="orange">{v}</Tag>,
            onHeaderCell: () => TH,
        },
        {
            title: 'Khu vực / Phường xã',
            render: (_, r) => (
                <div>
                    <div style={{ fontWeight: 500 }}>{r.area}</div>
                    <div style={{ fontSize: 12, color: '#888' }}>{r.ward}</div>
                </div>
            ),
            onHeaderCell: () => TH,
        },
        {
            title: 'Chi nhánh', width: 160,
            render: (_, r) => r.managedBranch?.name || '—',
            onHeaderCell: () => TH,
        },
        {
            title: 'Team', width: 140,
            render: (_, r) => r.team?.name || '—',
            onHeaderCell: () => TH,
        },
        {
            title: 'Thời gian thuê', width: 190,
            render: (_, r) => {
                if (!r.rentalStartAt) return '—';
                const start = dayjs(r.rentalStartAt).format('DD/MM/YYYY');
                const end = r.rentalEndAt ? dayjs(r.rentalEndAt).format('DD/MM/YYYY') : '...';
                return `${start} → ${end}`;
            },
            onHeaderCell: () => TH,
        },
        {
            title: 'Số phòng', width: 100, align: 'center',
            render: (_, r) => r._count?.rooms ?? 0,
            onHeaderCell: () => TH,
        },
        {
            title: 'Trạng thái', width: 150, align: 'center',
            render: (_, r) => {
                const s = STATUS_MAP[r.status] ?? { label: r.status, color: 'default' };
                return <Tag color={s.color}>{s.label}</Tag>;
            },
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
                            onClick={() => router.push(`/dashboard/he-thong/danh-muc-du-an/${r.id}` as any)}
                        />
                    </Tooltip>
                    <Tooltip title="Xoá">
                        <Popconfirm
                            title="Xoá dự án này?"
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
                title="Danh mục dự án / Danh sách"
                createLabel="Thêm dự án"
                createPath="/dashboard/he-thong/danh-muc-du-an/tao-moi"
            />

            <div style={{ background: '#fff', borderRadius: 8, padding: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 8, flexWrap: 'wrap' }}>
                    <Space wrap>
                        <Select
                            allowClear placeholder="Chi nhánh" style={{ width: 180 }}
                            onChange={(v) => { setBranchFilter(v); setPagination((p) => ({ ...p, page: 1 })); }}
                            options={branches.map((b) => ({ value: b.id, label: b.name }))}
                        />
                        <Select
                            allowClear placeholder="Trạng thái" style={{ width: 160 }}
                            onChange={(v) => { setStatusFilter(v); setPagination((p) => ({ ...p, page: 1 })); }}
                            options={Object.entries(STATUS_MAP).map(([k, v]) => ({ value: k, label: v.label }))}
                        />
                    </Space>
                    <Input.Search
                        placeholder="Tìm theo mã dự án..."
                        allowClear style={{ width: 260 }}
                        onSearch={(v) => { setSearch(v); setPagination((p) => ({ ...p, page: 1 })); }}
                    />
                </div>

                <Table
                    rowKey="id"
                    columns={columns}
                    dataSource={projects}
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
