'use client';
import { useEffect, useState, useCallback } from 'react';
import { message, Modal, Form, Input, InputNumber, Switch } from 'antd';
import { Pencil, Trash2 } from 'lucide-react';
import { Button, Tag, Table, Card, Typography, Space, Popconfirm } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined } from '@ant-design/icons';
import api from '@/lib/api';
import { useUser } from '@/context/UserContext';

const { Title } = Typography;

interface LeadSource {
    id: string;
    code: string;
    label: string;
    sortOrder: number;
    isActive: boolean;
}

export default function NguonKhachPage() {
    const { can } = useUser();
    const [sources, setSources] = useState<LeadSource[]>([]);
    const [loading, setLoading] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<LeadSource | null>(null);
    const [form] = Form.useForm();

    const fetchSources = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/lead-sources');
            setSources(Array.isArray(data) ? data : data?.data ?? []);
        } catch {
            message.error('Không thể tải danh sách nguồn khách');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchSources(); }, [fetchSources]);

    const openCreate = () => {
        setEditing(null);
        form.resetFields();
        form.setFieldsValue({ isActive: true, sortOrder: (sources.length + 1) });
        setModalOpen(true);
    };

    const openEdit = (item: LeadSource) => {
        setEditing(item);
        form.setFieldsValue({ label: item.label, sortOrder: item.sortOrder, isActive: item.isActive });
        setModalOpen(true);
    };

    const handleSubmit = async () => {
        const values = await form.validateFields();
        try {
            if (editing) {
                await api.patch(`/lead-sources/${editing.id}`, { label: values.label, sortOrder: values.sortOrder, isActive: values.isActive });
                message.success('Đã cập nhật nguồn khách');
            } else {
                await api.post('/lead-sources', { code: values.code, label: values.label, sortOrder: values.sortOrder });
                message.success('Đã thêm nguồn khách');
            }
            setModalOpen(false);
            fetchSources();
        } catch (err: any) {
            message.error(err?.response?.data?.message || 'Thao tác thất bại');
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await api.delete(`/lead-sources/${id}`);
            message.success('Đã xoá nguồn khách');
            fetchSources();
        } catch (err: any) {
            message.error(err?.response?.data?.message || 'Thao tác thất bại');
        }
    };

    const handleSeed = async () => {
        try {
            const { data } = await api.post('/lead-sources/seed');
            message.success(data.message ?? 'Đã seed nguồn khách');
            fetchSources();
        } catch (err: any) {
            message.error(err?.response?.data?.message || 'Seed thất bại');
        }
    };

    const isAdmin = can('EMPLOYEE_CREATE');

    const columns: ColumnsType<LeadSource> = [
        { title: 'STT', key: 'stt', width: 60, align: 'center', render: (_, __, i) => i + 1 },
        { title: 'Mã', key: 'code', width: 140, render: (_, r) => <Tag color="orange">{r.code}</Tag> },
        { title: 'Tên hiển thị', key: 'label', render: (_, r) => <span style={{ fontWeight: 500 }}>{r.label}</span> },
        { title: 'Thứ tự', key: 'sortOrder', width: 100, align: 'center', dataIndex: 'sortOrder' },
        {
            title: 'Trạng thái', key: 'isActive', width: 130, align: 'center',
            render: (_, r) => <Tag color={r.isActive ? 'success' : 'default'}>{r.isActive ? 'Hoạt động' : 'Ẩn'}</Tag>,
        },
        ...(isAdmin ? [{
            title: 'Thao tác', key: 'actions', width: 100, align: 'center' as const,
            render: (_: any, r: LeadSource) => (
                <Space>
                    <button title="Chỉnh sửa" style={{ padding: 6, background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}
                        onClick={() => openEdit(r)}>
                        <Pencil size={16} />
                    </button>
                    <Popconfirm title="Xoá nguồn khách này?" onConfirm={() => handleDelete(r.id)} okText="Xoá" cancelText="Huỷ" okButtonProps={{ danger: true }}>
                        <button title="Xoá" style={{ padding: 6, background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}>
                            <Trash2 size={16} />
                        </button>
                    </Popconfirm>
                </Space>
            ),
        }] : []),
    ];

    return (
        <>
            <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Title level={4} style={{ margin: 0 }}>Hệ thống / Nguồn khách</Title>
                {isAdmin && (
                    <Space>
                        <Button onClick={handleSeed}>Seed dữ liệu mặc định</Button>
                        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
                            Thêm nguồn khách
                        </Button>
                    </Space>
                )}
            </div>

            <Card>
                <Table
                    columns={columns}
                    dataSource={sources}
                    rowKey="id"
                    loading={loading}
                    pagination={false}
                    size="small"
                />
            </Card>

            <Modal
                title={editing ? 'Chỉnh sửa nguồn khách' : 'Thêm nguồn khách'}
                open={modalOpen}
                onOk={handleSubmit}
                onCancel={() => setModalOpen(false)}
                okText={editing ? 'Lưu' : 'Thêm'}
                cancelText="Huỷ"
            >
                <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
                    {!editing && (
                        <Form.Item name="code" label="Mã (code)" rules={[{ required: true, message: 'Nhập mã nguồn khách' }]}>
                            <Input placeholder="VD: ZALO_OA" style={{ textTransform: 'uppercase' }} />
                        </Form.Item>
                    )}
                    <Form.Item name="label" label="Tên hiển thị" rules={[{ required: true, message: 'Nhập tên hiển thị' }]}>
                        <Input placeholder="VD: Zalo OA" />
                    </Form.Item>
                    <Form.Item name="sortOrder" label="Thứ tự hiển thị">
                        <InputNumber min={0} style={{ width: '100%' }} />
                    </Form.Item>
                    {editing && (
                        <Form.Item name="isActive" label="Trạng thái" valuePropName="checked">
                            <Switch checkedChildren="Hoạt động" unCheckedChildren="Ẩn" />
                        </Form.Item>
                    )}
                </Form>
            </Modal>
        </>
    );
}
