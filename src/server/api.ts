// The read-only JSON API at /api (dev server only; see src/app/api).

import { inCategory, matchesDiet } from '../lib/content';
import type { Diet, Sort } from '../lib/types';
import { recipeJsonLd } from '../lib/seo';
import { loadCategories, loadRecipes } from './content';
import { HttpError } from './http';
import type { RecipeData } from './schema';

const SITE_URL = process.env.SITE_URL || 'https://www.example.com';

const withTotal = (r: RecipeData) => ({ ...r, total_minutes: r.prep_minutes + r.cook_minutes });

const SUMMARY_FIELDS = [
  'slug', 'title', 'description', 'image', 'meal', 'diets', 'diet_options', 'collections', 'difficulty',
  'total_minutes', 'extra_time', 'popularity', 'date_published',
] as const;

export function summary(r: RecipeData) {
  const full = withTotal(r);
  return Object.fromEntries(SUMMARY_FIELDS.map((f) => [f, full[f]]));
}

export function detail(r: RecipeData) {
  const full = withTotal(r);
  return { ...full, json_ld: recipeJsonLd(full, SITE_URL) };
}

function invalid(loc: string, msg: string): never {
  throw new HttpError(422, [{ loc: ['query', loc], msg }]);
}

const TRUE = new Set(['1', 'true', 'yes', 'on', 't', 'y']);
const FALSE = new Set(['0', 'false', 'no', 'off', 'f', 'n']);

/** GET /api/recipes. Diets combine with AND; meals and difficulties with OR. */
export function listRecipes(params: URLSearchParams) {
  const time = params.get('time');
  if (time !== null && !['15', '30', '60'].includes(time)) invalid('time', "Input should be 15, 30 or 60");
  const sort = (params.get('sort') ?? 'newest') as Sort;
  if (!['newest', 'popular', 'quickest'].includes(sort)) invalid('sort', "Input should be 'newest', 'popular' or 'quickest'");
  const gf = params.get('gf_options')?.toLowerCase();
  if (gf !== undefined && !TRUE.has(gf) && !FALSE.has(gf)) invalid('gf_options', 'Input should be a valid boolean');
  const int = (name: string, fallback: number, min: number, max = Infinity) => {
    const raw = params.get(name);
    if (raw === null) return fallback;
    const n = Number(raw);
    if (!Number.isInteger(n)) invalid(name, 'Input should be a valid integer');
    if (n < min || n > max) invalid(name, n < min ? `Input should be greater than or equal to ${min}` : `Input should be less than or equal to ${max}`);
    return n;
  };
  const page = int('page', 1, 1);
  const perPage = int('per_page', 9, 1, 50);

  const diets = params.getAll('diet') as Diet[];
  const meals = params.getAll('meal');
  const difficulties = params.getAll('difficulty');
  const collection = params.get('collection');
  const q = (params.get('q') ?? '').trim().toLowerCase();
  const includeOptions = gf === undefined || TRUE.has(gf);

  const items = loadRecipes()
    .map(withTotal)
    .filter((r) => {
      if (diets.length && !diets.every((d) => matchesDiet(r, d, includeOptions))) return false;
      if (meals.length && !meals.includes(r.meal)) return false;
      if (time !== null && r.total_minutes > Number(time)) return false;
      if (difficulties.length && !difficulties.includes(r.difficulty)) return false;
      if (collection && !r.collections.includes(collection)) return false;
      if (q && ![r.title, r.description, ...r.ingredients.map((i) => i.item)].join(' ').toLowerCase().includes(q)) return false;
      return true;
    });
  if (sort === 'popular') items.sort((a, b) => a.popularity - b.popularity);
  else if (sort === 'quickest') items.sort((a, b) => a.total_minutes - b.total_minutes || (a.title < b.title ? -1 : a.title > b.title ? 1 : 0));
  else items.sort((a, b) => b.date_published.localeCompare(a.date_published));

  const pages = Math.max(1, Math.ceil(items.length / perPage));
  const current = Math.min(page, pages);
  return {
    total: items.length,
    page: current,
    pages,
    items: items.slice((current - 1) * perPage, current * perPage).map(summary),
  };
}

export function recipeDetail(slug: string) {
  const recipe = loadRecipes().find((r) => r.slug === slug);
  if (!recipe) throw new HttpError(404, 'Recipe not found');
  return detail(recipe);
}

export function listCategories() {
  return loadCategories().map((c) => ({ slug: c.slug, name: c.name, h1: c.h1 }));
}

export function categoryDetail(slug: string) {
  const category = loadCategories().find((c) => c.slug === slug);
  if (!category) throw new HttpError(404, 'Category not found');
  return { ...category, recipes: loadRecipes().filter((r) => inCategory(r, category)).map(summary) };
}
