import type { NextConfig } from 'next';

const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    // Next.js emits inline bootstrap and style content. Keep this policy
    // self-contained while allowing that framework-required content only.
    value:
      "default-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; object-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; font-src 'self'; manifest-src 'self'; worker-src 'self' blob:",
  },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'accelerometer=(), autoplay=(), camera=(), geolocation=(), gyroscope=(), microphone=(), payment=(), usb=()',
  },
  // Browsers only honor HSTS over HTTPS. Vercel terminates HTTPS for preview
  // and production responses; omit `preload` until a controlled custom domain
  // meets the independent preload-list requirements.
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
] as const;

const nextConfig: NextConfig = {
  /**
   * Playwright's `playwright.config.ts` fixes `baseURL` at
   * `http://127.0.0.1:3000` while `pnpm dev` binds `localhost`; Next's
   * dev-only cross-origin guard otherwise blocks the RSC/client bundle from
   * hydrating when the two differ, leaving every button inert with no
   * console error. Dev-only setting -- has no effect on `next build`/`next
   * start`.
   */
  allowedDevOrigins: ['127.0.0.1'],
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
