import type { MetadataRoute } from 'next';
import { categories, recipes, site } from '../lib/content';
import { INFO_PAGES } from '../views/InfoPage';

// Written to out/sitemap.xml at build time.
export const dynamic = 'force-static';

const STATIC_PAGES = ['/', '/recipes', '/about', ...Object.keys(INFO_PAGES).map((p) => `/${p}`)];

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function sitemap(): MetadataRoute.Sitemap {
  const built = today();
  return [
    ...STATIC_PAGES.map((path) => ({ url: `${site.site_url}${path}`, lastModified: built })),
    ...categories.map((c) => ({ url: `${site.site_url}/${c.slug}`, lastModified: built })),
    ...recipes.map((r) => ({ url: `${site.site_url}/recipes/${r.slug}`, lastModified: r.date_modified })),
  ];
}
