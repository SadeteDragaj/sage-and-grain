// Local recipe admin: adding and editing recipes from /admin under `npm run dev`.
//
// Every save goes through the same rules as the build (src/server/schema.ts), so
// the diet-label rules apply here too. Saving rewrites content/recipes.json, which
// the dev site imports, so it shows the change straight away.

import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { strip } from '../lib/defaults';
import { DIET_LABELS, DIFFICULTY_LABELS, MEAL_LABELS } from '../lib/labels';
import { checkContent, loadRecipes, paths, readJson, readSite } from './content';
import { HttpError } from './http';
import { imageCount, wordCount } from './richtext';
import { DIET_BLOCKERS, FLAGS, type RecipeData, parseRecipe, slugProblem } from './schema';

const KEEP_BACKUPS = 30;

// Google uses all three crops. Width × height of each saved file (never upscaled).
export const CROPS: Record<string, [number, number]> = { '16x9': [1600, 900], '4x3': [1200, 900], '1x1': [1200, 1200] };
const MIN_CROP_WIDTH = 1200;
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
// Photos inside the article: the reading column is 680px, so 1360px covers 2× screens.
const ARTICLE_IMAGE_WIDTH = 1360;
const ARTICLE_MIN_WORDS = 200;

// ---------- Storage ----------

type Row = Record<string, unknown>;

/** JSON that keeps short objects on one line, like the hand-written file. */
export function compactJson(value: unknown, indent = 0): string {
  const flat = flatJson(value);
  if (flat.length + indent <= 110 || typeof value !== 'object' || value === null || !Object.keys(value).length) return flat;
  const pad = ' '.repeat(indent + 2);
  const items = Array.isArray(value)
    ? value.map((v) => pad + compactJson(v, indent + 2))
    : Object.entries(value).map(([k, v]) => `${pad}${JSON.stringify(k)}: ${compactJson(v, indent + 2)}`);
  const [open, close] = Array.isArray(value) ? ['[', ']'] : ['{', '}'];
  return `${open}\n${items.join(',\n')}\n${' '.repeat(indent)}${close}`;
}

