/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    serverComponentsExternalPackages: ['mysql2', 'bcryptjs', 'jsonwebtoken'],
  },
};

module.exports = nextConfig;
