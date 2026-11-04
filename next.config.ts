import type { NextConfig } from 'next';
import { PHASE_DEVELOPMENT_SERVER } from 'next/constants';

/**
 * `npm run build` exports a fully static site to out/ (upload it to any host).
 *
 * The recipe admin (/admin) and the JSON API (/api/...) only exist under
 * `npm run dev`: their route files end in `.dev.ts`, which only the dev server
 * treats as routes, so they never reach the static export.
 */
export default function config(phase: string): NextConfig {
  const dev = phase === PHASE_DEVELOPMENT_SERVER;
  return {
    ...(dev ? {} : { output: 'export' }),
    pageExtensions: dev ? ['tsx', 'ts', 'dev.ts'] : ['tsx', 'ts'],
    // Your production domain, without a trailing slash. Used for canonical URLs,
    // JSON-LD and the sitemap:  SITE_URL=https://www.yourdomain.com npm run build
    env: { SITE_URL: (process.env.SITE_URL || 'https://www.example.com').replace(/\/+$/, '') },
    // The site loads no images through next/image (photos are plain <img> crops).
    images: { unoptimized: true },
    poweredByHeader: false,
  };
}
