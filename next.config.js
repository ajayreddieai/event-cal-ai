/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  // GitHub Pages serves from a subdirectory if not using custom domain
  // This will be overridden by GITHUB_ACTIONS environment variable during build
  basePath: process.env.NODE_ENV === 'production' && !process.env.GITHUB_ACTIONS ? '/event-cal-ai' : '',
  assetPrefix: process.env.NODE_ENV === 'production' && !process.env.GITHUB_ACTIONS ? '/event-cal-ai' : '',
};

module.exports = nextConfig;



