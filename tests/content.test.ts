import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import * as categoriesApi from '../src/app/api/categories/[slug]/route.dev';
import * as recipeApi from '../src/app/api/recipes/[slug]/route.dev';
import * as recipesApi from '../src/app/api/recipes/route.dev';
import { EMPTY_FILTERS, filterRecipes, recipes } from '../src/lib/content';
import { formatQty, isoMinutes } from '../src/lib/seo';
import { loadCategories, loadRecipes } from '../src/server/content';
import { parseRecipe } from '../src/server/schema';

const RAW: Record<string, any>[] = JSON.parse(fs.readFileSync('content/recipes.json', 'utf8'));

const raw = (slug: string) => structuredClone(RAW.find((r) => r.slug === slug)!);

function problem(data: unknown) {
  const { errors } = parseRecipe(data);
  return errors?.[0]?.msg ?? '';
}

describe('content', () => {
  it('all content loads', () => {
    expect(loadRecipes()).toHaveLength(10);
    expect(loadCategories()).toHaveLength(7);
  });

  it('rejects a GF tag when an ingredient has gluten', () => {
    const data = raw('vegan-chickpea-curry');
    data.ingredients.push({ item: 'flour', contains: ['gluten'] });
    expect(problem(data)).toMatch('gluten-free');
  });

  it('plain oats cannot be gluten-free', () => {
    const data = raw('gluten-free-banana-oat-pancakes');
    data.ingredients[1].item = 'rolled oats';
    expect(problem(data)).toMatch('certified');
  });

  it('a GF option requires a swap', () => {
    const data = raw('healthy-avocado-toast');
    data.ingredients[0].gf_swap = null;
    expect(problem(data)).toMatch('gf_swap');
  });

  it('vegan rejects dairy', () => {
    const data = raw('vegan-red-lentil-soup');
    data.ingredients.push({ item: 'butter', contains: ['dairy'] });
    expect(problem(data)).toMatch('vegan');
  });

  it("step uses must point at real ingredients", () => {
    const data = raw('vegan-chickpea-curry');
    data.steps[0].uses = [99];
    expect(problem(data)).toMatch("don't exist");
  });

  it('timer_done needs a timer', () => {
    const data = raw('vegan-chickpea-curry');
    data.steps[2].timer_done = 'Done?';
    expect(problem(data)).toMatch('no timer');
  });

  it('filters', () => {
    const f = { ...EMPTY_FILTERS };
    expect(filterRecipes(recipes, { ...f, diets: ['vegan'], difficulties: ['easy'] })).toHaveLength(6);
    expect(filterRecipes(recipes, { ...f, diets: ['gluten-free'], meal: 'snack', gfOptions: false })).toEqual([]);
    expect(filterRecipes(recipes, { ...f, q: 'chickpeas' })).toHaveLength(3);
    const quickest = filterRecipes(recipes, { ...f, sort: 'quickest' });
    expect(quickest[0].total_minutes).toBeLessThanOrEqual(quickest[quickest.length - 1].total_minutes);
  });

  it('formats amounts and times for structured data', () => {
    expect(formatQty(0.5)).toBe('½');
    expect(formatQty(1.25)).toBe('1¼');
    expect(isoMinutes(35)).toBe('PT35M');
    expect(isoMinutes(60)).toBe('PT1H');
  });

  it('JSON-LD has the required fields', () => {
    const ld = recipes[0].json_ld;
    for (const key of ['name', 'image', 'author', 'datePublished', 'recipeIngredient', 'recipeInstructions', 'totalTime']) {
      expect(ld[key]).toBeTruthy();
    }
    expect(ld).not.toHaveProperty('aggregateRating');
  });

  it('serves the JSON API', async () => {
    const at = (path: string) => new Request(`http://127.0.0.1:5190${path}`);
    const params = (slug: string) => ({ params: Promise.resolve({ slug }) });

    const list = await recipesApi.GET(at('/api/recipes?diet=vegan&difficulty=easy'), {});
    expect(list.status).toBe(200);
    expect((await list.json()).total).toBe(6);
    expect((await (await recipeApi.GET(at('/api/recipes/vegan-chickpea-curry'), params('vegan-chickpea-curry'))).json()).json_ld['@type']).toBe('Recipe');
    expect((await recipeApi.GET(at('/api/recipes/nope'), params('nope'))).status).toBe(404);
    expect((await (await categoriesApi.GET(at('/api/categories/vegan'), params('vegan'))).json()).recipes).toHaveLength(7);
  });
});
