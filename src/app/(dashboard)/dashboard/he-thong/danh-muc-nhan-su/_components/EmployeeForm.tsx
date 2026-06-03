'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    Form, Input, Select, Button, Card, Typography, Row, Col,
    DatePicker, Checkbox, Upload, Avatar, message, Divider, Spin, Tag,
} from 'antd';
import { UserOutlined, UploadOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import type { UploadFile } from 'antd';
import dayjs from 'dayjs';
import api from '@/lib/api';

const { Title, Text } = Typography;

interface Role {
    id: string; code: string; name: string;
    fixedSalary: string | null;
    commissionPercent: string | null;
}
interface Team {
    id: string; name: string;
    branch: { id: string; name: string; region: { id: string; name: string } | null } | null;
}

const STATUS_OPTIONS = [
    { value: 'ACTIVE', label: 'Đang hoạt động' },
    { value: 'SUSPENDED', label: 'Tạm ngưng' },
    { value: 'RESIGNED', label: 'Đã nghỉ' },
];
const GENDER_OPTIONS = [
    { value: 'MALE', label: 'Nam' },
    { value: 'FEMALE', label: 'Nữ' },
    { value: 'OTHER', label: 'Khác' },
];

const fmt = (v: string | null) =>
    v ? new Intl.NumberFormat('vi-VN').format(Number(v)) + 'đ' : '—';

interface Props { mode: 'create' | 'edit'; userId?: string; }

export default function EmployeeForm({ mode, userId }: Props) {
    const router = useRouter();
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const [roles, setRoles] = useState<Role[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);

    // derived from selected role / team
    const [selectedRole, setSelectedRole] = useState<Role | null>(null);
    const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
    const [hasSocialInsurance, setHasSocialInsurance] = useState(false);

    // load lookup data
    useEffect(() => {
        api.get('/roles', { params: { limit: 100 } })
            .then(({ data }) => setRoles(data.data))
            .catch(() => { });
        api.get('/teams', { params: { limit: 200 } })
            .then(({ data }) => setTeams(data.data))
            .catch(() => { });
    }, []);

    // load employee for edit
    useEffect(() => {
        if (mode !== 'edit' || !userId) return;
        setLoading(true);
        api.get(`/employees/${userId}`)
            .then(({ data }) => {
                const prof = data.employeeProfile;
                const role = data.roles?.[0]?.role;
                form.setFieldsValue({
                    employeeCode: prof?.employeeCode ?? '',
                    fullName: data.fullName ?? '',
                    username: data.username ?? '',
                    roleCode: role?.code ?? undefined,
                    teamId: prof?.team?.id ?? undefined,
                    employeeStatus: prof?.employeeStatus ?? 'ACTIVE',
                    gender: prof?.gender ?? undefined,
                    dateOfBirth: prof?.dateOfBirth ? dayjs(prof.dateOfBirth) : undefined,
                    score: prof?.score != null ? Number(prof.score) : undefined,
                    joinedAt: prof?.joinedAt ? dayjs(prof.joinedAt) : undefined,
                    bankAccount: prof?.bankAccount ?? '',
                    hasContract: prof?.hasContract ?? false,
                    socialInsurance: prof?.socialInsurance ?? '',
                    note: prof?.note ?? '',
                });
                setHasSocialInsurance(!!prof?.socialInsurance);
                if (role) setSelectedRole(roles.find(r => r.code === role.code) ?? {
                    id: role.id, code: role.code, name: role.name,
                    fixedSalary: role.fixedSalary, commissionPercent: role.commissionPercent,
                });
                if (prof?.team) setSelectedTeam(teams.find(t => t.id === prof.team.id) ?? {
                    id: prof.team.id, name: prof.team.name,
                    branch: prof.team.branch ?? null,
                });
                setAvatarUrl(data.avatarUrl ?? null);
            })
            .catch(() => message.error('Không thể tải thông tin nhân sự'))
            .finally(() => setLoading(false));
    }, [mode, userId, roles, teams]);

    const handleRoleChange = (code: string) => {
        const r = roles.find(r => r.code === code) ?? null;
        setSelectedRole(r);
    };

    const handleTeamChange = (id: string) => {
        const t = teams.find(t => t.id === id) ?? null;
        setSelectedTeam(t);
    };

    const uploadAvatar = async (empId: string, file: File) => {
        setUploadingAvatar(true);
        try {
            const fd = new FormData();
            fd.append('file', file);
            const { data } = await api.patch(`/employees/${empId}/avatar`, fd, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            setAvatarUrl(data?.avatarUrl ?? null);
        } catch {
            message.warning('Lưu thành công nhưng upload ảnh thất bại');
        } finally {
            setUploadingAvatar(false);
        }
    };

    const onFinish = async (values: any) => {
        setSubmitting(true);
        try {
            if (mode === 'create') {
                const payload = {
                    employeeCode: values.employeeCode,
                    fullName: values.fullName,
                    username: values.username,
                    password: values.password,
                    roleCodes: [values.roleCode],
                    teamId: values.teamId || undefined,
                    employeeStatus: values.employeeStatus || 'ACTIVE',
                    gender: values.gender || undefined,
                    dateOfBirth: values.dateOfBirth ? values.dateOfBirth.toISOString() : undefined,
                    score: values.score != null ? Number(values.score) : undefined,
                    joinedAt: values.joinedAt ? values.joinedAt.toISOString() : undefined,
                    bankAccount: values.bankAccount || undefined,
                    hasContract: values.hasContract ?? false,
                    socialInsurance: values.socialInsurance || undefined,
                    note: values.note || undefined,
                };
                const { data } = await api.post('/employees', payload);
                if (avatarFile) await uploadAvatar(data.id, avatarFile);
                message.success('Tạo nhân sự thành công');
            } else {
                const payload = {
                    fullName: values.fullName,
                    roleCode: values.roleCode,
                    teamId: values.teamId || undefined,
                    employeeStatus: values.employeeStatus,
                    gender: values.gender || undefined,
                    dateOfBirth: values.dateOfBirth ? values.dateOfBirth.toISOString() : undefined,
                    score: values.score != null ? Number(values.score) : undefined,
                    joinedAt: values.joinedAt ? values.joinedAt.toISOString() : undefined,
                    bankAccount: values.bankAccount || undefined,
                    hasContract: values.hasContract ?? false,
                    socialInsurance: values.socialInsurance || undefined,
                    note: values.note || undefined,
                };
                await api.patch(`/employees/${userId}/profile`, payload);
                if (avatarFile) await uploadAvatar(userId!, avatarFile);
                message.success('Cập nhật thành công');
            }
            router.push('/dashboard/he-thong/danh-muc-nhan-su');
        } catch (err: any) {
            const msg = err?.response?.data?.message;
            if (err?.response?.status === 409) {
                if (typeof msg === 'string' && msg.toLowerCase().includes('username')) {
                    form.setFields([{ name: 'username', errors: ['Tài khoản đã tồn tại'] }]);
                } else if (typeof msg === 'string' && msg.toLowerCase().includes('code')) {
                    form.setFields([{ name: 'employeeCode', errors: ['Mã nhân sự đã tồn tại'] }]);
                } else {
                    message.error('Dữ liệu bị trùng, vui lòng kiểm tra lại');
                }
            } else {
                message.error(Array.isArray(msg) ? msg[0] : msg || 'Thao tác thất bại');
            }
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm('Xác nhận xoá nhân sự này?')) return;
        try {
            await api.delete(`/employees/${userId}`);
            message.success('Đã xoá nhân sự');
            router.push('/dashboard/he-thong/danh-muc-nhan-su');
        } catch (err: any) {
            message.error(err?.response?.data?.message || 'Xoá thất bại');
        }
    };

    if (loading) {
        return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Spin size="large" /></div>;
    }

    return (
        <>
            <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
                <Button icon={<ArrowLeftOutlined />} onClick={() => router.back()} />
                <Title level={4} style={{ margin: 0 }}>
                    {mode === 'create' ? 'Thêm nhân sự mới' : 'Chỉnh sửa nhân sự'}
                </Title>
            </div>

            <Form form={form} layout="vertical" onFinish={onFinish}
                initialValues={{ employeeStatus: 'ACTIVE', hasContract: false }}>
                {/* ── Tài khoản ── */}
                <Card title="Thông tin tài khoản" style={{ marginBottom: 16 }}>
                    <Row gutter={24}>
                        <Col span={8}>
                            <Form.Item name="employeeCode" label="Mã nhân sự"
                                rules={[{ required: true, message: 'Nhập mã nhân sự' }]}>
                                <Input placeholder="VD: NV001" disabled={mode === 'edit'} />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item name="fullName" label="Tên nhân sự"
                                rules={[{ required: true, message: 'Nhập tên nhân sự' }]}>
                                <Input placeholder="Nguyễn Văn A" />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item name="username" label="Tài khoản"
                                rules={[{ required: true, message: 'Nhập tài khoản' }]}>
                                <Input placeholder="nguyenvana" disabled={mode === 'edit'} />
                            </Form.Item>
                        </Col>
                        {mode === 'create' && (
                            <Col span={8}>
                                <Form.Item name="password" label="Mật khẩu"
                                    rules={[
                                        { required: true, message: 'Nhập mật khẩu' },
                                        { pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/, message: 'Tối thiểu 8 ký tự, gồm chữ hoa, thường, số và ký tự đặc biệt' },
                                    ]}>
                                    <Input.Password placeholder="Mật khẩu" />
                                </Form.Item>
                            </Col>
                        )}
                    </Row>
                </Card>

                {/* ── Vị trí ── */}
                <Card title="Vị trí công việc" style={{ marginBottom: 16 }}>
                    <Row gutter={24}>
                        <Col span={8}>
                            <Form.Item name="roleCode" label="Vai trò"
                                rules={[{ required: true, message: 'Chọn vai trò' }]}>
                                <Select
                                    showSearch={{ optionFilterProp: 'label' }}
                                    placeholder="Chọn vai trò"
                                    onChange={handleRoleChange}
                                    options={roles.map(r => ({ value: r.code, label: r.name }))}
                                />
                            </Form.Item>
                            {selectedRole && (
                                <div style={{ marginTop: -12, marginBottom: 16, padding: '8px 12px', background: '#fff7ed', borderRadius: 6, border: '1px solid #fed7aa', display: 'flex', gap: 24 }}>
                                    <span style={{ fontSize: 12, color: '#92400e' }}>
                                        Lương cơ bản: <strong>{fmt(selectedRole.fixedSalary)}</strong>
                                    </span>
                                    <span style={{ fontSize: 12, color: '#92400e' }}>
                                        Hoa hồng: <strong>{selectedRole.commissionPercent != null ? Number(selectedRole.commissionPercent) + '%' : '—'}</strong>
                                    </span>
                                </div>
                            )}
                        </Col>
                        <Col span={8}>
                            <Form.Item name="teamId" label="Team">
                                <Select
                                    showSearch={{ optionFilterProp: 'label' }}
                                    placeholder="Chọn team"
                                    allowClear
                                    onChange={handleTeamChange}
                                    options={teams.map(t => ({ value: t.id, label: t.name }))}
                                />
                            </Form.Item>
                            {selectedTeam && (
                                <div style={{ marginTop: -12, marginBottom: 16, padding: '8px 12px', background: '#eff6ff', borderRadius: 6, border: '1px solid #bfdbfe', display: 'flex', gap: 24 }}>
                                    <span style={{ fontSize: 12, color: '#1e40af' }}>
                                        Chi nhánh: <strong>{selectedTeam.branch?.name ?? '—'}</strong>
                                    </span>
                                    <span style={{ fontSize: 12, color: '#1e40af' }}>
                                        Khu vực: <strong>{selectedTeam.branch?.region?.name ?? '—'}</strong>
                                    </span>
                                </div>
                            )}
                        </Col>
                        <Col span={8}>
                            <Form.Item name="employeeStatus" label="Trạng thái">
                                <Select options={STATUS_OPTIONS} />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item label="% Hoa hồng">
                                <Input
                                    value={selectedRole?.commissionPercent != null
                                        ? `${Number(selectedRole.commissionPercent)}%`
                                        : ''}
                                    placeholder="Chọn vai trò để xem hoa hồng"
                                    readOnly
                                    style={{ background: '#f9fafb', color: '#E8890C', fontWeight: 600, cursor: 'default' }}
                                />
                            </Form.Item>
                        </Col>
                    </Row>
                </Card>

                {/* ── Thông tin cá nhân ── */}
                <Card title="Thông tin cá nhân" style={{ marginBottom: 16 }}>
                    <Row gutter={24}>
                        <Col span={8}>
                            <Form.Item name="dateOfBirth" label="Ngày sinh">
                                <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} placeholder="Chọn ngày sinh" />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item name="gender" label="Giới tính">
                                <Select placeholder="Chọn giới tính" allowClear options={GENDER_OPTIONS} />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item name="score" label="Điểm nhân sự">
                                <Input type="number" min={0} placeholder="0" />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item name="joinedAt" label="Ngày nhận việc">
                                <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} placeholder="Chọn ngày nhận việc" />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item name="bankAccount" label="STK ngân hàng">
                                <Input placeholder="Nhập số tài khoản ngân hàng" />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            {hasSocialInsurance && (
                                <Form.Item name="socialInsurance"
                                    rules={[{ required: true, message: 'Vui lòng nhập số BHXH' }]}
                                    label="Mã số BHXH"
                                >
                                    <Input placeholder="Nhập mã số BHXH" />
                                </Form.Item>
                            )}
                        </Col>
                    </Row>
                    <Row gutter={24}>
                        <Col span={8}>
                            <Form.Item name="hasContract" valuePropName="checked" label=" ">
                                <Checkbox style={{ whiteSpace: 'nowrap' }}>Hợp đồng / Cam kết</Checkbox>
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item label=" ">
                                <Checkbox
                                    checked={hasSocialInsurance}
                                    onChange={e => {
                                        setHasSocialInsurance(e.target.checked);
                                        if (!e.target.checked) form.setFieldValue('socialInsurance', '');
                                    }}
                                >
                                    Bảo hiểm xã hội
                                </Checkbox>
                            </Form.Item>
                        </Col>

                        <Col span={24}>
                            <Form.Item name="note" label="Ghi chú">
                                <Input.TextArea rows={4} placeholder="Ghi chú thêm..." />
                            </Form.Item>
                        </Col>
                    </Row>
                </Card>

                {/* ── Ảnh đại diện ── */}
                <Card title="Ảnh đại diện" style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                        <Avatar
                            size={80}
                            src={avatarFile ? URL.createObjectURL(avatarFile) : avatarUrl}
                            icon={<UserOutlined />}
                            style={{ background: '#E8890C', flexShrink: 0 }}
                        />
                        <div>
                            <Upload
                                accept="image/*"
                                maxCount={1}
                                showUploadList={false}
                                beforeUpload={(file) => { setAvatarFile(file as unknown as File); return false; }}
                            >
                                <Button icon={<UploadOutlined />} loading={uploadingAvatar}>
                                    {avatarUrl || avatarFile ? 'Thay ảnh' : 'Upload ảnh'}
                                </Button>
                            </Upload>
                            <Text type="secondary" style={{ display: 'block', marginTop: 6, fontSize: 12 }}>
                                {mode === 'create' ? 'Ảnh sẽ được upload sau khi tạo nhân sự' : 'Tối đa 5MB'}
                            </Text>
                        </div>
                    </div>
                </Card>

                {/* ── Actions ── */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                    {mode === 'edit' && (
                        <Button danger onClick={handleDelete}>Xoá nhân sự</Button>
                    )}
                    <Button onClick={() => router.back()}>Huỷ</Button>
                    <Button type="primary" htmlType="submit" loading={submitting}
                        style={{ background: '#E8890C', borderColor: '#E8890C' }}>
                        {mode === 'create' ? 'Tạo nhân sự' : 'Lưu thay đổi'}
                    </Button>
                </div>
            </Form>
        </>
    );
}
