// Admin API tests. They run against a temporary copy of content/ and public/images.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as adminPage from '../src/app/admin/route.dev';
import * as articlePhotos from '../src/app/api/admin/article-photos/[slug]/route.dev';
import * as photos from '../src/app/api/admin/photos/[slug]/route.dev';
import * as one from '../src/app/api/admin/recipes/[slug]/route.dev';
import * as many from '../src/app/api/admin/recipes/route.dev';
import * as check from '../src/app/api/admin/validate/route.dev';
import { CROPS, backupDir } from '../src/server/admin';
import { paths } from '../src/server/content';

const H = { 'X-Sage-Admin': '1' };
const original = { ...paths };
let tmp: string;

beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sage-admin-'));
  fs.cpSync(original.content, path.join(tmp, 'content'), { recursive: true, filter: (src) => !src.includes(`${path.sep}backups`) });
  paths.content = path.join(tmp, 'content');
  paths.images = path.join(tmp, 'images');
});

afterEach(() => {
  Object.assign(paths, original);
  fs.rmSync(tmp, { recursive: true, force: true });
});

type Handler<P> = (req: Request, ctx: { params: Promise<P> }) => Promise<Response>;

async function call<P>(handler: Handler<P>, url: string, params: P, init: RequestInit = {}) {
  const res = await handler(new Request(`http://127.0.0.1:5190${url}`, init), { params: Promise.resolve(params) });
  const text = await res.text();
  let body: any = null;
  try {
    body = JSON.parse(text);
  } catch {
    // An HTML page.
  }
  return { status: res.status, body, text };
}

const json = (method: string, data: unknown, headers: Record<string, string> = H): RequestInit => ({
  method,
  headers: { ...headers, 'content-type': 'application/json' },
  body: JSON.stringify(data),
});

const curry = async () => (await call(one.GET, '/api/admin/recipes/vegan-chickpea-curry', { slug: 'vegan-chickpea-curry' })).body;
const readContent = (name: string) => JSON.parse(fs.readFileSync(path.join(paths.content, name), 'utf8'));

function upload(file: Buffer, name: string, type: string): RequestInit {
  const form = new FormData();
  form.append('file', new Blob([new Uint8Array(file)], { type }), name);
  return { method: 'POST', headers: H, body: form };
}

