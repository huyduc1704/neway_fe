'use client';
import { Card, Avatar, Typography, Space, Tag, Button, Modal, Form, Input, message } from 'antd';
import {
    UserOutlined, PhoneOutlined, MailOutlined,
    BankOutlined, TeamOutlined,
    IdcardOutlined, CalendarOutlined, EditOutlined,
} from '@ant-design/icons';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const EMPLOYEE_STATUS_LABEL: Record<string, string> = {
    ACTIVE: 'Đang làm việc',
    SUSPENDED: 'Tạm ngưng',
    RESIGNED: 'Đã nghỉ',
};
const EMPLOYEE_STATUS_COLOR: Record<string, string> = {
    ACTIVE: 'success',
    SUSPENDED: 'warning',
    RESIGNED: 'error',
};

interface MeData {
    user: {
        id: string; fullName: string; username: string;
        phone?: string; email?: string; avatarUrl?: string;
        status: string; createdAt: string;
    };
    roleObjects: { id: string; code: string; name: string }[];
    profile: {
        employeeCode?: string; employeeStatus?: string;
        gender?: string; dateOfBirth?: string; joinedAt?: string;
        score?: number | string | null;
        bankAccount?: string; hasContract?: boolean;
        branch?: { id: string; code: string; name: string } | null;
        team?: { id: string; code: string; name: string } | null;
    } | null;
}

