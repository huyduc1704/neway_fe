'use client';
import { Card, Avatar, Typography, Space, Tag, Descriptions } from 'antd';
import {
    UserOutlined, PhoneOutlined, MailOutlined,
    BankOutlined, TeamOutlined, EnvironmentOutlined,
    IdcardOutlined, CalendarOutlined,
} from '@ant-design/icons';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const EMPLOYEE_STATUS_LABEL: Record<string, string> = {
    ACTIVE: 'Đang làm việc',
    SUSPENDED: 'Tạm ngưng',
    RESIGNED: 'Đã nghỉ',
};
const EMPLOYEE_STATUS_COLOR: Record<string, string> = {
    ACTIVE: 'success',
    SUSPENDED: 'warning',
    RESIGNED: 'error',
};

interface MeData {
    user: {
        id: string; fullName: string; username: string;
        phone?: string; email?: string; avatarUrl?: string;
        status: string; createdAt: string;
    };
    roleObjects: { id: string; code: string; name: string }[];
    profile: {
        employeeCode?: string; employeeStatus?: string;
        gender?: string; dateOfBirth?: string; joinedAt?: string;
        score?: number | string | null;
        bankAccount?: string; hasContract?: boolean;
        branch?: { id: string; code: string; name: string } | null;
        team?: { id: string; code: string; name: string } | null;
    } | null;
}

export default function PersonalInfoWidget() {
    const [data, setData] = useState<MeData | null>(null);

    useEffect(() => {
        api.get('/auth/me')
            .then(res => setData(res.data))
            .catch(console.error);
    }, []);

    if (!data) return <Card loading style={{ borderRadius: 12 }} />;

    const { user, roleObjects, profile } = data;

    return (
        <Card
            style={{ borderRadius: 12 }}
            bodyStyle={{ padding: '20px 24px' }}
        >
            {/* Header: Avatar + Tên + Roles */}
            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', marginBottom: 20 }}>
                <Avatar
                    size={72}
                    src={user.avatarUrl}
                    icon={<UserOutlined />}
                    style={{ flexShrink: 0, background: '#E8890C' }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                    <Title level={4} style={{ margin: 0, marginBottom: 6, color: '#1A2B5A' }}>
                        {user.fullName}
                    </Title>
                    {profile?.employeeCode && (
                        <Text type="secondary" style={{ fontSize: 13, display: 'block', marginBottom: 6 }}>
                            <IdcardOutlined style={{ marginRight: 4 }} />
                            {profile.employeeCode}
                        </Text>
                    )}
                    <Space size={4} wrap>
                        {roleObjects.length > 0
                            ? roleObjects.map(r => (
                                <Tag key={r.code} color="blue" style={{ margin: 0 }}>{r.name}</Tag>
                            ))
                            : <Tag color="default">Nhân viên</Tag>
                        }
                        {profile?.employeeStatus && (
                            <Tag color={EMPLOYEE_STATUS_COLOR[profile.employeeStatus] ?? 'default'}>
                                {EMPLOYEE_STATUS_LABEL[profile.employeeStatus] ?? profile.employeeStatus}
                            </Tag>
                        )}
                    </Space>
                </div>
            </div>

            {/* Team & Branch */}
            {(profile?.branch || profile?.team) && (
                <div style={{
                    background: '#f8faff', borderRadius: 8, padding: '10px 14px',
                    marginBottom: 16, display: 'flex', gap: 16, flexWrap: 'wrap',
                }}>
                    {profile?.branch && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                            <BankOutlined style={{ color: '#6b7280' }} />
                            <Text type="secondary">Chi nhánh:</Text>
                            <strong>{profile.branch.name}</strong>
                        </div>
                    )}
                    {profile?.team && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                            <TeamOutlined style={{ color: '#6b7280' }} />
                            <Text type="secondary">Đội/Nhóm:</Text>
                            <strong>{profile.team.name}</strong>
                        </div>
                    )}
                </div>
            )}

            {/* Contact & Info */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
                {user.phone && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <PhoneOutlined style={{ color: '#6b7280', width: 16 }} />
                        <Text>{user.phone}</Text>
                    </div>
                )}
                {user.email && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <MailOutlined style={{ color: '#6b7280', width: 16 }} />
                        <Text>{user.email}</Text>
                    </div>
                )}
                {!user.phone && !user.email && (
                    <Text type="secondary">Chưa cập nhật thông tin liên hệ</Text>
                )}
                {profile?.joinedAt && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <CalendarOutlined style={{ color: '#6b7280', width: 16 }} />
                        <Text type="secondary">Ngày vào làm:</Text>
                        <Text>{dayjs(profile.joinedAt).format('DD/MM/YYYY')}</Text>
                    </div>
                )}
                {profile?.score != null && Number(profile.score) > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Text type="secondary">Điểm hiệu suất:</Text>
                        <Tag color="gold">{Number(profile.score).toFixed(1)}</Tag>
                    </div>
                )}
                {profile?.hasContract && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Text type="secondary">Hợp đồng:</Text>
                        <Tag color="success">Đã ký HĐ</Tag>
                    </div>
                )}
            </div>
        </Card>
    );
}
