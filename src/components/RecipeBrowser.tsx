'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import {
  DIETS,
  DIET_LABELS,
  DIFFICULTIES,
  DIFFICULTY_LABELS,
  MEALS,
  MEAL_LABELS,
  SORT_LABELS,
  TIME_OPTIONS,
  activeFilterCount,
  closeMatch,
  filterRecipes,
  filtersToParams,
  parseFilters,
} from '../lib/content';
import type { Filters } from '../lib/content';
import { totalTime } from '../lib/format';
import { toneFor } from '../lib/tones';
import type { Diet, Difficulty, Meal, Recipe, Sort } from '../lib/types';
import { useSaved } from '../lib/useSaved';
import { DietTags } from './DietTags';
import { FilterPanel, type FilterVisibility } from './FilterPanel';
import { Icon } from './Icon';
import { Pagination } from './Pagination';
import { Photo } from './Photo';
import { RecipeGrid } from './RecipeGrid';

const PER_PAGE = 9; // 3 rows of 3 on desktop; the grid ad takes the place of a 10th cell

const COUNT_WORDS = ['', '', 'both', 'all three', 'all four', 'all five'];

function emptyHeading(n: number) {
  if (n <= 1) return 'Nothing matches that filter — yet';
  if (n === 2) return 'Nothing matches both filters — yet';
  return `Nothing matches ${COUNT_WORDS[n] ?? `all ${n}`} filters — yet`;
}

interface Props {
  /** Recipes to browse (all recipes, or a category's recipes). */
  base: Recipe[];
  /** Path of the page, used for pagination links. */
  path: string;
  hide?: FilterVisibility;
  showSearch?: boolean;
  /** Heading for the results (category pages show one; /recipes has the H1 instead). */
  heading?: string;
  /** "sidebar": checkbox filters in a column (/recipes). "bar": a row of selects beside the heading (category pages). */
  layout?: 'sidebar' | 'bar';
}

/**
 * Pages are prerendered without query strings, so the static HTML (what search
 * engines read) is the unfiltered list; ?filters apply once the page loads.
 */
export function RecipeBrowser(props: Props) {
  return (
    <Suspense fallback={<Browser {...props} params={NO_PARAMS} />}>
      <LiveBrowser {...props} />
    </Suspense>
  );
}

const NO_PARAMS = new URLSearchParams();

function LiveBrowser(props: Props) {
  return <Browser {...props} params={useSearchParams()} />;
}

