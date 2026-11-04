import { site } from '../../lib/content';
import { pageMetadata } from '../../lib/seo';
import { RecipesPage } from '../../views/RecipesPage';

// Canonical stays /recipes for every filter combination.
export const metadata = pageMetadata(site, {
  title: 'All Recipes',
  description: 'Browse every gluten-free, vegan and healthy recipe. Filter by diet, meal, time and difficulty, or search by ingredient.',
  path: '/recipes',
});

export default RecipesPage;
