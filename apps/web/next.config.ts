import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@agentos/shared'],
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
};

export default nextConfig;
