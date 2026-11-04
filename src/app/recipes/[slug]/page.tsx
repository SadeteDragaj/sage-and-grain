import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getRecipe, recipes, site } from '../../../lib/content';
import { pageMetadata } from '../../../lib/seo';
import { cleanArticle } from '../../../server/richtext';
import { RecipePage } from '../../../views/RecipePage';

type Props = { params: Promise<{ slug: string }> };

// Only the recipes in content/recipes.json exist; anything else is the 404 page.
export const dynamicParams = false;

export function generateStaticParams() {
  return recipes.map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const recipe = getRecipe((await params).slug);
  if (!recipe) return {};
  return pageMetadata(site, {
    title: recipe.title,
    description: recipe.intro,
    path: `/recipes/${recipe.slug}`,
    type: 'article',
    image: (recipe.json_ld.image as string[] | undefined)?.[0],
  });
}

export default async function Page({ params }: Props) {
  const recipe = getRecipe((await params).slug);
  if (!recipe) notFound();
  // The article is cleaned here, on the server, so the HTML cleaner never ships to the browser.
  return <RecipePage key={recipe.slug} recipe={{ ...recipe, article_html: cleanArticle(recipe.article_html) }} />;
}
