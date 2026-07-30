import './suppress-warnings';
import '@ant-design/v5-patch-for-react-19';
import type { Metadata } from 'next';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import './globals.css';

export const metadata: Metadata = {
  title: 'mos-lab — Wings Lashes CRM',
  description: 'Living Lab CRM Telesales for Wings Lashes',
};

import { ThemeProvider } from '../context/ThemeContext';
import { ErrorBoundary } from '../components/ErrorBoundary';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className="h-full">
      <body className="h-full m-0 p-0 antialiased">
        <ErrorBoundary>
          <AntdRegistry>
            <ThemeProvider>{children}</ThemeProvider>
          </AntdRegistry>
        </ErrorBoundary>
      </body>
    </html>
  );
}
