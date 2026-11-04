'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { Breadcrumbs, breadcrumbJsonLd } from '../components/Breadcrumbs';
import { JsonLd } from '../components/JsonLd';
import { RecipeBrowser } from '../components/RecipeBrowser';
import { recipes } from '../lib/content';

const CRUMBS = [
  { label: 'Home', to: '/' },
  { label: 'Recipes', to: '/recipes' },
];

function PageHead({ saved }: { saved: boolean }) {
  return (
    <header className="page-head">
      <h1 className="h1">{saved ? 'Saved Recipes' : 'All Recipes'}</h1>
      <p className="lede">
        {saved ? 'Recipes you bookmarked. They are stored on this device only.' : 'Every gluten-free, vegan and healthy recipe on the site, labelled by its ingredients.'}
      </p>
    </header>
  );
}

function LivePageHead() {
  return <PageHead saved={useSearchParams().get('saved') === '1'} />;
}

export function RecipesPage() {
  return (
    <>
      {/* Canonical stays /recipes for every filter combination (see app/recipes/page.tsx). */}
      <JsonLd data={[breadcrumbJsonLd(CRUMBS)]} />
      <div className="container page">
        <Breadcrumbs items={CRUMBS} />
        <Suspense fallback={<PageHead saved={false} />}>
          <LivePageHead />
        </Suspense>
        <RecipeBrowser base={recipes} path="/recipes" />
      </div>
    </>
  );
}
