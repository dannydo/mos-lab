import type { NextConfig } from 'next';
import { networkInterfaces } from 'node:os';
// Touch next.config.ts to trigger dev server reload
import withBundleAnalyzer from '@next/bundle-analyzer';

function localIpv4Hosts(): string[] {
  return Array.from(
    new Set(
      Object.values(networkInterfaces())
        .flatMap((entries) => entries || [])
        .filter((entry) => entry.family === 'IPv4' && !entry.internal)
        .map((entry) => entry.address)
    )
  );
}

const nextConfig: NextConfig = {
  compress: true,
  // Staff opens the dev app from localhost, while workshop participants scan
  // a LAN QR. Next 16 blocks its dev runtime/WebSocket when that LAN host is
  // not explicitly trusted, which leaves Safari on the server-rendered
  // "Đang vào workshop…" shell forever.
  // Resolve the current interfaces at server start so DHCP changes do not
  // silently break newly generated workshop QR links.
  allowedDevOrigins: localIpv4Hosts(),
  // Keeps an explicit production build isolated from the live dev server when
  // responsive performance QA runs locally. Defaults to Next's `.next`.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  reactStrictMode: true,
  transpilePackages: [
    '@mos-lab/shared',
    'antd',
    '@ant-design/icons',
    '@ant-design/cssinjs',
    'rc-util',
    'rc-pagination',
    'rc-picker',
    'rc-table',
    'rc-tree',
    'rc-select',
    'dayjs',
    'lucide-react',
  ],
  turbopack: {},
  experimental: {
    optimizePackageImports: ['lucide-react', 'antd', '@ant-design/icons', 'dayjs'],
  },
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        ignored: ['**/node_modules/**', '**/.git/**', '**/.next/**'],
      };
    }
    return config;
  },
  async rewrites() {
    // LAN devices must use the web origin so iOS does not need a second local
    // network connection/CORS grant for Fastify on :4001. Production keeps its
    // configured API origin unless the dedicated performance proxy is enabled.
    const shouldProxyApi = process.env.NODE_ENV === 'development' || process.env.PERFORMANCE_QA_PROXY === '1';
    if (!shouldProxyApi) return [];
    const apiOrigin = process.env.PERFORMANCE_QA_API_ORIGIN || 'http://localhost:4001';
    return [{ source: '/api/:path*', destination: `${apiOrigin}/api/:path*` }];
  },
};

export default withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
})(nextConfig);
