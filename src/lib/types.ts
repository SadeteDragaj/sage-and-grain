// Shapes of the content in content/*.json once defaults are filled in (src/lib/defaults.ts).
// The rules each field must follow are in src/server/schema.ts.

export type Diet = 'gluten-free' | 'vegan' | 'vegetarian' | 'dairy-free' | 'high-protein';
export type Meal = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'dessert';
export type Difficulty = 'easy' | 'medium' | 'advanced';
export type Sort = 'newest' | 'popular' | 'quickest';

export interface Ingredient {
  qty: number | null;
  unit: string;
  item: string;
  note: string;
  contains: string[];
  gf_swap: string | null;
}

export interface Step {
  text: string;
  timer_seconds: number | null;
  /** Indexes into Recipe.ingredients. */
  uses: number[];
  tip: string | null;
  timer_done: string | null;
}

export interface Note {
  title: string;
  text: string;
}

export interface FAQItem {
  question: string;
  answer: string;
}

export interface Recipe {
  slug: string;
  title: string;
  description: string;
  intro: string;
  image: { alt: string; src: string | null };
  meal: Meal;
  diets: Diet[];
  diet_options: Diet[];
  collections: string[];
  cuisine: string;
  difficulty: Difficulty;
  prep_minutes: number;
  cook_minutes: number;
  total_minutes: number;
  extra_time: string | null;
  servings: number;
  yield_label: string;
  ingredients: Ingredient[];
  steps: Step[];
  /** HTML from the admin's editor, cleaned before it is rendered (src/server/richtext.ts). */
  article_html: string | null;
  storage: { fridge: string | null; freezer: string | null; reheat: string | null; summary: string | null } | null;
  faq: FAQItem[];
  author: string;
  date_published: string;
  date_modified: string;
  popularity: number;
  json_ld: Record<string, unknown>;
}

export interface Category {
  slug: string;
  name: string;
  h1: string;
  meta_description: string;
  intro: string;
  match_diet: Diet | null;
  match_meals: Meal[];
  match_collection: string | null;
  collections: { label: string; query: string }[];
  guide_title: string;
  guide: Note[];
  faq: FAQItem[];
  related: string[];
  tone: string;
  recipe_slugs: string[];
  option_slugs: string[];
}

export interface Site {
  name: string;
  tagline: string;
  popular_searches: { label: string; href: string }[];
  author: string;
  site_url: string;
  featured: string[];
  seasonal: {
    label: string;
    title: string;
    text: string;
    image_alt: string;
    recipes: string[];
    link_query: string;
    link_label: string;
  };
}
