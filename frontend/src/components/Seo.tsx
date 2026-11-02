import { Helmet } from 'react-helmet-async';
import { site } from '../lib/content';

interface Props {
  title: string;
  description: string;
  path: string;
  /** Use for pages Google shouldn't index (404). */
  noindex?: boolean;
  jsonLd?: Record<string, unknown>[];
  image?: string;
  type?: 'website' | 'article';
}

export function Seo({ title, description, path, noindex, jsonLd = [], image, type = 'website' }: Props) {
  const url = `${site.site_url}${path}`;
  const fullTitle = path === '/' ? title : `${title} | ${site.name}`;
  return (
    <Helmet prioritizeSeoTags>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {noindex ? <meta name="robots" content="noindex" /> : <link rel="canonical" href={url} />}
      <meta property="og:site_name" content={site.name} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={type} />
      <meta property="og:url" content={url} />
      {image && <meta property="og:image" content={image} />}
      <meta name="twitter:card" content="summary_large_image" />
      {jsonLd.map((data, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(data)}
        </script>
      ))}
    </Helmet>
  );
}
