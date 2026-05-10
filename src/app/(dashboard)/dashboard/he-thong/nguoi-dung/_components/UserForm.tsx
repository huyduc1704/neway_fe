'use client';
import { useEffect, useState } from 'react';
import { Form, Input, Select, Button, Row, Col, Space, message, Popconfirm, Spin } from 'antd';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import PageHeader from '@/components/common/PageHeader';

interface Role { id: string; name: string; }

interface Props {
    mode: 'create' | 'edit';
    userId?: string;
}

export default function UserForm({ mode, userId }: Props) {
    const router = useRouter();
    const [form] = Form.useForm();
    const [roles, setRoles] = useState<Role[]>([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        api.get('/roles', { params: { limit: 100 } })
            .then(({ data }) => setRoles(data.data))
            .catch(() => {});
    }, []);

    useEffect(() => {
        if (mode === 'edit' && userId) {
            setLoading(true);
            api.get(`/users/${userId}`)
                .then(({ data }) => {
                    form.setFieldsValue({
                        fullName: data.fullName,
                        username: data.username,
                        phone: data.phone,
                        email: data.email,
                        roleId: data.roles?.[0]?.role?.id,
                        isActive: data.isActive,
                    });
                })
                .catch(() => message.error('Không thể tải thông tin người dùng'))
                .finally(() => setLoading(false));
        }
    }, [mode, userId, form]);

    const onFinish = async (values: any) => {
        setSubmitting(true);
        try {
            if (mode === 'create') {
                await api.post('/users', values);
                message.success('Tạo người dùng thành công');
            } else {
                const { password, roleId, ...rest } = values;
                await api.patch(`/users/${userId}`, rest);
                message.success('Cập nhật thành công');
            }
            router.push('/dashboard/he-thong/nguoi-dung' as any);
        } catch (err: any) {
            message.error(err?.response?.data?.message || 'Thao tác thất bại');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async () => {
        try {
            await api.patch(`/users/${userId}/deactivate`);
            message.success('Đã vô hiệu hoá tài khoản');
            router.push('/dashboard/he-thong/nguoi-dung' as any);
        } catch { message.error('Thao tác thất bại'); }
    };

    return (
        <Spin spinning={loading}>
            <PageHeader title={mode === 'create' ? 'Tạo mới / Chỉnh sửa' : 'Tạo mới / Chỉnh sửa'} />

            <div style={{ background: '#fff', borderRadius: 8, padding: 24 }}>
                <Form form={form} layout="vertical" onFinish={onFinish}>
                    <Row gutter={24}>
                        <Col span={8}>
                            <Form.Item label="Họ tên" name="fullName"
                                rules={[{ required: true, message: 'Nhập họ tên' }]}>
                                <Input placeholder="Nhập họ tên" />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item label="Tên đăng nhập" name="username"
                                rules={[{ required: true, message: 'Nhập tên đăng nhập' }]}>
                                <Input placeholder="Nhập tên đăng nhập" disabled={mode === 'edit'} />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item label="Trạng thái" name="isActive">
                                <Select placeholder="Chọn trạng thái" options={[
                                    { value: true, label: 'Hoạt động' },
                                    { value: false, label: 'Không hoạt động' },
                                ]} />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={24}>
                        <Col span={8}>
                            <Form.Item label="Mật khẩu" name="password"
                                rules={mode === 'create' ? [{ required: true, message: 'Nhập mật khẩu' }, { min: 8, message: 'Ít nhất 8 ký tự' }] : []}>
                                <Input.Password placeholder={mode === 'edit' ? 'Để trống nếu không đổi' : 'Nhập mật khẩu'} />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item label="Số điện thoại" name="phone"
                                rules={[{ required: true, message: 'Nhập số điện thoại' }]}>
                                <Input placeholder="Nhập số điện thoại" />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item label="Vai trò" name="roleId"
                                rules={mode === 'create' ? [{ required: true, message: 'Chọn vai trò' }] : []}>
                                <Select
                                    placeholder="Chọn vai trò"
                                    disabled={mode === 'edit'}
                                    options={roles.map((r) => ({ value: r.id, label: r.name }))}
                                />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={24}>
                        <Col span={8}>
                            <Form.Item label="Email" name="email">
                                <Input placeholder="Nhập email (không bắt buộc)" />
                            </Form.Item>
                        </Col>
                    </Row>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                        <Space>
                            {mode === 'edit' && (
                                <Popconfirm title="Vô hiệu hoá tài khoản này?" okText="Xác nhận" cancelText="Huỷ"
                                    onConfirm={handleDelete}>
                                    <Button danger>Xoá</Button>
                                </Popconfirm>
                            )}
                            <Button onClick={() => router.back()}>Huỷ</Button>
                            <Button type="primary" htmlType="submit" loading={submitting}>
                                Lưu thay đổi
                            </Button>
                        </Space>
                    </div>
                </Form>
            </div>
        </Spin>
    );
}
