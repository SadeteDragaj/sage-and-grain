// Content rules.
//
// The diet-tag rules from the design brief are enforced here, so a recipe with a
// wrong label fails the build and the admin refuses to save it:
//
// - A diet tag is only allowed when every ingredient supports it.
// - Oats count as gluten-free only when they are "certified gluten-free oats".
// - A recipe that needs a swap to be gluten-free gets a "GF option"
//   (`diet_options`), never the full Gluten-Free tag.

import { z } from 'zod';
import { fill } from '../lib/defaults';
import { DIET_LABELS, DIFFICULTY_LABELS, MEAL_LABELS } from '../lib/labels';
import type { Category, Diet, Difficulty, Meal, Recipe } from '../lib/types';
import { cleanArticle, placeholders } from './richtext';

/** A recipe as stored: total_minutes and json_ld are worked out when the site reads it. */
export type RecipeData = Omit<Recipe, 'total_minutes' | 'json_ld'>;
export type CategoryData = Omit<Category, 'recipe_slugs' | 'option_slugs'>;

/** One problem, with the path of the field it is about (empty for the whole recipe). */
export interface Problem {
  loc: string[];
  msg: string;
}

// What an ingredient contains that rules out a diet tag.
export const FLAGS = ['gluten', 'meat', 'fish', 'dairy', 'egg', 'honey'] as const;

// Ingredients carrying any of these flags rule the diet out.
export const DIET_BLOCKERS: Partial<Record<Diet, string[]>> = {
  'gluten-free': ['gluten'],
  vegan: ['meat', 'fish', 'dairy', 'egg', 'honey'],
  vegetarian: ['meat', 'fish'],
  'dairy-free': ['dairy'],
};

const DIETS = Object.keys(DIET_LABELS) as [Diet, ...Diet[]];
const MEALS = Object.keys(MEAL_LABELS) as [Meal, ...Meal[]];
const DIFFICULTIES = Object.keys(DIFFICULTY_LABELS) as [Difficulty, ...Difficulty[]];

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SLUG_HINT = 'use lowercase letters, numbers and single hyphens, e.g. vegan-chickpea-curry';

/** A recipe's address, /recipes/<slug>. Returns what is wrong with it, or null. */
export function slugProblem(slug: string): string | null {
  return SLUG.test(slug) ? null : SLUG_HINT;
}

const text = z.string().min(1);
const maybeText = z.string().nullable().optional();
const int = z.number().int();

const Ingredient = z.object({
  qty: z.number().nullable().optional(),
  unit: z.string().optional(),
  item: text,
  note: z.string().optional(),
  contains: z.array(z.enum(FLAGS)).optional(),
  // How to make this ingredient gluten-free, e.g. "Use certified gluten-free oats."
  gf_swap: maybeText,
});

const Step = z.object({
  text,
  timer_seconds: int.nullable().optional(),
  // Shown in cooking mode: the ingredients this step needs (indexes into
  // ingredients, so quantities scale), a short tip, and what to check when the
  // timer finishes.
  uses: z.array(int).optional(),
  tip: maybeText,
  timer_done: maybeText,
});

const FAQItem = z.object({ question: z.string(), answer: z.string() });

const RecipeFields = z.object({
  slug: z.string().regex(SLUG, SLUG_HINT),
  title: text,
  description: text,
  intro: text,
  // src: path under /images. Supply 16:9, 4:3 and 1:1 crops with the same stem.
  image: z.object({ alt: z.string(), src: maybeText }),
  meal: z.enum(MEALS),
  diets: z.array(z.enum(DIETS)),
  diet_options: z.array(z.enum(DIETS)).optional(),
  collections: z.array(z.string()).optional(),
  cuisine: z.string(),
  difficulty: z.enum(DIFFICULTIES),
  prep_minutes: int,
  cook_minutes: int,
  extra_time: maybeText,
  servings: int.min(1),
  yield_label: z.string().optional(),
  ingredients: z.array(Ingredient).min(1),
  steps: z.array(Step).min(1),
  // The article above the recipe card, written in the admin's editor.
  article_html: maybeText,
  // summary: one line for the end of cooking mode, e.g. "Leftovers keep for 4 days in the fridge."
  storage: z.object({ fridge: maybeText, freezer: maybeText, reheat: maybeText, summary: maybeText }).nullable().optional(),
  faq: z.array(FAQItem).optional(),
  author: z.string().optional(),
  date_published: z.iso.date(),
  date_modified: z.iso.date(),
  popularity: int.optional(),
});

const CategoryFields = z.object({
  slug: z.string(),
  name: z.string(),
  h1: z.string(),
  meta_description: z.string(),
  intro: z.string(),
  // How recipes are matched: a diet tag, a meal (one or more) or an editorial collection.
  match_diet: z.enum(DIETS).nullable().optional(),
  match_meals: z.array(z.enum(MEALS)).optional(),
  match_collection: z.string().nullable().optional(),
  // query: query string for /recipes, e.g. "diet=vegan&meal=breakfast"
  collections: z.array(z.object({ label: z.string(), query: z.string() })).optional(),
  guide_title: z.string(),
  guide: z.array(z.object({ title: z.string(), text: z.string() })),
  faq: z.array(FAQItem),
  related: z.array(z.string()).optional(),
  tone: z.string().optional(),
});

