'use client';
import { Card, Typography, Collapse, Button, Modal, Form, Input, Switch, message, Popconfirm, Checkbox, Tooltip, Badge } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, CheckCircleOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { useUser } from '@/context/UserContext';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { TextArea } = Input;

interface AckEntry {
    user: { id: string; fullName: string; employeeProfile?: { employeeCode?: string } | null };
    confirmedAt: string;
}

export default function CompanyPoliciesWidget() {
    const { isAdmin } = useUser();

    const [policies, setPolicies] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [form] = Form.useForm();
    const [editingId, setEditingId] = useState<string | null>(null);

    // acknowledgment state
    const [acknowledged, setAcknowledged] = useState(false);
    const [confirmedAt, setConfirmedAt] = useState<string | null>(null);
    const [ackLoading, setAckLoading] = useState(false);

    // admin: who has acknowledged
    const [ackModal, setAckModal] = useState(false);
    const [ackList, setAckList] = useState<AckEntry[]>([]);
    const [ackTotal, setAckTotal] = useState(0);

    const fetchPolicies = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/company-policies');
            setPolicies(data);
        } catch {
            // silent
        } finally {
            setLoading(false);
        }
    };

    const fetchMyAck = async () => {
        try {
            const { data } = await api.get('/company-policies/my-acknowledgment');
            setAcknowledged(data.acknowledged);
            setConfirmedAt(data.confirmedAt);
        } catch {
            // silent
        }
    };

    useEffect(() => {
        fetchPolicies();
        fetchMyAck();
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
        } catch {
            // silent
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await api.delete(`/company-policies/${id}`);
            message.success('Đã xóa chính sách');
            fetchPolicies();
        } catch {
            message.error('Lỗi khi xóa chính sách');
        }
    };

    const handleAcknowledge = async () => {
        if (acknowledged) return;
        setAckLoading(true);
        try {
            const { data } = await api.post('/company-policies/acknowledge');
            setAcknowledged(data.acknowledged);
            setConfirmedAt(data.confirmedAt);
            message.success('Đã xác nhận đọc và đồng ý chính sách');
        } catch {
            message.error('Không thể xác nhận, vui lòng thử lại');
        } finally {
            setAckLoading(false);
        }
    };

    const handleShowAckList = async () => {
        try {
            const { data } = await api.get('/company-policies/acknowledgments');
            setAckList(data.acknowledged ?? []);
            setAckTotal(data.total ?? 0);
            setAckModal(true);
        } catch {
            message.error('Không thể tải danh sách xác nhận');
        }
    };

    return (
        <>
            <Card
                title="Quy định & Chính sách"
                extra={
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        {isAdmin && (
                            <Tooltip title="Xem danh sách nhân sự đã xác nhận">
                                <Button size="small" icon={<CheckCircleOutlined />} onClick={handleShowAckList}>
                                    Đã xác nhận
                                </Button>
                            </Tooltip>
                        )}
                        {isAdmin && (
                            <Button type="primary" icon={<PlusOutlined />} size="small"
                                style={{ background: '#E8890C', borderColor: '#E8890C' }}
                                onClick={() => handleOpenModal()}>
                                Thêm mới
                            </Button>
                        )}
                    </div>
                }
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

                {/* Acknowledgment checkbox */}
                <div style={{ marginTop: 16, padding: '12px 16px', background: acknowledged ? '#f0fdf4' : '#fffbf5', borderRadius: 8, border: `1px solid ${acknowledged ? '#86efac' : '#fed7aa'}` }}>
                    <Checkbox
                        checked={acknowledged}
                        disabled={acknowledged || ackLoading}
                        onChange={handleAcknowledge}
                        style={{ fontSize: 13 }}
                    >
                        <span style={{ fontWeight: 500, color: acknowledged ? '#16a34a' : '#374151' }}>
                            Đã đọc và đồng ý với toàn bộ chính sách tại Neway Home
                        </span>
                    </Checkbox>
                    {acknowledged && confirmedAt && (
                        <div style={{ marginTop: 4, marginLeft: 24, fontSize: 12, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <CheckCircleOutlined style={{ color: '#16a34a' }} />
                            Đã xác nhận lúc {dayjs(confirmedAt).format('HH:mm DD/MM/YYYY')}
                        </div>
                    )}
                </div>
            </Card>

            {/* Modal tạo/sửa chính sách */}
            <Modal
                title={editingId ? 'Sửa Quy Định' : 'Thêm Quy Định Mới'}
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

            {/* Modal danh sách xác nhận (admin) */}
            <Modal
                title={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <CheckCircleOutlined style={{ color: '#16a34a' }} />
                        <span>Xác nhận chính sách</span>
                        <Badge count={`${ackList.length}/${ackTotal}`} style={{ background: '#E8890C' }} />
                    </div>
                }
                open={ackModal}
                onCancel={() => setAckModal(false)}
                footer={<Button onClick={() => setAckModal(false)}>Đóng</Button>}
                width={520}
            >
                <div style={{ marginBottom: 12, fontSize: 13, color: '#6b7280' }}>
                    <CheckCircleOutlined style={{ color: '#16a34a', marginRight: 4 }} />
                    {ackList.length} / {ackTotal} nhân sự đã xác nhận
                </div>
                <div style={{ maxHeight: 400, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {ackList.map(a => (
                        <div key={a.user.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#f0fdf4', borderRadius: 6 }}>
                            <div>
                                <div style={{ fontSize: 13, fontWeight: 500 }}>{a.user.fullName}</div>
                                {a.user.employeeProfile?.employeeCode && (
                                    <div style={{ fontSize: 11, color: '#9ca3af' }}>{a.user.employeeProfile.employeeCode}</div>
                                )}
                            </div>
                            <div style={{ fontSize: 11, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 4 }}>
                                <ClockCircleOutlined />
                                {dayjs(a.confirmedAt).format('HH:mm DD/MM/YYYY')}
                            </div>
                        </div>
                    ))}
                    {ackList.length === 0 && (
                        <Text type="secondary" style={{ textAlign: 'center', display: 'block', padding: '24px 0' }}>
                            Chưa có ai xác nhận
                        </Text>
                    )}
                </div>
            </Modal>
        </>
    );
}
