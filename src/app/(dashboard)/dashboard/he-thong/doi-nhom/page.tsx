'use client';
import { useEffect, useState, useCallback } from 'react';
import { message } from 'antd';
import { Pencil, Trash2, PowerOff, Plus, X } from 'lucide-react';
import { Button, Input, Select, Tag, Table, Card, Modal, Form, Typography, Space } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import api from '@/lib/api';
import dayjs from 'dayjs';

const { Title } = Typography;

interface Branch { id: string; name: string; }
interface Employee { id: string; fullName: string; }
interface Team {
    id: string; name: string; code: string; isActive: boolean; createdAt: string;
    branch: { id: string; name: string } | null;
    leader: { id: string; fullName: string } | null;
}

export default function DoiNhomPage() {
    const [teams,    setTeams]    = useState<Team[]>([]);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading,  setLoading]  = useState(false);
    const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 });
    const [searchInput, setSearchInput] = useState('');
    const [search, setSearch]     = useState('');
    const [branchFilter, setBranchFilter] = useState('');

    const [dialogOpen,  setDialogOpen]  = useState(false);
    const [editingId,   setEditingId]   = useState<string | null>(null);
    const [saving,      setSaving]      = useState(false);
    const [form] = Form.useForm();

    const fetchTeams = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/teams', {
                params: { page: pagination.page, limit: pagination.limit, search: search || undefined, branchId: branchFilter || undefined },
            });
            setTeams(data.data ?? data);
            if (data.meta) setPagination(p => ({ ...p, total: data.meta.total }));
        } catch { message.error('Không thể tải danh sách đội/nhóm'); }
        finally { setLoading(false); }
    }, [pagination.page, pagination.limit, search, branchFilter]);

    useEffect(() => { fetchTeams(); }, [fetchTeams]);
    useEffect(() => {
        api.get('/branches',  { params: { limit: 200 } }).then(({ data }) => setBranches(data.data ?? [])).catch(() => {});
        api.get('/employees', { params: { limit: 500 } }).then(({ data }) => setEmployees(data.data ?? [])).catch(() => {});
    }, []);

    const openCreate = () => { setEditingId(null); form.resetFields(); setDialogOpen(true); };
    const openEdit   = (t: Team) => {
        setEditingId(t.id);
        form.setFieldsValue({ name: t.name, code: t.code ?? '', branchId: t.branch?.id ?? '', leaderId: t.leader?.id ?? '' });
        setDialogOpen(true);
    };

    const handleSave = async () => {
        try {
            const values = await form.validateFields();
            setSaving(true);
            const payload = { name: values.name, code: values.code || undefined, branchId: values.branchId || undefined, leaderId: values.leaderId || undefined };
            if (editingId) {
                await api.patch(`/teams/${editingId}`, payload);
                message.success('Cập nhật đội/nhóm thành công');
            } else {
                await api.post('/teams', payload);
                message.success('Tạo đội/nhóm thành công');
            }
            setDialogOpen(false);
            fetchTeams();
        } catch (err: any) {
            if (err?.response) message.error(err?.response?.data?.message || 'Thao tác thất bại');
        } finally { setSaving(false); }
    };

    const handleDeactivate = async (id: string, isActive: boolean) => {
        if (!window.confirm(isActive ? 'Vô hiệu hoá đội/nhóm này?' : 'Kích hoạt lại đội/nhóm này?')) return;
        try {
            await api.patch(`/teams/${id}/deactivate`);
            message.success('Đã cập nhật trạng thái');
            fetchTeams();
        } catch (err: any) { message.error(err?.response?.data?.message || 'Thao tác thất bại'); }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Xoá đội/nhóm này? Hành động không thể hoàn tác.')) return;
        try {
            await api.delete(`/teams/${id}`);
            message.success('Đã xoá đội/nhóm');
            fetchTeams();
        } catch (err: any) { message.error(err?.response?.data?.message || 'Thao tác thất bại'); }
    };

    const columns: ColumnsType<Team> = [
        { title: 'STT', key: 'stt', width: 52, align: 'center', render: (_, __, i) => (pagination.page - 1) * pagination.limit + i + 1 },
        { title: 'Tên đội/nhóm', key: 'name', render: (_, r) => <span style={{ fontWeight: 500 }}>{r.name}</span> },
        { title: 'Chi nhánh', key: 'branch', width: 180, render: (_, r) => r.branch?.name || '—' },
        { title: 'Leader', key: 'leader', width: 180, render: (_, r) => r.leader?.fullName || '—' },
        { title: 'Trạng thái', key: 'status', width: 130, align: 'center', render: (_, r) => <Tag color={r.isActive ? 'success' : 'default'}>{r.isActive ? 'Hoạt động' : 'Đã vô hiệu'}</Tag> },
        { title: 'Ngày tạo', key: 'createdAt', width: 120, align: 'center', render: (_, r) => dayjs(r.createdAt).format('DD/MM/YYYY') },
        {
            title: 'Thao tác', key: 'actions', width: 110, align: 'center',
            render: (_, r) => (
                <Space>
                    <button title="Chỉnh sửa" style={{ padding: 6, background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }} onClick={() => openEdit(r)}><Pencil size={16} /></button>
                    <button title={r.isActive ? 'Vô hiệu hoá' : 'Kích hoạt'} style={{ padding: 6, background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }} onClick={() => handleDeactivate(r.id, r.isActive)}><PowerOff size={16} /></button>
                    <button title="Xoá" style={{ padding: 6, background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }} onClick={() => handleDelete(r.id)}><Trash2 size={16} /></button>
                </Space>
            ),
        },
    ];

    return (
        <>
            <div style={{ marginBottom: 24 }}>
                <Title level={4} style={{ margin: 0 }}>Hệ thống / Quản lý đội nhóm</Title>
            </div>
            <Card>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16, alignItems: 'center' }}>
                    <Select
                        value={branchFilter || undefined}
                        onChange={v => { setBranchFilter(v ?? ''); setPagination(p => ({ ...p, page: 1 })); }}
                        placeholder="Chi nhánh"
                        style={{ width: 176 }}
                        allowClear
                        options={[{ value: '', label: 'Tất cả chi nhánh' }, ...branches.map(b => ({ value: b.id, label: b.name }))]}
                    />
                    <Input
                        prefix={<SearchOutlined style={{ color: '#9ca3af' }} />}
                        placeholder="Tìm theo tên..."
                        value={searchInput}
                        onChange={e => setSearchInput(e.target.value)}
                        onPressEnter={() => { setSearch(searchInput); setPagination(p => ({ ...p, page: 1 })); }}
                        style={{ width: 240, marginLeft: 'auto' }}
                    />
                    <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Thêm mới</Button>
                </div>

                <Table
                    columns={columns}
                    dataSource={teams}
                    rowKey="id"
                    loading={loading}
                    pagination={{ pageSize: pagination.limit, total: pagination.total, current: pagination.page, onChange: (page) => setPagination(p => ({ ...p, page })), showTotal: (total) => `Tổng: ${total}` }}
                    size="small"
                />
            </Card>

            <Modal
                open={dialogOpen}
                onCancel={() => setDialogOpen(false)}
                title={editingId ? 'Chỉnh sửa đội/nhóm' : 'Thêm đội/nhóm mới'}
                width={520}
                footer={[
                    <Button key="cancel" onClick={() => setDialogOpen(false)}>Huỷ</Button>,
                    <Button key="ok" type="primary" onClick={handleSave} loading={saving}>Lưu</Button>,
                ]}
            >
                <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
                    <Form.Item name="name" label={<span>Tên đội/nhóm <span style={{ color: 'red' }}>*</span></span>} rules={[{ required: true, message: 'Nhập tên đội/nhóm' }]}>
                        <Input placeholder="VD: Team Hà Nội 1" />
                    </Form.Item>
                    <Form.Item name="code" label="Mã đội (tuỳ chọn)">
                        <Input placeholder="VD: HN01" style={{ textTransform: 'uppercase' }} onChange={e => form.setFieldValue('code', e.target.value.toUpperCase())} />
                    </Form.Item>
                    <Form.Item name="branchId" label="Chi nhánh">
                        <Select placeholder="Chọn chi nhánh" allowClear
                            options={branches.map(b => ({ value: b.id, label: b.name }))} />
                    </Form.Item>
                    <Form.Item name="leaderId" label="Leader phụ trách">
                        <Select placeholder="Chọn leader" allowClear
                            options={employees.map(e => ({ value: e.id, label: e.fullName }))} />
                    </Form.Item>
                </Form>
            </Modal>
        </>
    );
}