describe('admin', () => {
  it('lists recipes with how complete they are', async () => {
    const rows = (await call(many.GET, '/api/admin/recipes', {})).body;
    expect(rows).toHaveLength(10);
    const row = rows.find((r: any) => r.slug === 'vegan-chickpea-curry');
    expect(row.article_done).toBe(row.article_total);
    expect(row.cooking_hints).toBe(true);
  });

  it('creating saves the file and backs it up', async () => {
    const data = { ...(await curry()), slug: 'chickpea-curry-two', title: 'Chickpea Curry Two' };
    const r = await call(many.POST, '/api/admin/recipes', {}, json('POST', data));
    expect(r.status, r.text).toBe(201);
    const stored = readContent('recipes.json');
    expect(stored.at(-1).slug).toBe('chickpea-curry-two');
    expect(stored.at(-1).ingredients[1]).not.toHaveProperty('unit'); // defaults left out of the file
    expect(fs.readdirSync(backupDir()).some((f) => /^recipes-.*\.json$/.test(f))).toBe(true);
  });

  it('refuses a duplicate address', async () => {
    expect((await call(many.POST, '/api/admin/recipes', {}, json('POST', await curry()))).status).toBe(409);
  });

  it('applies the diet rules', async () => {
    const bad = await curry();
    bad.ingredients.push({ item: 'plain flour', contains: ['gluten'] });
    const r = await call(one.PUT, '/api/admin/recipes/vegan-chickpea-curry', { slug: 'vegan-chickpea-curry' }, json('PUT', bad));
    expect(r.status).toBe(422);
    expect(r.body.detail.errors[0].msg).toContain('gluten-free');
    expect(r.body.detail.errors[0].msg.startsWith('Value error')).toBe(false);
  });

  it('refuses a blank ingredient', async () => {
    const bad = await curry();
    bad.ingredients.push({ item: '' });
    const r = await call(check.POST, '/api/admin/validate', {}, json('POST', bad));
    expect(r.status).toBe(422);
    expect(r.body.detail.errors[0].loc.slice(0, 2)).toEqual(['ingredients', '14']);
  });

  it('renaming updates the homepage picks', async () => {
    const data = { ...(await curry()), slug: 'easy-chickpea-curry' };
    const r = await call(one.PUT, '/api/admin/recipes/vegan-chickpea-curry', { slug: 'vegan-chickpea-curry' }, json('PUT', data));
    expect(r.status, r.text).toBe(200);
    const site = readContent('site.json');
    expect(site.featured).toContain('easy-chickpea-curry');
    expect(site.seasonal.recipes).not.toContain('vegan-chickpea-curry');
  });

  it('deletes, unless the recipe is on the homepage', async () => {
    const del = (slug: string) => call(one.DELETE, `/api/admin/recipes/${slug}`, { slug }, { method: 'DELETE', headers: H });
    expect((await del('vegan-chickpea-curry')).status).toBe(409);
    expect((await del('healthy-avocado-toast')).status).toBe(200);
    expect((await call(many.GET, '/api/admin/recipes', {})).body).toHaveLength(9);
  });

  it('changes need the admin header', async () => {
    const slug = 'healthy-avocado-toast';
    expect((await call(one.DELETE, `/api/admin/recipes/${slug}`, { slug }, { method: 'DELETE' })).status).toBe(403);
    expect((await call(many.GET, '/api/admin/recipes', {})).status).toBe(200);
  });

  it('only answers requests addressed to this computer', async () => {
    const res = await many.GET(new Request('http://sage.example.com/api/admin/recipes'), { params: Promise.resolve({}) });
    expect(res.status).toBe(403);
  });

  it('a photo upload makes three crops', async () => {
    const jpeg = await sharp({ create: { width: 2400, height: 1800, channels: 3, background: 'orange' } }).jpeg().toBuffer();
    const r = await call(photos.POST, '/api/admin/photos/vegan-chickpea-curry', { slug: 'vegan-chickpea-curry' }, upload(jpeg, 'dish.jpg', 'image/jpeg'));
    expect(r.status, r.text).toBe(200);
    expect(r.body).toEqual({ src: '/images/recipes/vegan-chickpea-curry', warnings: [] });
    const sizes: Record<string, [number, number]> = {};
    for (const name of Object.keys(CROPS)) {
      const meta = await sharp(path.join(paths.images, 'recipes', `vegan-chickpea-curry-${name}.jpg`)).metadata();
      sizes[name] = [meta.width!, meta.height!];
    }
    expect(sizes).toEqual({ '16x9': [1600, 900], '4x3': [1200, 900], '1x1': [1200, 1200] });
  });

  it('a photo upload rejects files that are not images', async () => {
    const r = await call(photos.POST, '/api/admin/photos/x', { slug: 'x' }, upload(Buffer.from('hello'), 'a.txt', 'text/plain'));
    expect(r.status).toBe(400);
  });

  it('serves the admin page', async () => {
    const r = await call(adminPage.GET, '/admin', {});
    expect(r.status).toBe(200);
    expect(r.text).toContain('Recipe admin');
  });

  it('cleans article HTML on save', async () => {
    const data = await curry();
    data.article_html =
      '<h1>Title</h1><p onclick="x()">Hi&nbsp;there<script>alert(1)</script></p>' +
      '<img src="https://evil.example/x.jpg"><img src="/images/articles/a.jpg" alt="A">' +
      '<a href="javascript:alert(1)">bad</a><p><br></p>';
    const r = await call(one.PUT, '/api/admin/recipes/vegan-chickpea-curry', { slug: 'vegan-chickpea-curry' }, json('PUT', data));
    expect(r.status, r.text).toBe(200);
    const saved: string = (await curry()).article_html;
    expect(saved.startsWith('<h2>Title</h2><p>Hi there</p><img ')).toBe(true);
    expect(saved.endsWith('<a>bad</a>')).toBe(true);
    for (const bit of ['src="/images/articles/a.jpg"', 'alt="A"', 'loading="lazy"']) expect(saved).toContain(bit);
    for (const bad of ['script', 'onclick', 'evil.example', 'javascript', '<p><br', '<h1>']) expect(saved).not.toContain(bad);
  });

  it('template placeholders block saving', async () => {
    const data = await curry();
    data.article_html = '<h2>About this recipe</h2><p>[What it is, who it’s for]</p>';
    const r = await call(one.PUT, '/api/admin/recipes/vegan-chickpea-curry', { slug: 'vegan-chickpea-curry' }, json('PUT', data));
    expect(r.status).toBe(422);
    expect(r.body.detail.errors[0].msg).toContain('example text');
  });

  it('uploads a photo for the article', async () => {
    const png = await sharp({ create: { width: 2000, height: 1000, channels: 4, background: { r: 255, g: 0, b: 0, alpha: 0 } } }).png().toBuffer();
    const r = await call(articlePhotos.POST, '/api/admin/article-photos/vegan-chickpea-curry', { slug: 'vegan-chickpea-curry' }, upload(png, 'step.png', 'image/png'));
    expect(r.status, r.text).toBe(200);
    expect(r.body.src.startsWith('/images/articles/vegan-chickpea-curry-')).toBe(true);
    expect([r.body.width, r.body.height]).toEqual([1360, 680]);
    const file = path.join(paths.images, 'articles', r.body.src.split('/').pop());
    const { data, info } = await sharp(file).raw().toBuffer({ resolveWithObject: true });
    const at = (10 * info.width + 10) * info.channels;
    expect([data[at], data[at + 1], data[at + 2]]).toEqual([255, 255, 255]); // transparency flattened onto white
  });
});
