import Link from 'next/link';
import { RecipeCard } from '../components/RecipeCard';
import { SearchBar } from '../components/SearchBar';
import { recipes } from '../lib/content';

export function NotFoundPage() {
  const favourites = [...recipes].sort((a, b) => a.popularity - b.popularity).slice(0, 3);
  return (
    <>
      <div className="container page not-found">
        <p className="label">Error 404</p>
        <h1 className="h1">We couldn't find that page</h1>
        <p className="lede">The recipe may have moved or the link may be mistyped. Try a search, or start from one of our most popular categories.</p>
        <SearchBar id="nf-q" label="Search recipes" />
        <h2 className="h4">Popular categories</h2>
        <ul className="pill-row center">
          <li>
            <Link className="pill" href="/gluten-free">
              Gluten-free recipes
            </Link>
          </li>
          <li>
            <Link className="pill" href="/vegan">
              Vegan recipes
            </Link>
          </li>
          <li>
            <Link className="pill" href="/healthy">
              Healthy recipes
            </Link>
          </li>
          <li>
            <Link className="pill" href="/recipes?meal=dinner&time=30">
              Quick dinners
            </Link>
          </li>
          <li>
            <Link className="pill" href="/">
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
