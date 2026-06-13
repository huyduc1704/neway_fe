'use client';
import { Card, Avatar, Typography, Row, Col, Statistic, Space, Tag } from 'antd';
import { UserOutlined, PhoneOutlined, MailOutlined } from '@ant-design/icons';
import { useEffect, useState } from 'react';
import api from '@/lib/api';

const { Title, Text } = Typography;

export default function PersonalInfoWidget() {
    const [profile, setProfile] = useState<any>(null);

    useEffect(() => {
        api.get('/auth/me').then(res => setProfile(res.data)).catch(console.error);
    }, []);

    if (!profile) return <Card loading />;

    return (
        <Card>
            <Row gutter={[16, 16]} align="middle">
                <Col>
                    <Avatar size={64} src={profile.avatarUrl} icon={<UserOutlined />} />
                </Col>
                <Col flex="auto">
                    <Title level={4} style={{ margin: 0 }}>{profile.fullName}</Title>
                    <Space size={[0, 8]} wrap>
                        <Tag color="blue">{profile.role?.name || 'Nhân viên'}</Tag>
                        {profile.branch?.name && <Tag color="cyan">{profile.branch.name}</Tag>}
                        {profile.team?.name && <Tag color="geekblue">{profile.team.name}</Tag>}
                    </Space>
                </Col>
            </Row>
            <div style={{ marginTop: 16 }}>
                <Space direction="vertical" style={{ width: '100%' }}>
                    <Text><PhoneOutlined /> {profile.phone || 'Chưa cập nhật'}</Text>
                    <Text><MailOutlined /> {profile.email || 'Chưa cập nhật'}</Text>
                </Space>
            </div>
            <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
                <Col span={12}>
                    <Statistic title="Trạng thái" value={profile.isActive ? 'Hoạt động' : 'Tạm khóa'} valueStyle={{ color: profile.isActive ? '#52c41a' : '#ff4d4f', fontSize: 16 }} />
                </Col>
                <Col span={12}>
                    <Statistic title="Ngày tham gia" value={profile.createdAt ? new Date(profile.createdAt).toLocaleDateString('vi-VN') : '--'} valueStyle={{ fontSize: 16 }} />
                </Col>
            </Row>
        </Card>
    );
}
