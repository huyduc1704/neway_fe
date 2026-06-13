'use client';
import { Card, Typography, Collapse, Button, Modal, Form, Input, Switch, message, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useEffect, useState } from 'react';
import api from '@/lib/api';

const { Title, Text } = Typography;
const { TextArea } = Input;

export default function CompanyPoliciesWidget() {
    const [policies, setPolicies] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [form] = Form.useForm();
    const [editingId, setEditingId] = useState<string | null>(null);

    // Assume user is admin for demo purposes if they can see edit buttons.
    // In a real app, check role from context.
    const isAdmin = true; 

    const fetchPolicies = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/company-policies');
            setPolicies(data);
        } catch (error) {
            console.error('Failed to fetch policies', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPolicies();
    }, []);

    const handleOpenModal = (policy?: any) => {
        if (policy) {
            setEditingId(policy.id);
            form.setFieldsValue(policy);
        } else {
            setEditingId(null);
            form.resetFields();
            form.setFieldsValue({ isActive: true });
        }
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        try {
            const values = await form.validateFields();
            if (editingId) {
                await api.patch(`/company-policies/${editingId}`, values);
                message.success('Đã cập nhật chính sách');
            } else {
                await api.post('/company-policies', values);
                message.success('Đã thêm chính sách');
            }
            setIsModalOpen(false);
            fetchPolicies();
        } catch (error) {
            console.error(error);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await api.delete(`/company-policies/${id}`);
            message.success('Đã xóa chính sách');
            fetchPolicies();
        } catch (error) {
            console.error(error);
            message.error('Lỗi khi xóa chính sách');
        }
    };

    return (
        <Card
            title="Quy định & Chính sách"
            extra={isAdmin && <Button type="primary" icon={<PlusOutlined />} size="small" onClick={() => handleOpenModal()}>Thêm mới</Button>}
            style={{ marginTop: 24, flex: 1, display: 'flex', flexDirection: 'column' }}
            styles={{ body: { flex: 1, overflowY: 'auto' } }}
        >
            <Collapse
                accordion
                ghost
                items={policies.map(policy => ({
                    key: policy.id,
                    label: <Text strong style={{ color: policy.isActive ? 'inherit' : '#999', textDecoration: policy.isActive ? 'none' : 'line-through' }}>{policy.title}</Text>,
                    extra: isAdmin ? (
                        <div onClick={e => e.stopPropagation()}>
                            <Button type="text" icon={<EditOutlined />} onClick={() => handleOpenModal(policy)} size="small" />
                            <Popconfirm title="Xóa quy định này?" onConfirm={() => handleDelete(policy.id)}>
                                <Button type="text" danger icon={<DeleteOutlined />} size="small" />
                            </Popconfirm>
                        </div>
                    ) : null,
                    children: <div style={{ whiteSpace: 'pre-wrap' }}>{policy.content}</div>
                }))}
            />
            {!loading && policies.length === 0 && <Text type="secondary">Chưa có quy định nào.</Text>}

            <Modal
                title={editingId ? "Sửa Quy Định" : "Thêm Quy Định Mới"}
                open={isModalOpen}
                onOk={handleSave}
                onCancel={() => setIsModalOpen(false)}
            >
                <Form form={form} layout="vertical">
                    <Form.Item name="title" label="Tiêu đề" rules={[{ required: true, message: 'Vui lòng nhập tiêu đề' }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item name="content" label="Nội dung" rules={[{ required: true, message: 'Vui lòng nhập nội dung' }]}>
                        <TextArea rows={6} />
                    </Form.Item>
                    <Form.Item name="isActive" label="Trạng thái hiển thị" valuePropName="checked">
                        <Switch checkedChildren="Bật" unCheckedChildren="Tắt" />
                    </Form.Item>
                </Form>
            </Modal>
        </Card>
    );
}
