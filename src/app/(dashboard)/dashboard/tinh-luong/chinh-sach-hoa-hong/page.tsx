'use client';
import { useEffect, useState, useCallback } from 'react';
import { message } from 'antd';
import { Pencil, Trash2, PowerOff } from 'lucide-react';
import { Button, Input, Select, Tag, Table, Card, Modal, Form, Typography, Space } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import api from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';

const { Title } = Typography;

interface Policy {
    id: string; code: string; name: string;
    valueType: 'PERCENT' | 'FIXED'; value: string;
    effectiveFrom: string; effectiveTo: string | null;
    isActive: boolean; note: string | null;
    role: { id: string; code: string; name: string };
    branch: { id: string; code: string; name: string } | null;
    team: { id: string; code: string; name: string } | null;
}
interface Role { id: string; code: string; name: string; }
interface Branch { id: string; code: string; name: string; }
interface Team { id: string; code: string; name: string; }

export default function ChinhSachHoaHongPage() {
    const [policies, setPolicies] = useState<Policy[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);
    const [loading, setLoading] = useState(false);
    const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 });

    const [searchInput, setSearchInput] = useState('');
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [branchFilter, setBranchFilter] = useState('');
    const [teamFilter, setTeamFilter] = useState('');
    const [activeFilter, setActiveFilter] = useState('');

    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [form] = Form.useForm();

    const fetchPolicies = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/commission-policies', {
                params: {
                    page: pagination.page, limit: pagination.limit,
                    search: search || undefined,
                    roleId: roleFilter || undefined,
                    branchId: branchFilter || undefined,
                    teamId: teamFilter || undefined,
                    isActive: activeFilter !== '' ? activeFilter === 'true' : undefined,
                },
            });
            setPolicies(data.data);
            setPagination(p => ({ ...p, total: data.meta.total }));
        } catch { message.error('Không thể tải danh sách chính sách hoa hồng'); }
        finally { setLoading(false); }
    }, [pagination.page, pagination.limit, search, roleFilter, branchFilter, teamFilter, activeFilter]);

    useEffect(() => { fetchPolicies(); }, [fetchPolicies]);

    useEffect(() => {
        api.get('/roles', { params: { limit: 100 } }).then(({ data }) => setRoles(data.data)).catch(() => {});
        api.get('/branches', { params: { limit: 100 } }).then(({ data }) => setBranches(data.data)).catch(() => {});
        api.get('/teams', { params: { limit: 100 } }).then(({ data }) => setTeams(data.data)).catch(() => {});
    }, []);

    const openCreate = () => { setEditingId(null); form.resetFields(); form.setFieldsValue({ valueType: 'PERCENT' }); setDialogOpen(true); };
    const openEdit = (p: Policy) => {
        setEditingId(p.id);
        form.setFieldsValue({
            code: p.code, name: p.name, roleId: p.role.id,
            branchId: p.branch?.id ?? '', teamId: p.team?.id ?? '',
            valueType: p.valueType, value: p.value,
            effectiveFrom: p.effectiveFrom?.slice(0, 10) ?? '',
            effectiveTo: p.effectiveTo?.slice(0, 10) ?? '',
            note: p.note ?? '',
        });
        setDialogOpen(true);
    };

    const handleSave = async () => {
        try {
            const values = await form.validateFields();
            setSaving(true);
            if (editingId) {
                await api.patch(`/commission-policies/${editingId}`, {
                    name: values.name,
                    branchId: values.branchId || undefined,
                    teamId: values.teamId || undefined,
                    effectiveFrom: values.effectiveFrom,
                    effectiveTo: values.effectiveTo || undefined,
                    note: values.note || undefined,
                });
                message.success('Cập nhật chính sách thành công');
            } else {
                await api.post('/commission-policies', {
                    code: values.code, name: values.name, roleId: values.roleId,
                    branchId: values.branchId || undefined, teamId: values.teamId || undefined,
                    valueType: values.valueType, value: Number(values.value),
                    effectiveFrom: values.effectiveFrom,
                    effectiveTo: values.effectiveTo || undefined,
                    note: values.note || undefined,
                });
                message.success('Tạo chính sách thành công');
            }
            setDialogOpen(false); fetchPolicies();
        } catch (err: any) {
            if (err?.response) message.error(err?.response?.data?.message || 'Thao tác thất bại');
        } finally { setSaving(false); }
    };

    const handleDeactivate = async (id: string, name: string) => {
        if (!window.confirm(`Vô hiệu hoá chính sách "${name}"?`)) return;
        try {
            await api.patch(`/commission-policies/${id}/deactivate`);
            message.success('Đã vô hiệu hoá chính sách');
            fetchPolicies();
        } catch (err: any) { message.error(err?.response?.data?.message || 'Thao tác thất bại'); }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!window.confirm(`Xoá chính sách "${name}"?`)) return;
        try {
            await api.delete(`/commission-policies/${id}`);
            message.success('Đã xoá chính sách');
            fetchPolicies();
        } catch (err: any) { message.error(err?.response?.data?.message || 'Thao tác thất bại'); }
    };

    const formatValue = (p: Policy) => {
        if (p.valueType === 'PERCENT') return `${Number(p.value)}%`;
        return formatCurrency(Number(p.value));
    };

    const formatScope = (p: Policy) => {
        if (p.branch && p.team) return `${p.branch.name} / ${p.team.name}`;
        if (p.branch) return p.branch.name;
        if (p.team) return p.team.name;
        return <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>Toàn hệ thống</span>;
    };

    const columns: ColumnsType<Policy> = [
        { title: 'STT', key: 'stt', width: 60, align: 'center', render: (_, __, i) => (pagination.page - 1) * pagination.limit + i + 1 },
        { title: 'Mã policy', key: 'code', width: 130, render: (_, r) => <Tag>{r.code}</Tag> },
        { title: 'Tên chính sách', key: 'name', render: (_, r) => <span style={{ fontWeight: 500, color: '#1A2B5A' }}>{r.name}</span> },
        { title: 'Vai trò', key: 'role', width: 140, render: (_, r) => <Tag color="default">{r.role.name}</Tag> },
        { title: 'Áp dụng cho', key: 'scope', width: 200, render: (_, r) => formatScope(r) },
        {
            title: 'Loại', key: 'valueType', width: 90, align: 'center',
            render: (_, r) => <Tag color={r.valueType === 'PERCENT' ? 'processing' : 'warning'}>{r.valueType === 'PERCENT' ? '%' : 'VNĐ'}</Tag>,
        },
        { title: 'Giá trị', key: 'value', width: 130, align: 'right', render: (_, r) => <span style={{ fontWeight: 700, color: '#E8890C' }}>{formatValue(r)}</span> },
        { title: 'Hiệu lực từ', key: 'effectiveFrom', width: 120, align: 'center', render: (_, r) => formatDate(r.effectiveFrom) },
        { title: 'Đến ngày', key: 'effectiveTo', width: 120, align: 'center', render: (_, r) => r.effectiveTo ? formatDate(r.effectiveTo) : <span style={{ color: '#9ca3af' }}>—</span> },
        {
            title: 'Trạng thái', key: 'status', width: 130, align: 'center',
            render: (_, r) => <Tag color={r.isActive ? 'success' : 'default'}>{r.isActive ? 'Đang áp dụng' : 'Vô hiệu'}</Tag>,
        },
        {
            title: 'Thao tác', key: 'actions', width: 120, align: 'center',
            render: (_, r) => (
                <Space>
                    <button title="Chỉnh sửa" onClick={() => openEdit(r)}
                        style={{ padding: 6, background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}>
                        <Pencil size={16} />
                    </button>
                    {r.isActive && (
                        <button title="Vô hiệu hoá" onClick={() => handleDeactivate(r.id, r.name)}
                            style={{ padding: 6, background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}>
                            <PowerOff size={16} />
                        </button>
                    )}
                    <button title="Xoá" onClick={() => handleDelete(r.id, r.name)}
                        style={{ padding: 6, background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}>
                        <Trash2 size={16} />
                    </button>
                </Space>
            ),
        },
    ];

    return (
        <>
            <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <Title level={4} style={{ margin: 0 }}>Chính sách hoa hồng</Title>
                    <p style={{ color: '#6b7280', fontSize: 14, marginTop: 4 }}>Quản lý tỷ lệ hoa hồng theo vai trò, chi nhánh, team</p>
                </div>
                <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Thêm chính sách</Button>
            </div>

            {/* Filters */}
            <Card style={{ marginBottom: 16 }}>
                <Space wrap>
                    <Input
                        prefix={<SearchOutlined style={{ color: '#9ca3af' }} />}
                        placeholder="Tìm mã hoặc tên chính sách..."
                        value={searchInput}
                        onChange={e => setSearchInput(e.target.value)}
                        onPressEnter={() => { setSearch(searchInput); setPagination(p => ({ ...p, page: 1 })); }}
                        allowClear
                        onClear={() => { setSearchInput(''); setSearch(''); }}
                        style={{ width: 260 }}
                    />
                    <Select value={roleFilter || undefined} onChange={(v) => { setRoleFilter(v === '__all__' ? '' : (v ?? '')); setPagination(p => ({ ...p, page: 1 })); }} placeholder="Tất cả vai trò" style={{ width: 160 }} allowClear options={[{ value: '__all__', label: 'Tất cả vai trò' }, ...roles.map(r => ({ value: r.id, label: r.name }))]} />
                    <Select value={branchFilter || undefined} onChange={(v) => { setBranchFilter(v === '__all__' ? '' : (v ?? '')); setPagination(p => ({ ...p, page: 1 })); }} placeholder="Tất cả chi nhánh" style={{ width: 176 }} allowClear options={[{ value: '__all__', label: 'Tất cả chi nhánh' }, ...branches.map(b => ({ value: b.id, label: b.name }))]} />
                    <Select value={teamFilter || undefined} onChange={(v) => { setTeamFilter(v === '__all__' ? '' : (v ?? '')); setPagination(p => ({ ...p, page: 1 })); }} placeholder="Tất cả team" style={{ width: 160 }} allowClear options={[{ value: '__all__', label: 'Tất cả team' }, ...teams.map(t => ({ value: t.id, label: t.name }))]} />
                    <Select value={activeFilter || undefined} onChange={(v) => { setActiveFilter(v === '__all__' ? '' : (v ?? '')); setPagination(p => ({ ...p, page: 1 })); }} placeholder="Tất cả trạng thái" style={{ width: 160 }} allowClear options={[{ value: '__all__', label: 'Tất cả trạng thái' }, { value: 'true', label: 'Đang áp dụng' }, { value: 'false', label: 'Vô hiệu' }]} />
                </Space>
            </Card>

            <Card>
                <Table columns={columns} dataSource={policies} rowKey="id" loading={loading} pagination={{ pageSize: pagination.limit, total: pagination.total, current: pagination.page, onChange: (page) => setPagination(p => ({ ...p, page })) }} size="small" />
            </Card>

            {/* Create/Edit Modal */}
            <Modal
                open={dialogOpen}
                onCancel={() => setDialogOpen(false)}
                title={editingId ? 'Cập nhật chính sách hoa hồng' : 'Thêm chính sách hoa hồng'}
                width={640}
                footer={[
                    <Button key="cancel" onClick={() => setDialogOpen(false)}>Huỷ</Button>,
                    <Button key="ok" type="primary" onClick={handleSave} loading={saving}>{editingId ? 'Cập nhật' : 'Tạo mới'}</Button>,
                ]}
            >
                <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <Form.Item name="code" label={<span>Mã chính sách <span style={{ color: 'red' }}>*</span></span>} rules={[{ required: !editingId, message: 'Nhập mã chính sách' }]}>
                            <Input placeholder="VD: POL-SALE-HN" disabled={!!editingId} onChange={e => form.setFieldValue('code', e.target.value.toUpperCase())} />
                        </Form.Item>
                        <Form.Item name="roleId" label={<span>Vai trò <span style={{ color: 'red' }}>*</span></span>} rules={[{ required: !editingId, message: 'Chọn vai trò' }]}>
                            <Select placeholder="Chọn vai trò" disabled={!!editingId} options={roles.map(r => ({ value: r.id, label: `${r.name} (${r.code})` }))} />
                        </Form.Item>
                    </div>
                    <Form.Item name="name" label={<span>Tên chính sách <span style={{ color: 'red' }}>*</span></span>} rules={[{ required: true, message: 'Nhập tên chính sách' }]}>
                        <Input placeholder="VD: Hoa hồng Sale Hà Nội 2025" />
                    </Form.Item>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <Form.Item name="branchId" label="Chi nhánh áp dụng">
                            <Select placeholder="Tất cả chi nhánh" allowClear options={branches.map(b => ({ value: b.id, label: b.name }))} />
                        </Form.Item>
                        <Form.Item name="teamId" label="Team áp dụng">
                            <Select placeholder="Tất cả team" allowClear options={teams.map(t => ({ value: t.id, label: t.name }))} />
                        </Form.Item>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <Form.Item name="valueType" label={<span>Loại giá trị <span style={{ color: 'red' }}>*</span></span>}>
                            <Select disabled={!!editingId} options={[{ value: 'PERCENT', label: 'Phần trăm (%)' }, { value: 'FIXED', label: 'Cố định (VNĐ)' }]} />
                        </Form.Item>
                        <Form.Item name="value" label={<span>Giá trị <span style={{ color: 'red' }}>*</span></span>} rules={[{ required: !editingId, message: 'Nhập giá trị' }]}>
                            <Input type="number" min={0} placeholder="VD: 15" disabled={!!editingId} />
                        </Form.Item>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <Form.Item name="effectiveFrom" label={<span>Hiệu lực từ <span style={{ color: 'red' }}>*</span></span>} rules={[{ required: true, message: 'Chọn ngày hiệu lực' }]}>
                            <input type="date" style={{ height: 36, width: '100%', padding: '0 12px', borderRadius: 6, border: '1px solid #d9d9d9', fontSize: 14 }} />
                        </Form.Item>
                        <Form.Item name="effectiveTo" label="Hiệu lực đến (để trống = không hạn)">
                            <input type="date" style={{ height: 36, width: '100%', padding: '0 12px', borderRadius: 6, border: '1px solid #d9d9d9', fontSize: 14 }} />
                        </Form.Item>
                    </div>
                    <Form.Item name="note" label="Ghi chú">
                        <Input placeholder="Ghi chú thêm (tuỳ chọn)" />
                    </Form.Item>
                </Form>
            </Modal>
        </>
    );
}
