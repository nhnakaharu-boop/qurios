/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Build tolerance (type errors caught in IDE, not CI)
  eslint:     { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },

  // Opt out of telemetry
  env: { NEXT_TELEMETRY_DISABLED: '1' },

  // Image optimization
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co', pathname: '/storage/v1/object/public/**' },
    ],
    formats: ['image/avif', 'image/webp'],
  },

  // Compiler optimizations (remove console.log in production)
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error', 'warn'] } : false,
  },

  // Compression
  compress: true,

  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options',            value: 'DENY' },
          { key: 'X-Content-Type-Options',      value: 'nosniff' },
          { key: 'Referrer-Policy',             value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy',          value: 'camera=self, microphone=self, geolocation=()' },
          { key: 'Strict-Transport-Security',   value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'X-XSS-Protection',            value: '1; mode=block' },
          { key: 'X-DNS-Prefetch-Control',      value: 'on' },
        ],
      },
      {
        source: '/api/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate, proxy-revalidate' },
          { key: 'Pragma',        value: 'no-cache' },
        ],
      },
      {
        // Static assets: long cache
        source: '/_next/static/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
