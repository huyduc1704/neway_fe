'use client';
import { useEffect, useState, useCallback } from 'react';
import { Table, Input, Button, Tag, Space, message, Select } from 'antd';
import { EyeOutlined, SearchOutlined } from '@ant-design/icons';
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
    DRAFT: { label: 'Nháp', color: 'default' },
    ACTIVE: { label: 'Đang hoạt động', color: 'success' },
    ON_HOLD: { label: 'Tạm dừng', color: 'warning' },
    CLOSED: { label: 'Đã đóng', color: 'error' },
    CANCELLED: { label: 'Đã huỷ', color: 'default' },
};

const TH = { style: { backgroundColor: '#FFF3E0', color: '#E8890C' } };

export default function ThongTinDuAnPage() {
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
                    page: pagination.page, limit: pagination.limit,
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
        api.get('/branches', { params: { limit: 100 } }).then(({ data }) => setBranches(data.data)).catch(() => { });
    }, []);

    const columns: TableColumnsType<Project> = [
        {
            title: 'STT', width: 46, align: 'center',
            render: (_, __, i) => (pagination.page - 1) * pagination.limit + i + 1,
            onHeaderCell: () => TH,
        },
        {
            title: 'Mã dự án', dataIndex: 'code', width: 180,
            render: (v) => <Tag color="orange">{v}</Tag>,
            onHeaderCell: () => TH,
        },
        {
            title: 'Phường / Xã', width: 242,
            render: (_, r) => (
                <div>
                    <div style={{ fontWeight: 500 }}>{r.area}</div>
                    <div style={{ fontSize: 12, color: '#888' }}>{r.ward}</div>
                </div>
            ),
            onHeaderCell: () => TH,
        },
        {
            title: 'Chi nhánh quản lý', width: 200,
            render: (_, r) => r.managedBranch?.name || '—',
            onHeaderCell: () => TH,
        },
        {
            title: 'Khu vực', width: 200,
            render: (_, r) => r.team?.name || '—',
            onHeaderCell: () => TH,
        },
        {
            title: 'Thông tin phòng', width: 242, align: 'center',
            render: (_, r) => r._count?.rooms ?? 0,
            onHeaderCell: () => TH,
        },
        {
            title: 'Thao tác', width: 80, align: 'center',
            onHeaderCell: () => TH,
            render: (_, r) => (
                <Button
                    type="text" icon={<EyeOutlined />}
                    onClick={() => router.push(`/dashboard/quan-ly-du-an/thong-tin/${r.id}` as any)}
                />
            ),
        },
    ];

    return (
        <>
            <PageHeader
                title="Thông tin dự án / Danh sách"
                createLabel='Tạo mới dự án'
                createPath='/dashboard/quan-ly-du-an/thong-tin/create'
                buttonStyle={{
                    backgroundColor: 'transparent',
                    border: '1px solid #E8890C',
                    color: '#E8890C',
                    borderRadius: 8,
                    height: 38,
                    fontWeight: 600,
                    boxShadow: '0 2px 8px rgba(232, 137, 12, 0.15)'
                }}
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
                    <Input
                        placeholder='Tìm kiếm...'
                        prefix={<SearchOutlined style={{ color: '#595959', marginRight: 4 }} />}
                        style={{
                            width: 300,
                            borderRadius: 100,
                            border: '1px solid #d9d9d9',
                            height: 36,
                            backgroundColor: '#fff',
                        }}
                        className='custom-search-input'
                    >
                    </Input>
                </div>

                <Table
                    rowKey="id"
                    columns={columns}
                    dataSource={projects}
                    loading={loading}
                    onRow={(r) => ({ onClick: () => router.push(`/dashboard/quan-ly-du-an/thong-tin/${r.id}` as any), style: { cursor: 'pointer' } })}
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
