import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@mos-lab/shared'],
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
