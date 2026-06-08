/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  transpilePackages: ['@chatbot-platform/shared'],
  experimental: {
    // Enable server actions and other Next.js 15 features
  },
};

export default nextConfig;
