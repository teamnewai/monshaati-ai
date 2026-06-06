import type { NextConfig } from 'next';

const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://fonts.googleapis.com",  // unsafe-eval needed by Next.js in dev; remove in strict prod
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob: https://*.supabase.co https://ui-avatars.com",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.openai.com https://api.stripe.com https://api.resend.com",
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "upgrade-insecure-requests",
].join('; ');

const nextConfig: NextConfig = {
  serverExternalPackages: ['jspdf'],

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Core security
          { key: 'X-Frame-Options',            value: 'DENY' },
          { key: 'X-Content-Type-Options',      value: 'nosniff' },
          { key: 'X-XSS-Protection',           value: '1; mode=block' },
          { key: 'Referrer-Policy',             value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy',          value: 'camera=(), microphone=(), geolocation=(), payment=()' },
          // HSTS — force HTTPS for 1 year
          { key: 'Strict-Transport-Security',   value: 'max-age=31536000; includeSubDomains; preload' },
          // CSP
          { key: 'Content-Security-Policy',     value: CSP },
          // IP / branding protection
          { key: 'X-Powered-By-Replaced',       value: 'Monshaati-AI' },
          { key: 'X-Content-Source',            value: 'monshaati.ai' },
        ],
      },
      // Extra headers for API routes
      {
        source: '/api/(.*)',
        headers: [
          { key: 'Cache-Control',              value: 'no-store, no-cache, must-revalidate' },
          { key: 'X-Robots-Tag',              value: 'noindex, nofollow' },
        ],
      },
      // CORS for public read-only API routes (consultants, library, etc.)
      {
        source: '/api/(sectors|consultants|library|marketplace/products|payg/prices|bi/help|bi/funding)',
        headers: [
          { key: 'Access-Control-Allow-Origin',  value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
          { key: 'Access-Control-Max-Age',       value: '86400' },
        ],
      },
      // Allow export files to be downloaded
      {
        source: '/api/export',
        headers: [
          { key: 'Content-Disposition', value: 'attachment' },
        ],
      },
    ];
  },

  eslint: {
    ignoreDuringBuilds: false,
  },

  typescript: {
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
