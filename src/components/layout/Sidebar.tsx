'use client';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Layout, Menu, ConfigProvider, Spin } from 'antd';
import {
    DashboardOutlined, BarChartOutlined, ProjectOutlined,
    SettingOutlined, CalculatorOutlined, HomeOutlined, FileTextOutlined,
} from '@ant-design/icons';
import { useUser } from '@/context/UserContext';

const { Sider } = Layout;

// ── Menu config với permission tương ứng ─────────────────────────────────────
// permission: null → hiển thị với tất cả
// permission: 'RESOURCE_ACTION' → ẩn nếu không có quyền

const MENU_CONFIG = [
    {
        key: '/dashboard',
        icon: <HomeOutlined />,
        label: <Link href="/dashboard">Trang chủ</Link>,
        permission: null,
    },
    {
        key: 'quan-ly-du-an',
        icon: <ProjectOutlined />,
        label: 'Quản lý dự án',
        children: [
            { key: '/dashboard/quan-ly-du-an/thong-tin', label: <Link href="/dashboard/quan-ly-du-an/thong-tin">Giao dịch cọc</Link>, permission: 'TRANSACTION_VIEW' },
            { key: '/dashboard/quan-ly-du-an/giao-dich', label: <Link href="/dashboard/quan-ly-du-an/giao-dich">Giao dịch thành công</Link>, permission: 'TRANSACTION_VIEW' },
        ],
    },
    {
        key: '/dashboard/uy-nhiem-chi',
        icon: <FileTextOutlined />,
        label: <Link href="/dashboard/uy-nhiem-chi">Uỷ Nhiệm Chi</Link>,
        permission: 'DISBURSEMENT_VIEW',
    },
    {
        key: 'tinh-luong',
        icon: <CalculatorOutlined />,
        label: 'Tính lương & Hoa hồng',
        children: [
            { key: '/dashboard/tinh-luong/ky-luong', label: <Link href="/dashboard/tinh-luong/ky-luong">Kỳ lương</Link>, permission: 'PAYROLL_VIEW' },
            { key: '/dashboard/tinh-luong/bang-luong', label: <Link href="/dashboard/tinh-luong/bang-luong">Bảng lương</Link>, permission: 'PAYROLL_VIEW' },
        ],
    },
    {
        key: 'bao-cao',
        icon: <BarChartOutlined />,
        label: 'Báo cáo',
        children: [
            { key: '/dashboard/bao-cao/doanh-thu', label: <Link href="/dashboard/bao-cao/doanh-thu">Báo cáo doanh thu</Link>, permission: 'REPORT_VIEW' },
{ key: '/dashboard/bao-cao/giao-dich', label: <Link href="/dashboard/bao-cao/giao-dich">Báo cáo giao dịch</Link>, permission: 'REPORT_VIEW' },
            { key: '/dashboard/bao-cao/nguon-khach', label: <Link href="/dashboard/bao-cao/nguon-khach">Báo cáo nguồn khách</Link>, permission: 'REPORT_VIEW' },
            { key: '/dashboard/bao-cao/khu-vuc', label: <Link href="/dashboard/bao-cao/khu-vuc">Báo cáo khu vực</Link>, permission: 'REPORT_VIEW' },
            { key: '/dashboard/bao-cao/giai-thuong', label: <Link href="/dashboard/bao-cao/giai-thuong">Báo cáo giải thưởng</Link>, permission: 'REPORT_VIEW' },
        ],
    },
    {
        key: 'he-thong',
        icon: <SettingOutlined />,
        label: 'Quản lý hệ thống',
        children: [
            { key: '/dashboard/he-thong/vai-tro', label: <Link href="/dashboard/he-thong/vai-tro">Vai trò</Link>, permission: 'ROLE_VIEW' },
            { key: '/dashboard/he-thong/phan-quyen', label: <Link href="/dashboard/he-thong/phan-quyen">Phân quyền</Link>, permission: 'PERMISSION_VIEW' },
            { key: '/dashboard/he-thong/danh-muc-khach-hang', label: <Link href="/dashboard/he-thong/danh-muc-khach-hang">Danh mục khách hàng</Link>, permission: 'CUSTOMER_VIEW' },
            { key: '/dashboard/he-thong/danh-muc-nhan-su', label: <Link href="/dashboard/he-thong/danh-muc-nhan-su">Danh mục nhân sự</Link>, permission: 'EMPLOYEE_VIEW' },
            { key: '/dashboard/he-thong/chi-nhanh', label: <Link href="/dashboard/he-thong/chi-nhanh">Chi nhánh</Link>, permission: 'BRANCH_VIEW' },
{ key: '/dashboard/he-thong/quan-ly-khu-vuc', label: <Link href="/dashboard/he-thong/quan-ly-khu-vuc">Khu vực</Link>, permission: 'REGION_VIEW' },
            { key: '/dashboard/he-thong/doi-nhom', label: <Link href="/dashboard/he-thong/doi-nhom">Đội/Nhóm</Link>, permission: 'TEAM_VIEW' },
        ],
    },
];

// Loại bỏ field `permission` trước khi truyền vào Ant Design Menu,
// và ẩn những item mà user không có quyền truy cập.
function buildMenuItems(config: typeof MENU_CONFIG, can: (p: string) => boolean): any[] {
    return config
        .map((item) => {
            if ('children' in item && item.children) {
                const visibleChildren = item.children
                    .filter((c) => !c.permission || can(c.permission))
                    .map(({ permission: _, ...rest }) => rest);
                if (visibleChildren.length === 0) return null;
                const { permission: _, ...rest } = item as any;
                return { ...rest, children: visibleChildren };
            }
            const p = (item as any).permission;
            if (p && !can(p)) return null;
            const { permission: _, ...rest } = item as any;
            return rest;
        })
        .filter(Boolean);
}

export default function Sidebar() {
    const pathname = usePathname();
    const { can, loading } = useUser();

    const menuItems = buildMenuItems(MENU_CONFIG, can);

    const openKeys = MENU_CONFIG
        .filter((item) => 'children' in item && item.children?.some((c) => pathname.startsWith(c.key)))
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
                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '32px 0' }}>
                        <Spin size="small" />
                    </div>
                ) : (
                    <Menu
                        mode="inline"
                        selectedKeys={[pathname]}
                        defaultOpenKeys={openKeys}
                        items={menuItems}
                        style={{ border: 'none', marginTop: 8 }}
                    />
                )}
            </ConfigProvider>
        </Sider>
    );
}
