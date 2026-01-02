const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Only use standalone output in production builds (for Docker deployment)
  ...(process.env.NODE_ENV === 'production' ? { output: 'standalone' } : {}),
  async redirects() {
    return [
      // Backward-compatible redirects: we consolidated analytics into /reports
      { source: '/analytics', destination: '/reports', permanent: false },
      { source: '/bases/analytics', destination: '/reports', permanent: false },
    ];
  },
  typescript: {
    // Allow build to continue even with type errors during development
    ignoreBuildErrors: false,
  },
  eslint: {
    // Allow build to continue even with lint errors during development
    ignoreDuringBuilds: false,
  },
  webpack: (config, { isServer }) => {
    // Add path aliases
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname),
    };
    
    // Fix for potential module resolution issues
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    
    return config;
  }
};

module.exports = nextConfig;
