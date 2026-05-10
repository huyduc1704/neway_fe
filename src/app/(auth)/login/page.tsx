'use client';
import { Form, Input, Button, Card, Typography, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { authStorage } from '@/lib/auth';

const { Title } = Typography;

export default function LoginPage() {
    const router = useRouter();
    const [form] = Form.useForm();

    const onFinish = async (values: { username: string; password: string }) => {
        try {
            const { data } = await api.post('/auth/login', values);
            authStorage.setToken(data.access_token);
            authStorage.setUser(data.user);
            router.push('/dashboard');
        } catch {
            message.error('Tên đăng nhập hoặc mật khẩu không đúng');
        }
    };

    return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f2f5' }}>
            <Card style={{ width: 400, boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
                <div style={{ textAlign: 'center', marginBottom: 32 }}>
                    <Title level={2} style={{ color: '#E8890C', margin: 0 }}>NEWAY</Title>
                    <Typography.Text type="secondary">Niềm tin mới - Khởi đầu mới</Typography.Text>
                </div>
                <Form form={form} layout="vertical" onFinish={onFinish}>
                    <Form.Item name="username" rules={[{ required: true, message: 'Nhập tên đăng nhập' }]}>
                        <Input prefix={<UserOutlined />} placeholder="Tên đăng nhập" size="large" />
                    </Form.Item>
                    <Form.Item name="password" rules={[{ required: true, message: 'Nhập mật khẩu' }]}>
                        <Input.Password prefix={<LockOutlined />} placeholder="Mật khẩu" size="large" />
                    </Form.Item>
                    <Button type="primary" htmlType="submit" block size="large">
                        Đăng nhập
                    </Button>
                </Form>
            </Card>
        </div>
    );
}
