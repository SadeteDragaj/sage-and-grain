import recipesJson from '../../content/recipes.json';
import categoriesJson from '../../content/categories.json';
import siteJson from '../../content/site.json';
import { fill } from './defaults';
import { minutes } from './format';
import { DIET_LABELS, DIFFICULTY_LABELS, MEAL_LABELS, SORT_LABELS } from './labels';
import { recipeJsonLd } from './seo';
import type { Category, Diet, Difficulty, Meal, Recipe, Site, Sort } from './types';

export { DIET_LABELS, DIFFICULTY_LABELS, MEAL_LABELS, SORT_LABELS };

// Content lives in content/*.json: edit it in the admin (/admin under `npm run dev`)
// or by hand. It is validated on every build and admin save (src/server/content.ts).
const SITE_URL = process.env.SITE_URL || 'https://www.example.com';

export const recipes: Recipe[] = (recipesJson as unknown as Record<string, unknown>[]).map((raw) => {
  const r = fill('recipe', raw) as Omit<Recipe, 'total_minutes' | 'json_ld'>;
  const recipe = { ...r, total_minutes: r.prep_minutes + r.cook_minutes };
  return { ...recipe, json_ld: recipeJsonLd(recipe, SITE_URL) };
});

export const categories: Category[] = (categoriesJson as unknown as Record<string, unknown>[]).map((raw) => {
  const c = fill('category', raw) as Omit<Category, 'recipe_slugs' | 'option_slugs'>;
  return {
    ...c,
    recipe_slugs: recipes.filter((r) => inCategory(r, c)).map((r) => r.slug),
    option_slugs: recipes.filter((r) => inCategory(r, c, true) && !inCategory(r, c)).map((r) => r.slug),
  };
});

export const site: Site = { ...(siteJson as unknown as Omit<Site, 'site_url'>), site_url: SITE_URL };

export const TIME_OPTIONS = [15, 30, 60] as const;

export const DIETS = Object.keys(DIET_LABELS) as Diet[];
export const MEALS = Object.keys(MEAL_LABELS) as Meal[];
export const DIFFICULTIES = Object.keys(DIFFICULTY_LABELS) as Difficulty[];

/** Main navigation categories, in order. */
export const NAV_CATEGORIES = ['gluten-free', 'vegan', 'healthy'];

export function getRecipe(slug: string) {
  return recipes.find((r) => r.slug === slug);
}

export function getCategory(slug: string) {
  return categories.find((c) => c.slug === slug);
}

export function bySlugs(slugs: string[]) {
  return slugs.map(getRecipe).filter((r): r is Recipe => Boolean(r));
}

/** Where a diet tag links: its category page if there is one, else the filtered listing. */
export function dietHref(diet: Diet) {
  return getCategory(diet) ? `/${diet}` : `/recipes?diet=${diet}`;
}

export function mealHref(meal: Meal) {
  if (meal === 'snack' || meal === 'dessert') return '/snacks-desserts';
  return `/${meal}`;
}

// ---- Filtering ----

export interface Filters {
  diets: Diet[];
  meal: Meal | null;
  time: 15 | 30 | 60 | null;
  difficulties: Difficulty[];
  collection: string | null;
  q: string;
  sort: Sort;
  gfOptions: boolean;
  saved: boolean;
  page: number;
}

export const EMPTY_FILTERS: Filters = {
  diets: [],
  meal: null,
  time: null,
  difficulties: [],
  collection: null,
  q: '',
  sort: 'newest',
  gfOptions: true,
  saved: false,
  page: 1,
};

export function parseFilters(params: URLSearchParams): Filters {
  const time = Number(params.get('time'));
  const sort = params.get('sort') as Sort | null;
  const meal = params.get('meal') as Meal | null;
  return {
    diets: params.getAll('diet').filter((d): d is Diet => d in DIET_LABELS),
    meal: meal && meal in MEAL_LABELS ? meal : null,
    time: time === 15 || time === 30 || time === 60 ? time : null,
    difficulties: params.getAll('difficulty').filter((d): d is Difficulty => d in DIFFICULTY_LABELS),
    collection: params.get('collection'),
    q: params.get('q') ?? '',
    sort: sort && sort in SORT_LABELS ? sort : 'newest',
    gfOptions: params.get('gf_options') !== '0',
    saved: params.get('saved') === '1',
    page: Math.max(1, Number(params.get('page')) || 1),
  };
}