const TYPE_NAMES: Record<string, string> = {
  string: 'a valid string',
  number: 'a valid number',
  int: 'a valid integer',
  array: 'a valid list',
  object: 'a valid dictionary or object',
};

const quoted = (values: readonly unknown[]) => {
  const q = values.map((v) => `'${String(v)}'`);
  return q.length > 1 ? `${q.slice(0, -1).join(', ')} or ${q[q.length - 1]}` : q[0];
};

/** Plain-English messages for the admin's error list. */
function message(issue: z.core.$ZodRawIssue): string | undefined {
  switch (issue.code) {
    case 'invalid_type':
      return issue.input === undefined ? 'Field required' : `Input should be ${TYPE_NAMES[issue.expected] ?? `a valid ${issue.expected}`}`;
    case 'too_small': {
      const min = Number(issue.minimum);
      if (issue.origin === 'string') return `String should have at least ${min} character${min === 1 ? '' : 's'}`;
      if (issue.origin === 'array') return `List should have at least ${min} item${min === 1 ? '' : 's'}`;
      return `Input should be greater than or equal to ${min}`;
    }
    case 'invalid_value':
      return `Input should be ${quoted(issue.values)}`;
    case 'invalid_format':
      return issue.format === 'date' ? 'Input should be a valid date in the format YYYY-MM-DD' : undefined;
    default:
      return undefined;
  }
}

function problems(error: z.ZodError): Problem[] {
  return error.issues.map((i) => ({ loc: i.path.map(String), msg: i.message }));
}

/** Python-style list, as the messages have always shown it: ['plain flour', 'oats']. */
const list = (items: string[]) => `[${items.map((s) => (s.includes("'") && !s.includes('"') ? `"${s}"` : `'${s}'`)).join(', ')}]`;

function articleProblem(r: RecipeData): string | null {
  const left = placeholders(r.article_html);
  return left.length ? `replace the example text in the article: ${left.slice(0, 3).join(', ')}` : null;
}

function dietProblem(r: RecipeData): string | null {
  for (const diet of r.diets) {
    const blocked = DIET_BLOCKERS[diet] ?? [];
    const offending = r.ingredients.filter((i) => i.contains.some((c) => blocked.includes(c))).map((i) => i.item);
    if (offending.length) return `${r.slug}: tagged ${diet} but these ingredients rule it out: ${list(offending)}`;
  }

  for (const diet of r.diet_options) {
    if (r.diets.includes(diet)) return `${r.slug}: ${diet} is both a full tag and an option`;
    if (diet !== 'gluten-free') return `${r.slug}: only 'GF option' is supported as a diet option`;
    const glutenItems = r.ingredients.filter((i) => i.contains.includes('gluten'));
    if (!glutenItems.length) return `${r.slug}: nothing needs swapping, so tag it Gluten-Free instead of GF option`;
    const missing = glutenItems.filter((i) => !i.gf_swap).map((i) => i.item);
    if (missing.length) return `${r.slug}: GF option needs a gf_swap on: ${list(missing)}`;
  }

  for (const [n, step] of r.steps.entries()) {
    const bad = step.uses.filter((i) => !(i >= 0 && i < r.ingredients.length));
    if (bad.length) return `${r.slug}: step ${n + 1} uses ingredients that don't exist: [${bad.join(', ')}]`;
    if (step.timer_done && !step.timer_seconds) return `${r.slug}: step ${n + 1} has timer_done but no timer`;
  }

  for (const ing of r.ingredients) {
    const name = ing.item.toLowerCase();
    if (name.includes('oat') && !ing.contains.includes('gluten') && !name.includes('certified gluten-free')) {
      return `${r.slug}: '${ing.item}' — oats are only gluten-free when certified; say 'certified gluten-free oats' or flag them as containing gluten`;
    }
  }
  return null;
}

/** Checks a recipe and returns it with every field filled in and the article cleaned. */
export function parseRecipe(data: unknown): { recipe: RecipeData; errors?: undefined } | { recipe?: undefined; errors: Problem[] } {
  const parsed = RecipeFields.safeParse(data, { error: message });
  if (!parsed.success) return { errors: problems(parsed.error) };
  const recipe = fill('recipe', parsed.data) as unknown as RecipeData;
  recipe.article_html = cleanArticle(recipe.article_html);
  const problem = articleProblem(recipe) ?? dietProblem(recipe);
  return problem ? { errors: [{ loc: [], msg: problem }] } : { recipe };
}

export function parseCategory(data: unknown): { category: CategoryData; errors?: undefined } | { category?: undefined; errors: Problem[] } {
  const parsed = CategoryFields.safeParse(data, { error: message });
  if (!parsed.success) return { errors: problems(parsed.error) };
  const category = fill('category', parsed.data) as unknown as CategoryData;
  if (!(category.match_diet || category.match_meals.length || category.match_collection)) {
    return { errors: [{ loc: [], msg: `category ${category.slug} matches nothing` }] };
  }
  return { category };
}
