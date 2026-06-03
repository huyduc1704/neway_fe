'use client';
import { useEffect, useState } from 'react';
import { message } from 'antd';
import { useRouter } from 'next/navigation';
import { Button, Input, Select, Form, Card, Typography } from 'antd';
import api from '@/lib/api';

const { Title } = Typography;

interface Props {
    mode: 'create' | 'edit';
    customerId?: string;
}

export default function CustomerForm({ mode, customerId }: Props) {
    const router = useRouter();
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (mode === 'edit' && customerId) {
            setLoading(true);
            api.get(`/customers/${customerId}`)
                .then(({ data }) => {
                    form.setFieldsValue({
                        code: data.code || '',
                        fullName: data.fullName || '',
                        phone: data.phone || '',
                        email: data.email || '',
                        address: data.address || '',
                        note: data.note || '',
                        isActive: String(data.isActive ?? true),
                    });
                })
                .catch(() => message.error('Không thể tải thông tin khách hàng'))
                .finally(() => setLoading(false));
        }
    }, [mode, customerId]);

    const onSubmit = async () => {
        try {
            const values = await form.validateFields();
            setSubmitting(true);
            if (mode === 'create') {
                await api.post('/customers', { code: values.code, fullName: values.fullName, phone: values.phone, email: values.email || undefined, address: values.address || undefined, note: values.note || undefined });
                message.success('Tạo khách hàng thành công');
            } else {
                await api.patch(`/customers/${customerId}`, { fullName: values.fullName, phone: values.phone, email: values.email || undefined, address: values.address || undefined, note: values.note || undefined, isActive: values.isActive === 'true' });
                message.success('Cập nhật thành công');
            }
            router.push('/dashboard/he-thong/danh-muc-khach-hang' as any);
        } catch (err: any) {
            if (err?.response) message.error(err?.response?.data?.message || 'Thao tác thất bại');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm('Xoá khách hàng này?')) return;
        try {
            await api.delete(`/customers/${customerId}`);
            message.success('Đã xoá khách hàng');
            router.push('/dashboard/he-thong/danh-muc-khach-hang' as any);
        } catch (err: any) {
            message.error(err?.response?.data?.message || 'Thao tác thất bại');
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
                <Title level={4} style={{ margin: 0 }}>Danh mục khách hàng / Tạo mới · Chỉnh sửa</Title>
            </div>
            <Card>
                <Form form={form} layout="vertical" initialValues={{ isActive: 'true' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 24 }}>
                        <Form.Item name="code" label={<span>Mã khách hàng <span style={{ color: 'red' }}>*</span></span>} rules={[{ required: true, message: 'Nhập mã khách hàng' }]}>
                            <Input placeholder="VD: KH001" disabled={mode === 'edit'} />
                        </Form.Item>
                        <Form.Item name="fullName" label={<span>Họ tên <span style={{ color: 'red' }}>*</span></span>} rules={[{ required: true, message: 'Nhập họ tên' }]}>
                            <Input placeholder="Nhập họ tên khách hàng" />
                        </Form.Item>
                        <Form.Item name="phone" label={<span>Số điện thoại <span style={{ color: 'red' }}>*</span></span>} rules={[{ required: true, message: 'Nhập số điện thoại' }]}>
                            <Input placeholder="Nhập số điện thoại" />
                        </Form.Item>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 24, marginTop: 20 }}>
                        <Form.Item name="email" label="Email">
                            <Input type="email" placeholder="Nhập email (không bắt buộc)" />
                        </Form.Item>
                        <Form.Item name="address" label="Địa chỉ">
                            <Input placeholder="Nhập địa chỉ (không bắt buộc)" />
                        </Form.Item>
                        {mode === 'edit' && (
                            <Form.Item name="isActive" label="Trạng thái">
                                <Select options={[{ value: 'true', label: 'Hoạt động' }, { value: 'false', label: 'Không hoạt động' }]} />
                            </Form.Item>
                        )}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginTop: 20 }}>
                        <Form.Item name="note" label="Ghi chú">
                            <Input.TextArea placeholder="Ghi chú thêm..." rows={4} />
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
