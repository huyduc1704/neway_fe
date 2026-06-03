'use client';
import { useEffect, useState, useCallback } from 'react';
import { message } from 'antd';
import { Pencil, Trash2, PowerOff, Plus, Building2 } from 'lucide-react';
import { Button, Input, Select, Tag, Table, Card, Modal, Form, Typography, Space } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import api from '@/lib/api';

const { Title } = Typography;

interface Region { id: string; name: string; }
interface Branch {
    id: string; code: string; name: string;
    province: string | null; ward: string | null;
    regionId: string | null; isActive: boolean;
    region: { id: string; name: string } | null;
    createdAt: string;
}

const EMPTY_FORM = { code: '', name: '', province: '', ward: '', regionId: '' };

export default function ChiNhanhPage() {
    const [branches, setBranches] = useState<Branch[]>([]);
    const [regions, setRegions] = useState<Region[]>([]);
    const [loading, setLoading] = useState(false);
    const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 });

    const [searchInput, setSearchInput] = useState('');
    const [search, setSearch] = useState('');
    const [regionFilter, setRegionFilter] = useState('');
    const [activeFilter, setActiveFilter] = useState('');

    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form] = Form.useForm();
    const [saving, setSaving] = useState(false);

    const fetchBranches = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/branches', {
                params: {
                    page: pagination.page, limit: pagination.limit,
                    search: search || undefined,
                    regionId: regionFilter || undefined,
                    isActive: activeFilter !== '' ? activeFilter === 'true' : undefined,
                },
            });
            setBranches(data.data);
            setPagination(p => ({ ...p, total: data.meta.total }));
        } catch { message.error('Không thể tải danh sách chi nhánh'); }
        finally { setLoading(false); }
    }, [pagination.page, pagination.limit, search, regionFilter, activeFilter]);

    useEffect(() => { fetchBranches(); }, [fetchBranches]);

    useEffect(() => {
        api.get('/regions', { params: { limit: 100 } })
            .then(({ data }) => setRegions(data.data))
            .catch(() => {});
    }, []);

    const openCreate = () => {
        setEditingId(null);
        form.resetFields();
        setDialogOpen(true);
    };
    const openEdit = (b: Branch) => {
        setEditingId(b.id);
        form.setFieldsValue({ code: b.code, name: b.name, province: b.province ?? '', ward: b.ward ?? '', regionId: b.regionId ?? '' });
        setDialogOpen(true);
    };

    const handleSave = async () => {
        try {
            const values = await form.validateFields();
            setSaving(true);
            if (editingId) {
                await api.patch(`/branches/${editingId}`, {
                    name: values.name, province: values.province || undefined,
                    ward: values.ward || undefined, regionId: values.regionId || undefined,
                });
                message.success('Cập nhật chi nhánh thành công');
            } else {
                await api.post('/branches', {
                    code: values.code, name: values.name,
                    province: values.province || undefined,
                    ward: values.ward || undefined,
                    regionId: values.regionId || undefined,
                });
                message.success('Tạo chi nhánh thành công');
            }
            setDialogOpen(false);
            fetchBranches();
        } catch (err: any) {
            if (err?.response) message.error(err?.response?.data?.message || 'Thao tác thất bại');
        } finally { setSaving(false); }
    };

    const handleDeactivate = async (id: string, name: string) => {
        if (!window.confirm(`Vô hiệu hoá chi nhánh "${name}"?`)) return;
        try {
            await api.patch(`/branches/${id}/deactivate`);
            message.success('Đã vô hiệu hoá chi nhánh');
            fetchBranches();
        } catch (err: any) { message.error(err?.response?.data?.message || 'Thao tác thất bại'); }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!window.confirm(`Xoá chi nhánh "${name}"? Thao tác không thể hoàn tác.`)) return;
        try {
            await api.delete(`/branches/${id}`);
            message.success('Đã xoá chi nhánh');
            fetchBranches();
        } catch (err: any) { message.error(err?.response?.data?.message || 'Thao tác thất bại'); }
    };

    const columns: ColumnsType<Branch> = [
        { title: 'STT', key: 'stt', width: 60, align: 'center', render: (_, __, i) => (pagination.page - 1) * pagination.limit + i + 1 },
        { title: 'Mã CN', key: 'code', width: 110, render: (_, r) => <Tag>{r.code}</Tag> },
        { title: 'Tên chi nhánh', key: 'name', render: (_, r) => <span style={{ fontWeight: 500, color: '#1A2B5A' }}>{r.name}</span> },
        { title: 'Khu vực', key: 'region', width: 160, render: (_, r) => r.region?.name ?? <span style={{ color: '#9ca3af' }}>—</span> },
        { title: 'Tỉnh/TP', key: 'province', width: 160, render: (_, r) => r.province ?? <span style={{ color: '#9ca3af' }}>—</span> },
        { title: 'Phường/Xã', key: 'ward', width: 160, render: (_, r) => r.ward ?? <span style={{ color: '#9ca3af' }}>—</span> },
        {
            title: 'Trạng thái', key: 'status', width: 140, align: 'center',
            render: (_, r) => <Tag color={r.isActive ? 'success' : 'default'}>{r.isActive ? 'Hoạt động' : 'Vô hiệu'}</Tag>,
        },
        {
            title: 'Thao tác', key: 'actions', width: 120, align: 'center',
            render: (_, r) => (
                <Space>
                    <button title="Chỉnh sửa" onClick={() => openEdit(r)}
                        style={{ padding: 6, borderRadius: 4, background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}>
                        <Pencil size={16} />
                    </button>
                    {r.isActive && (
                        <button title="Vô hiệu hoá" onClick={() => handleDeactivate(r.id, r.name)}
                            style={{ padding: 6, borderRadius: 4, background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}>
                            <PowerOff size={16} />
                        </button>
                    )}
                    <button title="Xoá" onClick={() => handleDelete(r.id, r.name)}
                        style={{ padding: 6, borderRadius: 4, background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}>
                        <Trash2 size={16} />
                    </button>
                </Space>
            ),
        },
    ];

    return (
        <>
            {/* Page Header */}
            <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <Title level={4} style={{ margin: 0 }}>Quản lý Chi nhánh</Title>
                    <p style={{ color: '#6b7280', fontSize: 14, marginTop: 4 }}>Danh sách chi nhánh trong hệ thống</p>
                </div>
                <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
                    Thêm chi nhánh
                </Button>
            </div>

            {/* Filters */}
            <Card style={{ marginBottom: 16 }}>
                <Space wrap>
                    <Input
                        prefix={<SearchOutlined style={{ color: '#9ca3af' }} />}
                        placeholder="Tìm mã hoặc tên chi nhánh..."
                        value={searchInput}
                        onChange={e => setSearchInput(e.target.value)}
                        onPressEnter={() => { setSearch(searchInput); setPagination(p => ({ ...p, page: 1 })); }}
                        allowClear
                        onClear={() => { setSearchInput(''); setSearch(''); }}
                        style={{ width: 280 }}
                    />
                    <Select
                        value={regionFilter || undefined}
                        onChange={(v) => { setRegionFilter(v === '__all__' ? '' : (v ?? '')); setPagination(p => ({ ...p, page: 1 })); }}
                        placeholder="Tất cả khu vực"
                        style={{ width: 176 }}
                        allowClear
                        options={[{ value: '__all__', label: 'Tất cả khu vực' }, ...regions.map(r => ({ value: r.id, label: r.name }))]}
                    />
                    <Select
                        value={activeFilter || undefined}
                        onChange={(v) => { setActiveFilter(v === '__all__' ? '' : (v ?? '')); setPagination(p => ({ ...p, page: 1 })); }}
                        placeholder="Tất cả trạng thái"
                        style={{ width: 176 }}
                        allowClear
                        options={[
                            { value: '__all__', label: 'Tất cả trạng thái' },
                            { value: 'true', label: 'Hoạt động' },
                            { value: 'false', label: 'Vô hiệu' },
                        ]}
                    />
                </Space>
            </Card>

            <Card>
                <Table columns={columns} dataSource={branches} rowKey="id" loading={loading} pagination={{ pageSize: pagination.limit, total: pagination.total, current: pagination.page, onChange: (page) => setPagination(p => ({ ...p, page })) }} size="small" />
            </Card>

            {/* Create/Edit Modal */}
            <Modal
                open={dialogOpen}
                onCancel={() => setDialogOpen(false)}
                title={
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Building2 size={20} color="#E8890C" />
                        {editingId ? 'Cập nhật chi nhánh' : 'Thêm chi nhánh mới'}
                    </span>
                }
                footer={[
                    <Button key="cancel" onClick={() => setDialogOpen(false)}>Huỷ</Button>,
                    <Button key="ok" type="primary" onClick={handleSave} loading={saving}>
                        {editingId ? 'Cập nhật' : 'Tạo mới'}
                    </Button>,
                ]}
                width={520}
            >
                <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <Form.Item name="code" label="Mã chi nhánh" rules={[{ required: !editingId, message: 'Nhập mã chi nhánh' }]}>
                            <Input placeholder="VD: HN01" disabled={!!editingId} onChange={e => form.setFieldValue('code', e.target.value.toUpperCase())} />
                        </Form.Item>
                        <Form.Item name="regionId" label="Khu vực">
                            <Select placeholder="Chọn khu vực" allowClear
                                options={regions.map(r => ({ value: r.id, label: r.name }))} />
                        </Form.Item>
                    </div>
                    <Form.Item name="name" label="Tên chi nhánh" rules={[{ required: true, message: 'Nhập tên chi nhánh' }]}>
                        <Input placeholder="VD: Chi nhánh Hà Nội 1" />
                    </Form.Item>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <Form.Item name="province" label="Tỉnh / Thành phố">
                            <Input placeholder="VD: Hà Nội" />
                        </Form.Item>
                        <Form.Item name="ward" label="Phường / Xã">
                            <Input placeholder="VD: Phú Thạnh" />
                        </Form.Item>
                    </div>
                </Form>
            </Modal>
        </>
    );
}
