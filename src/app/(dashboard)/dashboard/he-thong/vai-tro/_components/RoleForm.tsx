'use client';
import { useEffect, useState } from 'react';
import { message } from 'antd';
import { useRouter } from 'next/navigation';
import { Button, Input, Select, Form, Card, Typography } from 'antd';
import api from '@/lib/api';

const { Title } = Typography;

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
                        code: data.code || '',
                        name: data.name || '',
                        description: data.description || '',
                        isActive: String(data.isActive ?? true),
                    });
                })
                .catch(() => message.error('Không thể tải thông tin vai trò'))
                .finally(() => setLoading(false));
        }
    }, [mode, roleId]);

    const onSubmit = async () => {
        try {
            const values = await form.validateFields();
            setSubmitting(true);
            if (mode === 'create') {
                await api.post('/roles', { code: values.code.toUpperCase(), name: values.name, description: values.description, isActive: values.isActive === 'true' });
                message.success('Tạo vai trò thành công');
            } else {
                await api.patch(`/roles/${roleId}`, { name: values.name, description: values.description, isActive: values.isActive === 'true' });
                message.success('Cập nhật thành công');
            }
            router.push('/dashboard/he-thong/vai-tro' as any);
        } catch (err: any) {
            if (err?.response) message.error(err?.response?.data?.message || 'Thao tác thất bại');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm('Xoá vai trò này?')) return;
        try {
            await api.delete(`/roles/${roleId}`);
            message.success('Đã xoá vai trò');
            router.push('/dashboard/he-thong/vai-tro' as any);
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
                <Title level={4} style={{ margin: 0 }}>Vai trò / Tạo mới · Chỉnh sửa</Title>
            </div>
            <Card>
                <Form form={form} layout="vertical" initialValues={{ isActive: 'true' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 24 }}>
                        <Form.Item name="code" label={<span>Mã vai trò <span style={{ color: 'red' }}>*</span></span>} rules={[{ required: true, message: 'Nhập mã vai trò' }]}>
                            <Input
                                placeholder="VD: ADMIN, SALE..."
                                disabled={mode === 'edit'}
                                style={{ textTransform: 'uppercase' }}
                                onChange={(e) => form.setFieldValue('code', e.target.value.toUpperCase())}
                            />
                        </Form.Item>
                        <Form.Item name="name" label={<span>Tên vai trò <span style={{ color: 'red' }}>*</span></span>} rules={[{ required: true, message: 'Nhập tên vai trò' }]}>
                            <Input placeholder="Nhập tên vai trò" />
                        </Form.Item>
                        <Form.Item name="isActive" label="Trạng thái">
                            <Select options={[{ value: 'true', label: 'Hoạt động' }, { value: 'false', label: 'Không hoạt động' }]} />
                        </Form.Item>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginTop: 20 }}>
                        <Form.Item name="description" label="Mô tả">
                            <Input.TextArea placeholder="Mô tả quyền hạn của vai trò này..." rows={4} />
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
