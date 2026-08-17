/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: false,
  },
  images: { unoptimized: true },
  poweredByHeader: false,
  // Enables instrumentation.ts (Next.js 13) — used only to start the
  // Telegram notification checker interval on server boot.
  experimental: {
    instrumentationHook: true,
  },
  async headers() {
    return [
      {
        // Never attach nosniff to /_next/static — if Next.js (especially in
        // dev HMR) briefly serves an HTML fallback for a CSS chunk, nosniff
        // makes the browser refuse the stylesheet ("MIME type text/html").
        source: '/((?!_next/static|_next/image).*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
