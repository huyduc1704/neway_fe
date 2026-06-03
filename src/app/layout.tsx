import type { Metadata } from 'next';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import { ConfigProvider } from 'antd';
import viVN from 'antd/locale/vi_VN';
import dayjs from 'dayjs';
import 'dayjs/locale/vi';
import { Toaster } from 'sonner';
import './globals.css';

dayjs.locale('vi');

export const metadata: Metadata = { title: 'Neway Home', description: 'Hệ thống quản lý hồ sơ' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>
        <AntdRegistry>
          <ConfigProvider
            locale={viVN}
            theme={{
              token: {
                colorPrimary: '#E8890C',
                borderRadius: 6,
                fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              },
            }}
          >
            {children}
            <Toaster position="top-right" richColors />
          </ConfigProvider>
        </AntdRegistry>
      </body>
    </html>
  );
}
