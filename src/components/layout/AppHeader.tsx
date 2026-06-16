'use client';
import { Layout, Input, Badge, Avatar, Dropdown, Space, Typography } from 'antd';
import { BellOutlined, UserOutlined, LogoutOutlined, DownOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { authStorage } from '@/lib/auth';
import { useUser } from '@/context/UserContext';

const { Header } = Layout;
const { Text } = Typography;

export default function AppHeader() {
    const router = useRouter();
    const { roleObjects } = useUser();
    const user = authStorage.getUser();

    const handleLogout = () => {
        authStorage.clear();
        router.push('/login');
    };

    const roleLabel = roleObjects.length > 0
        ? roleObjects.map(r => r.name).join(', ')
        : '—';

    const menuItems = [
        { key: 'logout', icon: <LogoutOutlined />, label: 'Đăng xuất', onClick: handleLogout },
    ];

    return (
        <Header style={{ background: '#fff', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f0f0f0', position: 'sticky', top: 0, zIndex: 100 }}>
            <Input.Search placeholder="Tìm kiếm..." style={{ width: 300 }} />
            <Space size={20}>
                <Badge count={0} showZero={false}>
                    <BellOutlined style={{ fontSize: 20, cursor: 'pointer' }} />
                </Badge>
                <Dropdown menu={{ items: menuItems }} placement="bottomRight">
                    <Space style={{ cursor: 'pointer' }}>
                        <Avatar icon={<UserOutlined />} style={{ background: '#E8890C' }} />
                        <div style={{ lineHeight: 1.3 }}>
                            <div style={{ fontWeight: 600, fontSize: 14 }}>{user?.fullName ?? ''}</div>
                            <Text type="secondary" style={{ fontSize: 12 }}>{roleLabel}</Text>
                        </div>
                        <DownOutlined style={{ fontSize: 12 }} />
                    </Space>
                </Dropdown>
            </Space>
        </Header>
    );
}
