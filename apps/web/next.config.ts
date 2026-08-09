import type { NextConfig } from 'next';
// Touch next.config.ts to trigger dev server reload
import withBundleAnalyzer from '@next/bundle-analyzer';

const nextConfig: NextConfig = {
  compress: true,
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
  async redirects() {
    return [
      {
        source: '/',
        destination: '/dashboard/customers',
        permanent: false,
      },
      {
        source: '/dashboard',
        destination: '/dashboard/customers',
        permanent: false,
      },
    ];
  },
};

export default withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
})(nextConfig);
