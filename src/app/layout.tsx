import type { Metadata } from 'next';
import dayjs from 'dayjs';
import 'dayjs/locale/vi';
import { Toaster } from 'sonner';
import './globals.css';

dayjs.locale('vi');

export const metadata: Metadata = {
  title: 'Neway Home',
  description: 'Hệ thống quản lý hồ sơ',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
