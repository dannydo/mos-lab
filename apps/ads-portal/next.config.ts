import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@mos-lab/shared'],
  outputFileTracingIncludes: {
    '/api/run-report': ['./scripts/*.py', './configs/academy_config.json'],
    '/api/sync-pancake': ['./scripts/auto_sync_pancake.py', './scripts/lib/*.py'],
  },
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
};

export default nextConfig;
