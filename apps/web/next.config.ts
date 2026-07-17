import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@mos-lab/shared'],
  experimental: {
    optimizePackageImports: ['lucide-react', 'antd', '@ant-design/icons', 'dayjs'],
  },
};

export default nextConfig;
