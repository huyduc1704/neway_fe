'use client';
import { useEffect, useState, useCallback } from 'react';
import { message } from 'antd';
import { useRouter } from 'next/navigation';
import { Eye } from 'lucide-react';
import { Button, Input, Select, Tag, Table, Card, Typography, Space } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined, SearchOutlined, CloseOutlined } from '@ant-design/icons';
import api from '@/lib/api';
import dayjs from 'dayjs';

const { Title } = Typography;

interface Project {
    id: string;
    code: string;
    ward: string;
    province: string | null;
    area: string;
    status: string;
    leadSource: string | null;
    depositDate: string | null;
    checkInDate: string | null;
    managedBranch: { id: string; name: string } | null;
    team: { id: string; name: string } | null;
    _count: { rooms: number };
}

interface Branch { id: string; name: string; }
interface Region { id: string; name: string; }

const STATUS_MAP: Record<string, { label: string; color: string }> = {
    DRAFT:     { label: 'Nháp',           color: 'default' },
    ACTIVE:    { label: 'Đang hoạt động', color: 'success' },
    ON_HOLD:   { label: 'Tạm dừng',       color: 'warning' },
    CLOSED:    { label: 'Đã đóng',        color: 'error' },
    CANCELLED: { label: 'Đã huỷ',        color: 'default' },
};

const LEAD_SOURCE_MAP: Record<string, string> = {
    FACEBOOK: 'Facebook', TIKTOK: 'TikTok', THREADS: 'Threads',
    CHO_TOT: 'Chợ Tốt', BDS: 'BĐS', WALK_IN: 'Vãng Lai',
    REFERRAL: 'Giới Thiệu', ZALO: 'Zalo', OTHER: 'Khác',
};

