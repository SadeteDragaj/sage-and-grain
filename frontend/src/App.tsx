import { useEffect } from 'react';
import { Route, Routes, useLocation, useParams } from 'react-router-dom';
import { Layout } from './components/Layout';
import { categories, getCategory, getRecipe, recipes } from './lib/content';
import { AboutPage } from './pages/AboutPage';
import { CategoryPage } from './pages/CategoryPage';
import { HomePage } from './pages/HomePage';
import { INFO_PAGES, InfoPage, type InfoSlug } from './pages/InfoPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { RecipePage } from './pages/RecipePage';
import { RecipesPage } from './pages/RecipesPage';
import './styles/global.css';

function RecipeRoute() {
  const { slug = '' } = useParams();
  const recipe = getRecipe(slug);
  return recipe ? <RecipePage key={recipe.slug} recipe={recipe} /> : <NotFoundPage />;
}

/** /gluten-free, /vegan, /healthy, /breakfast … and the info pages share the top level. */
function TopLevelRoute() {
  const { page = '' } = useParams();
  const category = getCategory(page);
  if (category) return <CategoryPage key={category.slug} category={category} />;
  if (page in INFO_PAGES) return <InfoPage slug={page as InfoSlug} />;
  return <NotFoundPage />;
}

function ScrollToTop() {
  const { pathname } = useLocation();
  // Braces matter: Chrome's scrollTo returns a Promise when smooth scrolling is on,
  // and React would treat a returned value as a cleanup function and crash.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="recipes" element={<RecipesPage />} />
          <Route path="recipes/:slug" element={<RecipeRoute />} />
          <Route path="about" element={<AboutPage />} />
          <Route path=":page" element={<TopLevelRoute />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </>
  );
}

/** Every URL to prerender to static HTML. */
export function staticRoutes(): string[] {
  return [
    '/',
    '/recipes',
    '/about',
    ...Object.keys(INFO_PAGES).map((p) => `/${p}`),
    ...categories.map((c) => `/${c.slug}`),
    ...recipes.map((r) => `/recipes/${r.slug}`),
  ];
}