/** One-line JSON with a space after commas and colons, like Python's json.dumps. */
function flatJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(flatJson).join(', ')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.entries(value).map(([k, v]) => `${JSON.stringify(k)}: ${flatJson(v)}`).join(', ')}}`;
  }
  return JSON.stringify(value);
}

function writeAtomic(file: string, text: string) {
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, text, 'utf8');
  fs.renameSync(tmp, file);
}

const recipesFile = () => path.join(paths.content, 'recipes.json');
const siteFile = () => path.join(paths.content, 'site.json');
export const backupDir = () => path.join(paths.content, 'backups');

function backup() {
  const dir = backupDir();
  fs.mkdirSync(dir, { recursive: true });
  const now = new Date();
  const p = (n: number, w = 2) => String(n).padStart(w, '0');
  const stamp = `${now.getFullYear()}${p(now.getMonth() + 1)}${p(now.getDate())}-${p(now.getHours())}${p(now.getMinutes())}${p(now.getSeconds())}-${p(now.getMilliseconds(), 3)}${randomBytes(2).toString('hex')}`;
  fs.copyFileSync(recipesFile(), path.join(dir, `recipes-${stamp}.json`));
  const old = fs.readdirSync(dir).filter((f) => /^recipes-.*\.json$/.test(f)).sort();
  for (const f of old.slice(0, -KEEP_BACKUPS)) fs.unlinkSync(path.join(dir, f));
}

export const readRows = () => readJson<Row[]>('recipes.json');

function writeRows(rows: Row[]) {
  backup();
  writeAtomic(recipesFile(), `${compactJson(rows)}\n`);
}

/** What goes in recipes.json: defaults left out so the file stays readable. */
const storedForm = (recipe: RecipeData) => strip('recipe', recipe as unknown as Row);

function siteReferences(slug: string): string[] {
  const site = readSite();
  const places = [];
  if (site.featured?.includes(slug)) places.push('Featured recipes on the homepage');
  if (site.seasonal?.recipes?.includes(slug)) places.push('Ingredient of the month on the homepage');
  return places;
}

function renameInSite(oldSlug: string, newSlug: string) {
  const site = readSite();
  const swap = (list: string[] = []) => list.map((s) => (s === oldSlug ? newSlug : s));
  site.featured = swap(site.featured);
  site.seasonal = { ...site.seasonal, recipes: swap(site.seasonal?.recipes) };
  writeAtomic(siteFile(), `${JSON.stringify(site, null, 2)}\n`);
}

// ---------- Validation ----------

export function validate(data: unknown): RecipeData {
  const { recipe, errors } = parseRecipe(data);
  if (errors) throw new HttpError(422, { errors });
  return recipe;
}

function saveAndCheck(rows: Row[]) {
  writeRows(rows);
  return checkContent();
}

// ---------- Actions ----------

export function meta(origin: string) {
  const collections = [...new Set(loadRecipes().flatMap((r) => r.collections))].sort();
  return {
    diets: DIET_LABELS,
    meals: MEAL_LABELS,
    difficulties: DIFFICULTY_LABELS,
    flags: ['gluten', 'dairy', 'egg', 'meat', 'fish', 'honey'] satisfies (typeof FLAGS)[number][],
    diet_blockers: Object.fromEntries(Object.entries(DIET_BLOCKERS).map(([k, v]) => [k, [...v].sort()])),
    collections,
    // The admin and the site share the dev server now.
    dev_site_url: origin,
    today: localDate(),
  };
}

function localDate() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function completeness(r: RecipeData) {
  const words = wordCount(r.article_html);
  const sections: Record<string, boolean> = {
    [`Article (${ARTICLE_MIN_WORDS}+ words)`]: words >= ARTICLE_MIN_WORDS,
    Storage: Boolean(r.storage),
    FAQ: r.faq.length > 0,
  };
  return {
    photo: Boolean(r.image.src),
    words,
    article_images: imageCount(r.article_html),
    article_done: Object.values(sections).filter(Boolean).length,
    article_total: Object.keys(sections).length,
    missing: Object.keys(sections).filter((name) => !sections[name]),
    cooking_hints: r.steps.some((s) => s.uses.length > 0 || Boolean(s.tip)),
  };
}

export function listRecipes() {
  return [...loadRecipes()]
    .sort((a, b) => b.date_modified.localeCompare(a.date_modified))
    .map((r) => ({
      slug: r.slug,
      title: r.title,
      meal: r.meal,
      diets: r.diets,
      diet_options: r.diet_options,
      date_modified: r.date_modified,
      ...completeness(r),
    }));
}

/** What the editor receives: every field, defaults filled in. */
export function getRecipe(slug: string): RecipeData {
  const recipe = loadRecipes().find((r) => r.slug === slug);
  if (!recipe) throw new HttpError(404, 'Recipe not found');
  return recipe;
}

const taken = (slug: string) => new HttpError(409, `A recipe with the address /recipes/${slug} already exists.`);

export function createRecipe(data: unknown) {
  const recipe = validate(data);
  const rows = readRows();
  if (rows.some((r) => r.slug === recipe.slug)) throw taken(recipe.slug);
  rows.push(storedForm(recipe));
  return { slug: recipe.slug, export: saveAndCheck(rows) };
}

export function updateRecipe(slug: string, data: unknown) {
  const recipe = validate(data);
  const rows = readRows();
  const index = rows.findIndex((r) => r.slug === slug);
  if (index === -1) throw new HttpError(404, 'Recipe not found');
  const renamed = recipe.slug !== slug;
  if (renamed && rows.some((r) => r.slug === recipe.slug)) throw taken(recipe.slug);

  if (renamed) {
    // Keep photos and homepage picks pointing at the recipe.
    if (recipe.image.src === `/images/recipes/${slug}`) {
      const dir = path.join(paths.images, 'recipes');
      for (const name of Object.keys(CROPS)) {
        const oldFile = path.join(dir, `${slug}-${name}.jpg`);
        if (fs.existsSync(oldFile)) fs.renameSync(oldFile, path.join(dir, `${recipe.slug}-${name}.jpg`));
      }
      recipe.image.src = `/images/recipes/${recipe.slug}`;
    }
    renameInSite(slug, recipe.slug);
  }

  rows[index] = storedForm(recipe);
  return { slug: recipe.slug, export: saveAndCheck(rows) };
}

export function deleteRecipe(slug: string) {
  const rows = readRows();
  if (!rows.some((r) => r.slug === slug)) throw new HttpError(404, 'Recipe not found');
  const places = siteReferences(slug);
  if (places.length) {
    throw new HttpError(409, `This recipe is used in: ${places.join('; ')}. Remove it there (content/site.json) first.`);
  }
  return { export: saveAndCheck(rows.filter((r) => r.slug !== slug)) };
}

export function exportNow() {
  return { export: checkContent() };
}

// ---------- Photos ----------

function checkPhotoSlug(slug: string) {
  const problem = slugProblem(slug);
  if (problem) throw new HttpError(400, `Fix the recipe address first: ${problem}`);
}

/** The photo upright, flattened onto white (not black) and in sRGB, as raw pixels. */
async function openPhoto(data: Buffer) {
  if (data.length > MAX_UPLOAD_BYTES) throw new HttpError(413, 'That photo is over 25 MB. Export a smaller JPEG and try again.');
  try {
    const { data: pixels, info } = await sharp(data)
      .rotate()
      .flatten({ background: '#ffffff' })
      .toColourspace('srgb')
      .raw()
      .toBuffer({ resolveWithObject: true });
    return { pixels, width: info.width, height: info.height, channels: info.channels };
  } catch {
    throw new HttpError(400, "That file isn't a photo this tool can read. Use a JPEG, PNG or WebP.");
  }
}

type Photo = Awaited<ReturnType<typeof openPhoto>>;

const image = (p: Photo) => sharp(p.pixels, { raw: { width: p.width, height: p.height, channels: p.channels } });
const jpeg = { quality: 85, progressive: true, optimiseCoding: true } as const;

/** Centre crop to the ratio (keep the dish centred so every crop works). */
function cropBox(width: number, height: number, ratioW: number, ratioH: number) {
  const target = ratioW / ratioH;
  if (width / height > target) {
    const w = Math.round(height * target);
    return { left: Math.floor((width - w) / 2), top: 0, width: w, height };
  }
  const h = Math.round(width / target);
  return { left: 0, top: Math.floor((height - h) / 2), width, height: h };
}

export async function uploadPhoto(slug: string, data: Buffer) {
  checkPhotoSlug(slug);
  const photo = await openPhoto(data);
  const dir = path.join(paths.images, 'recipes');
  fs.mkdirSync(dir, { recursive: true });
  const warnings = [];
  for (const [name, [maxW, maxH]] of Object.entries(CROPS)) {
    const [ratioW, ratioH] = name.split('x').map(Number);
    const box = cropBox(photo.width, photo.height, ratioW, ratioH);
    let out = image(photo).extract(box);
    if (box.width > maxW) out = out.resize(maxW, maxH, { fit: 'fill' });
    else if (box.width < MIN_CROP_WIDTH) {
      warnings.push(`The ${name.replace('x', ':')} crop is only ${box.width}px wide; Google prefers at least ${MIN_CROP_WIDTH}px.`);
    }
    await out.jpeg(jpeg).toFile(path.join(dir, `${slug}-${name}.jpg`));
  }
  return { src: `/images/recipes/${slug}`, warnings };
}

/** A photo placed inside the article (process shots, finished dish…). */
export async function uploadArticlePhoto(slug: string, data: Buffer) {
  checkPhotoSlug(slug);
  const photo = await openPhoto(data);
  let out = image(photo);
  let { width, height } = photo;
  if (width > ARTICLE_IMAGE_WIDTH) {
    height = Math.round((height * ARTICLE_IMAGE_WIDTH) / width);
    width = ARTICLE_IMAGE_WIDTH;
    out = out.resize(width, height, { fit: 'fill' });
  }
  const dir = path.join(paths.images, 'articles');
  fs.mkdirSync(dir, { recursive: true });
  const name = `${slug}-${randomBytes(4).toString('hex')}.jpg`;
  await out.jpeg(jpeg).toFile(path.join(dir, name));
  const warnings = [];
  if (width < 680) warnings.push(`This photo is only ${width}px wide, so it will look soft in the article. 1360px or more is best.`);
  return { src: `/images/articles/${name}`, width, height, warnings };
}