function Browser({ base, path, hide = {}, showSearch = true, heading, layout = 'sidebar', params }: Props & { params: URLSearchParams }) {
  const router = useRouter();
  const pathname = usePathname();
  const setParams = (next: URLSearchParams) => {
    const qs = next.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };
  const f = parseFilters(params);
  const { savedSet } = useSaved();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [query, setQuery] = useState(f.q);

  useEffect(() => setQuery(f.q), [f.q]);
  useEffect(() => {
    if (!sheetOpen) return;
    document.body.classList.add('no-scroll');
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setSheetOpen(false);
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.classList.remove('no-scroll');
      window.removeEventListener('keydown', onKey);
    };
  }, [sheetOpen]);

  const results = filterRecipes(base, f, savedSet);
  const pages = Math.max(1, Math.ceil(results.length / PER_PAGE));
  const page = Math.min(f.page, pages);
  const items = results.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const count = activeFilterCount(f);
  const nearest = results.length === 0 ? closeMatch(base, f) : null;

  const update = (next: Partial<Filters>) => setParams(filtersToParams({ ...f, page: 1, ...next }));
  const clearAll = () => setParams(filtersToParams({ ...parseFilters(new URLSearchParams()), sort: f.sort }));
  const hrefFor = (p: number) => {
    const qs = filtersToParams({ ...f, page: p }).toString();
    return qs ? `${path}?${qs}` : path;
  };

  const chips: { label: string; remove: Partial<Filters> }[] = [
    ...f.diets.map((d) => ({ label: DIET_LABELS[d], remove: { diets: f.diets.filter((x) => x !== d) } })),
    ...(f.meal ? [{ label: MEAL_LABELS[f.meal], remove: { meal: null } }] : []),
    ...(f.time ? [{ label: `Under ${f.time} min`, remove: { time: null } }] : []),
    ...f.difficulties.map((d) => ({ label: DIFFICULTY_LABELS[d], remove: { difficulties: f.difficulties.filter((x) => x !== d) } })),
    ...(f.collection ? [{ label: f.collection[0].toUpperCase() + f.collection.slice(1), remove: { collection: null } }] : []),
    ...(f.saved ? [{ label: 'Saved', remove: { saved: false } }] : []),
    ...(f.q ? [{ label: `“${f.q}”`, remove: { q: '' } }] : []),
  ];

  const sortSelect = (id: string) => (
    <div className="sort">
      <label htmlFor={id}>Sort by</label>
      <select id={id} value={f.sort} onChange={(e) => update({ sort: e.target.value as Sort })}>
        {(Object.keys(SORT_LABELS) as Sort[]).map((s) => (
          <option key={s} value={s}>
            {SORT_LABELS[s]}
          </option>
        ))}
      </select>
    </div>
  );

  const filterBar = (
    <div className="filter-bar only-desktop">
      {!hide.diet && (
        <>
          <label htmlFor="bar-diet" className="sr-only">
            Diet
          </label>
          <select id="bar-diet" value={f.diets[0] ?? ''} onChange={(e) => update({ diets: e.target.value ? [e.target.value as Diet] : [] })}>
            <option value="">Any diet</option>
            {DIETS.map((d) => (
              <option key={d} value={d}>
                {DIET_LABELS[d]}
              </option>
            ))}
          </select>
        </>
      )}
      {!hide.meal && (
        <>
          <label htmlFor="bar-meal" className="sr-only">
            Meal
          </label>
          <select id="bar-meal" value={f.meal ?? ''} onChange={(e) => update({ meal: (e.target.value || null) as Meal | null })}>
            <option value="">Any meal</option>
            {MEALS.map((m) => (
              <option key={m} value={m}>
                {MEAL_LABELS[m]}
              </option>
            ))}
          </select>
        </>
      )}
      <label htmlFor="bar-time" className="sr-only">
        Time
      </label>
      <select id="bar-time" value={f.time ?? ''} onChange={(e) => update({ time: (Number(e.target.value) || null) as Filters['time'] })}>
        <option value="">Any time</option>
        {TIME_OPTIONS.map((t) => (
          <option key={t} value={t}>
            Under {t} min
          </option>
        ))}
      </select>
      <label htmlFor="bar-difficulty" className="sr-only">
        Difficulty
      </label>
      <select
        id="bar-difficulty"
        value={f.difficulties[0] ?? ''}
        onChange={(e) => update({ difficulties: e.target.value ? [e.target.value as Difficulty] : [] })}
      >
        <option value="">Any difficulty</option>
        {DIFFICULTIES.map((d) => (
          <option key={d} value={d}>
            {DIFFICULTY_LABELS[d]}
          </option>
        ))}
      </select>
      {sortSelect('bar-sort')}
    </div>
  );

  return (
    <div className={`browser browser-${layout}`}>
      {showSearch && (
        <form
          role="search"
          className="search-bar"
          onSubmit={(e) => {
            e.preventDefault();
            update({ q: query.trim() });
          }}
        >
          <Icon name="search" />
          <label htmlFor="browse-q" className="sr-only">
            Search by recipe name or ingredient
          </label>
          <input id="browse-q" type="search" placeholder="Search by name or ingredient, e.g. lentils" value={query} onChange={(e) => setQuery(e.target.value)} />
          <button type="submit" className="btn btn-primary btn-sm">
            Search
          </button>
        </form>
      )}

      <div className="browser-body">
        {layout === 'sidebar' && (
          <aside className="filter-aside only-desktop" aria-labelledby="filters-h">
            <div className="filter-head">
              <h2 id="filters-h">
                <Icon name="filter" />
                Filters {count > 0 && <span className="muted">({count})</span>}
              </h2>
              {count > 0 && (
                <button type="button" className="link-btn" onClick={clearAll}>
                  Clear all
                </button>
              )}
            </div>
            <FilterPanel filters={f} onChange={update} hide={hide} idPrefix="aside" />
          </aside>
        )}

        <section className="results" aria-labelledby={heading ? 'results-h' : undefined} aria-label={heading ? undefined : 'Results'}>
          <div className="results-head">
            {heading && (
              <h2 id="results-h" className="h2">
                {heading}
              </h2>
            )}
            {layout === 'bar' && filterBar}
          </div>
          <div className="results-bar">
            <p role="status" className="result-count">
              <strong>
                {results.length} {results.length === 1 ? 'recipe' : 'recipes'}
              </strong>
              {pages > 1 && ` · showing ${(page - 1) * PER_PAGE + 1}–${(page - 1) * PER_PAGE + items.length}`}
            </p>
            <button type="button" className="btn btn-primary only-mobile filters-btn" onClick={() => setSheetOpen(true)}>
              <Icon name="filter" />
              Filters{count > 0 ? ` (${count})` : ''}
            </button>
            {layout === 'bar' ? <div className="only-mobile sort-mobile">{sortSelect('sort')}</div> : sortSelect('sort')}
          </div>

          {chips.length > 0 && (
            <ul className="chips" aria-label="Active filters">
              {chips.map((c) => (
                <li key={c.label}>
                  <button type="button" className="chip" aria-label={`Remove filter: ${c.label}`} onClick={() => update(c.remove)}>
                    {c.label}
                    <Icon name="close" size={16} />
                  </button>
                </li>
              ))}
              <li>
                <button type="button" className="link-btn" onClick={clearAll}>
                  Clear all
                </button>
              </li>
            </ul>
          )}

          {items.length > 0 ? (
            <>
              <RecipeGrid items={items} />
              <Pagination page={page} pages={pages} hrefFor={hrefFor} />
            </>
          ) : (
            <div className="empty">
              <span className="empty-icon">
                <Icon name="search" size={28} />
              </span>
              <h2>{f.saved ? 'No saved recipes yet' : emptyHeading(chips.length)}</h2>
              <p>
                {f.saved
                  ? 'Tap the bookmark on any recipe to keep it here. Saved recipes stay on this device.'
                  : !f.gfOptions && f.diets.includes('gluten-free')
                    ? 'Try removing a filter. We only tag a recipe Gluten-Free when every ingredient qualifies, so recipes that need a swap are hidden right now.'
                    : 'Try removing a filter, or search for a single ingredient instead.'}
              </p>
              <div className="row-gap">
                <button type="button" className="btn btn-primary" onClick={clearAll}>
                  Clear filters
                </button>
                {!f.gfOptions && (
                  <button type="button" className="btn btn-outline" onClick={() => update({ gfOptions: true })}>
                    Include “GF option” recipes
                  </button>
                )}
              </div>
              <p className="muted">Or browse a popular category</p>
              <div className="pill-row center">
                <Link className="pill" href="/gluten-free">
                  Gluten-free recipes
                </Link>
                <Link className="pill" href="/vegan">
                  Vegan recipes
                </Link>
                <Link className="pill" href="/snacks-desserts">
                  Snacks &amp; desserts
                </Link>
                <Link className="pill" href="/recipes?meal=breakfast&time=15">
                  Quick breakfasts
                </Link>
              </div>
            </div>
          )}

          {nearest && (
            <section className="close-match" aria-labelledby="close-h">
              <h3 id="close-h">Close match</h3>
              <article className="card close-card">
                <Photo alt={nearest.recipe.image.alt} tone={toneFor(nearest.recipe.slug)} src={nearest.recipe.image.src} className="close-thumb" />
                <div className="close-body">
                  <Link className="card-link" href={`/recipes/${nearest.recipe.slug}`}>
                    {nearest.recipe.title}
                  </Link>
                  <span className="card-meta">
                    {totalTime(nearest.recipe)} · {DIFFICULTY_LABELS[nearest.recipe.difficulty]} · {MEAL_LABELS[nearest.recipe.meal]}
                  </span>
                  <DietTags recipe={nearest.recipe} />
                  <span className="close-note">{nearest.note}</span>
                </div>
              </article>
            </section>
          )}
        </section>
      </div>

      {sheetOpen && (
        <div className="sheet-backdrop" onClick={() => setSheetOpen(false)}>
          <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-h" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-handle" aria-hidden="true" />
            <div className="sheet-head">
              <h2 id="sheet-h">Filters</h2>
              <button type="button" className="icon-btn" aria-label="Close filters" onClick={() => setSheetOpen(false)}>
                <Icon name="close" size={24} />
              </button>
            </div>
            <div className="sheet-body">
              <FilterPanel filters={f} onChange={update} hide={hide} idPrefix="sheet" />
              {sortSelect('sheet-sort')}
            </div>
            <div className="sheet-foot">
              <button type="button" className="btn btn-outline" onClick={clearAll}>
                Clear all
              </button>
              <button type="button" className="btn btn-primary grow" onClick={() => setSheetOpen(false)}>
                Show {results.length} {results.length === 1 ? 'recipe' : 'recipes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
