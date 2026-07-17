import type { NextConfig } from 'next';
import withBundleAnalyzer from '@next/bundle-analyzer';

const nextConfig: NextConfig = {
  transpilePackages: ['@mos-lab/shared'],
  experimental: {
    optimizePackageImports: ['lucide-react', 'antd', '@ant-design/icons', 'dayjs'],
  },
};

export default withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
})(nextConfig);
