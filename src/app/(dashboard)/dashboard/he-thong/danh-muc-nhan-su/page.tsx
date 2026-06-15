'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
    Table, Input, Tag, Typography, Card, Space, Button, DatePicker, Tooltip, Popconfirm, message, Select,
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

interface FilterOption { id: string; name: string; code?: string; }

export default function DanhMucNhanSuPage() {
    const router = useRouter();
    const [rows, setRows]       = useState<Employee[]>([]);
    const [loading, setLoading] = useState(false);
    const [total, setTotal]     = useState(0);
    const [page, setPage]       = useState(1);
    const limit = 20;

    // Filters
    const [search, setSearch]       = useState('');
    const [dateRange, setDateRange] = useState<[string, string] | null>(null);
    const [roleCode, setRoleCode]   = useState('');
    const [teamId, setTeamId]       = useState('');
    const [branchId, setBranchId]   = useState('');
    const [regionId, setRegionId]   = useState('');
    const [empStatus, setEmpStatus] = useState('');

    // Filter options
    const [roles, setRoles]       = useState<FilterOption[]>([]);
    const [teams, setTeams]       = useState<FilterOption[]>([]);
    const [branches, setBranches] = useState<FilterOption[]>([]);
    const [regions, setRegions]   = useState<FilterOption[]>([]);

    useEffect(() => {
        api.get('/roles',    { params: { limit: 100 } }).then(({ data }) => setRoles(data.data)).catch(() => {});
        api.get('/teams',    { params: { limit: 200 } }).then(({ data }) => setTeams(data.data)).catch(() => {});
        api.get('/branches', { params: { limit: 100 } }).then(({ data }) => setBranches(data.data)).catch(() => {});
        api.get('/regions',  { params: { limit: 100 } }).then(({ data }) => setRegions(data.data)).catch(() => {});
    }, []);

    const fetchData = useCallback(async (p = 1) => {
        setLoading(true);
        try {
            const { data } = await api.get('/employees', {
                params: {
                    page: p, limit,
                    search: search || undefined,
                    fromDate: dateRange?.[0] || undefined,
                    toDate: dateRange?.[1] || undefined,
                    roleCode: roleCode || undefined,
                    teamId: teamId || undefined,
                    branchId: branchId || undefined,
                    regionId: regionId || undefined,
                    employeeStatus: empStatus || undefined,
                },
            });
            setRows(data.data);
            setTotal(data.meta.total);
        } catch {
            message.error('Không thể tải danh sách nhân sự');
        } finally {
            setLoading(false);
        }
    }, [search, dateRange, roleCode, teamId, branchId, regionId, empStatus]);

    useEffect(() => { fetchData(1); }, [fetchData]);

    const resetAndFetch = () => { setPage(1); fetchData(1); };

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
            title: 'Vai trò', key: 'role', width: 200,
            render: (_, r) => r.roles?.length
                ? <Space size={4} wrap>{r.roles.map(ur => <Tag key={ur.role.code} color="blue" style={{ margin: 0 }}>{ur.role.name}</Tag>)}</Space>
                : '—',
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
                <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
                    <Input
                        prefix={<SearchOutlined style={{ color: '#9ca3af' }} />}
                        placeholder="Tìm theo mã hoặc tên nhân sự..."
                        style={{ width: 260 }}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onPressEnter={resetAndFetch}
                        allowClear
                        onClear={() => { setSearch(''); }}
                    />
                    <Select
                        placeholder="Vai trò"
                        style={{ width: 180 }}
                        allowClear
                        showSearch
                        optionFilterProp="label"
                        value={roleCode || undefined}
                        onChange={(v) => { setRoleCode(v ?? ''); setPage(1); }}
                        options={roles.map(r => ({ value: r.code ?? r.id, label: r.name }))}
                    />
                    <Select
                        placeholder="Team"
                        style={{ width: 160 }}
                        allowClear
                        showSearch
                        optionFilterProp="label"
                        value={teamId || undefined}
                        onChange={(v) => { setTeamId(v ?? ''); setPage(1); }}
                        options={teams.map(t => ({ value: t.id, label: t.name }))}
                    />
                    <Select
                        placeholder="Chi nhánh"
                        style={{ width: 180 }}
                        allowClear
                        showSearch
                        optionFilterProp="label"
                        value={branchId || undefined}
                        onChange={(v) => { setBranchId(v ?? ''); setPage(1); }}
                        options={branches.map(b => ({ value: b.id, label: b.name }))}
                    />
                    <Select
                        placeholder="Khu vực"
                        style={{ width: 160 }}
                        allowClear
                        showSearch
                        optionFilterProp="label"
                        value={regionId || undefined}
                        onChange={(v) => { setRegionId(v ?? ''); setPage(1); }}
                        options={regions.map(r => ({ value: r.id, label: r.name }))}
                    />
                    <Select
                        placeholder="Trạng thái"
                        style={{ width: 160 }}
                        allowClear
                        value={empStatus || undefined}
                        onChange={(v) => { setEmpStatus(v ?? ''); setPage(1); }}
                        options={[
                            { value: 'ACTIVE',    label: 'Đang làm việc' },
                            { value: 'SUSPENDED', label: 'Tạm ngưng' },
                            { value: 'RESIGNED',  label: 'Đã nghỉ' },
                        ]}
                    />
                    <RangePicker
                        placeholder={['Từ ngày vào làm', 'Đến ngày']}
                        format="DD/MM/YYYY"
                        style={{ width: 240 }}
                        onChange={(_, strings) => {
                            const dr = strings[0] && strings[1]
                                ? [dayjs(strings[0], 'DD/MM/YYYY').toISOString(), dayjs(strings[1], 'DD/MM/YYYY').toISOString()] as [string, string]
                                : null;
                            setDateRange(dr);
                            setPage(1);
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
