'use client';
import { Layout } from 'antd';
import Sidebar from '@/components/layout/Sidebar';
import AppHeader from '@/components/layout/AppHeader';
import { UserProvider } from '@/context/UserContext';

const { Content, Footer } = Layout;

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <UserProvider>
            <Layout style={{ minHeight: '100vh' }}>
                <Sidebar />
                <Layout>
                    <AppHeader />
                    <Content style={{ padding: 24, minHeight: 'calc(100vh - 64px - 60px)' }}>
                        {children}
                    </Content>
                    <Footer style={{ textAlign: 'center', fontSize: 12, color: '#888', padding: '12px 24px' }}>
                        ĐC: 64 Bình Long, Phường Phú Thạnh, TP.HCM | Email: newayhome267@gmail.com | Hotline: 0916 793 576
                        <br />Copyright ©2026. Bản quyền thuộc về <strong>Neway Home</strong>. Web Design by Vinasoftware (VNS)
                    </Footer>
                </Layout>
            </Layout>
        </UserProvider>
    );
}
