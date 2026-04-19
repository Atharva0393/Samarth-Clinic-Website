import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {},
  async rewrites() {
    return [
      {
        source: '/api/backend/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL}/:path*`,
      },
    ];
  },
};

export default nextConfig;
