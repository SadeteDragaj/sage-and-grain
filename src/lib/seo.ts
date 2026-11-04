import type { Metadata } from 'next';
import { DIET_LABELS, MEAL_LABELS } from './labels';
import type { Ingredient, Recipe, Site } from './types';

// Structured data. Everything marked up here is also visible on the page (Google
// requires that): title, image, description, author, dates, times, servings,
// ingredients, instructions, category, cuisine and diet.

const SCHEMA_DIETS: Partial<Record<string, string>> = {
  'gluten-free': 'https://schema.org/GlutenFreeDiet',
  vegan: 'https://schema.org/VeganDiet',
  vegetarian: 'https://schema.org/VegetarianDiet',
};

const FRACTIONS: Record<string, string> = { '0.25': '¼', '0.33': '⅓', '0.5': '½', '0.67': '⅔', '0.75': '¾' };

/** Exact amounts for the structured data: 0.5 → "½", 1.25 → "1¼", 1.1 → "1.1". */
export function formatQty(qty: number): string {
  const whole = Math.trunc(qty);
  const frac = Math.round((qty - whole) * 100) / 100;
  if (frac === 0) return String(whole);
  const symbol = FRACTIONS[String(frac)];
  if (!symbol) return String(Number(qty.toPrecision(6)));
  return whole ? `${whole}${symbol}` : symbol;
}

export function ingredientText(ing: Ingredient): string {
  const parts = [];
  if (ing.qty != null) parts.push(formatQty(ing.qty));
  if (ing.unit) parts.push(ing.unit);
  parts.push(ing.item);
  const text = parts.join(' ');
  return ing.note ? `${text}, ${ing.note}` : text;
}

export function isoMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `PT${hours ? `${hours}H` : ''}${mins || !hours ? `${mins}M` : ''}`;
}

/** Google wants 16:9, 4:3 and 1:1 crops. Upload them with these names. */
function imageUrls(recipe: Pick<Recipe, 'slug' | 'image'>, siteUrl: string) {
  const stem = recipe.image.src || `/images/recipes/${recipe.slug}`;
  return ['16x9', '4x3', '1x1'].map((ratio) => `${siteUrl}${stem}-${ratio}.jpg`);
}

export function recipeJsonLd(recipe: Omit<Recipe, 'json_ld'>, siteUrl: string): Record<string, unknown> {
  const url = `${siteUrl}/recipes/${recipe.slug}`;
  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Recipe',
    name: recipe.title,
    description: recipe.intro,
    image: imageUrls(recipe, siteUrl),
    author: { '@type': 'Person', name: recipe.author, url: `${siteUrl}/about` },
    datePublished: recipe.date_published,
    dateModified: recipe.date_modified,
    prepTime: isoMinutes(recipe.prep_minutes),
    cookTime: isoMinutes(recipe.cook_minutes),
    totalTime: isoMinutes(recipe.total_minutes),
    recipeYield: `${recipe.servings} ${recipe.yield_label}`,
    recipeCategory: MEAL_LABELS[recipe.meal],
    recipeCuisine: recipe.cuisine,
    keywords: [recipe.title.toLowerCase(), ...recipe.diets.map((d) => DIET_LABELS[d].toLowerCase())].join(', '),
    recipeIngredient: recipe.ingredients.map(ingredientText),
    recipeInstructions: recipe.steps.map((step, i) => ({
      '@type': 'HowToStep',
      position: i + 1,
      text: step.text,
      url: `${url}#step-${i + 1}`,
    })),
    url,
  };
  const diets = recipe.diets.map((d) => SCHEMA_DIETS[d]).filter(Boolean);
  if (diets.length) data.suitableForDiet = diets;
  // No aggregateRating: the site has no real reviews in v1.
  return data;
}

interface PageMeta {
  title: string;
  description: string;
  path: string;
  /** Use for pages Google shouldn't index (404). */
  noindex?: boolean;
  image?: string;
  type?: 'website' | 'article';
}

/** The <head> of every page: title, description, canonical URL and social cards. */
export function pageMetadata(site: Site, { title, description, path, noindex, image, type = 'website' }: PageMeta): Metadata {
  const url = `${site.site_url}${path}`;
  const fullTitle = path === '/' ? title : `${title} | ${site.name}`;
  return {
    title: { absolute: fullTitle },
    description,
    ...(noindex ? { robots: { index: false } } : { alternates: { canonical: url } }),
    openGraph: {
      siteName: site.name,
      title: fullTitle,
      description,
      type,
      url,
      ...(image ? { images: [image] } : {}),
    },
    twitter: { card: 'summary_large_image' },
  };
}
