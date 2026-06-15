'use client';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Layout, Menu, ConfigProvider } from 'antd';
import { DashboardOutlined, BarChartOutlined, ProjectOutlined, SettingOutlined, CalculatorOutlined, HomeOutlined, FileTextOutlined } from '@ant-design/icons';

const { Sider } = Layout;

const menuItems = [
    {
        key: '/dashboard',
        icon: <HomeOutlined />,
        label: <Link href="/dashboard">Trang chủ</Link>,
    },
    {
        key: 'quan-ly-du-an',
        icon: <ProjectOutlined />,
        label: 'Quản lý dự án',
        children: [
            { key: '/dashboard/quan-ly-du-an/thong-tin', label: <Link href="/dashboard/quan-ly-du-an/thong-tin">Giao dịch cọc</Link> },
            { key: '/dashboard/quan-ly-du-an/giao-dich', label: <Link href="/dashboard/quan-ly-du-an/giao-dich">Giao dịch thành công</Link> },
        ],
    },
    {
        key: '/dashboard/uy-nhiem-chi',
        icon: <FileTextOutlined />,
        label: <Link href="/dashboard/uy-nhiem-chi">Uỷ Nhiệm Chi</Link>,
    },
    {
        key: 'tinh-luong',
        icon: <CalculatorOutlined />,
        label: 'Tính lương & Hoa hồng',
        children: [
            { key: '/dashboard/tinh-luong/ky-luong', label: <Link href="/dashboard/tinh-luong/ky-luong">Kỳ lương</Link> },
            { key: '/dashboard/tinh-luong/bang-luong', label: <Link href="/dashboard/tinh-luong/bang-luong">Bảng lương</Link> },
        ],
    },
    {
        key: 'bao-cao',
        icon: <BarChartOutlined />,
        label: 'Báo cáo',
        children: [
            { key: '/dashboard/bao-cao/doanh-thu', label: <Link href="/dashboard/bao-cao/doanh-thu">Báo cáo doanh thu</Link> },
            { key: '/dashboard/bao-cao/hoa-hong', label: <Link href="/dashboard/bao-cao/hoa-hong">Báo cáo hoa hồng</Link> },
            { key: '/dashboard/bao-cao/giao-dich', label: <Link href="/dashboard/bao-cao/giao-dich">Báo cáo giao dịch</Link> },
            { key: '/dashboard/bao-cao/nguon-khach', label: <Link href="/dashboard/bao-cao/nguon-khach">Báo cáo nguồn khách</Link> },
            { key: '/dashboard/bao-cao/khu-vuc', label: <Link href="/dashboard/bao-cao/khu-vuc">Báo cáo khu vực</Link> },
            { key: '/dashboard/bao-cao/giai-thuong', label: <Link href="/dashboard/bao-cao/giai-thuong">Báo cáo giải thưởng</Link> },
        ],
    },
    {
        key: 'he-thong',
        icon: <SettingOutlined />,
        label: 'Quản lý hệ thống',
        children: [
            { key: '/dashboard/he-thong/vai-tro', label: <Link href="/dashboard/he-thong/vai-tro">Vai trò</Link> },
            { key: '/dashboard/he-thong/phan-quyen', label: <Link href="/dashboard/he-thong/phan-quyen">Phân quyền</Link> },
            { key: '/dashboard/he-thong/danh-muc-khach-hang', label: <Link href="/dashboard/he-thong/danh-muc-khach-hang">Danh mục khách hàng</Link> },
            { key: '/dashboard/he-thong/danh-muc-nhan-su', label: <Link href="/dashboard/he-thong/danh-muc-nhan-su">Danh mục nhân sự</Link> },
            { key: '/dashboard/he-thong/chi-nhanh', label: <Link href="/dashboard/he-thong/chi-nhanh">Chi nhánh</Link> },
            { key: '/dashboard/he-thong/kpi', label: <Link href="/dashboard/he-thong/kpi">KPI Targets</Link> },
            { key: '/dashboard/he-thong/quan-ly-khu-vuc', label: <Link href="/dashboard/he-thong/quan-ly-khu-vuc">Khu vực</Link> },
            { key: '/dashboard/he-thong/doi-nhom', label: <Link href="/dashboard/he-thong/doi-nhom">Đội/Nhóm</Link> },
        ],
    },

];

export default function Sidebar() {
    const pathname = usePathname();

    const openKeys = menuItems
        .filter((item) => item.children?.some((c) => pathname.startsWith(c.key)))
        .map((item) => item.key);

    return (
        <Sider width={245} style={{ background: '#fff', minHeight: '100vh' }}>
            <div style={{
                height: 64,
                padding: '0 20px',
                display: 'flex',
                alignItems: 'center',
                borderBottom: '1px solid #f0f0f0',
                color: '#161B44',
            }}>
                <img
                    src="/neway-logo.png"
                    alt="Neway Logo"
                    style={{ maxHeight: 40, width: 'auto' }}
                />
            </div>
            <ConfigProvider
                theme={{
                    components: {
                        Menu: {
                            itemColor: '#161B44',
                            itemHoverColor: '#E8890C',
                            itemSelectedColor: '#E8890C',
                        },
                    },
                }}
            >
                <Menu
                    mode="inline"
                    selectedKeys={[pathname]}
                    defaultOpenKeys={openKeys}
                    items={menuItems}
                    style={{ border: 'none', marginTop: 8 }}
                />
            </ConfigProvider>
        </Sider>
    );
}
