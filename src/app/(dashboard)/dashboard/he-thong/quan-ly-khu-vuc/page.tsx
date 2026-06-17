'use client';
import { useEffect, useState, useCallback } from 'react';
import { message } from 'antd';
import { Pencil, Trash2, X } from 'lucide-react';
import { Button, Input, Tag, Table, Card, Modal, Form, Typography, Space } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import api from '@/lib/api';
import dayjs from 'dayjs';
import { useUser } from '@/context/UserContext';

const { Title } = Typography;

interface Branch  { id: string; name: string; }
interface Region  {
    id: string; name: string; createdAt: string;
    branches: Branch[];
    _count?: { branches: number };
}

export default function QuanLyKhuVucPage() {
    const { can } = useUser();
    const [regions,  setRegions]  = useState<Region[]>([]);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [loading,  setLoading]  = useState(false);
    const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 });
    const [searchInput, setSearchInput] = useState('');
    const [search, setSearch]     = useState('');

    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingId,  setEditingId]  = useState<string | null>(null);
    const [saving,     setSaving]     = useState(false);
    const [form] = Form.useForm();
    const [selectedBranchIds, setSelectedBranchIds] = useState<string[]>([]);

    const fetchRegions = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/regions', { params: { page: pagination.page, limit: pagination.limit, search: search || undefined } });
            setRegions(data.data ?? data);
            if (data.meta) setPagination(p => ({ ...p, total: data.meta.total }));
        } catch { message.error('Không thể tải danh sách khu vực'); }
        finally { setLoading(false); }
    }, [pagination.page, pagination.limit, search]);

    useEffect(() => { fetchRegions(); }, [fetchRegions]);
    useEffect(() => {
        api.get('/branches', { params: { limit: 200 } }).then(({ data }) => setBranches(data.data ?? [])).catch(() => {});
    }, []);

    const openCreate = () => { setEditingId(null); form.resetFields(); setSelectedBranchIds([]); setDialogOpen(true); };
    const openEdit   = async (r: Region) => {
        setEditingId(r.id);
        try {
            const { data } = await api.get(`/regions/${r.id}`);
            form.setFieldsValue({ name: data.name });
            setSelectedBranchIds(data.branches?.map((b: Branch) => b.id) ?? []);
        } catch {
            form.setFieldsValue({ name: r.name });
            setSelectedBranchIds(r.branches?.map(b => b.id) ?? []);
        }
        setDialogOpen(true);
    };

    const handleSave = async () => {
        try {
            const values = await form.validateFields();
            setSaving(true);
            const payload = { name: values.name, branchIds: selectedBranchIds };
            if (editingId) {
                await api.patch(`/regions/${editingId}`, payload);
                message.success('Cập nhật khu vực thành công');
            } else {
                await api.post('/regions', payload);
                message.success('Tạo khu vực thành công');
            }
            setDialogOpen(false);
            fetchRegions();
        } catch (err: any) {
            if (err?.response) message.error(err?.response?.data?.message || 'Thao tác thất bại');
        } finally { setSaving(false); }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Xoá khu vực này? Hành động không thể hoàn tác.')) return;
        try {
            await api.delete(`/regions/${id}`);
            message.success('Đã xoá khu vực');
            fetchRegions();
        } catch (err: any) { message.error(err?.response?.data?.message || 'Thao tác thất bại'); }
    };

    const toggleBranch = (id: string) => {
        setSelectedBranchIds(prev => prev.includes(id) ? prev.filter(b => b !== id) : [...prev, id]);
    };

    const columns: ColumnsType<Region> = [
        { title: 'STT', key: 'stt', width: 52, align: 'center', render: (_, __, i) => (pagination.page - 1) * pagination.limit + i + 1 },
        { title: 'Tên khu vực', key: 'name', render: (_, r) => <span style={{ fontWeight: 500 }}>{r.name}</span> },
        {
            title: 'Chi nhánh trực thuộc', key: 'branches',
            render: (_, r) => {
                const list = r.branches ?? [];
                if (!list.length) return <span style={{ color: '#9ca3af', fontSize: 14 }}>—</span>;
                return (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {list.slice(0, 3).map(b => <Tag key={b.id} color="default" style={{ fontSize: 12 }}>{b.name}</Tag>)}
                        {list.length > 3 && <Tag color="default" style={{ fontSize: 12 }}>+{list.length - 3}</Tag>}
                    </div>
                );
            },
        },
        { title: 'Ngày tạo', key: 'createdAt', width: 120, align: 'center', render: (_, r) => dayjs(r.createdAt).format('DD/MM/YYYY') },
        {
            title: 'Thao tác', key: 'actions', width: 90, align: 'center',
            render: (_, r) => (
                <Space>
                    {can('REGION_EDIT') && <button title="Chỉnh sửa" style={{ padding: 6, background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }} onClick={() => openEdit(r)}><Pencil size={16} /></button>}
                    {can('REGION_DELETE') && <button title="Xoá" style={{ padding: 6, background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }} onClick={() => handleDelete(r.id)}><Trash2 size={16} /></button>}
                </Space>
            ),
        },
    ];

    return (
        <>
            <div style={{ marginBottom: 24 }}>
                <Title level={4} style={{ margin: 0 }}>Hệ thống / Quản lý khu vực</Title>
            </div>
            <Card>
                <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
                    <Input
                        prefix={<SearchOutlined style={{ color: '#9ca3af' }} />}
                        placeholder="Tìm theo tên khu vực..."
                        value={searchInput}
                        onChange={e => setSearchInput(e.target.value)}
                        onPressEnter={() => { setSearch(searchInput); setPagination(p => ({ ...p, page: 1 })); }}
                        allowClear
                        onClear={() => { setSearchInput(''); setSearch(''); }}
                        style={{ width: 240 }}
                    />
                    {can('REGION_CREATE') && <Button type="primary" icon={<PlusOutlined />} style={{ marginLeft: 'auto' }} onClick={openCreate}>Thêm mới</Button>}
                </div>

                <Table
                    columns={columns}
                    dataSource={regions}
                    rowKey="id"
                    loading={loading}
                    pagination={{ pageSize: pagination.limit, total: pagination.total, current: pagination.page, onChange: (page) => setPagination(p => ({ ...p, page })), showTotal: (total) => `Tổng: ${total} khu vực` }}
                    size="small"
                />
            </Card>

            <Modal
                open={dialogOpen}
                onCancel={() => setDialogOpen(false)}
                title={editingId ? 'Chỉnh sửa khu vực' : 'Thêm khu vực mới'}
                width={520}
                footer={[
                    <Button key="cancel" onClick={() => setDialogOpen(false)}>Huỷ</Button>,
                    <Button key="ok" type="primary" onClick={handleSave} loading={saving}>Lưu</Button>,
                ]}
            >
                <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
                    <Form.Item name="name" label={<span>Tên khu vực <span style={{ color: 'red' }}>*</span></span>} rules={[{ required: true, message: 'Nhập tên khu vực' }]}>
                        <Input placeholder="VD: Khu vực Hà Nội" />
                    </Form.Item>
                    <Form.Item label="Chi nhánh trực thuộc">
                        <div style={{ border: '1px solid #d9d9d9', borderRadius: 6, maxHeight: 192, overflowY: 'auto' }}>
                            {branches.length === 0 && <p style={{ fontSize: 14, color: '#9ca3af', padding: '8px 12px' }}>Chưa có chi nhánh</p>}
                            {branches.map(b => (
                                <label key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', cursor: 'pointer', fontSize: 14 }}>
                                    <input
                                        type="checkbox"
                                        style={{ width: 16, height: 16, accentColor: '#E8890C' }}
                                        checked={selectedBranchIds.includes(b.id)}
                                        onChange={() => toggleBranch(b.id)}
                                    />
                                    {b.name}
                                </label>
                            ))}
                        </div>
                        {selectedBranchIds.length > 0 && (
                            <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>Đã chọn {selectedBranchIds.length} chi nhánh</p>
                        )}
                    </Form.Item>
                </Form>
            </Modal>
        </>
    );
}
