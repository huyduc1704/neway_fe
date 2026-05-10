'use client';
import { useEffect, useState } from 'react';
import { Form, Input, Select, Button, Row, Col, Space, message, Popconfirm, Spin, DatePicker } from 'antd';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import PageHeader from '@/components/common/PageHeader';
import dayjs from 'dayjs';

interface Branch { id: string; name: string; }
interface Team { id: string; name: string; }

interface Props {
    mode: 'create' | 'edit';
    projectId?: string;
}

const STATUS_OPTIONS = [
    { value: 'DRAFT',     label: 'Nháp' },
    { value: 'ACTIVE',    label: 'Đang hoạt động' },
    { value: 'ON_HOLD',   label: 'Tạm dừng' },
    { value: 'CLOSED',    label: 'Đã đóng' },
    { value: 'CANCELLED', label: 'Đã huỷ' },
];

export default function ProjectForm({ mode, projectId }: Props) {
    const router = useRouter();
    const [form] = Form.useForm();
    const [branches, setBranches] = useState<Branch[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        api.get('/branches', { params: { limit: 100 } }).then(({ data }) => setBranches(data.data)).catch(() => {});
        api.get('/teams', { params: { limit: 100 } }).then(({ data }) => setTeams(data.data)).catch(() => {});
    }, []);

    useEffect(() => {
        if (mode === 'edit' && projectId) {
            setLoading(true);
            api.get(`/projects/${projectId}`)
                .then(({ data }) => {
                    form.setFieldsValue({
                        code: data.code,
                        ward: data.ward,
                        area: data.area,
                        managedBranchId: data.managedBranch?.id,
                        teamId: data.team?.id,
                        status: data.status,
                        rentalStartAt: data.rentalStartAt ? dayjs(data.rentalStartAt) : null,
                        rentalEndAt: data.rentalEndAt ? dayjs(data.rentalEndAt) : null,
                        expectedStayAt: data.expectedStayAt ? dayjs(data.expectedStayAt) : null,
                        note: data.note,
                    });
                })
                .catch(() => message.error('Không thể tải thông tin dự án'))
                .finally(() => setLoading(false));
        }
    }, [mode, projectId, form]);

    const onFinish = async (values: any) => {
        setSubmitting(true);
        try {
            const payload = {
                ...values,
                rentalStartAt: values.rentalStartAt?.toISOString() ?? undefined,
                rentalEndAt: values.rentalEndAt?.toISOString() ?? undefined,
                expectedStayAt: values.expectedStayAt?.toISOString() ?? undefined,
            };

            if (mode === 'create') {
                await api.post('/projects', payload);
                message.success('Tạo dự án thành công');
            } else {
                const { code, ...rest } = payload;
                await api.patch(`/projects/${projectId}`, rest);
                message.success('Cập nhật thành công');
            }
            router.push('/dashboard/he-thong/danh-muc-du-an' as any);
        } catch (err: any) {
            message.error(err?.response?.data?.message || 'Thao tác thất bại');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async () => {
        try {
            await api.delete(`/projects/${projectId}`);
            message.success('Đã xoá dự án');
            router.push('/dashboard/he-thong/danh-muc-du-an' as any);
        } catch (err: any) {
            message.error(err?.response?.data?.message || 'Thao tác thất bại');
        }
    };

    return (
        <Spin spinning={loading}>
            <PageHeader title="Danh mục dự án / Tạo mới · Chỉnh sửa" />

            <div style={{ background: '#fff', borderRadius: 8, padding: 24 }}>
                <Form form={form} layout="vertical" onFinish={onFinish}>
                    <Row gutter={24}>
                        <Col span={8}>
                            <Form.Item label="Mã dự án" name="code"
                                rules={[{ required: true, message: 'Nhập mã dự án' }]}>
                                <Input placeholder="VD: DA001" disabled={mode === 'edit'} />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item label="Khu vực" name="area"
                                rules={[{ required: true, message: 'Nhập khu vực' }]}>
                                <Input placeholder="VD: Quận 12" />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item label="Phường / Xã" name="ward"
                                rules={[{ required: true, message: 'Nhập phường/xã' }]}>
                                <Input placeholder="VD: Thạnh Lộc" />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={24}>
                        <Col span={8}>
                            <Form.Item label="Chi nhánh quản lý" name="managedBranchId"
                                rules={[{ required: true, message: 'Chọn chi nhánh' }]}>
                                <Select
                                    placeholder="Chọn chi nhánh"
                                    options={branches.map((b) => ({ value: b.id, label: b.name }))}
                                />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item label="Team phụ trách" name="teamId">
                                <Select
                                    allowClear placeholder="Chọn team (không bắt buộc)"
                                    options={teams.map((t) => ({ value: t.id, label: t.name }))}
                                />
                            </Form.Item>
                        </Col>
                        {mode === 'edit' && (
                            <Col span={8}>
                                <Form.Item label="Trạng thái" name="status">
                                    <Select options={STATUS_OPTIONS} />
                                </Form.Item>
                            </Col>
                        )}
                    </Row>

                    <Row gutter={24}>
                        <Col span={8}>
                            <Form.Item label="Ngày bắt đầu thuê" name="rentalStartAt">
                                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" placeholder="Chọn ngày" />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item label="Ngày kết thúc thuê" name="rentalEndAt">
                                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" placeholder="Chọn ngày" />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item label="Ngày khách dự kiến ở" name="expectedStayAt">
                                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" placeholder="Chọn ngày" />
                            </Form.Item>
                        </Col>
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
                                <Popconfirm title="Xoá dự án này?" okText="Xác nhận" cancelText="Huỷ"
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
