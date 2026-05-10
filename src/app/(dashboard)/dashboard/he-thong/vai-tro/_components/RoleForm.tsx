'use client';
import { useEffect, useState } from 'react';
import { Form, Input, Select, Button, Row, Col, Space, message, Popconfirm, Spin } from 'antd';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import PageHeader from '@/components/common/PageHeader';

interface Props {
    mode: 'create' | 'edit';
    roleId?: string;
}

export default function RoleForm({ mode, roleId }: Props) {
    const router = useRouter();
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (mode === 'edit' && roleId) {
            setLoading(true);
            api.get(`/roles/${roleId}`)
                .then(({ data }) => {
                    form.setFieldsValue({
                        code: data.code,
                        name: data.name,
                        description: data.description,
                        isActive: data.isActive,
                    });
                })
                .catch(() => message.error('Không thể tải thông tin vai trò'))
                .finally(() => setLoading(false));
        }
    }, [mode, roleId, form]);

    const onFinish = async (values: any) => {
        setSubmitting(true);
        try {
            if (mode === 'create') {
                await api.post('/roles', values);
                message.success('Tạo vai trò thành công');
            } else {
                const { code, ...rest } = values;
                await api.patch(`/roles/${roleId}`, rest);
                message.success('Cập nhật thành công');
            }
            router.push('/dashboard/he-thong/vai-tro' as any);
        } catch (err: any) {
            message.error(err?.response?.data?.message || 'Thao tác thất bại');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async () => {
        try {
            await api.delete(`/roles/${roleId}`);
            message.success('Đã xoá vai trò');
            router.push('/dashboard/he-thong/vai-tro' as any);
        } catch (err: any) {
            message.error(err?.response?.data?.message || 'Thao tác thất bại');
        }
    };

    return (
        <Spin spinning={loading}>
            <PageHeader title="Vai trò / Tạo mới · Chỉnh sửa" />

            <div style={{ background: '#fff', borderRadius: 8, padding: 24 }}>
                <Form form={form} layout="vertical" onFinish={onFinish}>
                    <Row gutter={24}>
                        <Col span={8}>
                            <Form.Item label="Mã vai trò" name="code"
                                rules={[{ required: true, message: 'Nhập mã vai trò' }]}>
                                <Input placeholder="VD: ADMIN, SALE..." disabled={mode === 'edit'} style={{ textTransform: 'uppercase' }} />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item label="Tên vai trò" name="name"
                                rules={[{ required: true, message: 'Nhập tên vai trò' }]}>
                                <Input placeholder="Nhập tên vai trò" />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item label="Trạng thái" name="isActive" initialValue={true}>
                                <Select options={[
                                    { value: true, label: 'Hoạt động' },
                                    { value: false, label: 'Không hoạt động' },
                                ]} />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={24}>
                        <Col span={16}>
                            <Form.Item label="Mô tả" name="description">
                                <Input.TextArea rows={3} placeholder="Mô tả quyền hạn của vai trò này..." />
                            </Form.Item>
                        </Col>
                    </Row>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                        <Space>
                            {mode === 'edit' && (
                                <Popconfirm title="Xoá vai trò này?" okText="Xác nhận" cancelText="Huỷ"
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
