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

import { Suspense } from 'react';
import { ThemeProvider } from '../context/ThemeContext';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { BugReportSurfacePortal } from '../components/bug-reports/BugReportSurfacePortal';
import { FrontendTelemetryProvider } from '../components/telemetry/FrontendTelemetryProvider';

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
            __html: `(function(){var K="mos_chunk_reload_ts";function isChunkError(e){if(!e)return false;var m=typeof e==="string"?e:(e.message||(e.reason&&e.reason.message)||e.reason||"");var n=e.name||(e.reason&&e.reason.name)||"";var s=String(n)+" "+String(m);return/ChunkLoadError/i.test(s)||/Loading chunk [\\w-]+ failed/i.test(s)||/Failed to load chunk/i.test(s)||/CSS_CHUNK_LOAD_FAILED/i.test(s)||/Failed to fetch dynamically imported module/i.test(s)||/Loading CSS chunk/i.test(s)}function tryReload(err){if(window.__mos_chunk_reloading)return;if(!isChunkError(err))return;try{var l=sessionStorage.getItem(K);var now=Date.now();if(l&&(now-parseInt(l,10))<15000)return;sessionStorage.setItem(K,String(now));window.__mos_chunk_reloading=true;console.warn("[ChunkReloader] Stale chunk detected, auto-reloading once...",err);window.location.reload()}catch(x){}}window.addEventListener("error",function(ev){if(ev.target&&(ev.target.tagName==="SCRIPT"||ev.target.tagName==="LINK")){var src=ev.target.src||ev.target.href||"";if(src.indexOf("/_next/static/")!==-1){tryReload("Failed to load chunk asset: "+src);return}}tryReload(ev.error||ev.message)},true);window.addEventListener("unhandledrejection",function(ev){tryReload(ev.reason)})})();`,
          }}
        />
      </head>
      <body className="h-full m-0 p-0 antialiased" suppressHydrationWarning>
        <AntdRegistry>
          <ThemeProvider>
            <Suspense fallback={null}>
              <FrontendTelemetryProvider />
            </Suspense>
            <ErrorBoundary>{children}</ErrorBoundary>
            <BugReportSurfacePortal />
          </ThemeProvider>
        </AntdRegistry>
      </body>
    </html>
  );
}
