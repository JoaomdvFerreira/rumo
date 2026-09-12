import type { NextConfig } from 'next';

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
};

export default nextConfig;
