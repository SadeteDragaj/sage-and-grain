# Sage & Grain

A gluten-free, vegan and healthy recipe site built for Google recipe rich results.

One Next.js app (App Router, TypeScript):

- **The site**: every page is rendered to static HTML at build time (fast, crawlable,
  with title, description, canonical URL, Open Graph tags and Recipe/Breadcrumb/FAQ
  JSON-LD in the HTML), then hydrated for the interactive parts: filters, bookmarks,
  servings, cooking mode. The sitemap and robots.txt are generated from the content.
- **The recipe admin and JSON API**: route handlers that only exist under `npm run dev`.
  They enforce the diet-label rules and write the content files.

```
content/recipes.json, categories.json, site.json   ← the content (edit in the admin or by hand)
src/app/          routes: pages, sitemap.ts, robots.ts; admin + API (*.dev.ts, dev server only)
src/views/        page components        src/components/   shared components
src/lib/          content, filters, formatting, SEO helpers (safe for the browser)
src/server/       content rules (schema.ts), admin, API, article cleaning (server only)
admin/            the admin's page, styles and scripts (plain JS, no build step)

npm run build  ──▶  out/  (static files: upload to any host)
```

## First run

Requires Node 20+.

```bash
npm install
npm test           # checks content + diet-label rules, admin and API
npm run dev        # the site at http://127.0.0.1:5190, the admin at /admin
```

## Everyday workflow

Add and edit recipes in the local admin at http://127.0.0.1:5190/admin while `npm run dev`
runs. Saving checks the diet-label rules, writes `content/recipes.json` (a backup of the
previous version goes to `content/backups/`), and the site updates straight away. Photos
uploaded there are cropped to 16:9, 4:3 and 1:1 automatically. The admin only accepts
requests addressed to this computer, and it isn't part of the built site.

You can still edit the JSON by hand (categories in `categories.json`, homepage picks in
`site.json`); then run `npm run content` to check it. A wrong diet tag fails there, in
`npm run dev` and in `npm run build`, for example a "gluten-free" recipe with plain oats.

The JSON API (`/api/recipes`, `/api/recipes/<slug>`, `/api/categories`, `/api/site`,
`/api/health`) is also available under `npm run dev`.

## Production build

```bash
SITE_URL=https://www.yourdomain.com npm run build
npm run preview    # http://127.0.0.1:4190
```

Upload `out/` to Netlify, Cloudflare Pages, Vercel, Firebase Hosting or Cloud Storage.
Pages are written as `recipes.html`, `recipes/vegan-chickpea-curry.html` and so on:
configure the host to serve them without the `.html` extension ("clean URLs"; Netlify,
Cloudflare Pages and Vercel do this by default) and to serve `404.html` for unknown URLs.

## Diet-label rules (enforced in `src/server/schema.ts`)

- A diet tag only goes on a recipe if no ingredient rules it out (`contains: ["gluten"]`, `["dairy"]`…).
- Oats must be named "certified gluten-free oats", or be flagged as containing gluten.
- A recipe that needs a swap gets `diet_options: ["gluten-free"]` (shown as "GF option"),
  and every gluten ingredient needs a `gf_swap` explaining the swap.

## Optional recipe fields

Defaults for every optional field are in `src/lib/defaults.ts`.

- `article_html`: the article above the recipe card, written in the admin's editor (headings,
  lists, links, quotes and photos). It is cleaned on every save and build
  (`src/server/richtext.ts`), and `[bracketed]` example text from the template blocks saving.
  Photos uploaded in the editor go to `public/images/articles/`.
- On each step, for cooking mode: `uses` (indexes into `ingredients`, shown as "For this step"
  with scaled quantities), `tip`, and `timer_done` (what to check when the timer ends).
- `storage.summary`: one line shown on the last cooking-mode screen.

## Photos

Until real photos exist, recipes show tinted placeholders with their final alt text.
To add a photo, set `"image": {"alt": "...", "src": "/images/recipes/<slug>"}` and put
three crops in `public/images/recipes/`: `<slug>-16x9.jpg`, `<slug>-4x3.jpg`
and `<slug>-1x1.jpg` (Google uses all three). Keep the dish centred so every crop works.

## Ads

Every ad is `src/components/AdSlot.tsx`. Placeholders show until you copy
`.env.example` to `.env` and add your AdSense client and slot IDs
(`NEXT_PUBLIC_ADSENSE_*`). Heights are reserved in CSS (`.ad-*`), so ads never shift the layout.

## Before launch

- Replace `[Author name]`, the author bio, `[your email address]`, the "[3] times
  tested" claim, and the legal page text (`src/views/InfoPage.tsx`, `AboutPage.tsx`).
- Set `SITE_URL` to your real domain when building.
- Point the newsletter form (`src/components/NewsletterForm.tsx`) at your email provider.
- Replace the social links in `Footer.tsx`.
- Consider self-hosting DM Sans instead of loading it from Google Fonts.
