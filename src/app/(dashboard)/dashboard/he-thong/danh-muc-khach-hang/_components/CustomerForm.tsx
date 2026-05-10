'use client';
import { useEffect, useState } from 'react';
import { Form, Input, Select, Button, Row, Col, Space, message, Popconfirm, Spin } from 'antd';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import PageHeader from '@/components/common/PageHeader';

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
                        code: data.code,
                        fullName: data.fullName,
                        phone: data.phone,
                        email: data.email,
                        address: data.address,
                        note: data.note,
                        isActive: data.isActive,
                    });
                })
                .catch(() => message.error('Không thể tải thông tin khách hàng'))
                .finally(() => setLoading(false));
        }
    }, [mode, customerId, form]);

    const onFinish = async (values: any) => {
        setSubmitting(true);
        try {
            if (mode === 'create') {
                await api.post('/customers', values);
                message.success('Tạo khách hàng thành công');
            } else {
                const { code, ...rest } = values;
                await api.patch(`/customers/${customerId}`, rest);
                message.success('Cập nhật thành công');
            }
            router.push('/dashboard/he-thong/danh-muc-khach-hang' as any);
        } catch (err: any) {
            message.error(err?.response?.data?.message || 'Thao tác thất bại');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async () => {
        try {
            await api.delete(`/customers/${customerId}`);
            message.success('Đã xoá khách hàng');
            router.push('/dashboard/he-thong/danh-muc-khach-hang' as any);
        } catch (err: any) {
            message.error(err?.response?.data?.message || 'Thao tác thất bại');
        }
    };

    return (
        <Spin spinning={loading}>
            <PageHeader title="Danh mục khách hàng / Tạo mới · Chỉnh sửa" />

            <div style={{ background: '#fff', borderRadius: 8, padding: 24 }}>
                <Form form={form} layout="vertical" onFinish={onFinish}>
                    <Row gutter={24}>
                        <Col span={8}>
                            <Form.Item label="Mã khách hàng" name="code"
                                rules={[{ required: true, message: 'Nhập mã khách hàng' }]}>
                                <Input placeholder="VD: KH001" disabled={mode === 'edit'} />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item label="Họ tên" name="fullName"
                                rules={[{ required: true, message: 'Nhập họ tên' }]}>
                                <Input placeholder="Nhập họ tên khách hàng" />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item label="Số điện thoại" name="phone"
                                rules={[{ required: true, message: 'Nhập số điện thoại' }]}>
                                <Input placeholder="Nhập số điện thoại" />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={24}>
                        <Col span={8}>
                            <Form.Item label="Email" name="email">
                                <Input placeholder="Nhập email (không bắt buộc)" />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item label="Địa chỉ" name="address">
                                <Input placeholder="Nhập địa chỉ (không bắt buộc)" />
                            </Form.Item>
                        </Col>
                        {mode === 'edit' && (
                            <Col span={8}>
                                <Form.Item label="Trạng thái" name="isActive">
                                    <Select options={[
                                        { value: true, label: 'Hoạt động' },
                                        { value: false, label: 'Không hoạt động' },
                                    ]} />
                                </Form.Item>
                            </Col>
                        )}
                    </Row>

                    <Row gutter={24}>
                        <Col span={16}>
                            <Form.Item label="Ghi chú" name="note">
                                <Input.TextArea rows={3} placeholder="Ghi chú thêm..." />
                            </Form.Item>
                        </Col>
                    </Row>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                        <Space>
                            {mode === 'edit' && (
                                <Popconfirm title="Xoá khách hàng này?" okText="Xác nhận" cancelText="Huỷ"
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