export function filtersToParams(f: Filters): URLSearchParams {
  const p = new URLSearchParams();
  if (f.q) p.set('q', f.q);
  f.diets.forEach((d) => p.append('diet', d));
  if (f.meal) p.set('meal', f.meal);
  if (f.time) p.set('time', String(f.time));
  f.difficulties.forEach((d) => p.append('difficulty', d));
  if (f.collection) p.set('collection', f.collection);
  if (!f.gfOptions) p.set('gf_options', '0');
  if (f.saved) p.set('saved', '1');
  if (f.sort !== 'newest') p.set('sort', f.sort);
  if (f.page > 1) p.set('page', String(f.page));
  return p;
}

export function activeFilterCount(f: Filters) {
  return f.diets.length + (f.meal ? 1 : 0) + (f.time ? 1 : 0) + f.difficulties.length + (f.collection ? 1 : 0) + (f.saved ? 1 : 0);
}

export function matchesDiet(r: Pick<Recipe, 'diets' | 'diet_options'>, diet: Diet, includeOptions: boolean) {
  if (r.diets.includes(diet)) return true;
  // Every vegan recipe is also vegetarian.
  if (diet === 'vegetarian' && r.diets.includes('vegan')) return true;
  return includeOptions && r.diet_options.includes(diet);
}

type CategoryMatch = Pick<Category, 'match_diet' | 'match_meals' | 'match_collection'>;

export function inCategory(r: Pick<Recipe, 'diets' | 'diet_options' | 'meal' | 'collections'>, c: CategoryMatch, includeOptions = false) {
  if (c.match_diet) return matchesDiet(r, c.match_diet, includeOptions);
  if (c.match_meals.length) return c.match_meals.includes(r.meal);
  return Boolean(c.match_collection && r.collections.includes(c.match_collection));
}

export function filterRecipes(list: Recipe[], f: Filters, savedSlugs?: Set<string>) {
  const q = f.q.trim().toLowerCase();
  const out = list.filter((r) => {
    if (f.diets.length && !f.diets.every((d) => matchesDiet(r, d, f.gfOptions))) return false;
    if (f.meal && r.meal !== f.meal) return false;
    if (f.time && r.total_minutes > f.time) return false;
    if (f.difficulties.length && !f.difficulties.includes(r.difficulty)) return false;
    if (f.collection && !r.collections.includes(f.collection)) return false;
    if (f.saved && !savedSlugs?.has(r.slug)) return false;
    if (q) {
      const hay = [r.title, r.description, ...r.ingredients.map((i) => i.item)].join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
  if (f.sort === 'popular') out.sort((a, b) => a.popularity - b.popularity);
  else if (f.sort === 'quickest') out.sort((a, b) => a.total_minutes - b.total_minutes || a.title.localeCompare(b.title));
  else out.sort((a, b) => b.date_published.localeCompare(a.date_published));
  return out;
}

/** Number of recipes behind a /recipes?… link, e.g. a category's collection pills. */
export function countFor(query: string) {
  return filterRecipes(recipes, parseFilters(new URLSearchParams(query))).length;
}

/**
 * When nothing matches: the nearest recipe and why it was left out. Tries the
 * "GF option" swap first, then dropping one filter at a time.
 */
export function closeMatch(list: Recipe[], f: Filters): { recipe: Recipe; note: string } | null {
  if (f.saved) return null;
  const first = (relaxed: Partial<Filters>) => filterRecipes(list, { ...f, ...relaxed, sort: 'popular' })[0];

  if (!f.gfOptions && f.diets.includes('gluten-free')) {
    const r = first({ gfOptions: true });
    const swap = r?.ingredients.find((i) => i.gf_swap)?.gf_swap;
    if (r) return { recipe: r, note: swap ? `Gluten-free with one swap: ${swap.charAt(0).toLowerCase()}${swap.slice(1)}` : 'Gluten-free with one swap.' };
  }
  const attempts: [Partial<Filters>, (r: Recipe) => string][] = [
    [{ time: null }, (r) => `Takes ${minutes(r.total_minutes)} in total.`],
    [{ difficulties: [] }, (r) => `Rated ${DIFFICULTY_LABELS[r.difficulty].toLowerCase()}.`],
    ...f.diets.map((d): [Partial<Filters>, (r: Recipe) => string] => [{ diets: f.diets.filter((x) => x !== d) }, () => `Not tagged ${DIET_LABELS[d]}.`]),
    // The meal is usually what someone came for, so it is relaxed last.
    [{ meal: null }, (r) => `Filed under ${MEAL_LABELS[r.meal]}.`],
    [{ collection: null }, () => 'Outside this collection.'],
  ];
  for (const [relaxed, note] of attempts) {
    if (Object.entries(relaxed).every(([k, v]) => JSON.stringify(f[k as keyof Filters]) === JSON.stringify(v))) continue;
    const r = first(relaxed);
    if (r) return { recipe: r, note: note(r) };
  }
  return null;
}
