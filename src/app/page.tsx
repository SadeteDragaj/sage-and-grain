import { site } from '../lib/content';
import { pageMetadata } from '../lib/seo';
import { HomePage } from '../views/HomePage';

export const metadata = pageMetadata(site, {
  title: `${site.name} — Gluten-Free, Vegan & Healthy Recipes`,
  description:
    "Good food, simple ingredients: tested gluten-free, vegan and healthy recipes for every day, labelled honestly so you know exactly what you're cooking.",
  path: '/',
});

export default HomePage;
