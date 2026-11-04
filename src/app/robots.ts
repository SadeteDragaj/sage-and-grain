import type { MetadataRoute } from 'next';
import { site } from '../lib/content';

// Written to out/robots.txt at build time.
export const dynamic = 'force-static';

export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: '*', allow: '/' }, sitemap: `${site.site_url}/sitemap.xml` };
}
