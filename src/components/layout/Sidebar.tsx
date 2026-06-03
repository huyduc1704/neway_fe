'use client';
import { usePathname, useRouter } from 'next/navigation';
import { Layout, Menu } from 'antd';
import { DashboardOutlined, BarChartOutlined, ProjectOutlined, SettingOutlined, CalculatorOutlined } from '@ant-design/icons';

const { Sider } = Layout;

const menuItems = [
    {
        key: '/dashboard',
        icon: <DashboardOutlined />,
        label: 'Bảng điều khiển',
    },
    {
        key: 'he-thong',
        icon: <SettingOutlined />,
        label: 'Quản lý hệ thống',
        children: [
            { key: '/dashboard/he-thong/vai-tro', label: 'Vai trò' },
            { key: '/dashboard/he-thong/phan-quyen', label: 'Phân quyền' },
            { key: '/dashboard/he-thong/danh-muc-khach-hang', label: 'Danh mục khách hàng' },
            { key: '/dashboard/he-thong/danh-muc-nhan-su', label: 'Danh mục nhân sự' },
            { key: '/dashboard/he-thong/chi-nhanh', label: 'Chi nhánh' },
            { key: '/dashboard/he-thong/kpi', label: 'KPI Targets' },
            { key: '/dashboard/he-thong/quan-ly-khu-vuc', label: 'Khu vực' },
            { key: '/dashboard/he-thong/doi-nhom', label: 'Đội/Nhóm' },
        ],
    },

    {
        key: 'tinh-luong',
        icon: <CalculatorOutlined />,
        label: 'Tính lương & Hoa hồng',
        children: [
            { key: '/dashboard/tinh-luong/ky-luong', label: 'Kỳ lương' },
            { key: '/dashboard/tinh-luong/bang-luong', label: 'Bảng lương' },
            { key: '/dashboard/tinh-luong/chinh-sach-hoa-hong', label: 'Chính sách hoa hồng' },
        ],
    },
    {
        key: 'quan-ly-du-an',
        icon: <ProjectOutlined />,
        label: 'Quản lý dự án',
        children: [
            { key: '/dashboard/quan-ly-du-an/thong-tin', label: 'Quản lý thông tin dự án' },
            { key: '/dashboard/quan-ly-du-an/giao-dich', label: 'Quản lý giao dịch' },
        ],
    },
    {
        key: 'bao-cao',
        icon: <BarChartOutlined />,
        label: 'Báo cáo',
        children: [
            { key: '/dashboard/bao-cao/doanh-thu', label: 'Báo cáo doanh thu' },
            { key: '/dashboard/bao-cao/hoa-hong', label: 'Báo cáo hoa hồng' },
            { key: '/dashboard/bao-cao/giao-dich', label: 'Báo cáo giao dịch' },
            { key: '/dashboard/bao-cao/nguon-khach', label: 'Báo cáo nguồn khách' },
            { key: '/dashboard/bao-cao/khu-vuc', label: 'Báo cáo khu vực' },
            { key: '/dashboard/bao-cao/giai-thuong', label: 'Báo cáo giải thưởng' },
        ],
    },

];

export default function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();

    const openKeys = menuItems
        .filter((item) => item.children?.some((c) => pathname.startsWith(c.key)))
        .map((item) => item.key);

    return (
        <Sider width={245} style={{ background: '#fff', minHeight: '100vh' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #f0f0f0' }}>
                <div style={{ color: '#E8890C', fontWeight: 800, fontSize: 22, letterSpacing: 1 }}>
                    NEWAY
                </div>
                <div style={{ color: '#888', fontSize: 11 }}>Niềm tin mới - Khởi đầu mới</div>
            </div>
            <Menu
                mode="inline"
                selectedKeys={[pathname]}
                defaultOpenKeys={openKeys}
                items={menuItems}
                onClick={({ key }) => router.push(key as any)}
                style={{ border: 'none', marginTop: 8 }}
            />
        </Sider>
    );
}
