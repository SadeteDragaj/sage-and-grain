// Optional content fields and their defaults. content/*.json leaves defaults out
// (the admin strips them on save) and everything that reads content fills them in
// here, so this is the one place a default is defined.

interface Model {
  /** Every field, in the order they are written to JSON. */
  fields: string[];
  defaults: Record<string, unknown>;
  /** Fields holding another model (or a list of them, written [model]). */
  nested?: Record<string, string | [string]>;
}

const MODELS: Record<string, Model> = {
  image: { fields: ['alt', 'src'], defaults: { src: null } },
  ingredient: {
    fields: ['qty', 'unit', 'item', 'note', 'contains', 'gf_swap'],
    defaults: { qty: null, unit: '', note: '', contains: [], gf_swap: null },
  },
  step: {
    fields: ['text', 'timer_seconds', 'uses', 'tip', 'timer_done'],
    defaults: { timer_seconds: null, uses: [], tip: null, timer_done: null },
  },
  storage: {
    fields: ['fridge', 'freezer', 'reheat', 'summary'],
    defaults: { fridge: null, freezer: null, reheat: null, summary: null },
  },
  note: { fields: ['title', 'text'], defaults: {} },
  faq: { fields: ['question', 'answer'], defaults: {} },
  collection: { fields: ['label', 'query'], defaults: {} },
  recipe: {
    fields: [
      'slug', 'title', 'description', 'intro', 'image', 'meal', 'diets', 'diet_options', 'collections',
      'cuisine', 'difficulty', 'prep_minutes', 'cook_minutes', 'extra_time', 'servings', 'yield_label',
      'ingredients', 'steps', 'article_html', 'storage', 'faq', 'author', 'date_published',
      'date_modified', 'popularity',
    ],
    defaults: {
      diet_options: [],
      collections: [],
      extra_time: null, // e.g. "overnight" — not counted in total_minutes
      yield_label: 'servings',
      article_html: null,
      storage: null,
      faq: [],
      author: '[Author name]',
      popularity: 100, // lower = more popular this week
    },
    nested: { image: 'image', ingredients: ['ingredient'], steps: ['step'], storage: 'storage', faq: ['faq'] },
  },
  category: {
    fields: [
      'slug', 'name', 'h1', 'meta_description', 'intro', 'match_diet', 'match_meals', 'match_collection',
      'collections', 'guide_title', 'guide', 'faq', 'related', 'tone',
    ],
    defaults: { match_diet: null, match_meals: [], match_collection: null, collections: [], related: [], tone: 'green' },
    nested: { collections: ['collection'], guide: ['note'], faq: ['faq'] },
  },
};

type Row = Record<string, unknown>;

function eachNested(model: Model, field: string, value: unknown, fn: (name: string, v: Row) => Row) {
  const sub = model.nested?.[field];
  if (!sub || value == null) return value;
  if (Array.isArray(sub)) return (value as Row[]).map((v) => fn(sub[0], v));
  return fn(sub, value as Row);
}

/** Every field present, in order, with defaults filled in. */
export function fill(name: string, raw: Row): Row {
  const model = MODELS[name];
  const out: Row = {};
  for (const f of model.fields) {
    const value = raw[f] !== undefined ? raw[f] : structuredClone(model.defaults[f]);
    out[f] = eachNested(model, f, value, fill);
  }
  return out;
}

/** The reverse of fill(): fields equal to their default are left out, so the JSON stays readable. */
export function strip(name: string, full: Row): Row {
  const model = MODELS[name];
  const out: Row = {};
  for (const f of model.fields) {
    if (full[f] === undefined) continue;
    if (f in model.defaults && JSON.stringify(full[f]) === JSON.stringify(model.defaults[f])) continue;
    out[f] = eachNested(model, f, full[f], strip);
  }
  return out;
}
