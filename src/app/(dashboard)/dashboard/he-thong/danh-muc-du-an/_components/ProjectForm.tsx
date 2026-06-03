'use client';
import { useEffect, useState } from 'react';
import { message } from 'antd';
import { useRouter } from 'next/navigation';
import { Button, Input, Select, Form, Card, Typography } from 'antd';
import api from '@/lib/api';
import dayjs from 'dayjs';

const { Title } = Typography;

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
                        code: data.code || '',
                        ward: data.ward || '',
                        area: data.area || '',
                        managedBranchId: data.managedBranch?.id || '',
                        teamId: data.team?.id || '',
                        status: data.status || 'DRAFT',
                        rentalStartAt: data.rentalStartAt ? dayjs(data.rentalStartAt).format('YYYY-MM-DD') : '',
                        rentalEndAt: data.rentalEndAt ? dayjs(data.rentalEndAt).format('YYYY-MM-DD') : '',
                        expectedStayAt: data.expectedStayAt ? dayjs(data.expectedStayAt).format('YYYY-MM-DD') : '',
                        note: data.note || '',
                    });
                })
                .catch(() => message.error('Không thể tải thông tin dự án'))
                .finally(() => setLoading(false));
        }
    }, [mode, projectId]);

    const onSubmit = async () => {
        try {
            const values = await form.validateFields();
            setSubmitting(true);
            const payload: any = {
                code: values.code,
                area: values.area,
                ward: values.ward,
                managedBranchId: values.managedBranchId,
                teamId: values.teamId || undefined,
                status: values.status,
                rentalStartAt: values.rentalStartAt ? new Date(values.rentalStartAt).toISOString() : undefined,
                rentalEndAt: values.rentalEndAt ? new Date(values.rentalEndAt).toISOString() : undefined,
                expectedStayAt: values.expectedStayAt ? new Date(values.expectedStayAt).toISOString() : undefined,
                note: values.note || undefined,
            };

            if (mode === 'create') {
                await api.post('/projects', payload);
                message.success('Tạo dự án thành công');
            } else {
                const { code: _c, ...rest } = payload;
                await api.patch(`/projects/${projectId}`, rest);
                message.success('Cập nhật thành công');
            }
            router.push('/dashboard/he-thong/danh-muc-du-an' as any);
        } catch (err: any) {
            if (err?.response) message.error(err?.response?.data?.message || 'Thao tác thất bại');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm('Xoá dự án này?')) return;
        try {
            await api.delete(`/projects/${projectId}`);
            message.success('Đã xoá dự án');
            router.push('/dashboard/he-thong/danh-muc-du-an' as any);
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
                <Title level={4} style={{ margin: 0 }}>Danh mục dự án / Tạo mới · Chỉnh sửa</Title>
            </div>
            <Card>
                <Form form={form} layout="vertical" initialValues={{ status: 'DRAFT' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 24 }}>
                        <Form.Item name="code" label={<span>Mã dự án <span style={{ color: 'red' }}>*</span></span>} rules={[{ required: true, message: 'Nhập mã dự án' }]}>
                            <Input placeholder="VD: DA001" disabled={mode === 'edit'} />
                        </Form.Item>
                        <Form.Item name="area" label={<span>Khu vực <span style={{ color: 'red' }}>*</span></span>} rules={[{ required: true, message: 'Nhập khu vực' }]}>
                            <Input placeholder="VD: Quận 12" />
                        </Form.Item>
                        <Form.Item name="ward" label={<span>Phường / Xã <span style={{ color: 'red' }}>*</span></span>} rules={[{ required: true, message: 'Nhập phường/xã' }]}>
                            <Input placeholder="VD: Thạnh Lộc" />
                        </Form.Item>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 24, marginTop: 20 }}>
                        <Form.Item name="managedBranchId" label={<span>Chi nhánh quản lý <span style={{ color: 'red' }}>*</span></span>} rules={[{ required: true, message: 'Chọn chi nhánh' }]}>
                            <Select placeholder="Chọn chi nhánh"
                                options={branches.map((b) => ({ value: b.id, label: b.name }))} />
                        </Form.Item>
                        <Form.Item name="teamId" label="Team phụ trách">
                            <Select placeholder="Chọn team (không bắt buộc)" allowClear
                                options={teams.map((t) => ({ value: t.id, label: t.name }))} />
                        </Form.Item>
                        {mode === 'edit' && (
                            <Form.Item name="status" label="Trạng thái">
                                <Select options={STATUS_OPTIONS} />
                            </Form.Item>
                        )}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 24, marginTop: 20 }}>
                        <Form.Item name="rentalStartAt" label="Ngày bắt đầu thuê">
                            <input type="date" style={{ height: 36, width: '100%', padding: '0 12px', borderRadius: 6, border: '1px solid #d9d9d9', fontSize: 14 }} />
                        </Form.Item>
                        <Form.Item name="rentalEndAt" label="Ngày kết thúc thuê">
                            <input type="date" style={{ height: 36, width: '100%', padding: '0 12px', borderRadius: 6, border: '1px solid #d9d9d9', fontSize: 14 }} />
                        </Form.Item>
                        <Form.Item name="expectedStayAt" label="Ngày khách dự kiến ở">
                            <input type="date" style={{ height: 36, width: '100%', padding: '0 12px', borderRadius: 6, border: '1px solid #d9d9d9', fontSize: 14 }} />
                        </Form.Item>
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
