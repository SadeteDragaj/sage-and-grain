# Sage & Grain

A gluten-free, vegan and healthy recipe site built for Google recipe rich results.

- **backend/**: Python + FastAPI. Owns the content (`app/data/*.json`), enforces the
  diet-label rules, generates Recipe JSON-LD, the sitemap and robots.txt, and serves a JSON API.
- **frontend/**: React + Vite + TypeScript. Every page is prerendered to static HTML
  at build time (fast, crawlable, with structured data in the HTML), then hydrated for
  the interactive parts: filters, bookmarks, servings, cooking mode.

```
backend/app/data/recipes.json  ──python -m app.export──▶  frontend/src/content/*.json
                                                          frontend/public/sitemap.xml, robots.txt
frontend  ──npm run build──▶  frontend/dist/site/  (static files: upload to any host)
```

## First run

Requires Python 3.11+ and Node 20+.

```bash
# Backend
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
pytest                      # checks content + diet-label rules
python -m app.export        # writes content into ../frontend
uvicorn app.main:app --reload --port 8190   # API + admin (or `npm run admin`)

# Frontend (new terminal)
cd frontend
npm install
npm run dev                 # http://localhost:5190
```

## Everyday workflow

Add and edit recipes in the local admin:

```bash
cd frontend
npm run admin      # recipe admin at http://127.0.0.1:8190/admin
npm run dev        # the site at http://127.0.0.1:5190 (second terminal)
```

Saving in the admin checks the diet-label rules, writes `backend/app/data/recipes.json`
(a backup of the previous version goes to `backend/app/data/backups/`), and re-exports,
so the dev site updates straight away. Photos uploaded there are cropped to 16:9, 4:3 and
1:1 automatically. The admin only accepts requests from this computer.

You can still edit the JSON by hand (categories in `categories.json`, homepage picks in
`site.json`); then run `npm run content` to validate and export. A wrong diet tag fails
there too, for example a "gluten-free" recipe with plain oats.

## Production build

```bash
cd backend && SITE_URL=https://www.yourdomain.com .venv/bin/python -m app.export
cd ../frontend && npm run build && npm run preview   # http://localhost:4190
```

Upload `frontend/dist/site` to Netlify, Cloudflare Pages, Vercel, Firebase Hosting or
Cloud Storage. Configure the host to serve `404.html` for unknown URLs.

## Diet-label rules (enforced in `backend/app/models.py`)

- A diet tag only goes on a recipe if no ingredient rules it out (`contains: ["gluten"]`, `["dairy"]`…).
- Oats must be named "certified gluten-free oats", or be flagged as containing gluten.
- A recipe that needs a swap gets `diet_options: ["gluten-free"]` (shown as "GF option"),
  and every gluten ingredient needs a `gf_swap` explaining the swap.

## Optional recipe fields

- `article_html`: the article above the recipe card, written in the admin's editor (headings,
  lists, links, quotes and photos). It is cleaned on every load and save (`app/richtext.py`),
  and `[bracketed]` example text from the template blocks saving. Photos uploaded in the editor
  go to `frontend/public/images/articles/`.
- On each step, for cooking mode: `uses` (indexes into `ingredients`, shown as "For this step"
  with scaled quantities), `tip`, and `timer_done` (what to check when the timer ends).
- `storage.summary`: one line shown on the last cooking-mode screen.

## Photos

Until real photos exist, recipes show tinted placeholders with their final alt text.
To add a photo, set `"image": {"alt": "...", "src": "/images/recipes/<slug>"}` and put
three crops in `frontend/public/images/recipes/`: `<slug>-16x9.jpg`, `<slug>-4x3.jpg`
and `<slug>-1x1.jpg` (Google uses all three). Keep the dish centred so every crop works.

## Ads

Every ad is `frontend/src/components/AdSlot.tsx`. Placeholders show until you copy
`frontend/.env.example` to `.env` and add your AdSense client and slot IDs. Heights are
reserved in CSS (`.ad-*`), so ads never shift the layout.

## Before launch

- Replace `[Author name]`, the author bio, `[your email address]`, the "[3] times
  tested" claim, and the legal page text (`frontend/src/pages/InfoPage.tsx`, `AboutPage.tsx`).
- Set `SITE_URL` to your real domain when exporting.
- Point the newsletter form (`HomePage.tsx`) at your email provider.
- Replace the social links in `Footer.tsx`.
- Consider self-hosting DM Sans instead of loading it from Google Fonts.
