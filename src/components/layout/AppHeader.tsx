'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, LogOut, User, Search, ChevronDown } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import api from '@/lib/api';
import { authStorage } from '@/lib/auth';

export default function AppHeader() {
  const router = useRouter();
  const [user, setUser] = useState<{ fullName?: string; roles?: { role: { name: string } }[] } | null>(null);

  useEffect(() => {
    // Load from local cache first for instant display
    setUser(authStorage.getUser());
    // Then refresh from server
    api.get('/auth/me').then(({ data }) => {
      setUser(data);
      authStorage.setUser(data);
    }).catch(() => {});
  }, []);

  const handleLogout = () => {
    authStorage.clear();
    router.push('/login');
  };

  const initials = user?.fullName
    ? user.fullName.split(' ').slice(-2).map((w) => w[0]).join('').toUpperCase()
    : 'U';

  return (
    <header className="h-[76px] bg-white border-b border-gray-200 flex items-center justify-between px-6 sticky top-0 z-50">
      {/* Search */}
      <div className="relative w-72">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input placeholder="Tìm kiếm..." className="pl-9 h-9 rounded-full bg-gray-50 border-gray-200" />
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-4">
        {/* Notification */}
        <Button variant="ghost" size="icon" className="relative text-gray-500">
          <Bell className="h-5 w-5" />
        </Button>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2.5 hover:bg-gray-50 px-2 py-1.5 rounded-lg transition-colors">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs">{initials}</AvatarFallback>
              </Avatar>
              <div className="text-left leading-tight">
                <p className="text-sm font-semibold text-gray-800">{user?.fullName ?? '—'}</p>
                <p className="text-xs text-gray-400">
                  {user?.roles?.[0]?.role?.name ?? 'Admin'}
                </p>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>Tài khoản</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-gray-600">
              <User className="h-4 w-4" />
              Hồ sơ cá nhân
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600 focus:bg-red-50">
              <LogOut className="h-4 w-4" />
              Đăng xuất
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
