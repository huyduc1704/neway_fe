'use client';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, Form, Input, Select, Button, Typography, Space, Descriptions, message, Spin } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import api from '@/lib/api';

const { Title } = Typography;

const STATUS_OPTIONS = [
    { value: 'DRAFT',     label: 'Nháp' },
    { value: 'ACTIVE',    label: 'Đang hoạt động' },
    { value: 'ON_HOLD',   label: 'Tạm dừng' },
    { value: 'CLOSED',    label: 'Đã đóng' },
    { value: 'CANCELLED', label: 'Đã hủy' },
];

const formatCurrency = (v: number) =>
    new Intl.NumberFormat('vi-VN').format(v) + 'đ';

export default function RevenueDetailPage() {
    const router = useRouter();
    const { id } = useParams<{ id: string }>();
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [project, setProject] = useState<any>(null);

    useEffect(() => {
        api.get(`/projects/${id}`)
            .then(({ data }) => {
                setProject(data);
                form.setFieldsValue({
                    estimatedCommissionPercent: data.estimatedCommissionPercent != null
                        ? Number(data.estimatedCommissionPercent) : undefined,
                    customerSupport: data.customerSupport != null
                        ? Number(data.customerSupport) : undefined,
                    status: data.status ?? undefined,
                });
            })
            .catch(() => message.error('Không thể tải thông tin dự án'))
            .finally(() => setLoading(false));
    }, [id]);

    const onFinish = async (values: any) => {
        setSaving(true);
        try {
            await api.patch(`/projects/${id}`, {
                estimatedCommissionPercent: values.estimatedCommissionPercent != null
                    ? Number(values.estimatedCommissionPercent) : undefined,
                customerSupport: values.customerSupport != null
                    ? Number(values.customerSupport) : undefined,
                status: values.status,
            });
            message.success('Cập nhật doanh thu thành công');
            router.push('/dashboard/quan-ly-du-an/doanh-thu');
        } catch {
            message.error('Lưu thất bại, vui lòng thử lại');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Spin size="large" /></div>;
    }

    return (
        <div>
            <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
                <Button icon={<ArrowLeftOutlined />} onClick={() => router.back()} />
                <Title level={4} style={{ margin: 0 }}>Quản lý doanh thu / Chi tiết</Title>
            </div>

            <Space direction="vertical" size={16} style={{ width: '100%' }}>
                {/* Thông tin chỉ đọc */}
                <Card title="Thông tin dự án">
                    <Descriptions column={2} size="small">
                        <Descriptions.Item label="Mã dự án">{project?.code ?? '—'}</Descriptions.Item>
                        <Descriptions.Item label="Địa chỉ">
                            {[project?.ward, project?.province].filter(Boolean).join(', ') || '—'}
                        </Descriptions.Item>
                        <Descriptions.Item label="Chi nhánh">{project?.managedBranch?.name ?? '—'}</Descriptions.Item>
                        <Descriptions.Item label="Team">{project?.team?.name ?? '—'}</Descriptions.Item>
                        <Descriptions.Item label="Số phòng">{project?._count?.rooms ?? 0}</Descriptions.Item>
                        <Descriptions.Item label="Doanh thu ước tính">
                            {project?.estimatedRevenue != null
                                ? <strong style={{ color: '#E8890C' }}>{formatCurrency(Number(project.estimatedRevenue))}</strong>
                                : '—'}
                        </Descriptions.Item>
                    </Descriptions>
                </Card>

                {/* Form chỉnh sửa */}
                <Card title="Cập nhật doanh thu">
                    <Form
                        form={form}
                        layout="vertical"
                        onFinish={onFinish}
                        style={{ maxWidth: 600 }}
                    >
                        <Form.Item
                            label="% Hoa hồng ước tính"
                            name="estimatedCommissionPercent"
                            rules={[{ type: 'number', min: 0, max: 100, message: 'Giá trị từ 0–100' }]}
                        >
                            <Input type="number" min={0} max={100} suffix="%" placeholder="Nhập % hoa hồng" />
                        </Form.Item>

                        <Form.Item
                            label="Hỗ trợ khách hàng (đ)"
                            name="customerSupport"
                        >
                            <Input type="number" min={0} placeholder="Nhập số tiền hỗ trợ" />
                        </Form.Item>

                        <Form.Item label="Trạng thái" name="status">
                            <Select options={STATUS_OPTIONS} placeholder="Chọn trạng thái" />
                        </Form.Item>

                        <Form.Item>
                            <Space>
                                <Button onClick={() => router.back()}>Hủy</Button>
                                <Button type="primary" htmlType="submit" loading={saving}
                                    style={{ background: '#E8890C', borderColor: '#E8890C' }}>
                                    Lưu thay đổi
                                </Button>
                            </Space>
                        </Form.Item>
                    </Form>
                </Card>
            </Space>
        </div>
    );
}
