// Recipe admin. Plain JS, no build step. Talks to /api/admin (backend/app/admin.py).
'use strict';

const app = document.getElementById('app');
const toastEl = document.getElementById('toast');
let META = null;

// ---------- Helpers ----------

const esc = (v) =>
  String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

async function api(path, options = {}) {
  const res = await fetch(`/api/admin${path}`, {
    ...options,
    headers: { 'X-Sage-Admin': '1', ...(options.body && !(options.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}), ...options.headers },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(typeof data.detail === 'string' ? data.detail : 'Something went wrong.');
    err.status = res.status;
    err.details = data.detail;
    throw err;
  }
  return data;
}

let toastTimer;
function toast(msg, bad = false) {
  toastEl.textContent = msg;
  toastEl.classList.toggle('bad', bad);
  toastEl.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (toastEl.hidden = true), bad ? 6000 : 3500);
}

function slugify(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function getPath(obj, path) {
  return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

function setPath(obj, path, value) {
  const keys = path.split('.');
  const last = keys.pop();
  const parent = keys.reduce((o, k) => (o[k] ??= {}), obj);
  parent[last] = value;
}

const fmtQty = (n) => (n == null ? '' : String(n));

// ---------- Routing ----------

function route() {
  const hash = location.hash || '#/';
  if (hash.startsWith('#/edit/')) return showEditor(decodeURIComponent(hash.slice(7)));
  if (hash === '#/new') return showEditor(null);
  return showList();
}

let editor = null; // { recipe, original, dirty, ... }
let ignoreNextHash = false;

window.addEventListener('hashchange', () => {
  if (ignoreNextHash) {
    ignoreNextHash = false;
    return;
  }
  if (editor?.dirty && !confirm('You have unsaved changes. Leave without saving?')) {
    // Put the address back without reloading the editor (and losing the edits).
    ignoreNextHash = true;
    history.back();
    return;
  }
  route();
});
window.addEventListener('beforeunload', (e) => {
  if (editor?.dirty) e.preventDefault();
});

// ---------- List ----------

async function showList() {
  editor = null;
  app.innerHTML = '<p class="loading">Loading recipes…</p>';
  let rows;
  try {
    rows = await api('/recipes');
  } catch (e) {
    app.innerHTML = `<div class="page"><p class="errors">${esc(e.message)}</p></div>`;
    return;
  }
  const bare = rows.filter((r) => r.missing.length).length;
  const noPhoto = rows.filter((r) => !r.photo).length;
  app.innerHTML = `
    <div class="page">
      <div class="page-head">
        <div>
          <h1>Recipes <span class="muted">(${rows.length})</span></h1>
          <p>${bare} need more content · ${noPhoto} need a photo. Changes go live on the dev site as soon as you save.</p>
        </div>
        <label class="sr-only" for="q">Search recipes</label>
        <input id="q" class="search" type="search" placeholder="Search by title or address">
      </div>
      <table>
        <thead><tr><th>Recipe</th><th class="hide-sm">Meal</th><th>Diet</th><th>Photo</th><th>Content</th><th class="hide-sm">Cooking hints</th><th class="hide-sm">Updated</th></tr></thead>
        <tbody>${rows.map(listRow).join('')}</tbody>
      </table>
    </div>`;
  const q = document.getElementById('q');
  q.addEventListener('input', () => {
    const needle = q.value.trim().toLowerCase();
    app.querySelectorAll('tbody tr').forEach((tr) => {
      tr.hidden = needle && !tr.dataset.search.includes(needle);
    });
  });
}

function listRow(r) {
  const pct = Math.round((r.article_done / r.article_total) * 100);
  const tags = [
    ...r.diets.map((d) => `<span class="tag">${esc(META.diets[d])}</span>`),
    ...(r.diet_options.length ? ['<span class="tag tag-option">GF option</span>'] : []),
  ].join('');
  return `
    <tr data-search="${esc((r.title + ' ' + r.slug).toLowerCase())}">
      <td><a class="title-link" href="#/edit/${encodeURIComponent(r.slug)}">${esc(r.title)}</a><span class="slug">/recipes/${esc(r.slug)}</span></td>
      <td class="hide-sm">${esc(META.meals[r.meal])}</td>
      <td><div class="tags">${tags}</div></td>
      <td>${r.photo ? '<span class="yes">Yes</span>' : '<span class="no">Missing</span>'}</td>
      <td title="${r.missing.length ? 'Missing: ' + esc(r.missing.join(', ')) : 'Complete'}">
        <span class="meter"><span class="meter-bar"><span style="width:${pct}%"></span></span>${r.words} words${r.article_images ? ` · ${r.article_images} photo${r.article_images === 1 ? '' : 's'}` : ''}</span>
      </td>
      <td class="hide-sm">${r.cooking_hints ? '<span class="yes">Yes</span>' : '<span class="muted">—</span>'}</td>
      <td class="hide-sm">${esc(r.date_modified)}</td>
    </tr>`;
}

// ---------- Editor ----------

function blankRecipe() {
  return {
    slug: '', title: '', description: '', intro: '',
    image: { alt: '', src: null },
    meal: 'dinner', diets: [], diet_options: [], collections: [],
    cuisine: '', difficulty: 'easy',
    prep_minutes: 10, cook_minutes: 20, extra_time: null, servings: 4, yield_label: 'servings',
    ingredients: [blankIngredient()],
    steps: [blankStep()],
    article_html: ARTICLE_TEMPLATE,
    storage: null, faq: [],
    author: '[Author name]', date_published: META.today, date_modified: META.today, popularity: 100,
  };
}
const blankIngredient = () => ({ qty: null, unit: '', item: '', note: '', contains: [], gf_swap: null });
const blankStep = () => ({ text: '', timer_seconds: null, uses: [], tip: null, timer_done: null });

const LISTS = {
  ingredients: blankIngredient,
  steps: blankStep,
  faq: () => ({ question: '', answer: '' }),
};

// The design's article sections. New recipes start with these; delete any you don't need.
const ARTICLE_TEMPLATE = [
  '<h2>About this recipe</h2><p>[What it is, who it’s for and why it works — two or three sentences.]</p>',
  '<h2>Why you’ll love this recipe</h2><ul><li>[Quick? Easy? Made from pantry staples?]</li></ul>',
  '<h2>Ingredients overview</h2><ul><li><strong>[Main ingredient]:</strong> [what to buy and why it matters]</li></ul>',
  '<h2>Substitutions and variations</h2><ul><li><strong>[Swap]:</strong> [how to make it work]</li></ul>',
  '<h2>Step-by-step instructions</h2><h3>1. [First stage]</h3><p>[What happens and what to look for. Add a process photo here.]</p>',
  '<h2>Tips for success</h2><ul><li>[The one thing people get wrong]</li></ul>',
].join('');

async function showEditor(slug) {
  app.innerHTML = '<p class="loading">Loading…</p>';
  let recipe;
  try {
    recipe = slug ? await api(`/recipes/${encodeURIComponent(slug)}`) : blankRecipe();
  } catch (e) {
    app.innerHTML = `<div class="page"><p class="errors">${esc(e.message)} <a href="#/">Back to the list</a></p></div>`;
    return;
  }
  editor = { recipe, original: slug, dirty: false, slugTouched: Boolean(slug), markUpdated: true, errors: [] };
  renderEditor();
}

const SECTIONS = [
  ['basics', 'Basics'],
  ['times', 'Times & servings'],
  ['photo', 'Photo'],
  ['ingredients', 'Ingredients'],
  ['steps', 'Steps'],
  ['article', 'Article'],
  ['storage', 'Storage'],
  ['faq', 'FAQ'],
  ['publishing', 'Publishing'],
];

function renderEditor() {
  const r = editor.recipe;
  const isNew = !editor.original;
  app.innerHTML = `
    <div class="editor">
      <div class="editor-head">
        <div>
          <a href="#/">← All recipes</a>
          <h1>${isNew ? 'New recipe' : esc(r.title || 'Untitled')}</h1>
        </div>
        <div class="actions">
          <span class="dirty-note" id="dirty" ${editor.dirty ? '' : 'hidden'}>Unsaved changes</span>
          ${isNew ? '' : `<a class="btn btn-outline" target="_blank" rel="noopener" href="${esc(META.dev_site_url)}/recipes/${encodeURIComponent(editor.original)}">View on site</a>`}
          ${isNew ? '' : '<button type="button" class="btn btn-danger" data-action="delete">Delete</button>'}
          <button type="button" class="btn btn-outline" data-action="check">Check</button>
          <button type="button" class="btn btn-primary" data-action="save">${isNew ? 'Create recipe' : 'Save'}</button>
        </div>
      </div>
      <div id="errors"></div>
      <nav class="toc" aria-label="Sections">${SECTIONS.map(([id, label]) => `<a href="#" data-jump="${id}">${label}</a>`).join('')}</nav>
      <form class="form" id="form" novalidate>
        ${sectionBasics(r)}
        ${sectionTimes(r)}
        ${sectionPhoto(r)}
        <section class="card" id="sec-ingredients"><h2>Ingredients</h2>
          <p class="hint">Tick what each ingredient contains — the diet labels are checked against these. Leave the amount empty for “to taste” items.</p>
          <div data-list="ingredients">${listIngredients(r)}</div></section>
        <section class="card" id="sec-steps"><h2>Steps</h2>
          <p class="hint">The method, one action per step. Timers, “For this step” ingredients and tips appear in cooking mode.</p>
          <div data-list="steps">${listSteps(r)}</div></section>
        ${sectionArticle()}
        ${sectionStorage(r)}
        <section class="card" id="sec-faq"><h2>FAQ</h2>
          <p class="hint">Shown on the page and marked up for Google. Answer the questions people actually search for.</p>
          <div data-list="faq">${listPairs('faq', r.faq, 'question', 'answer', 'Question', 'Answer')}</div></section>
        ${sectionPublishing(r)}
      </form>
    </div>`;
  renderErrors();
  updateDietWarnings();
  mountArticleEditor();
}

// ----- Field builders -----

function input(path, label, { type = 'text', value, hint = '', wide = false, step, min, placeholder = '', kind = 'text' } = {}) {
  const v = value !== undefined ? value : getPath(editor.recipe, path);
  const id = `f-${path.replace(/\./g, '-')}`;
  return `<div class="field${wide ? ' field-wide' : ''}" data-field="${path}">
    <label for="${id}">${label}</label>
    <input id="${id}" type="${type}" data-path="${path}" data-kind="${kind}" value="${esc(v)}" ${step ? `step="${step}"` : ''} ${min !== undefined ? `min="${min}"` : ''} placeholder="${esc(placeholder)}">
    ${hint ? `<small>${hint}</small>` : ''}</div>`;
}

function textarea(path, label, { hint = '', wide = true, rows = 3, kind = 'text', placeholder = '' } = {}) {
  const id = `f-${path.replace(/\./g, '-')}`;
  return `<div class="field${wide ? ' field-wide' : ''}" data-field="${path}">
    <label for="${id}">${label}</label>
    <textarea id="${id}" rows="${rows}" data-path="${path}" data-kind="${kind}" placeholder="${esc(placeholder)}">${esc(getPath(editor.recipe, path))}</textarea>
    ${hint ? `<small>${hint}</small>` : ''}</div>`;
}

function select(path, label, options) {
  const id = `f-${path.replace(/\./g, '-')}`;
  const v = getPath(editor.recipe, path);
  return `<div class="field" data-field="${path}"><label for="${id}">${label}</label>
    <select id="${id}" data-path="${path}" data-kind="text">${Object.entries(options)
      .map(([k, l]) => `<option value="${esc(k)}" ${k === v ? 'selected' : ''}>${esc(l)}</option>`)
      .join('')}</select></div>`;
}

function rowTools(list, i, len) {
  return `<div class="row-tools">
    <button type="button" class="icon-btn" data-move="${list}" data-from="${i}" data-to="${i - 1}" ${i === 0 ? 'disabled' : ''} aria-label="Move up">↑</button>
    <button type="button" class="icon-btn" data-move="${list}" data-from="${i}" data-to="${i + 1}" ${i === len - 1 ? 'disabled' : ''} aria-label="Move down">↓</button>
    <button type="button" class="icon-btn" data-remove="${list}" data-index="${i}" aria-label="Remove">✕</button></div>`;
}

const addButton = (list, label) => `<button type="button" class="btn btn-outline btn-small add-row" data-add="${list}">+ ${label}</button>`;

// ----- Sections -----

function sectionBasics(r) {
  const dietChecks = Object.entries(META.diets)
    .map(([k, l]) => `<label class="check"><input type="checkbox" data-array="diets" value="${k}" ${r.diets.includes(k) ? 'checked' : ''}>${esc(l)}</label>`)
    .join('');
  return `<section class="card" id="sec-basics"><h2>Basics</h2>
    <p class="hint">What shows on recipe cards, in search results and at the top of the page.</p>
    <div class="grid grid-2">
      ${input('title', 'Title', { wide: true, placeholder: 'Easy Vegan Chickpea Curry' })}
      ${input('slug', 'Address', { hint: 'The page lives at /recipes/<b>this-address</b>. Changing it later breaks old links.', kind: 'slug' })}
      ${input('cuisine', 'Cuisine', { placeholder: 'Indian-inspired' })}
      ${textarea('description', 'Short description', { rows: 2, hint: 'One sentence for recipe cards and the recipe card box.' })}
      ${textarea('intro', 'Intro', { rows: 3, hint: 'The first paragraph under the title. Also used as the Google description, so lead with what it is and why it’s good.' })}
      ${select('meal', 'Meal', META.meals)}
      ${select('difficulty', 'Difficulty', META.difficulties)}
      <div class="field field-wide" data-field="diets"><span class="label">Diet labels</span>
        <div class="checks">${dietChecks}
          <label class="check"><input type="checkbox" data-gf-option ${r.diet_options.includes('gluten-free') ? 'checked' : ''}>GF option <span class="muted">(gluten-free with a swap)</span></label>
        </div>
        <p class="diet-warn" id="diet-warn"></p></div>
      ${input('collections', 'Collections', { value: r.collections.join(', '), kind: 'csv', wide: true, hint: `Comma-separated. In use: ${esc(META.collections.join(', ') || 'none yet')}` })}
    </div></section>`;
}

function sectionTimes(r) {
  return `<section class="card" id="sec-times"><h2>Times &amp; servings</h2>
    <p class="hint">Total time is prep + cook. Put waiting time such as “overnight” in Extra time.</p>
    <div class="grid">
      ${input('prep_minutes', 'Prep (minutes)', { type: 'number', min: 0, kind: 'int' })}
      ${input('cook_minutes', 'Cook (minutes)', { type: 'number', min: 0, kind: 'int' })}
      ${input('extra_time', 'Extra time', { kind: 'nullable', placeholder: 'overnight' })}
      ${input('servings', 'Servings', { type: 'number', min: 1, kind: 'int' })}
      ${input('yield_label', 'Yield word', { hint: '“servings”, “bites”, “pancakes”…' })}
    </div></section>`;
}

function sectionPhoto(r) {
  const slug = r.slug;
  const stamp = editor.photoStamp || '';
  const crops = r.image.src
    ? `<div class="crops">${['16x9', '4x3', '1x1']
        .map((c) => `<figure><img src="${esc(r.image.src)}-${c}.jpg${stamp}" alt=""><figcaption>${c.replace('x', ':')}</figcaption></figure>`)
        .join('')}</div>`
    : '<div class="no-photo">No photo yet</div>';
  return `<section class="card" id="sec-photo"><h2>Photo</h2>
    <p class="hint">Upload one landscape photo with the dish in the centre. Three crops are made automatically (16:9, 4:3, 1:1). Use at least 1600px wide.</p>
    <div class="photo-box">${crops}
      <div class="field" style="flex:1 1 260px">
        <label for="photo-file">Upload photo</label>
        <input id="photo-file" type="file" accept="image/jpeg,image/png,image/webp" ${slug ? '' : 'disabled'}>
        <small>${slug ? 'Saved straight away; click Save to attach it to the recipe.' : 'Fill in the address first.'}</small>
        <p id="photo-warn" class="diet-warn">${esc(editor.photoWarnings || '')}</p>
      </div>
      ${input('image.alt', 'Alt text', { wide: true, hint: 'Describe the photo for screen readers and Google, e.g. “Chickpea curry in a white bowl with rice and coriander”.' })}
    </div></section>`;
}

function listIngredients(r) {
  const rows = r.ingredients
    .map((ing, i) => {
      const p = `ingredients.${i}`;
      const flags = META.flags
        .map((f) => `<label class="check"><input type="checkbox" data-array="${p}.contains" value="${f}" ${ing.contains.includes(f) ? 'checked' : ''}>${f}</label>`)
        .join('');
      return `<div class="row" data-field="${p}">
        <div class="row-head"><span class="row-num">Ingredient ${i + 1}</span>${rowTools('ingredients', i, r.ingredients.length)}</div>
        <div class="ing-grid">
          ${input(`${p}.qty`, 'Amount', { type: 'number', step: 'any', min: 0, kind: 'float', value: fmtQty(ing.qty) })}
          ${input(`${p}.unit`, 'Unit', { placeholder: 'g, tbsp…' })}
          ${input(`${p}.item`, 'Ingredient', { placeholder: 'chickpeas' })}
          ${input(`${p}.note`, 'Note', { placeholder: 'optional' })}
        </div>
        <div class="ing-extra"><span class="label">Contains:</span>${flags}</div>
        ${ing.contains.includes('gluten') ? `<div class="swap">${input(`${p}.gf_swap`, 'Gluten-free swap', { kind: 'nullable', placeholder: 'Use certified gluten-free oats.', hint: 'Needed for a “GF option” label.' })}</div>` : ''}
      </div>`;
    })
    .join('');
  return `<div class="rows">${rows || '<p class="empty-list">No ingredients yet.</p>'}</div>${addButton('ingredients', 'Add ingredient')}`;
}

function ingredientLabel(ing, i) {
  const text = [fmtQty(ing.qty), ing.unit, ing.item].filter(Boolean).join(' ');
  return text || `Ingredient ${i + 1}`;
}

function listSteps(r) {
  const rows = r.steps
    .map((s, i) => {
      const p = `steps.${i}`;
      const uses = r.ingredients
        .map((ing, j) => `<label class="check"><input type="checkbox" data-uses="${i}" value="${j}" ${s.uses.includes(j) ? 'checked' : ''}>${esc(ingredientLabel(ing, j))}</label>`)
        .join('');
      const minutes = s.timer_seconds ? +(s.timer_seconds / 60).toFixed(2) : '';
      return `<div class="row" data-field="${p}">
        <div class="row-head"><span class="row-num">Step ${i + 1}</span>${rowTools('steps', i, r.steps.length)}</div>
        <div class="grid grid-2">
          ${textarea(`${p}.text`, 'Instruction', { rows: 2 })}
          ${input(`${p}.timer_seconds`, 'Timer (minutes)', { type: 'number', step: 'any', min: 0, kind: 'timer', value: minutes, hint: 'Leave empty for no timer.' })}
          ${input(`${p}.timer_done`, 'When the timer ends', { kind: 'nullable', placeholder: 'optional, e.g. check the sauce has thickened' })}
          ${input(`${p}.tip`, 'Tip', { kind: 'nullable', wide: true, placeholder: 'optional, e.g. keep stirring — spices burn quickly' })}
          <div class="field field-wide"><span class="label">For this step <span class="muted">(ingredients shown in cooking mode)</span></span><div class="uses">${uses}</div></div>
        </div></div>`;
    })
    .join('');
  return `<div class="rows">${rows || '<p class="empty-list">No steps yet.</p>'}</div>${addButton('steps', 'Add step')}`;
}

function listPairs(list, items, a, b, labelA, labelB) {
  const rows = items
    .map((_, i) => {
      const p = `${list}.${i}`;
      return `<div class="row" data-field="${p}"><div class="row-head"><span class="row-num">${labelA} ${i + 1}</span>${rowTools(list, i, items.length)}</div>
        <div class="grid grid-2">${input(`${p}.${a}`, labelA, { wide: true })}${textarea(`${p}.${b}`, labelB, { rows: 2 })}</div></div>`;
    })
    .join('');
  return `<div class="rows">${rows || '<p class="empty-list">None yet.</p>'}</div>${addButton(list, `Add ${labelA.toLowerCase()}`)}`;
}

function sectionArticle() {
  return `<section class="card" id="sec-article"><h2>Article</h2>
    <p class="hint">Everything above the recipe card. Use <b>Heading</b> for sections (H2) and <b>Subheading</b> for stages (H3).
      Click the photo button to upload a picture where the cursor is; double-click a photo to change its description.</p>
    <div id="article-editor" class="article-editor"></div>
    <div class="article-foot">
      <span id="article-count" class="muted"></span>
      <button type="button" class="btn btn-outline btn-small" data-action="template">Add the standard section headings</button>
    </div>
  </section>`;
}

function sectionStorage(r) {
  const s = r.storage || {};
  const f = (key, label, placeholder) => input(`storage.${key}`, label, { kind: 'storage', value: s[key] ?? '', placeholder, wide: key === 'summary' });
  return `<section class="card" id="sec-storage"><h2>Storage</h2>
    <p class="hint">Leave all empty to hide the section.</p>
    <div class="grid grid-2">
      ${f('fridge', 'Fridge', 'Up to 4 days in an airtight container.')}
      ${f('freezer', 'Freezer', 'Up to 3 months.')}
      ${f('reheat', 'Reheat', 'Gently on the stove with a splash of water.')}
      ${f('summary', 'One-line summary (end of cooking mode)', 'Leftovers keep for 4 days in the fridge or 3 months in the freezer.')}
    </div></section>`;
}

function sectionPublishing(r) {
  return `<section class="card" id="sec-publishing"><h2>Publishing</h2>
    <div class="grid">
      ${input('author', 'Author')}
      ${input('date_published', 'Published', { type: 'date' })}
      ${input('date_modified', 'Last updated', { type: 'date' })}
      ${input('popularity', 'Popularity rank', { type: 'number', min: 1, kind: 'int', hint: 'Lower = higher in “Popular this week”.' })}
    </div>
    ${editor.original ? `<label class="check" style="margin-top:12px"><input type="checkbox" id="mark-updated" ${editor.markUpdated ? 'checked' : ''}>Set “Last updated” to today when I save</label>` : ''}
  </section>`;
}

// ----- Diet hints (mirrors the rules in models.py) -----

function updateDietWarnings() {
  const el = document.getElementById('diet-warn');
  if (!el) return;
  const r = editor.recipe;
  const msgs = [];
  for (const d of r.diets) {
    const blockers = META.diet_blockers[d] || [];
    const bad = r.ingredients.filter((i) => i.contains.some((c) => blockers.includes(c))).map((i) => i.item || 'an unnamed ingredient');
    if (bad.length) msgs.push(`${META.diets[d]} is ruled out by: ${bad.join(', ')}.`);
  }
  const oats = r.ingredients.filter((i) => /oat/i.test(i.item) && !i.contains.includes('gluten') && !/certified gluten-free/i.test(i.item));
  if (oats.length) msgs.push(`Oats count as gluten-free only when named “certified gluten-free oats” — otherwise tick “gluten”.`);
  if (r.diet_options.includes('gluten-free')) {
    if (r.diets.includes('gluten-free')) msgs.push('Choose either Gluten-Free or GF option, not both.');
    const gluten = r.ingredients.filter((i) => i.contains.includes('gluten'));
    if (!gluten.length) msgs.push('GF option needs at least one ingredient marked “gluten” (with a swap). Otherwise use the Gluten-Free label.');
    else if (gluten.some((i) => !i.gf_swap)) msgs.push('Every gluten ingredient needs a gluten-free swap for the GF option label.');
  }
  el.textContent = msgs.join(' ');
}

// ---------- Editing ----------

function markDirty() {
  editor.dirty = true;
  const d = document.getElementById('dirty');
  if (d) d.hidden = false;
}

function convert(kind, raw) {
  switch (kind) {
    case 'int':
      return raw === '' ? null : parseInt(raw, 10);
    case 'float':
      return raw === '' ? null : parseFloat(raw);
    case 'timer':
      return raw === '' || Number(raw) <= 0 ? null : Math.round(parseFloat(raw) * 60);
    case 'nullable':
      return raw.trim() === '' ? null : raw;
    case 'csv':
      return raw.split(',').map((s) => s.trim()).filter(Boolean);
    default:
      return raw;
  }
}

app.addEventListener('input', (e) => {
  if (!editor) return;
  const el = e.target;
  const path = el.dataset.path;
  if (!path) return;
  const kind = el.dataset.kind;
  const r = editor.recipe;

  if (kind === 'storage') {
    const key = path.split('.')[1];
    const s = { fridge: null, freezer: null, reheat: null, summary: null, ...(r.storage || {}) };
    s[key] = el.value.trim() === '' ? null : el.value;
    r.storage = Object.values(s).some(Boolean) ? s : null;
  } else if (kind === 'slug') {
    el.value = el.value.toLowerCase().replace(/\s+/g, '-');
    r.slug = el.value;
    editor.slugTouched = true;
    syncPhotoInput();
  } else {
    setPath(r, path, convert(kind, el.value));
  }

  if (path === 'title' && !editor.slugTouched) {
    r.slug = slugify(el.value);
    const slugEl = document.getElementById('f-slug');
    if (slugEl) slugEl.value = r.slug;
    syncPhotoInput();
  }
  // Ingredient names appear in the steps' "For this step" lists.
  if (/^ingredients\.\d+\.(qty|unit|item)$/.test(path)) refreshSteps(false);
  if (/^ingredients\.\d+\.item$/.test(path)) updateDietWarnings();
  el.closest('.invalid')?.classList.remove('invalid');
  markDirty();
});

app.addEventListener('change', (e) => {
  if (!editor) return;
  const el = e.target;
  const r = editor.recipe;
  if (el.dataset.array) {
    const list = getPath(r, el.dataset.array);
    const next = el.checked ? [...new Set([...list, el.value])] : list.filter((v) => v !== el.value);
    setPath(r, el.dataset.array, next);
    if (/^ingredients\.\d+\.contains$/.test(el.dataset.array) && el.value === 'gluten') {
      if (!el.checked) setPath(r, el.dataset.array.replace('contains', 'gf_swap'), null);
      rerenderList('ingredients');
    }
    updateDietWarnings();
    markDirty();
  } else if (el.dataset.uses !== undefined) {
    const step = r.steps[Number(el.dataset.uses)];
    const j = Number(el.value);
    step.uses = el.checked ? [...new Set([...step.uses, j])].sort((a, b) => a - b) : step.uses.filter((v) => v !== j);
    markDirty();
  } else if (el.hasAttribute('data-gf-option')) {
    r.diet_options = el.checked ? ['gluten-free'] : [];
    updateDietWarnings();
    markDirty();
  } else if (el.id === 'mark-updated') {
    editor.markUpdated = el.checked;
  } else if (el.id === 'photo-file' && el.files[0]) {
    uploadPhoto(el.files[0]);
  }
});

app.addEventListener('click', (e) => {
  const t = e.target.closest('button, a[data-jump]');
  if (!t || !editor) return;
  const r = editor.recipe;
  if (t.dataset.jump) {
    e.preventDefault();
    document.getElementById(`sec-${t.dataset.jump}`)?.scrollIntoView({ behavior: 'smooth' });
  } else if (t.dataset.add) {
    getPath(r, t.dataset.add).push(LISTS[t.dataset.add]());
    rerenderList(t.dataset.add);
    markDirty();
    const rows = app.querySelectorAll(`[data-list="${t.dataset.add}"] .row`);
    rows[rows.length - 1]?.querySelector('input, textarea')?.focus();
  } else if (t.dataset.remove) {
    const list = t.dataset.remove;
    const i = Number(t.dataset.index);
    getPath(r, list).splice(i, 1);
    if (list === 'ingredients') remapUses((j) => (j === i ? null : j > i ? j - 1 : j));
    rerenderList(list);
    markDirty();
  } else if (t.dataset.move) {
    const list = t.dataset.move;
    const from = Number(t.dataset.from);
    const to = Number(t.dataset.to);
    const arr = getPath(r, list);
    [arr[from], arr[to]] = [arr[to], arr[from]];
    if (list === 'ingredients') remapUses((j) => (j === from ? to : j === to ? from : j));
    rerenderList(list);
    markDirty();
  } else if (t.dataset.action === 'save') {
    save();
  } else if (t.dataset.action === 'check') {
    check();
  } else if (t.dataset.action === 'delete') {
    remove();
  } else if (t.dataset.action === 'template') {
    addTemplate();
  } else if (t.dataset.errorPath !== undefined) {
    focusPath(t.dataset.errorPath);
  }
});

/** Steps point at ingredients by position; keep them pointing at the same ones. */
function remapUses(fn) {
  for (const s of editor.recipe.steps) {
    s.uses = s.uses.map(fn).filter((j) => j !== null).sort((a, b) => a - b);
  }
  refreshSteps(true);
  updateDietWarnings();
}

function refreshSteps(force) {
  // Re-render the steps list unless the user is typing in it.
  if (!force && document.activeElement?.closest('[data-list="steps"]')) return;
  rerenderList('steps');
}

function rerenderList(list) {
  const box = app.querySelector(`[data-list="${list}"]`);
  if (!box) return;
  const r = editor.recipe;
  const html = {
    ingredients: () => listIngredients(r),
    steps: () => listSteps(r),
    faq: () => listPairs('faq', r.faq, 'question', 'answer', 'Question', 'Answer'),
  }[list];
  box.innerHTML = html();
  if (list === 'ingredients') refreshSteps(true);
}

function syncPhotoInput() {
  const f = document.getElementById('photo-file');
  if (f) f.disabled = !editor.recipe.slug;
}

async function uploadPhoto(file) {
  const r = editor.recipe;
  const body = new FormData();
  body.append('file', file);
  toast('Uploading photo…');
  try {
    const res = await api(`/photos/${encodeURIComponent(r.slug)}`, { method: 'POST', body });
    r.image.src = res.src;
    editor.photoStamp = `?t=${Date.now()}`;
    editor.photoWarnings = res.warnings.join(' ');
    const sec = document.getElementById('sec-photo');
    sec.outerHTML = sectionPhoto(r);
    markDirty();
    toast(res.warnings.length ? 'Photo uploaded — see the note about size' : 'Photo uploaded. Click Save to attach it.');
  } catch (e) {
    toast(e.message, true);
  }
}

// ---------- Article editor (Quill) ----------

function articleHtml(quill) {
  const hasImage = Boolean(quill.root.querySelector('img'));
  if (!quill.getText().trim() && !hasImage) return null;
  // getSemanticHTML gives plain <ul>/<ol>; it also turns spaces into &nbsp;, which we undo.
  return quill.getSemanticHTML().replace(/&nbsp;/g, ' ');
}

function updateArticleCount() {
  const el = document.getElementById('article-count');
  if (!el || !editor.quill) return;
  const words = editor.quill.getText().trim().split(/\s+/).filter(Boolean).length;
  const photos = editor.quill.root.querySelectorAll('img').length;
  el.textContent = `${words} words · ${photos} photo${photos === 1 ? '' : 's'}`;
}

function mountArticleEditor() {
  const el = document.getElementById('article-editor');
  if (!el) return;
  const quill = new Quill(el, {
    theme: 'snow',
    placeholder: 'Write the article…',
    modules: {
      toolbar: {
        container: [
          [{ header: [2, 3, false] }],
          ['bold', 'italic', 'link'],
          [{ list: 'bullet' }, { list: 'ordered' }],
          ['blockquote', 'image'],
          ['clean'],
        ],
        handlers: { image: () => pickArticlePhoto(quill) },
      },
    },
  });
  // Plain-language labels for the toolbar (Quill shows icons only).
  const labels = { 'ql-bold': 'Bold', 'ql-italic': 'Italic', 'ql-link': 'Link', 'ql-blockquote': 'Quote', 'ql-image': 'Upload photo', 'ql-clean': 'Clear formatting' };
  el.previousElementSibling?.querySelectorAll('button').forEach((b) => {
    const cls = [...b.classList].find((c) => labels[c]);
    let label = labels[cls];
    if (b.classList.contains('ql-list')) label = b.value === 'bullet' ? 'Bullet list' : 'Numbered list';
    if (label) {
      b.title = label;
      b.setAttribute('aria-label', label);
    }
  });
  // setContents (unlike dangerouslyPasteHTML) doesn't move the cursor into the editor and scroll the page.
  if (editor.recipe.article_html) quill.setContents(quill.clipboard.convert({ html: editor.recipe.article_html }), 'silent');
  quill.history.clear();
  quill.on('text-change', () => {
    editor.recipe.article_html = articleHtml(quill);
    updateArticleCount();
    markDirty();
  });
  quill.root.addEventListener('dblclick', (e) => {
    if (e.target.tagName !== 'IMG') return;
    const blot = Quill.find(e.target);
    const alt = prompt('Describe this photo (for screen readers and Google):', e.target.getAttribute('alt') || '');
    if (alt === null || !blot) return;
    quill.formatText(quill.getIndex(blot), 1, 'alt', alt.trim(), 'user');
  });
  editor.quill = quill;
  updateArticleCount();
}

function pickArticlePhoto(quill) {
  if (!editor.recipe.slug) {
    toast('Fill in the recipe address first.', true);
    return;
  }
  const picker = document.createElement('input');
  picker.type = 'file';
  picker.accept = 'image/jpeg,image/png,image/webp';
  picker.onchange = async () => {
    const file = picker.files[0];
    if (!file) return;
    const range = quill.getSelection(true);
    const body = new FormData();
    body.append('file', file);
    toast('Uploading photo…');
    try {
      const res = await api(`/article-photos/${encodeURIComponent(editor.recipe.slug)}`, { method: 'POST', body });
      const alt = prompt('Describe this photo (for screen readers and Google):', '') || '';
      const index = range ? range.index : quill.getLength();
      quill.insertEmbed(index, 'image', res.src, 'user');
      quill.formatText(index, 1, { alt: alt.trim(), width: String(res.width), height: String(res.height) }, 'user');
      quill.setSelection(index + 1, 0, 'silent');
      toast(res.warnings.length ? res.warnings[0] : 'Photo added to the article.', res.warnings.length > 0);
    } catch (e) {
      toast(e.message, true);
    }
  };
  picker.click();
}

function addTemplate() {
  const quill = editor.quill;
  if (!quill) return;
  if (articleHtml(quill) && !confirm('Add the standard section headings at the end of the article?')) return;
  quill.clipboard.dangerouslyPasteHTML(quill.getLength(), ARTICLE_TEMPLATE, 'user');
}

// ---------- Errors ----------

const LABELS = {
  ingredients: 'Ingredient', steps: 'Step', faq: 'FAQ', article_html: 'Article',
  image: 'Photo', storage: 'Storage', qty: 'amount', item: 'name', text: 'text', title: 'title',
  slug: 'Address', intro: 'Intro', description: 'Short description', cuisine: 'Cuisine',
};

function describeLoc(loc) {
  if (!loc.length) return '';
  return loc
    .map((part) => (/^\d+$/.test(part) ? String(Number(part) + 1) : LABELS[part] || part.replace(/_/g, ' ')))
    .join(' › ');
}

function renderErrors() {
  const box = document.getElementById('errors');
  if (!box) return;
  app.querySelectorAll('.invalid').forEach((el) => el.classList.remove('invalid'));
  if (!editor.errors.length) {
    box.innerHTML = '';
    return;
  }
  box.innerHTML = `<div class="errors" role="alert"><h2>Fix ${editor.errors.length === 1 ? 'this' : 'these'} before saving</h2><ul>${editor.errors
    .map((err) => {
      const path = err.loc.join('.');
      const where = describeLoc(err.loc);
      return `<li>${where ? `<button type="button" data-error-path="${esc(path)}">${esc(where)}</button>: ` : ''}${esc(err.msg)}</li>`;
    })
    .join('')}</ul></div>`;
  for (const err of editor.errors) {
    if (!err.loc.length) continue;
    const el = app.querySelector(`[data-field="${CSS.escape(err.loc.join('.'))}"]`) || app.querySelector(`[data-field="${CSS.escape(err.loc.slice(0, 2).join('.'))}"]`);
    el?.classList.add('invalid');
  }
}

function focusPath(path) {
  const el = app.querySelector(`[data-field="${CSS.escape(path)}"]`) || app.querySelector(`[data-path^="${CSS.escape(path)}"]`)?.closest('[data-field]');
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  el.querySelector('input, textarea, select')?.focus({ preventScroll: true });
}

function payload() {
  const r = structuredClone(editor.recipe);
  if (editor.original && editor.markUpdated) r.date_modified = META.today;
  r.ingredients.forEach((i) => {
    if (!i.contains.includes('gluten')) i.gf_swap = null;
  });
  return r;
}

function handleError(e) {
  if (e.status === 422 && e.details?.errors) {
    editor.errors = e.details.errors;
    renderErrors();
    document.getElementById('errors').scrollIntoView({ behavior: 'smooth', block: 'center' });
    toast('Not saved — see the list at the top.', true);
  } else {
    toast(e.message, true);
  }
}

async function check() {
  try {
    await api('/validate', { method: 'POST', body: JSON.stringify(payload()) });
    editor.errors = [];
    renderErrors();
    toast('Everything checks out.');
  } catch (e) {
    handleError(e);
  }
}

async function save() {
  const body = JSON.stringify(payload());
  try {
    const res = editor.original
      ? await api(`/recipes/${encodeURIComponent(editor.original)}`, { method: 'PUT', body })
      : await api('/recipes', { method: 'POST', body });
    editor.errors = [];
    editor.dirty = false;
    const wasNew = !editor.original;
    if (editor.original && editor.markUpdated) editor.recipe.date_modified = META.today;
    const renamed = editor.original && editor.original !== res.slug;
    editor.original = res.slug;
    toast(wasNew ? 'Recipe created — the dev site is updated.' : 'Saved — the dev site is updated.');
    if (wasNew || renamed) {
      location.hash = `#/edit/${encodeURIComponent(res.slug)}`;
    } else {
      renderEditor();
    }
  } catch (e) {
    handleError(e);
  }
}

async function remove() {
  const r = editor.recipe;
  if (!confirm(`Delete “${r.title}”?\n\nIt disappears from the dev site now, and from the live site after your next build and upload. A backup of recipes.json is kept in backend/app/data/backups.`)) return;
  try {
    await api(`/recipes/${encodeURIComponent(editor.original)}`, { method: 'DELETE' });
    editor.dirty = false;
    toast('Recipe deleted.');
    location.hash = '#/';
  } catch (e) {
    toast(e.message, true);
  }
}

// ---------- Start ----------

(async () => {
  try {
    META = await api('/meta');
  } catch (e) {
    app.innerHTML = `<div class="page"><p class="errors">Can't reach the API: ${esc(e.message)}</p></div>`;
    return;
  }
  document.getElementById('open-site').href = META.dev_site_url;
  route();
})();
