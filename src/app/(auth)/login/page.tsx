'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Form, Input, Button, Card, Typography, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import api from '@/lib/api';
import { authStorage } from '@/lib/auth';

const { Title, Text } = Typography;

export default function LoginPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const handleLogin = async (values: { username: string; password: string }) => {
        setLoading(true);
        try {
            const { data } = await api.post('/auth/login', values);
            authStorage.setToken(data.access_token);
            authStorage.setUser(data.user);
            message.success('Đăng nhập thành công');
            router.push('/dashboard');
        } catch {
            message.error('Sai tên đăng nhập hoặc mật khẩu');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #1A2B5A 0%, #2d4a8a 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
        }}>
            <Card style={{ width: '100%', maxWidth: 420, borderRadius: 12, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
                {/* Logo */}
                <div style={{ textAlign: 'center', marginBottom: 28 }}>
                    <div style={{ color: '#E8890C', fontWeight: 900, fontSize: 40, letterSpacing: 3, lineHeight: 1 }}>
                        NEWAY
                    </div>
                    <Text type="secondary" style={{ fontSize: 13 }}>Niềm tin mới - Khởi đầu mới</Text>
                    <div style={{ marginTop: 16 }}>
                        <Title level={4} style={{ margin: 0 }}>Đăng nhập hệ thống</Title>
                        <Text type="secondary" style={{ fontSize: 13 }}>Nhập thông tin tài khoản để tiếp tục</Text>
                    </div>
                </div>

                <Form layout="vertical" onFinish={handleLogin} requiredMark={false}>
                    <Form.Item
                        label="Tên đăng nhập"
                        name="username"
                        rules={[{ required: true, message: 'Vui lòng nhập tên đăng nhập' }]}
                    >
                        <Input
                            prefix={<UserOutlined style={{ color: '#bfbfbf' }} />}
                            placeholder="Nhập tên đăng nhập"
                            size="large"
                            autoComplete="username"
                        />
                    </Form.Item>

                    <Form.Item
                        label="Mật khẩu"
                        name="password"
                        rules={[{ required: true, message: 'Vui lòng nhập mật khẩu' }]}
                    >
                        <Input.Password
                            prefix={<LockOutlined style={{ color: '#bfbfbf' }} />}
                            placeholder="Nhập mật khẩu"
                            size="large"
                            autoComplete="current-password"
                        />
                    </Form.Item>

                    <Form.Item style={{ marginBottom: 0 }}>
                        <Button
                            type="primary"
                            htmlType="submit"
                            size="large"
                            loading={loading}
                            block
                            style={{ background: '#E8890C', borderColor: '#E8890C', height: 44, fontWeight: 600 }}
                        >
                            Đăng nhập
                        </Button>
                    </Form.Item>
                </Form>
            </Card>
        </div>
    );
}
