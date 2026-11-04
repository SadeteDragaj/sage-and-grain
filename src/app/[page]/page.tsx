import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { categories, getCategory, site } from '../../lib/content';
import { pageMetadata } from '../../lib/seo';
import { CategoryPage } from '../../views/CategoryPage';
import { INFO_PAGES, InfoPage, type InfoSlug } from '../../views/InfoPage';

// /gluten-free, /vegan, /healthy, /breakfast … and the info pages share the top level.
type Props = { params: Promise<{ page: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return [...categories.map((c) => ({ page: c.slug })), ...Object.keys(INFO_PAGES).map((page) => ({ page }))];
}

const isInfo = (page: string): page is InfoSlug => page in INFO_PAGES;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { page } = await params;
  const category = getCategory(page);
  if (category) return pageMetadata(site, { title: category.h1, description: category.meta_description, path: `/${category.slug}` });
  if (isInfo(page)) return pageMetadata(site, { title: INFO_PAGES[page].title, description: INFO_PAGES[page].description, path: `/${page}` });
  return {};
}

export default async function Page({ params }: Props) {
  const { page } = await params;
  const category = getCategory(page);
  if (category) return <CategoryPage key={category.slug} category={category} />;
  if (isInfo(page)) return <InfoPage slug={page} />;
  notFound();
}
