import './suppress-warnings';
import '@ant-design/v5-patch-for-react-19';
import type { Metadata, Viewport } from 'next';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import 'katex/dist/katex.min.css';
import './globals.css';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#090d16',
};

export const metadata: Metadata = {
  title: 'mos-lab — Wings Lashes CRM',
  description: 'Living Lab CRM Telesales for Wings Lashes',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'mOS',
  },
  icons: {
    apple: '/apple-touch-icon.png',
  },
};

const PRE_HYDRATION_THEME_SCRIPT = `(function(){try{var r=document.documentElement;var pref=localStorage.getItem("mos_theme_preference");var mode=localStorage.getItem("mos_theme");var tid=localStorage.getItem("mos_core_theme")||"mos";var sysDark=window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches;var resolved=pref==="auto"?(sysDark?"dark":"light"):(pref==="light"||pref==="dark"?pref:(mode==="light"||mode==="dark"?mode:"dark"));var schemeContent=pref==="auto"?"light dark":resolved;var sm=document.querySelector('meta[name="color-scheme"]');if(sm){sm.setAttribute("content",schemeContent);}if(resolved==="light"){r.classList.remove("dark-theme","dark");r.classList.add("light-theme");}else{r.classList.remove("light-theme");r.classList.add("dark-theme","dark");}r.classList.add("theme-"+tid);r.dataset.theme=tid;r.dataset.themeBase=resolved;r.dataset.themePreference=pref||resolved;var bgMap={mos:{light:"#f5f7fa",dark:"#090d16"},"mos-light":{light:"#f8fafc",dark:"#0b0f19"},ivory:{light:"#f6f3ee",dark:"#141210"},midnight:{light:"#f0f6ff",dark:"#070a13"},emerald:{light:"#f0fbf5",dark:"#041410"},blush:{light:"#fdf4f6",dark:"#181116"},wings:{light:"#faf7f2",dark:"#0d0c0a"}};var bg=(bgMap[tid]&&bgMap[tid][resolved])||(resolved==="light"?"#f5f7fa":"#090d16");try{var rawCustom=localStorage.getItem("mos_custom_themes");if(rawCustom){var parsed=JSON.parse(rawCustom);if(parsed&&parsed[tid]&&parsed[tid].colors&&parsed[tid].base===resolved&&parsed[tid].colors.bgLayout){bg=parsed[tid].colors.bgLayout;}}}catch(_){}r.style.setProperty("--background",bg);r.style.backgroundColor=bg;var metas=document.querySelectorAll('meta[name="theme-color"]');for(var i=0;i<metas.length;i++){metas[i].removeAttribute("media");metas[i].setAttribute("content",bg);}}catch(_){}})();`;

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
        <meta name="color-scheme" content="light dark" />
        <script dangerouslySetInnerHTML={{ __html: PRE_HYDRATION_THEME_SCRIPT }} />
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
