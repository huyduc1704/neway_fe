import Sidebar from '@/components/layout/Sidebar';
import AppHeader from '@/components/layout/AppHeader';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[#f0f2f5]">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <AppHeader />
        <main className="flex-1 p-6">
          {children}
        </main>
        <footer className="text-center text-[11px] text-gray-400 py-3 px-6 border-t border-gray-200 bg-white">
          ĐC: 64 Bình Long, Phường Phú Thạnh, TP.HCM | Email: newayhome267@gmail.com | Hotline: 0916 793 576
          <br />Copyright ©2026. Bản quyền thuộc về <strong className="text-gray-600">Neway Home</strong>. Web Design by Vinasoftware (VNS)
        </footer>
      </div>
    </div>
  );
}
