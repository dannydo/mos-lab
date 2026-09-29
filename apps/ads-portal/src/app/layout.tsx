import './suppress-warnings';
import '@ant-design/v5-patch-for-react-19';
import type { Metadata } from 'next';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import { ThemeProvider } from '../context/ThemeContext';
import './globals.css';

export const metadata: Metadata = {
  title: 'Wings Ads & Lead Portal',
  description: 'Wings Lashes & Academy Marketing and Lead Pipeline Management Portal',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className="h-full">
      <head>
        <meta name="color-scheme" content="light dark" />
      </head>
      <body className="h-full m-0 p-0 antialiased font-sans">
        <a href="#main-content" className="visually-hidden">
          Chuyển sang nội dung chính
        </a>
        <AntdRegistry>
          <ThemeProvider>{children}</ThemeProvider>
        </AntdRegistry>
      </body>
    </html>
  );
}
