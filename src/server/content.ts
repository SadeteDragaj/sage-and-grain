// Reading content/*.json from disk, with every rule checked.
//
// The site itself imports the same files (src/lib/content.ts); this module is for
// the build check, the admin and the JSON API, which must see edits straight away.

import fs from 'node:fs';
import path from 'node:path';
import type { Site } from '../lib/types';
import { type CategoryData, type Problem, type RecipeData, parseCategory, parseRecipe } from './schema';

/** Folders the server reads and writes. Tests point them at a temporary copy. */
export const paths = {
  content: path.join(process.cwd(), 'content'),
  // Served by the site as /images/... (public/images).
  images: path.join(process.cwd(), 'public', 'images'),
};

export class ContentError extends Error {}

export function readJson<T>(name: string): T {
  return JSON.parse(fs.readFileSync(path.join(paths.content, name), 'utf8')) as T;
}

function fail(file: string, label: string, errors: Problem[]): never {
  const lines = errors.map((e) => `  ${e.loc.length ? `${e.loc.join('.')}: ` : ''}${e.msg}`);
  throw new ContentError(`content/${file}, ${label}:\n${lines.join('\n')}`);
}

export function loadRecipes(): RecipeData[] {
  const rows = readJson<Record<string, unknown>[]>('recipes.json');
  const recipes = rows.map((row, i) => {
    const { recipe, errors } = parseRecipe(row);
    if (errors) fail('recipes.json', typeof row.slug === 'string' ? row.slug : `recipe ${i + 1}`, errors);
    return recipe;
  });
  const slugs = recipes.map((r) => r.slug);
  if (new Set(slugs).size !== slugs.length) throw new ContentError('content/recipes.json: duplicate recipe slugs');
  return recipes;
}

export function loadCategories(): CategoryData[] {
  return readJson<Record<string, unknown>[]>('categories.json').map((row, i) => {
    const { category, errors } = parseCategory(row);
    if (errors) fail('categories.json', typeof row.slug === 'string' ? row.slug : `category ${i + 1}`, errors);
    return category;
  });
}

export function readSite(): Omit<Site, 'site_url'> {
  return readJson('site.json');
}

/** Validates all content (diet-label rules included) and returns a one-line summary. */
export function checkContent(): string {
  const recipes = loadRecipes();
  const categories = loadCategories();
  return `Checked ${recipes.length} recipes and ${categories.length} categories`;
}
