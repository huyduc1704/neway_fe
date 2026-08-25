'use client';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { message } from 'antd';
import { Pencil, Trash2, PowerOff, Building2 } from 'lucide-react';
import { Button, Input, Select, Tag, Table, Card, Modal, Form, Typography, Space } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import api from '@/lib/api';
import { useUser } from '@/context/UserContext';

const { Title } = Typography;

const PROVINCES_API = 'https://provinces.open-api.vn/api/v2';

interface Region { id: string; name: string; }
interface Branch {
    id: string; code: string; name: string;
    province: string | null; wards: string[];
    regionId: string | null; isActive: boolean;
    region: { id: string; name: string } | null;
    createdAt: string;
}
interface ProvinceOption { code: number; name: string; }
interface WardOption { code: string; name: string; }

export default function ChiNhanhPage() {
    const { can } = useUser();
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

    // Province/Ward API state
    const [provinceOptions, setProvinceOptions] = useState<ProvinceOption[]>([]);
    const [wardOptions, setWardOptions] = useState<WardOption[]>([]);
    const [provincesLoading, setProvincesLoading] = useState(false);
    const [wardsLoading, setWardsLoading] = useState(false);
    const [selectedProvinceCode, setSelectedProvinceCode] = useState<number | null>(null);
    const [wardSearch, setWardSearch] = useState('');
    const filteredWards = useMemo(() => {
        const q = wardSearch.toLowerCase();
        if (!q) return wardOptions.slice(0, 100);
        return wardOptions.filter(w => w.name.toLowerCase().includes(q)).slice(0, 100);
    }, [wardSearch, wardOptions]);

    // Load province list once
    useEffect(() => {
        setProvincesLoading(true);
        fetch(`${PROVINCES_API}/p/`)
            .then(r => r.json())
            .then((data: ProvinceOption[]) => setProvinceOptions(data))
            .catch(() => message.error('Không thể tải danh sách thành phố'))
            .finally(() => setProvincesLoading(false));
    }, []);

    const loadWards = async (provinceCode: number): Promise<WardOption[]> => {
        setWardsLoading(true);
        setWardOptions([]);
        try {
            const resp = await fetch(`${PROVINCES_API}/p/${provinceCode}?depth=2`);
            const data = await resp.json();
            // After Vietnam's administrative reform, wards are directly under province
            const wards: WardOption[] = data.wards ?? [];
            setWardOptions(wards);
            return wards;
        } catch {
            message.error('Không thể tải danh sách phường/xã');
            return [];
        } finally {
            setWardsLoading(false);
        }
    };

    const handleProvinceChange = async (value: string | undefined, option: any) => {
        form.setFieldValue('wards', []);
        setWardOptions([]);
        setWardSearch('');
        if (!value) { setSelectedProvinceCode(null); return; }
        const code = Array.isArray(option) ? option[0]?.code : option?.code;
        setSelectedProvinceCode(code ?? null);
        if (code) await loadWards(code);
    };

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
            .catch(() => { });
    }, []);

    const openCreate = () => {
        setEditingId(null);
        form.resetFields();
        setWardOptions([]);
        setSelectedProvinceCode(null);
        setDialogOpen(true);
    };

    const openEdit = async (b: Branch) => {
        setEditingId(b.id);
        form.resetFields();
        setWardOptions([]);
        setSelectedProvinceCode(null);
        form.setFieldsValue({
            code: b.code,
            name: b.name,
            regionId: b.region?.id ?? undefined,
            province: b.province ?? undefined,
            wards: b.wards ?? [],
        });

        // Pre-load wards for the stored province name
        if (b.province && provinceOptions.length > 0) {
            const prov = provinceOptions.find(p => p.name === b.province);
            if (prov) {
                setSelectedProvinceCode(prov.code);
                await loadWards(prov.code);
            }
        }

        setDialogOpen(true);
    };

    const handleSave = async () => {
        try {
            const values = await form.validateFields();
            setSaving(true);
            const payload = {
                name: values.name,
                province: values.province || undefined,
                wards: values.wards?.length ? values.wards : [],
                regionId: values.regionId || undefined,
            };
            if (editingId) {
                await api.patch(`/branches/${editingId}`, payload);
                message.success('Cập nhật chi nhánh thành công');
            } else {
                await api.post('/branches', { code: values.code, ...payload });
                message.success('Tạo chi nhánh thành công');
            }
            setDialogOpen(false);
            fetchBranches();
        } catch (err: any) {
            if (err?.response) message.error(err?.response?.data?.message || 'Thao tác thất bại');
        } finally { setSaving(false); }
    };

    const handleDeactivate = (id: string, name: string) => {
        Modal.confirm({
            title: `Vô hiệu hoá chi nhánh "${name}"?`,
            okText: 'Vô hiệu hoá',
            cancelText: 'Huỷ',
            onOk: async () => {
                try {
                    await api.patch(`/branches/${id}/deactivate`);
                    message.success('Đã vô hiệu hoá chi nhánh');
                    fetchBranches();
                } catch (err: any) { message.error(err?.response?.data?.message || 'Thao tác thất bại'); }
            },
        });
    };

    const handleDelete = (id: string, name: string) => {
        Modal.confirm({
            title: `Xoá chi nhánh "${name}"?`,
            content: 'Thao tác không thể hoàn tác.',
            okText: 'Xoá',
            okType: 'danger',
            cancelText: 'Huỷ',
            onOk: async () => {
                try {
                    await api.delete(`/branches/${id}`);
                    message.success('Đã xoá chi nhánh');
                    fetchBranches();
                } catch (err: any) { message.error(err?.response?.data?.message || 'Thao tác thất bại'); }
            },
        });
    };

    const columns: ColumnsType<Branch> = [
        { title: 'STT', key: 'stt', width: 60, align: 'center', render: (_, __, i) => (pagination.page - 1) * pagination.limit + i + 1 },
        { title: 'Mã CN', key: 'code', width: 110, render: (_, r) => <Tag>{r.code}</Tag> },
        { title: 'Tên chi nhánh', key: 'name', render: (_, r) => <span style={{ fontWeight: 500, color: '#1A2B5A' }}>{r.name}</span> },
        { title: 'Khu vực', key: 'region', width: 140, render: (_, r) => r.region?.name ?? <span style={{ color: '#9ca3af' }}>—</span> },
        { title: 'Thành phố', key: 'province', width: 140, render: (_, r) => r.province ?? <span style={{ color: '#9ca3af' }}>—</span> },
        {
            title: 'Phường/Xã', key: 'wards', width: 260,
            render: (_, r) => r.wards?.length
                ? <Space wrap size={4}>{r.wards.map(w => <Tag key={w} style={{ marginBottom: 2 }}>{w}</Tag>)}</Space>
                : <span style={{ color: '#9ca3af' }}>—</span>
        },
        {
            title: 'Trạng thái', key: 'status', width: 120, align: 'center',
            render: (_, r) => <Tag color={r.isActive ? 'success' : 'default'}>{r.isActive ? 'Hoạt động' : 'Vô hiệu'}</Tag>,
        },
        {
            title: 'Thao tác', key: 'actions', width: 120, align: 'center',
            render: (_, r) => (
                <Space>
                    {can('BRANCH_EDIT') && (
                        <button title="Chỉnh sửa" onClick={() => openEdit(r)}
                            style={{ padding: 6, borderRadius: 4, background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}>
                            <Pencil size={16} />
                        </button>
                    )}
                    {can('BRANCH_EDIT') && r.isActive && (
                        <button title="Vô hiệu hoá" onClick={() => handleDeactivate(r.id, r.name)}
                            style={{ padding: 6, borderRadius: 4, background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}>
                            <PowerOff size={16} />
                        </button>
                    )}
                    {can('BRANCH_DELETE') && (
                        <button title="Xoá" onClick={() => handleDelete(r.id, r.name)}
                            style={{ padding: 6, borderRadius: 4, background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}>
                            <Trash2 size={16} />
                        </button>
                    )}
                </Space>
            ),
        },
    ];

    return (
        <>
            <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <Title level={4} style={{ margin: 0 }}>Quản lý Chi nhánh</Title>
                    <p style={{ color: '#6b7280', fontSize: 14, marginTop: 4 }}>Danh sách chi nhánh trong hệ thống</p>
                </div>
                {can('BRANCH_CREATE') && (
                    <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
                        Thêm chi nhánh
                    </Button>
                )}
            </div>

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
                <Table columns={columns} dataSource={branches} rowKey="id" loading={loading}
                    pagination={{ pageSize: pagination.limit, total: pagination.total, current: pagination.page, onChange: (page) => setPagination(p => ({ ...p, page })) }}
                    size="small" scroll={{ x: 1000 }} />
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
                width={560}
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
                        <Input placeholder="VD: Chi nhánh Hà Nội" />
                    </Form.Item>

                    <Form.Item name="province" label="Thành phố">
                        <Select
                            placeholder={provincesLoading ? 'Đang tải...' : 'Chọn thành phố'}
                            allowClear
                            showSearch
                            loading={provincesLoading}
                            filterOption={(input, option) =>
                                (option?.label as string ?? '').toLowerCase().includes(input.toLowerCase())
                            }
                            options={provinceOptions.map(p => ({ value: p.name, label: p.name, code: p.code }))}
                            onChange={handleProvinceChange}
                        />
                    </Form.Item>

                    <Form.Item name="wards" label="Phường / Xã">
                        <Select
                            mode="multiple"
                            placeholder={
                                wardsLoading ? 'Đang tải phường/xã...'
                                    : selectedProvinceCode ? 'Chọn phường/xã (có thể chọn nhiều)'
                                        : 'Chọn thành phố trước'
                            }
                            allowClear
                            showSearch
                            loading={wardsLoading}
                            disabled={!selectedProvinceCode && wardOptions.length === 0}
                            filterOption={false}
                            onSearch={setWardSearch}
                            options={filteredWards.map(w => ({ value: w.name, label: w.name }))}
                            maxTagCount="responsive"
                        />
                    </Form.Item>
                </Form>
            </Modal>
        </>
    );
}
