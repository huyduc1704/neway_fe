'use client';
import { useEffect, useState } from 'react';
import { Form, Input, Select, Button, Row, Col, Space, message, Popconfirm, Spin, DatePicker } from 'antd';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import PageHeader from '@/components/common/PageHeader';
import dayjs from 'dayjs';

interface Props {
    mode: 'create' | 'edit';
    userId?: string;
}

interface UserOption { id: string; fullName: string; username: string; }
interface Branch { id: string; name: string; }
interface Team { id: string; name: string; }
interface ManagerOption { id: string; user: { fullName: string }; }

const ROLE_OPTIONS = [
    { value: 'SALE',      label: 'Nhân viên Kinh doanh' },
    { value: 'LEADER',    label: 'Trưởng nhóm' },
    { value: 'MARKETING', label: 'Nhân viên Marketing' },
];

export default function EmployeeForm({ mode, userId }: Props) {
    const router = useRouter();
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const [users, setUsers] = useState<UserOption[]>([]);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);
    const [managers, setManagers] = useState<ManagerOption[]>([]);

    useEffect(() => {
        // Load dropdowns
        api.get('/branches', { params: { limit: 100 } }).then(({ data }) => setBranches(data.data)).catch(() => {});
        api.get('/teams', { params: { limit: 100 } }).then(({ data }) => setTeams(data.data)).catch(() => {});
        api.get('/employees', { params: { limit: 100 } }).then(({ data }) => setManagers(data.data.map((e: any) => ({
            id: e.employeeProfile?.id,
            user: { fullName: e.fullName },
        })).filter((m: any) => m.id && m.id !== userId))).catch(() => {});

        // Khi tạo mới: load danh sách user chưa có profile
        if (mode === 'create') {
            api.get('/users', { params: { limit: 200 } }).then(({ data }) => setUsers(data.data)).catch(() => {});
        }
    }, [mode, userId]);

    useEffect(() => {
        if (mode === 'edit' && userId) {
            setLoading(true);
            api.get(`/employees/${userId}`)
                .then(({ data }) => {
                    form.setFieldsValue({
                        employeeCode: data.employeeProfile?.employeeCode,
                        roleCode: data.roles?.[0]?.role?.code,
                        branchId: data.employeeProfile?.branch?.id,
                        teamId: data.employeeProfile?.team?.id,
                        directManagerId: data.employeeProfile?.directManager?.id,
                        joinedAt: data.employeeProfile?.joinedAt ? dayjs(data.employeeProfile.joinedAt) : null,
                        isActive: data.employeeProfile?.isActive,
                    });
                })
                .catch(() => message.error('Không thể tải thông tin nhân viên'))
                .finally(() => setLoading(false));
        }
    }, [mode, userId, form]);

    const onFinish = async (values: any) => {
        setSubmitting(true);
        try {
            const payload = {
                ...values,
                joinedAt: values.joinedAt?.toISOString() ?? undefined,
            };

            if (mode === 'create') {
                await api.post('/employees', payload);
                message.success('Tạo hồ sơ nhân viên thành công');
            } else {
                const { userId: _u, employeeCode: _c, ...rest } = payload;
                await api.patch(`/employees/${userId}/profile`, rest);
                message.success('Cập nhật thành công');
            }
            router.push('/dashboard/he-thong/danh-muc-nhan-su' as any);
        } catch (err: any) {
            message.error(err?.response?.data?.message || 'Thao tác thất bại');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async () => {
        try {
            await api.delete(`/employees/${userId}`);
            message.success('Đã xoá nhân viên');
            router.push('/dashboard/he-thong/danh-muc-nhan-su' as any);
        } catch (err: any) {
            message.error(err?.response?.data?.message || 'Thao tác thất bại');
        }
    };

    return (
        <Spin spinning={loading}>
            <PageHeader title="Danh mục nhân sự / Tạo mới · Chỉnh sửa" />

            <div style={{ background: '#fff', borderRadius: 8, padding: 24 }}>
                <Form form={form} layout="vertical" onFinish={onFinish}>
                    <Row gutter={24}>
                        {mode === 'create' && (
                            <Col span={8}>
                                <Form.Item label="Tài khoản người dùng" name="userId"
                                    rules={[{ required: true, message: 'Chọn tài khoản' }]}>
                                    <Select
                                        showSearch placeholder="Chọn tài khoản..."
                                        filterOption={(input, opt) =>
                                            (opt?.label as string)?.toLowerCase().includes(input.toLowerCase())
                                        }
                                        options={users.map((u) => ({
                                            value: u.id,
                                            label: `${u.fullName} (${u.username})`,
                                        }))}
                                    />
                                </Form.Item>
                            </Col>
                        )}
                        <Col span={8}>
                            <Form.Item label="Mã nhân viên" name="employeeCode"
                                rules={[{ required: true, message: 'Nhập mã nhân viên' }]}>
                                <Input placeholder="VD: NV001" disabled={mode === 'edit'} />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item label="Vai trò" name="roleCode"
                                rules={[{ required: true, message: 'Chọn vai trò' }]}>
                                <Select placeholder="Chọn vai trò" options={ROLE_OPTIONS} />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={24}>
                        <Col span={8}>
                            <Form.Item label="Chi nhánh" name="branchId">
                                <Select
                                    allowClear placeholder="Chọn chi nhánh"
                                    options={branches.map((b) => ({ value: b.id, label: b.name }))}
                                />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item label="Team" name="teamId">
                                <Select
                                    allowClear placeholder="Chọn team"
                                    options={teams.map((t) => ({ value: t.id, label: t.name }))}
                                />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item label="Leader trực thuộc" name="directManagerId">
                                <Select
                                    allowClear placeholder="Chọn leader (không bắt buộc)"
                                    options={managers.map((m) => ({
                                        value: m.id,
                                        label: m.user.fullName,
                                    }))}
                                />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={24}>
                        <Col span={8}>
                            <Form.Item label="Ngày vào làm" name="joinedAt">
                                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" placeholder="Chọn ngày" />
                            </Form.Item>
                        </Col>
                        {mode === 'edit' && (
                            <Col span={8}>
                                <Form.Item label="Trạng thái" name="isActive">
                                    <Select options={[
                                        { value: true, label: 'Đang làm' },
                                        { value: false, label: 'Đã nghỉ' },
                                    ]} />
                                </Form.Item>
                            </Col>
                        )}
                    </Row>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                        <Space>
                            {mode === 'edit' && (
                                <Popconfirm title="Xoá nhân viên này?" okText="Xác nhận" cancelText="Huỷ"
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
