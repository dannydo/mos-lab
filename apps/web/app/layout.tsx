import './suppress-warnings';
import '@ant-design/v5-patch-for-react-19';
import type { Metadata, Viewport } from 'next';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import './globals.css';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#090d16' },
  ],
};

export const metadata: Metadata = {
  title: 'mos-lab — Wings Lashes CRM',
  description: 'Living Lab CRM Telesales for Wings Lashes',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'mOS',
  },
  icons: {
    apple: '/apple-touch-icon.png',
  },
};

import { ThemeProvider } from '../context/ThemeContext';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { BugReportSurfacePortal } from '../components/bug-reports/BugReportSurfacePortal';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className="h-full" suppressHydrationWarning>
      <body className="h-full m-0 p-0 antialiased" suppressHydrationWarning>
        <AntdRegistry>
          <ThemeProvider>
            <ErrorBoundary>{children}</ErrorBoundary>
            <BugReportSurfacePortal />
          </ThemeProvider>
        </AntdRegistry>
      </body>
    </html>
  );
}
