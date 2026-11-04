import type { Metadata } from 'next';
import { site } from '../lib/content';
import { pageMetadata } from '../lib/seo';
import { NotFoundPage } from '../views/NotFoundPage';

export const metadata: Metadata = {
  ...pageMetadata(site, { title: 'Page not found', description: "We couldn't find that page.", path: '/404', noindex: true }),
  // Next.js adds the noindex tag to this page itself; a second one would be a duplicate.
  robots: undefined,
};

export default NotFoundPage;
