'use client';
import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';
import {
  LayoutDashboard, BarChart3, FolderOpen, Settings, ChevronDown,
  TrendingUp, FileText, DollarSign, Users, Shield, Building2,
  UserCheck, Landmark, Receipt, FileCheck, MapPin, Award, Calculator,
  CreditCard, BadgePercent, UsersRound, Globe,
} from 'lucide-react';

interface MenuItem {
  key: string;
  label: string;
  icon: React.ReactNode;
  children?: { key: string; label: string; icon?: React.ReactNode }[];
}

const menuItems: MenuItem[] = [
  {
    key: '/dashboard',
    label: 'Bảng điều khiển',
    icon: <LayoutDashboard className="h-4 w-4" />,
  },
  {
    key: 'bao-cao',
    label: 'Báo cáo & Thống kê',
    icon: <BarChart3 className="h-4 w-4" />,
    children: [
      { key: '/dashboard/bao-cao/doanh-thu', label: 'Doanh thu', icon: <TrendingUp className="h-3.5 w-3.5" /> },
      { key: '/dashboard/bao-cao/giao-dich', label: 'Giao dịch', icon: <FileText className="h-3.5 w-3.5" /> },
      { key: '/dashboard/bao-cao/hoa-hong', label: 'Hoa hồng', icon: <DollarSign className="h-3.5 w-3.5" /> },
      { key: '/dashboard/bao-cao/nguon-khach', label: 'Nguồn khách', icon: <Users className="h-3.5 w-3.5" /> },
      { key: '/dashboard/bao-cao/khu-vuc', label: 'Khu vực', icon: <MapPin className="h-3.5 w-3.5" /> },
      { key: '/dashboard/bao-cao/giai-thuong', label: 'Giải thưởng', icon: <Award className="h-3.5 w-3.5" /> },
    ],
  },
  {
    key: 'tinh-luong',
    label: 'Tính lương & Hoa hồng',
    icon: <Calculator className="h-4 w-4" />,
    children: [
      { key: '/dashboard/tinh-luong/ky-luong', label: 'Kỳ lương', icon: <FileCheck className="h-3.5 w-3.5" /> },
      { key: '/dashboard/tinh-luong/bang-luong', label: 'Bảng lương', icon: <Receipt className="h-3.5 w-3.5" /> },
      { key: '/dashboard/tinh-luong/chinh-sach-hoa-hong', label: 'Chính sách hoa hồng', icon: <BadgePercent className="h-3.5 w-3.5" /> },
    ],
  },
  {
    key: 'uy-nhiem-chi',
    label: 'Uỷ nhiệm chi',
    icon: <CreditCard className="h-4 w-4" />,
    children: [
      { key: '/dashboard/uy-nhiem-chi', label: 'Danh sách UNC', icon: <FileText className="h-3.5 w-3.5" /> },
      { key: '/dashboard/uy-nhiem-chi/canh-bao', label: 'Cảnh báo cọc', icon: <Shield className="h-3.5 w-3.5" /> },
    ],
  },
  {
    key: 'quan-ly-du-an',
    label: 'Quản lý dự án',
    icon: <FolderOpen className="h-4 w-4" />,
    children: [
      { key: '/dashboard/quan-ly-du-an/thong-tin', label: 'Thông tin dự án', icon: <Building2 className="h-3.5 w-3.5" /> },
      { key: '/dashboard/quan-ly-du-an/doanh-thu', label: 'Quản lý doanh thu', icon: <TrendingUp className="h-3.5 w-3.5" /> },
      { key: '/dashboard/quan-ly-du-an/giao-dich', label: 'Quản lý giao dịch', icon: <FileText className="h-3.5 w-3.5" /> },
    ],
  },
  {
    key: 'he-thong',
    label: 'Quản lý hệ thống',
    icon: <Settings className="h-4 w-4" />,
    children: [
      { key: '/dashboard/he-thong/nguoi-dung', label: 'Người dùng', icon: <Users className="h-3.5 w-3.5" /> },
      { key: '/dashboard/he-thong/vai-tro', label: 'Vai trò', icon: <Shield className="h-3.5 w-3.5" /> },
      { key: '/dashboard/he-thong/phan-quyen', label: 'Phân quyền', icon: <UserCheck className="h-3.5 w-3.5" /> },
      { key: '/dashboard/he-thong/kpi', label: 'KPI Targets', icon: <TrendingUp className="h-3.5 w-3.5" /> },
      { key: '/dashboard/he-thong/danh-muc-du-an', label: 'Danh mục dự án', icon: <Building2 className="h-3.5 w-3.5" /> },
      { key: '/dashboard/he-thong/danh-muc-khach-hang', label: 'Danh mục khách hàng', icon: <Users className="h-3.5 w-3.5" /> },
      { key: '/dashboard/he-thong/danh-muc-nhan-su', label: 'Danh mục nhân sự', icon: <UserCheck className="h-3.5 w-3.5" /> },
      { key: '/dashboard/he-thong/chi-nhanh', label: 'Chi nhánh', icon: <Landmark className="h-3.5 w-3.5" /> },
      { key: '/dashboard/he-thong/quan-ly-khu-vuc', label: 'Khu vực', icon: <Globe className="h-3.5 w-3.5" /> },
      { key: '/dashboard/he-thong/doi-nhom', label: 'Đội/Nhóm', icon: <UsersRound className="h-3.5 w-3.5" /> },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const defaultOpen = menuItems
    .filter((item) => item.children?.some((c) => pathname.startsWith(c.key)))
    .map((item) => item.key);

  const [openKeys, setOpenKeys] = useState<string[]>(defaultOpen);

  const toggleKey = (key: string) => {
    setOpenKeys((prev) => prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]);
  };

  return (
    <aside className="w-[245px] min-h-screen bg-white border-r border-gray-200 flex flex-col">
      {/* Logo */}
      <div className="h-[76px] flex flex-col justify-center px-5 border-b border-gray-100">
        <div className="text-[#E8890C] font-extrabold text-[22px] tracking-wide">NEWAY</div>
        <div className="text-gray-400 text-[11px]">Niềm tin mới - Khởi đầu mới</div>
      </div>

      {/* Menu */}
      <nav className="flex-1 overflow-y-auto py-2">
        {menuItems.map((item) => {
          if (!item.children) {
            const isActive = pathname === item.key;
            return (
              <button
                key={item.key}
                onClick={() => router.push(item.key)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors text-left',
                  isActive
                    ? 'bg-orange-50 text-[#E8890C] font-semibold border-r-2 border-[#E8890C]'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                )}
              >
                {item.icon}
                {item.label}
              </button>
            );
          }

          const isGroupActive = item.children.some((c) => pathname.startsWith(c.key));
          const isOpen = openKeys.includes(item.key);

          return (
            <Collapsible key={item.key} open={isOpen} onOpenChange={() => toggleKey(item.key)}>
              <CollapsibleTrigger className={cn(
                'w-full flex items-center justify-between gap-3 px-4 py-2.5 text-sm transition-colors',
                isGroupActive ? 'text-[#E8890C] font-semibold' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
              )}>
                <span className="flex items-center gap-3">
                  {item.icon}
                  {item.label}
                </span>
                <ChevronDown className={cn('h-3.5 w-3.5 transition-transform text-gray-400', isOpen && 'rotate-180')} />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="ml-4 border-l border-gray-100 pl-3 py-1 space-y-0.5">
                  {item.children.map((child) => {
                    const isActive = pathname.startsWith(child.key);
                    return (
                      <button
                        key={child.key}
                        onClick={() => router.push(child.key)}
                        className={cn(
                          'w-full flex items-center gap-2.5 px-3 py-2 text-[13px] rounded-md transition-colors text-left',
                          isActive
                            ? 'bg-orange-50 text-[#E8890C] font-medium'
                            : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800',
                        )}
                      >
                        {child.icon}
                        {child.label}
                      </button>
                    );
                  })}
                </div>
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-gray-100">
        <p className="text-[10px] text-gray-400 text-center leading-relaxed">
          © 2026 Neway Home<br />
          Web Design by Vinasoftware
        </p>
      </div>
    </aside>
  );
}
