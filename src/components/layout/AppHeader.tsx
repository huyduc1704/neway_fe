'use client';
import { useEffect, useState } from 'react';
import { Layout, Input, Badge, Avatar, Dropdown, Space, Typography } from 'antd';
import { BellOutlined, UserOutlined, LogoutOutlined, DownOutlined, SearchOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { authStorage } from '@/lib/auth';

const { Header } = Layout;
const { Text } = Typography;

export default function AppHeader() {
    const router = useRouter();
    const [user, setUser] = useState<{ fullName?: string } | null>(null);

    useEffect(() => {
        setUser(authStorage.getUser());
    }, []);

    const handleLogout = () => {
        authStorage.clear();
        router.push('/login');
    };

    const menuItems = [
        { key: 'logout', icon: <LogoutOutlined />, label: 'Đăng xuất', onClick: handleLogout },
    ];

    return (
        <Header style={{ background: '#fff', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'end', borderBottom: '1px solid #f0f0f0', position: 'sticky', top: 0, zIndex: 100, gap: 32, height: 76 }}>
            <Input
                placeholder='Tìm kiếm...'
                prefix={<SearchOutlined style={{ color: '#595959', marginRight: 4 }} />}
                style={{
                    width: 300,
                    borderRadius: 100,
                    border: '1px solid #d9d9d9',
                    height: 36,
                    backgroundColor: '#fff',
                }}
                className='custom-search-input'
            >
            </Input>
            <Space size={20}>
                <Badge count={0} showZero={false}>
                    <BellOutlined style={{ fontSize: 20, cursor: 'pointer' }} />
                </Badge>
                <Dropdown menu={{ items: menuItems }} placement="bottomRight">
                    <Space style={{ cursor: 'pointer' }}>
                        <Avatar icon={<UserOutlined />} style={{ background: '#E8890C' }} />
                        <div style={{ lineHeight: 1.3 }}>
                            <div style={{ fontWeight: 600, fontSize: 14 }}>{user?.fullName ?? ''}</div>
                            <Text type="secondary" style={{ fontSize: 12 }}>Admin</Text>
                        </div>
                        <DownOutlined style={{ fontSize: 12 }} />
                    </Space>
                </Dropdown>
            </Space>
        </Header>
    );
}