export default function ThongTinDuAnPage() {
    const router = useRouter();
    const [projects, setProjects] = useState<Project[]>([]);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [regions, setRegions] = useState<Region[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [searchInput, setSearchInput] = useState('');
    const [branchFilter, setBranchFilter] = useState('');
    const [regionFilter, setRegionFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 });

    const fetchProjects = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/projects', {
                params: {
                    page: pagination.page,
                    limit: pagination.limit,
                    search: search || undefined,
                    branchId: branchFilter || undefined,
                    regionId: regionFilter || undefined,
                    status: statusFilter || undefined,
                    fromDate: fromDate || undefined,
                    toDate: toDate || undefined,
                },
            });
            setProjects(data.data);
            setPagination(p => ({ ...p, total: data.meta.total }));
        } catch {
            message.error('Không thể tải danh sách dự án');
        } finally {
            setLoading(false);
        }
    }, [pagination.page, pagination.limit, search, branchFilter, regionFilter, statusFilter, fromDate, toDate]);

    useEffect(() => { fetchProjects(); }, [fetchProjects]);

    useEffect(() => {
        api.get('/branches', { params: { limit: 100 } }).then(({ data }) => setBranches(data.data)).catch(() => {});
        api.get('/regions', { params: { limit: 100 } }).then(({ data }) => setRegions(data.data)).catch(() => {});
    }, []);

    const resetFilters = () => {
        setBranchFilter(''); setRegionFilter(''); setStatusFilter('');
        setFromDate(''); setToDate(''); setSearch(''); setSearchInput('');
        setPagination(p => ({ ...p, page: 1 }));
    };

    const hasFilter = branchFilter || regionFilter || statusFilter || fromDate || toDate || search;

    const columns: ColumnsType<Project> = [
        {
            title: 'STT', key: 'stt', width: 46, align: 'center',
            render: (_, __, i) => (pagination.page - 1) * pagination.limit + i + 1,
        },
        { title: 'Mã dự án', key: 'code', width: 160, render: (_, r) => <Tag color="orange">{r.code}</Tag> },
        {
            title: 'Địa điểm', key: 'location',
            render: (_, r) => (
                <div>
                    <div style={{ fontWeight: 500 }}>{r.area || r.province || '—'}</div>
                    <div style={{ fontSize: 12, color: '#9ca3af' }}>{r.ward}</div>
                </div>
            ),
        },
        { title: 'Chi nhánh', key: 'branch', width: 160, render: (_, r) => r.managedBranch?.name || '—' },
        { title: 'Khu vực', key: 'team', width: 140, render: (_, r) => r.team?.name || '—' },
        { title: 'Nguồn khách', key: 'leadSource', width: 120, align: 'center', render: (_, r) => r.leadSource ? (LEAD_SOURCE_MAP[r.leadSource] ?? r.leadSource) : '—' },
        { title: 'Ngày đặt cọc', key: 'depositDate', width: 130, align: 'center', render: (_, r) => r.depositDate ? dayjs(r.depositDate).format('DD/MM/YYYY') : '—' },
        {
            title: 'Trạng thái', key: 'status', width: 140, align: 'center',
            render: (_, r) => {
                const s = STATUS_MAP[r.status] ?? { label: r.status, color: 'default' };
                return <Tag color={s.color}>{s.label}</Tag>;
            },
        },
        {
            title: 'Thao tác', key: 'actions', width: 70, align: 'center',
            render: (_, r) => (
                <button
                    style={{ padding: 6, background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}
                    onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/quan-ly-du-an/thong-tin/${r.id}` as any); }}
                >
                    <Eye size={16} />
                </button>
            ),
        },
    ];

    return (
        <>
            <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Title level={4} style={{ margin: 0 }}>Thông tin dự án / Danh sách</Title>
                <Button type="primary" icon={<PlusOutlined />} onClick={() => router.push('/dashboard/quan-ly-du-an/thong-tin/create' as any)}>
                    Tạo mới dự án
                </Button>
            </div>

            <Card>
                <Space wrap style={{ marginBottom: 12 }}>
                    <Select value={regionFilter || undefined} onChange={v => { setRegionFilter(v ?? ''); setPagination(p => ({ ...p, page: 1 })); }} placeholder="Khu vực" style={{ width: 160 }} allowClear options={[{ value: '', label: 'Tất cả khu vực' }, ...regions.map(r => ({ value: r.id, label: r.name }))]} />
                    <Select value={branchFilter || undefined} onChange={v => { setBranchFilter(v ?? ''); setPagination(p => ({ ...p, page: 1 })); }} placeholder="Chi nhánh" style={{ width: 176 }} allowClear options={[{ value: '', label: 'Tất cả chi nhánh' }, ...branches.map(b => ({ value: b.id, label: b.name }))]} />
                    <Select value={statusFilter || undefined} onChange={v => { setStatusFilter(v ?? ''); setPagination(p => ({ ...p, page: 1 })); }} placeholder="Trạng thái" style={{ width: 160 }} allowClear options={[{ value: '', label: 'Tất cả' }, ...Object.entries(STATUS_MAP).map(([k, v]) => ({ value: k, label: v.label }))]} />
                    <span style={{ fontSize: 14, color: '#6b7280' }}>Từ ngày</span>
                    <input type="date" style={{ height: 32, padding: '0 8px', borderRadius: 6, border: '1px solid #d9d9d9', fontSize: 14 }} value={fromDate} onChange={e => { setFromDate(e.target.value); setPagination(p => ({ ...p, page: 1 })); }} />
                    <span style={{ fontSize: 14, color: '#6b7280' }}>đến ngày</span>
                    <input type="date" style={{ height: 32, padding: '0 8px', borderRadius: 6, border: '1px solid #d9d9d9', fontSize: 14 }} value={toDate} onChange={e => { setToDate(e.target.value); setPagination(p => ({ ...p, page: 1 })); }} />
                    {hasFilter && (
                        <Button icon={<CloseOutlined />} onClick={resetFilters}>Xoá lọc</Button>
                    )}
                    <Input
                        prefix={<SearchOutlined style={{ color: '#9ca3af' }} />}
                        placeholder="Tìm theo mã dự án..."
                        value={searchInput}
                        onChange={e => setSearchInput(e.target.value)}
                        onPressEnter={() => { setSearch(searchInput); setPagination(p => ({ ...p, page: 1 })); }}
                        style={{ width: 256 }}
                    />
                </Space>

                <Table
                    columns={columns}
                    dataSource={projects}
                    rowKey="id"
                    loading={loading}
                    pagination={{ pageSize: pagination.limit, total: pagination.total, current: pagination.page, onChange: (page) => setPagination(p => ({ ...p, page })), showTotal: (total) => `Tổng: ${total} dự án` }}
                    onRow={(r) => ({ onClick: () => router.push(`/dashboard/quan-ly-du-an/thong-tin/${r.id}` as any) })}
                    size="small"
                />
            </Card>
        </>
    );
}
