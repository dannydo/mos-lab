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
import { BugReportSurfacePortal } from '../components/bug-reports/BugReportSurfacePortal';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className="h-full" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var mode = localStorage.getItem('mos_theme');
                  var supportDark = mode === 'dark' || (!mode && window.matchMedia('(prefers-color-scheme: dark)').matches);
                  if (supportDark) {
                    document.documentElement.classList.add('dark-theme', 'dark');
                    document.documentElement.classList.remove('light-theme');
                  } else {
                    document.documentElement.classList.add('light-theme');
                    document.documentElement.classList.remove('dark-theme', 'dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
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
