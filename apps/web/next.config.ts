import type { NextConfig } from 'next';
// Touch next.config.ts to trigger dev server reload
import withBundleAnalyzer from '@next/bundle-analyzer';

const nextConfig: NextConfig = {
  compress: true,
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
    // Production performance QA runs on a dedicated local port while the API
    // remains on :4001. Proxy only in that opt-in mode so browser measurements
    // use the same-origin path and are not distorted by a local CORS policy.
    if (process.env.PERFORMANCE_QA_PROXY !== '1') return [];
    const apiOrigin = process.env.PERFORMANCE_QA_API_ORIGIN || 'http://localhost:4001';
    return [{ source: '/api/:path*', destination: `${apiOrigin}/api/:path*` }];
  },
};

export default withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
})(nextConfig);
