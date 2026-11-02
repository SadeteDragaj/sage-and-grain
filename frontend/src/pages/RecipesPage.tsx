import { useSearchParams } from 'react-router-dom';
import { Breadcrumbs, breadcrumbJsonLd } from '../components/Breadcrumbs';
import { RecipeBrowser } from '../components/RecipeBrowser';
import { Seo } from '../components/Seo';
import { recipes } from '../lib/content';
import { useHydrated } from '../lib/useHydrated';

const CRUMBS = [
  { label: 'Home', to: '/' },
  { label: 'Recipes', to: '/recipes' },
];

export function RecipesPage() {
  const [params] = useSearchParams();
  const saved = useHydrated() && params.get('saved') === '1';
  return (
    <>
      {/* Canonical stays /recipes for every filter combination. */}
      <Seo
        title="All Recipes"
        description="Browse every gluten-free, vegan and healthy recipe. Filter by diet, meal, time and difficulty, or search by ingredient."
        path="/recipes"
        jsonLd={[breadcrumbJsonLd(CRUMBS)]}
      />
      <div className="container page">
        <Breadcrumbs items={CRUMBS} />
        <header className="page-head">
          <h1 className="h1">{saved ? 'Saved Recipes' : 'All Recipes'}</h1>
          <p className="lede">
            {saved
              ? 'Recipes you bookmarked. They are stored on this device only.'
              : 'Every gluten-free, vegan and healthy recipe on the site, labelled by its ingredients.'}
          </p>
        </header>
        <RecipeBrowser base={recipes} path="/recipes" />
      </div>
    </>
  );
}
