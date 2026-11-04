import Link from 'next/link';
import { site } from '../lib/content';

export interface Crumb {
  label: string;
  to: string;
}

/** Visible breadcrumb. Pair it with breadcrumbJsonLd() in the page's <Seo>. */
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="breadcrumb">
      <ol>
        {items.map((c, i) => (
          <li key={c.to}>
            {i < items.length - 1 ? <Link href={c.to}>{c.label}</Link> : <span aria-current="page">{c.label}</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function breadcrumbJsonLd(items: Crumb[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.label,
      item: `${site.site_url}${c.to}`,
    })),
  };
}