export default function PersonalInfoWidget() {
    const [data, setData] = useState<MeData | null>(null);
    const [editOpen, setEditOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form] = Form.useForm();

    const fetchMe = () => {
        api.get('/auth/me')
            .then(res => setData(res.data))
            .catch(console.error);
    };

    useEffect(() => { fetchMe(); }, []);

    const handleEdit = () => {
        if (!data) return;
        form.setFieldsValue({
            fullName: data.user.fullName,
            phone: data.user.phone ?? '',
            email: data.user.email ?? '',
            currentPassword: '',
            newPassword: '',
        });
        setEditOpen(true);
    };

    const handleSave = async () => {
        try {
            const values = await form.validateFields();
            setSaving(true);
            const payload: any = {
                fullName: values.fullName,
                phone: values.phone || null,
                email: values.email || null,
            };
            if (values.newPassword) {
                payload.currentPassword = values.currentPassword;
                payload.newPassword = values.newPassword;
            }
            await api.patch('/auth/me', payload);
            message.success('Đã cập nhật thông tin cá nhân');
            setEditOpen(false);
            fetchMe();
        } catch (err: any) {
            if (err?.response) {
                const msg = err.response.data?.message;
                message.error(Array.isArray(msg) ? msg[0] : msg || 'Cập nhật thất bại');
            }
        } finally {
            setSaving(false);
        }
    };

    if (!data) return <Card loading style={{ borderRadius: 12 }} />;

    const { user, roleObjects, profile } = data;

    return (
        <>
            <Card
                style={{ borderRadius: 12 }}
                bodyStyle={{ padding: '20px 24px' }}
            >
                {/* Header: Avatar + Tên + Roles */}
                <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', marginBottom: 20 }}>
                    <Avatar
                        size={72}
                        src={user.avatarUrl}
                        icon={<UserOutlined />}
                        style={{ flexShrink: 0, background: '#E8890C' }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                            <Title level={4} style={{ margin: 0, color: '#1A2B5A' }}>
                                {user.fullName}
                            </Title>
                            <Button
                                type="text"
                                icon={<EditOutlined />}
                                size="small"
                                onClick={handleEdit}
                                style={{ color: '#E8890C' }}
                            >
                                Chỉnh sửa
                            </Button>
                        </div>
                        {profile?.employeeCode && (
                            <Text type="secondary" style={{ fontSize: 13, display: 'block', marginBottom: 6 }}>
                                <IdcardOutlined style={{ marginRight: 4 }} />
                                {profile.employeeCode}
                            </Text>
                        )}
                        <Space size={4} wrap>
                            {roleObjects.length > 0
                                ? roleObjects.map(r => (
                                    <Tag key={r.code} color="blue" style={{ margin: 0 }}>{r.name}</Tag>
                                ))
                                : <Tag color="default">Nhân viên</Tag>
                            }
                            {profile?.employeeStatus && (
                                <Tag color={EMPLOYEE_STATUS_COLOR[profile.employeeStatus] ?? 'default'}>
                                    {EMPLOYEE_STATUS_LABEL[profile.employeeStatus] ?? profile.employeeStatus}
                                </Tag>
                            )}
                        </Space>
                    </div>
                </div>

                {/* Team & Branch */}
                {(profile?.branch || profile?.team) && (
                    <div style={{
                        background: '#f8faff', borderRadius: 8, padding: '10px 14px',
                        marginBottom: 16, display: 'flex', gap: 16, flexWrap: 'wrap',
                    }}>
                        {profile?.branch && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                                <BankOutlined style={{ color: '#6b7280' }} />
                                <Text type="secondary">Chi nhánh:</Text>
                                <strong>{profile.branch.name}</strong>
                            </div>
                        )}
                        {profile?.team && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                                <TeamOutlined style={{ color: '#6b7280' }} />
                                <Text type="secondary">Đội/Nhóm:</Text>
                                <strong>{profile.team.name}</strong>
                            </div>
                        )}
                    </div>
                )}

                {/* Contact & Info */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
                    {user.phone && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <PhoneOutlined style={{ color: '#6b7280', width: 16 }} />
                            <Text>{user.phone}</Text>
                        </div>
                    )}
                    {user.email && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <MailOutlined style={{ color: '#6b7280', width: 16 }} />
                            <Text>{user.email}</Text>
                        </div>
                    )}
                    {!user.phone && !user.email && (
                        <Text type="secondary">Chưa cập nhật thông tin liên hệ</Text>
                    )}
                    {profile?.joinedAt && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <CalendarOutlined style={{ color: '#6b7280', width: 16 }} />
                            <Text type="secondary">Ngày vào làm:</Text>
                            <Text>{dayjs(profile.joinedAt).format('DD/MM/YYYY')}</Text>
                        </div>
                    )}
                    {profile?.score != null && Number(profile.score) > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Text type="secondary">Điểm hiệu suất:</Text>
                            <Tag color="gold">{Number(profile.score).toFixed(1)}</Tag>
                        </div>
                    )}
                    {profile?.hasContract && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Text type="secondary">Hợp đồng:</Text>
                            <Tag color="success">Đã ký HĐ</Tag>
                        </div>
                    )}
                </div>
            </Card>

            {/* Modal chỉnh sửa thông tin */}
            <Modal
                title={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <EditOutlined style={{ color: '#E8890C' }} />
                        <span>Chỉnh sửa thông tin cá nhân</span>
                    </div>
                }
                open={editOpen}
                onCancel={() => setEditOpen(false)}
                footer={null}
                width={460}
                destroyOnClose
            >
                <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
                    <Form.Item name="fullName" label="Họ và tên"
                        rules={[{ required: true, message: 'Vui lòng nhập họ tên' }]}>
                        <Input prefix={<UserOutlined style={{ color: '#d1d5db' }} />} />
                    </Form.Item>

                    <Form.Item name="phone" label="Số điện thoại">
                        <Input prefix={<PhoneOutlined style={{ color: '#d1d5db' }} />} placeholder="VD: 0901234567" />
                    </Form.Item>

                    <Form.Item name="email" label="Email">
                        <Input prefix={<MailOutlined style={{ color: '#d1d5db' }} />} placeholder="VD: example@gmail.com" />
                    </Form.Item>

                    <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 16, marginTop: 4 }}>
                        <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 12 }}>
                            Để đổi mật khẩu, điền thêm thông tin bên dưới (bỏ trống nếu không đổi):
                        </Text>
                        <Form.Item name="currentPassword" label="Mật khẩu hiện tại">
                            <Input.Password placeholder="Nhập mật khẩu hiện tại" />
                        </Form.Item>
                        <Form.Item name="newPassword" label="Mật khẩu mới"
                            rules={[{ min: 6, message: 'Mật khẩu phải ít nhất 6 ký tự' }]}>
                            <Input.Password placeholder="Nhập mật khẩu mới" />
                        </Form.Item>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, borderTop: '1px solid #f0f0f0', paddingTop: 16 }}>
                        <Button onClick={() => setEditOpen(false)}>Huỷ</Button>
                        <Button type="primary" loading={saving} onClick={handleSave}
                            style={{ background: '#E8890C', borderColor: '#E8890C' }}>
                            Lưu thay đổi
                        </Button>
                    </div>
                </Form>
            </Modal>
        </>
    );
}
