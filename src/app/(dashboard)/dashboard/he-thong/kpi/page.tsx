'use client';
import { useEffect, useState, useCallback } from 'react';
import { message } from 'antd';
import { Pencil, Trash2, Plus, Copy, Target } from 'lucide-react';
import { Button, Input, Select, Tag, Table, Card, Modal, Form, Typography, Space } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined, CopyOutlined } from '@ant-design/icons';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

const { Title } = Typography;

interface KpiTarget {
    id: string; targetType: 'TEAM' | 'BRANCH';
    periodYear: number; periodMonth: number;
    targetValue: string; note: string | null;
    team: { id: string; code: string; name: string } | null;
    branch: { id: string; code: string; name: string } | null;
    createdAt: string;
}
interface Branch { id: string; code: string; name: string; }
interface Team { id: string; code: string; name: string; }

const MONTHS = Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: `Tháng ${i + 1}` }));

export default function KpiPage() {
    const [kpis, setKpis] = useState<KpiTarget[]>([]);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);
    const [loading, setLoading] = useState(false);
    const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 });

    const [typeFilter, setTypeFilter] = useState('');
    const [branchFilter, setBranchFilter] = useState('');
    const [teamFilter, setTeamFilter] = useState('');
    const [yearFilter, setYearFilter] = useState('');
    const [monthFilter, setMonthFilter] = useState('');

    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [form] = Form.useForm();

    const [copyOpen, setCopyOpen] = useState(false);
    const [copying, setCopying] = useState(false);
    const [copyForm] = Form.useForm();

    const fetchKpis = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/kpi-targets', {
                params: {
                    page: pagination.page, limit: pagination.limit,
                    targetType: typeFilter || undefined,
                    branchId: branchFilter || undefined,
                    teamId: teamFilter || undefined,
                    periodYear: yearFilter || undefined,
                    periodMonth: monthFilter || undefined,
                },
            });
            setKpis(data.data);
            setPagination(p => ({ ...p, total: data.meta.total }));
        } catch { message.error('Không thể tải danh sách KPI'); }
        finally { setLoading(false); }
    }, [pagination.page, pagination.limit, typeFilter, branchFilter, teamFilter, yearFilter, monthFilter]);

    useEffect(() => { fetchKpis(); }, [fetchKpis]);

    useEffect(() => {
        api.get('/branches', { params: { limit: 100 } }).then(({ data }) => setBranches(data.data)).catch(() => { });
        api.get('/teams', { params: { limit: 100 } }).then(({ data }) => setTeams(data.data)).catch(() => { });
    }, []);

    const openCreate = () => {
        setEditingId(null);
        form.resetFields();
        form.setFieldsValue({ targetType: 'TEAM', periodYear: new Date().getFullYear(), periodMonth: String(new Date().getMonth() + 1) });
        setDialogOpen(true);
    };
    const openEdit = (k: KpiTarget) => {
        setEditingId(k.id);
        form.setFieldsValue({ targetType: k.targetType, teamId: k.team?.id ?? '', branchId: k.branch?.id ?? '', periodYear: k.periodYear, periodMonth: String(k.periodMonth), targetValue: k.targetValue, note: k.note ?? '' });
        setDialogOpen(true);
    };

    const handleSave = async () => {
        try {
            const values = await form.validateFields();
            if (!values.targetValue || Number(values.targetValue) <= 0) { message.error('Giá trị KPI phải lớn hơn 0'); return; }
            setSaving(true);
            if (editingId) {
                await api.patch(`/kpi-targets/${editingId}`, { targetValue: Number(values.targetValue), note: values.note || undefined });
                message.success('Cập nhật KPI thành công');
            } else {
                await api.post('/kpi-targets', {
                    targetType: values.targetType,
                    teamId: values.targetType === 'TEAM' ? values.teamId || undefined : undefined,
                    branchId: values.targetType === 'BRANCH' ? values.branchId || undefined : undefined,
                    periodYear: values.periodYear, periodMonth: Number(values.periodMonth),
                    targetValue: Number(values.targetValue), note: values.note || undefined,
                });
                message.success('Tạo KPI thành công');
            }
            setDialogOpen(false); fetchKpis();
        } catch (err: any) {
            if (err?.response) message.error(err?.response?.data?.message || 'Thao tác thất bại');
        } finally { setSaving(false); }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Xoá KPI target này?')) return;
        try {
            await api.delete(`/kpi-targets/${id}`);
            message.success('Đã xoá KPI');
            fetchKpis();
        } catch (err: any) { message.error(err?.response?.data?.message || 'Thao tác thất bại'); }
    };

    const handleCopy = async () => {
        try {
            const values = await copyForm.validateFields();
            setCopying(true);
            const res = await api.post('/kpi-targets/copy', {
                fromYear: values.fromYear, fromMonth: Number(values.fromMonth),
                toYear: values.toYear, toMonth: Number(values.toMonth),
            });
            message.success(res.data.message);
            setCopyOpen(false); fetchKpis();
        } catch (err: any) {
            if (err?.response) message.error(err?.response?.data?.message || 'Copy thất bại');
        } finally { setCopying(false); }
    };

    const columns: ColumnsType<KpiTarget> = [
        { title: 'STT', key: 'stt', width: 60, align: 'center', render: (_, __, i) => (pagination.page - 1) * pagination.limit + i + 1 },
        {
            title: 'Loại', key: 'type', width: 100, align: 'center',
            render: (_, r) => <Tag color={r.targetType === 'TEAM' ? 'blue' : 'default'}>{r.targetType}</Tag>,
        },
        {
            title: 'Đối tượng', key: 'target',
            render: (_, r) => {
                const entity = r.targetType === 'TEAM' ? r.team : r.branch;
                return entity ? (
                    <div>
                        <span style={{ fontWeight: 500, color: '#1A2B5A' }}>{entity.name}</span>
                        <span style={{ fontSize: 12, color: '#9ca3af', marginLeft: 6 }}>({entity.code})</span>
                    </div>
                ) : <span style={{ color: '#9ca3af' }}>—</span>;
            },
        },
        {
            title: 'Kỳ', key: 'period', width: 120, align: 'center',
            render: (_, r) => <span style={{ fontWeight: 500 }}>T{r.periodMonth}/{r.periodYear}</span>,
        },
        {
            title: 'KPI', key: 'targetValue', width: 180, align: 'right',
            render: (_, r) => <span style={{ fontWeight: 700, color: '#E8890C' }}>{formatCurrency(Number(r.targetValue))}</span>,
        },
        { title: 'Ghi chú', key: 'note', render: (_, r) => r.note ?? <span style={{ color: '#9ca3af' }}>—</span> },
        {
            title: 'Thao tác', key: 'actions', width: 100, align: 'center',
            render: (_, r) => (
                <Space>
                    <button title="Chỉnh sửa" onClick={() => openEdit(r)}
                        style={{ padding: 6, background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}>
                        <Pencil size={16} />
                    </button>
                    <button title="Xoá" onClick={() => handleDelete(r.id)}
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
                    <Title level={4} style={{ margin: 0 }}>Quản lý KPI</Title>
                    <p style={{ color: '#6b7280', fontSize: 14, marginTop: 4 }}>Thiết lập chỉ tiêu KPI theo kỳ cho team và chi nhánh</p>
                </div>
                <Space>
                    <Button icon={<CopyOutlined />} onClick={() => { copyForm.resetFields(); copyForm.setFieldsValue({ fromYear: new Date().getFullYear(), fromMonth: String(new Date().getMonth()), toYear: new Date().getFullYear(), toMonth: String(new Date().getMonth() + 1) }); setCopyOpen(true); }}>
                        Copy từ tháng trước
                    </Button>
                    <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
                        Thêm KPI
                    </Button>
                </Space>
            </div>

            {/* Filters */}
            <Card style={{ marginBottom: 16 }}>
                <Space wrap>
                    <Select value={typeFilter || undefined} onChange={(v) => { setTypeFilter(v === '__all__' ? '' : (v ?? '')); setPagination(p => ({ ...p, page: 1 })); }} placeholder="Tất cả loại" style={{ width: 144 }} allowClear options={[{ value: '__all__', label: 'Tất cả loại' }, { value: 'TEAM', label: 'Team' }, { value: 'BRANCH', label: 'Chi nhánh' }]} />
                    <Select value={branchFilter || undefined} onChange={(v) => { setBranchFilter(v === '__all__' ? '' : (v ?? '')); setPagination(p => ({ ...p, page: 1 })); }} placeholder="Tất cả chi nhánh" style={{ width: 176 }} allowClear options={[{ value: '__all__', label: 'Tất cả chi nhánh' }, ...branches.map(b => ({ value: b.id, label: b.name }))]} />
                    <Select value={teamFilter || undefined} onChange={(v) => { setTeamFilter(v === '__all__' ? '' : (v ?? '')); setPagination(p => ({ ...p, page: 1 })); }} placeholder="Tất cả team" style={{ width: 160 }} allowClear options={[{ value: '__all__', label: 'Tất cả team' }, ...teams.map(t => ({ value: t.id, label: t.name }))]} />
                    <Input type="number" placeholder="Năm" style={{ width: 96 }} value={yearFilter} onChange={e => { setYearFilter(e.target.value); setPagination(p => ({ ...p, page: 1 })); }} />
                    <Select value={monthFilter || undefined} onChange={(v) => { setMonthFilter(v === '__all__' ? '' : (v ?? '')); setPagination(p => ({ ...p, page: 1 })); }} placeholder="Tháng" style={{ width: 128 }} allowClear options={[{ value: '__all__', label: 'Tất cả tháng' }, ...MONTHS]} />
                </Space>
            </Card>

            <Card>
                <Table columns={columns} dataSource={kpis} rowKey="id" loading={loading} pagination={{ pageSize: pagination.limit, total: pagination.total, current: pagination.page, onChange: (page) => setPagination(p => ({ ...p, page })) }} size="small" />
            </Card>

            {/* Create/Edit Modal */}
            <Modal open={dialogOpen} onCancel={() => setDialogOpen(false)} title={<span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Target size={20} color="#E8890C" />{editingId ? 'Cập nhật KPI' : 'Thêm KPI mới'}</span>} width={520} footer={[<Button key="cancel" onClick={() => setDialogOpen(false)}>Huỷ</Button>, <Button key="ok" type="primary" onClick={handleSave} loading={saving}>{editingId ? 'Cập nhật' : 'Tạo mới'}</Button>]}>
                <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
                    {!editingId && (
                        <>
                            <Form.Item name="targetType" label={<span>Đối tượng <span style={{ color: 'red' }}>*</span></span>}>
                                <Select options={[{ value: 'TEAM', label: 'Team' }, { value: 'BRANCH', label: 'Chi nhánh' }]} />
                            </Form.Item>
                            <Form.Item noStyle shouldUpdate={(prev, cur) => prev.targetType !== cur.targetType}>
                                {({ getFieldValue }) => getFieldValue('targetType') === 'TEAM' ? (
                                    <Form.Item name="teamId" label={<span>Team <span style={{ color: 'red' }}>*</span></span>}>
                                        <Select placeholder="Chọn team" options={teams.map(t => ({ value: t.id, label: `${t.name} (${t.code})` }))} />
                                    </Form.Item>
                                ) : (
                                    <Form.Item name="branchId" label={<span>Chi nhánh <span style={{ color: 'red' }}>*</span></span>}>
                                        <Select placeholder="Chọn chi nhánh" options={branches.map(b => ({ value: b.id, label: `${b.name} (${b.code})` }))} />
                                    </Form.Item>
                                )}
                            </Form.Item>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                <Form.Item name="periodYear" label={<span>Năm <span style={{ color: 'red' }}>*</span></span>}>
                                    <Input type="number" min={2020} max={2100} />
                                </Form.Item>
                                <Form.Item name="periodMonth" label={<span>Tháng <span style={{ color: 'red' }}>*</span></span>}>
                                    <Select options={MONTHS} />
                                </Form.Item>
                            </div>
                        </>
                    )}
                    <Form.Item name="targetValue" label={<span>Giá trị KPI (VNĐ) <span style={{ color: 'red' }}>*</span></span>} rules={[{ required: true, message: 'Nhập giá trị KPI' }]}>
                        <Input type="number" min={0} placeholder="VD: 500000000" />
                    </Form.Item>
                    <Form.Item name="note" label="Ghi chú">
                        <Input placeholder="Ghi chú thêm (tuỳ chọn)" />
                    </Form.Item>
                </Form>
            </Modal>

            {/* Copy Modal */}
            <Modal open={copyOpen} onCancel={() => setCopyOpen(false)} title={<span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Copy size={20} color="#E8890C" />Copy KPI từ tháng trước</span>} width={480} footer={[<Button key="cancel" onClick={() => setCopyOpen(false)}>Huỷ</Button>, <Button key="ok" type="primary" onClick={handleCopy} loading={copying}>Copy KPI</Button>]}>
                <Form form={copyForm} layout="vertical" style={{ marginTop: 16 }}>
                    <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 16 }}>Copy toàn bộ KPI từ kỳ nguồn sang kỳ đích. Các KPI đã tồn tại ở kỳ đích sẽ được bỏ qua.</p>
                    <Card style={{ background: '#f9fafb', marginBottom: 16 }}>
                        <p style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', marginBottom: 12 }}>Kỳ nguồn</p>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <Form.Item name="fromYear" label="Năm"><Input type="number" min={2020} /></Form.Item>
                            <Form.Item name="fromMonth" label="Tháng"><Select options={MONTHS} /></Form.Item>
                        </div>
                    </Card>
                    <Card style={{ background: '#fff7ed', borderColor: '#fed7aa' }}>
                        <p style={{ fontSize: 12, fontWeight: 600, color: '#E8890C', textTransform: 'uppercase', marginBottom: 12 }}>Kỳ đích</p>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <Form.Item name="toYear" label="Năm"><Input type="number" min={2020} /></Form.Item>
                            <Form.Item name="toMonth" label="Tháng"><Select options={MONTHS} /></Form.Item>
                        </div>
                    </Card>
                </Form>
            </Modal>
        </>
    );
}
