/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
  async rewrites() {
    // Determine internal/backend destination for API proxying
    const rawBackend = process.env.BACKEND_INTERNAL_URL || process.env.BACKEND_URL || 'https://doon-riders-backend.onrender.com';
    const targetBase = rawBackend.replace(/\/api\/?$/, '').replace(/\/+$/, '');

    return [
      {
        source: '/api/:path*',
        destination: `${targetBase}/api/:path*`,
      },
      {
        source: '/uploads/:path*',
        destination: `${targetBase}/uploads/:path*`,
      },
    ];
  },
};

export default nextConfig;
