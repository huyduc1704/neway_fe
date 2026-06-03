'use client';
import { useEffect, useState } from 'react';
import { message } from 'antd';
import { useRouter } from 'next/navigation';
import { Button, Input, Select, Form, Card, Typography } from 'antd';
import api from '@/lib/api';

const { Title } = Typography;

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
        api.get('/roles', { params: { limit: 100 } }).then(({ data }) => setRoles(data.data)).catch(() => {});
    }, []);

    useEffect(() => {
        if (mode === 'edit' && userId) {
            setLoading(true);
            api.get(`/users/${userId}`)
                .then(({ data }) => {
                    form.setFieldsValue({
                        fullName: data.fullName || '',
                        username: data.username || '',
                        phone: data.phone || '',
                        email: data.email || '',
                        roleId: data.roles?.[0]?.role?.id || '',
                        isActive: String(data.isActive ?? true),
                    });
                })
                .catch(() => message.error('Không thể tải thông tin người dùng'))
                .finally(() => setLoading(false));
        }
    }, [mode, userId]);

    const onSubmit = async () => {
        try {
            const values = await form.validateFields();
            setSubmitting(true);
            if (mode === 'create') {
                await api.post('/users', { fullName: values.fullName, username: values.username, password: values.password, phone: values.phone, email: values.email || undefined, roleId: values.roleId });
                message.success('Tạo người dùng thành công');
            } else {
                await api.patch(`/users/${userId}`, { fullName: values.fullName, phone: values.phone, email: values.email || undefined, isActive: values.isActive === 'true' });
                message.success('Cập nhật thành công');
            }
            router.push('/dashboard/he-thong/nguoi-dung' as any);
        } catch (err: any) {
            if (err?.response) message.error(err?.response?.data?.message || 'Thao tác thất bại');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm('Vô hiệu hoá tài khoản này?')) return;
        try {
            await api.patch(`/users/${userId}/deactivate`);
            message.success('Đã vô hiệu hoá tài khoản');
            router.push('/dashboard/he-thong/nguoi-dung' as any);
        } catch {
            message.error('Thao tác thất bại');
        }
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0' }}>
                <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid #E8890C', borderTop: '2px solid transparent', animation: 'spin 1s linear infinite' }} />
            </div>
        );
    }

    return (
        <>
            <div style={{ marginBottom: 24 }}>
                <Title level={4} style={{ margin: 0 }}>Tạo mới / Chỉnh sửa</Title>
            </div>
            <Card>
                <Form form={form} layout="vertical" initialValues={{ isActive: 'true' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 24 }}>
                        <Form.Item name="fullName" label={<span>Họ tên <span style={{ color: 'red' }}>*</span></span>} rules={[{ required: true, message: 'Nhập họ tên' }]}>
                            <Input placeholder="Nhập họ tên" />
                        </Form.Item>
                        <Form.Item name="username" label={<span>Tên đăng nhập <span style={{ color: 'red' }}>*</span></span>} rules={[{ required: true, message: 'Nhập tên đăng nhập' }]}>
                            <Input placeholder="Nhập tên đăng nhập" disabled={mode === 'edit'} />
                        </Form.Item>
                        <Form.Item name="isActive" label="Trạng thái">
                            <Select options={[{ value: 'true', label: 'Hoạt động' }, { value: 'false', label: 'Không hoạt động' }]} />
                        </Form.Item>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 24, marginTop: 20 }}>
                        <Form.Item
                            name="password"
                            label={<span>Mật khẩu {mode === 'create' && <span style={{ color: 'red' }}>*</span>}</span>}
                            rules={mode === 'create' ? [{ required: true, message: 'Nhập mật khẩu' }, { min: 8, message: 'Ít nhất 8 ký tự' }] : []}
                        >
                            <Input.Password placeholder={mode === 'edit' ? 'Để trống nếu không đổi' : 'Nhập mật khẩu'} />
                        </Form.Item>
                        <Form.Item name="phone" label={<span>Số điện thoại <span style={{ color: 'red' }}>*</span></span>} rules={[{ required: true, message: 'Nhập số điện thoại' }]}>
                            <Input placeholder="Nhập số điện thoại" />
                        </Form.Item>
                        <Form.Item
                            name="roleId"
                            label={<span>Vai trò {mode === 'create' && <span style={{ color: 'red' }}>*</span>}</span>}
                            rules={mode === 'create' ? [{ required: true, message: 'Chọn vai trò' }] : []}
                        >
                            <Select placeholder="Chọn vai trò" disabled={mode === 'edit'}
                                options={roles.map((r) => ({ value: r.id, label: r.name }))} />
                        </Form.Item>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 24, marginTop: 20 }}>
                        <Form.Item name="email" label="Email">
                            <Input type="email" placeholder="Nhập email (không bắt buộc)" />
                        </Form.Item>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 24 }}>
                        {mode === 'edit' && (
                            <Button danger onClick={handleDelete}>Xoá</Button>
                        )}
                        <Button onClick={() => router.back()}>Huỷ</Button>
                        <Button type="primary" onClick={onSubmit} loading={submitting}>
                            Lưu thay đổi
                        </Button>
                    </div>
                </Form>
            </Card>
        </>
    );
}
