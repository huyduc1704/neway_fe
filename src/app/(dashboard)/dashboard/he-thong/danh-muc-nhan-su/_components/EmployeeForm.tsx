'use client';
import { useEffect, useState } from 'react';
import { message } from 'antd';
import { useRouter } from 'next/navigation';
import { Upload } from 'lucide-react';
import { Button, Input, Select, Form, Card, Typography } from 'antd';
import api from '@/lib/api';
import dayjs from 'dayjs';

const { Title } = Typography;

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
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);

    useEffect(() => {
        api.get('/branches', { params: { limit: 100 } }).then(({ data }) => setBranches(data.data)).catch(() => {});
        api.get('/teams', { params: { limit: 100 } }).then(({ data }) => setTeams(data.data)).catch(() => {});
        api.get('/employees', { params: { limit: 100 } }).then(({ data }) => setManagers(data.data.map((e: any) => ({
            id: e.employeeProfile?.id,
            user: { fullName: e.fullName },
        })).filter((m: any) => m.id && m.id !== userId))).catch(() => {});

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
                        employeeCode: data.employeeProfile?.employeeCode || '',
                        roleCode: data.roles?.[0]?.role?.code || '',
                        branchId: data.employeeProfile?.branch?.id || '',
                        teamId: data.employeeProfile?.team?.id || '',
                        directManagerId: data.employeeProfile?.directManager?.id || '',
                        joinedAt: data.employeeProfile?.joinedAt ? dayjs(data.employeeProfile.joinedAt).format('YYYY-MM-DD') : '',
                        isActive: String(data.employeeProfile?.isActive ?? true),
                    });
                    setAvatarUrl(data.employeeProfile?.avatarUrl ?? null);
                })
                .catch(() => message.error('Không thể tải thông tin nhân viên'))
                .finally(() => setLoading(false));
        }
    }, [mode, userId]);

    const onSubmit = async () => {
        try {
            const values = await form.validateFields();
            setSubmitting(true);
            const payload: any = {
                employeeCode: values.employeeCode,
                roleCode: values.roleCode,
                branchId: values.branchId || undefined,
                teamId: values.teamId || undefined,
                directManagerId: values.directManagerId || undefined,
                joinedAt: values.joinedAt ? new Date(values.joinedAt).toISOString() : undefined,
            };

            if (mode === 'create') {
                await api.post('/employees', { ...payload, userId: values.userId });
                message.success('Tạo hồ sơ nhân viên thành công');
            } else {
                const { employeeCode: _c, ...rest } = payload;
                await api.patch(`/employees/${userId}/profile`, { ...rest, isActive: values.isActive === 'true' });
                message.success('Cập nhật thành công');
            }
            router.push('/dashboard/he-thong/danh-muc-nhan-su' as any);
        } catch (err: any) {
            if (err?.response) message.error(err?.response?.data?.message || 'Thao tác thất bại');
        } finally {
            setSubmitting(false);
        }
    };

    const handleAvatarUpload = async (file: File) => {
        if (!userId) return;
        setUploadingAvatar(true);
        try {
            const fd = new FormData();
            fd.append('file', file);
            const { data } = await api.patch(`/employees/${userId}/avatar`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
            setAvatarUrl(data?.avatarUrl ?? null);
            message.success('Upload avatar thành công');
        } catch (err: any) {
            message.error(err?.response?.data?.message || 'Upload thất bại');
        } finally { setUploadingAvatar(false); }
    };

    const handleDelete = async () => {
        if (!window.confirm('Xoá nhân viên này?')) return;
        try {
            await api.delete(`/employees/${userId}`);
            message.success('Đã xoá nhân viên');
            router.push('/dashboard/he-thong/danh-muc-nhan-su' as any);
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
                <Title level={4} style={{ margin: 0 }}>Danh mục nhân sự / Tạo mới · Chỉnh sửa</Title>
            </div>
            <Card>
                <Form form={form} layout="vertical" initialValues={{ isActive: 'true' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 24 }}>
                        {mode === 'create' && (
                            <Form.Item name="userId" label={<span>Tài khoản người dùng <span style={{ color: 'red' }}>*</span></span>} rules={[{ required: true, message: 'Chọn tài khoản' }]}>
                                <Select placeholder="Chọn tài khoản..."
                                    options={users.map((u) => ({ value: u.id, label: `${u.fullName} (${u.username})` }))} />
                            </Form.Item>
                        )}
                        <Form.Item name="employeeCode" label={<span>Mã nhân viên <span style={{ color: 'red' }}>*</span></span>} rules={[{ required: true, message: 'Nhập mã nhân viên' }]}>
                            <Input placeholder="VD: NV001" disabled={mode === 'edit'} />
                        </Form.Item>
                        <Form.Item name="roleCode" label={<span>Vai trò <span style={{ color: 'red' }}>*</span></span>} rules={[{ required: true, message: 'Chọn vai trò' }]}>
                            <Select placeholder="Chọn vai trò" options={ROLE_OPTIONS} />
                        </Form.Item>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 24, marginTop: 20 }}>
                        <Form.Item name="branchId" label="Chi nhánh">
                            <Select placeholder="Chọn chi nhánh" allowClear
                                options={branches.map((b) => ({ value: b.id, label: b.name }))} />
                        </Form.Item>
                        <Form.Item name="teamId" label="Team">
                            <Select placeholder="Chọn team" allowClear
                                options={teams.map((t) => ({ value: t.id, label: t.name }))} />
                        </Form.Item>
                        <Form.Item name="directManagerId" label="Leader trực thuộc">
                            <Select placeholder="Chọn leader (không bắt buộc)" allowClear
                                options={managers.map((m) => ({ value: m.id, label: m.user.fullName }))} />
                        </Form.Item>
                    </div>

                    {mode === 'edit' && (
                        <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 16, padding: 16, background: '#f9fafb', borderRadius: 8, border: '1px solid #e5e7eb' }}>
                            <div style={{ width: 64, height: 64, borderRadius: '50%', border: '2px solid #e5e7eb', overflow: 'hidden', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                {avatarUrl
                                    ? <img src={avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    : <span style={{ fontSize: 24, color: '#d1d5db' }}>👤</span>}
                            </div>
                            <div>
                                <p style={{ fontSize: 14, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Ảnh đại diện</p>
                                <label style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 12, cursor: uploadingAvatar ? 'not-allowed' : 'pointer', opacity: uploadingAvatar ? 0.5 : 1 }}>
                                    <Upload size={14} />
                                    {uploadingAvatar ? 'Đang upload...' : (avatarUrl ? 'Thay ảnh' : 'Upload ảnh')}
                                    <input type="file" accept="image/*" style={{ display: 'none' }} disabled={uploadingAvatar}
                                        onChange={e => e.target.files?.[0] && handleAvatarUpload(e.target.files[0])} />
                                </label>
                                <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>Tối đa 5MB</p>
                            </div>
                        </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 24, marginTop: 20 }}>
                        <Form.Item name="joinedAt" label="Ngày vào làm">
                            <input type="date" style={{ height: 36, width: '100%', padding: '0 12px', borderRadius: 6, border: '1px solid #d9d9d9', fontSize: 14 }} />
                        </Form.Item>
                        {mode === 'edit' && (
                            <Form.Item name="isActive" label="Trạng thái">
                                <Select options={[{ value: 'true', label: 'Đang làm' }, { value: 'false', label: 'Đã nghỉ' }]} />
                            </Form.Item>
                        )}
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
