import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { RecipeCard } from '../components/RecipeCard';
import { Seo } from '../components/Seo';
import { recipes } from '../lib/content';

export function NotFoundPage() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const favourites = [...recipes].sort((a, b) => a.popularity - b.popularity).slice(0, 3);
  return (
    <>
      <Seo title="Page not found" description="We couldn't find that page." path="/404" noindex />
      <div className="container page not-found">
        <p className="label">Error 404</p>
        <h1 className="h1">We couldn't find that page</h1>
        <p className="lede">The recipe may have moved or the link may be mistyped. Try a search, or start from one of our most popular categories.</p>
        <form
          role="search"
          className="search-bar search-bar-lg"
          onSubmit={(e) => {
            e.preventDefault();
            navigate(q.trim() ? `/recipes?q=${encodeURIComponent(q.trim())}` : '/recipes');
          }}
        >
          <Icon name="search" size={22} />
          <label htmlFor="nf-q" className="sr-only">
            Search recipes
          </label>
          <input id="nf-q" type="search" placeholder="Find your next favorite recipe…" value={q} onChange={(e) => setQ(e.target.value)} />
          <button type="submit" className="btn btn-primary">
            Search
          </button>
        </form>
        <h2 className="h4">Popular categories</h2>
        <ul className="pill-row center">
          <li>
            <Link className="pill" to="/gluten-free">
              Gluten-free recipes
            </Link>
          </li>
          <li>
            <Link className="pill" to="/vegan">
              Vegan recipes
            </Link>
          </li>
          <li>
            <Link className="pill" to="/healthy">
              Healthy recipes
            </Link>
          </li>
          <li>
            <Link className="pill" to="/recipes?meal=dinner&time=30">
              Quick dinners
            </Link>
          </li>
          <li>
            <Link className="pill" to="/">
              Back to the homepage
            </Link>
          </li>
        </ul>
        <h2 className="h4">Readers' favourites</h2>
        <div className="grid left">
          {favourites.map((r) => (
            <RecipeCard key={r.slug} recipe={r} />
          ))}
        </div>
      </div>
    </>
  );
}
