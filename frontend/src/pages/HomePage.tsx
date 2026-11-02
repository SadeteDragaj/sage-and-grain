import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AdSlot } from '../components/AdSlot';
import { DietTags } from '../components/DietTags';
import { Icon } from '../components/Icon';
import { Photo } from '../components/Photo';
import { RecipeCard, RecipeRow } from '../components/RecipeCard';
import { SaveButton } from '../components/SaveButton';
import { Seo } from '../components/Seo';
import { DIFFICULTY_LABELS, MEAL_LABELS, bySlugs, recipes, site } from '../lib/content';
import { totalTime } from '../lib/format';
import { toneFor } from '../lib/tones';

const TILES = [
  { to: '/gluten-free', label: 'Gluten-Free', tone: 'quinoa' },
  { to: '/vegan', label: 'Vegan', tone: 'green' },
  { to: '/healthy', label: 'Healthy', tone: 'roast' },
  { to: '/breakfast', label: 'Breakfast', tone: 'pancakes' },
  { to: '/lunch', label: 'Lunch', tone: 'lentil' },
  { to: '/dinner', label: 'Dinner', tone: 'curry' },
  { to: '/snacks-desserts', label: 'Snacks & Desserts', tone: 'snack' },
];

export function HomePage() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const featured = bySlugs(site.featured);
  const hero = featured[0];
  const popular = [...recipes].sort((a, b) => a.popularity - b.popularity).slice(0, 5);
  const [top, ...rest] = popular;
  const seasonal = bySlugs(site.seasonal.recipes);

  return (
    <>
      <Seo
        title={`${site.name} — Gluten-Free, Vegan & Healthy Recipes`}
        description="Good food, simple ingredients: tested gluten-free, vegan and healthy recipes for every day, labelled honestly so you know exactly what you're cooking."
        path="/"
        jsonLd={[
          {
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            name: site.name,
            url: site.site_url,
            potentialAction: {
              '@type': 'SearchAction',
              target: `${site.site_url}/recipes?q={search_term_string}`,
              'query-input': 'required name=search_term_string',
            },
          },
        ]}
      />

      <section className="container hero" aria-labelledby="hero-h">
        <div className="hero-text">
          <p className="label">Gluten-free · Vegan · Wholesome</p>
          <h1 id="hero-h" className="display">
            Good food. Simple ingredients. Feel-good recipes.
          </h1>
          <p className="lede">Gluten-free, vegan and healthy recipes for every day — tested at home and clearly labelled.</p>
          <form
            role="search"
            className="search-bar search-bar-lg"
            action="/recipes"
            onSubmit={(e) => {
              e.preventDefault();
              navigate(q.trim() ? `/recipes?q=${encodeURIComponent(q.trim())}` : '/recipes');
            }}
          >
            <Icon name="search" size={22} />
            <label htmlFor="hero-q" className="sr-only">
              Search by recipe or ingredient
            </label>
            <input id="hero-q" name="q" type="search" placeholder="Find your next favorite recipe…" value={q} onChange={(e) => setQ(e.target.value)} />
            <button type="submit" className="btn btn-primary">
              Search
            </button>
          </form>
          <div className="row-gap">
            <Link to="/recipes" className="btn btn-outline">
              Explore recipes <Icon name="arrowRight" size={18} />
            </Link>
          </div>
          <p className="popular-searches">
            Popular:
            {site.popular_searches.map((s) => (
              <Link key={s.href} to={s.href}>
                {s.label}
              </Link>
            ))}
          </p>
        </div>
        {hero && (
          <div className="hero-media">
            <Photo alt={hero.image.alt} tone={toneFor(hero.slug)} src={hero.image.src} ratio="16/9" eager />
            <Link to={`/recipes/${hero.slug}`} className="hero-chip">
              <span className="label">Featured</span>
              <strong>{hero.title}</strong>
              <span className="muted">{totalTime(hero)}</span>
            </Link>
          </div>
        )}
      </section>

      <section className="container section" aria-labelledby="cat-h">
        <div className="section-head">
          <h2 id="cat-h" className="h2">
            Browse by category
          </h2>
          <Link to="/recipes" className="more-link">
            All recipes <Icon name="arrowRight" size={16} />
          </Link>
        </div>
        <ul className="tiles">
          {TILES.map((t) => (
            <li key={t.to} className="tile">
              <Photo alt="" tone={t.tone} />
              <h3>
                <Link className="card-link" to={t.to}>
                  {t.label}
                </Link>
              </h3>
            </li>
          ))}
        </ul>
      </section>

      <section className="container section" aria-labelledby="feat-h">
        <div className="section-head">
          <div>
            <h2 id="feat-h" className="h2">
              Featured recipes
            </h2>
            <p className="muted">Fresh picks for this week.</p>
          </div>
          <Link to="/recipes" className="more-link">
            See all recipes <Icon name="arrowRight" size={16} />
          </Link>
        </div>
        <div className="grid">
          {featured.map((r) => (
            <RecipeCard key={r.slug} recipe={r} />
          ))}
        </div>
      </section>

      <div className="container ad-band">
        <AdSlot placement="home-leaderboard" />
      </div>

      <section className="section-ruled" aria-labelledby="pop-h">
        <div className="container section">
          <h2 id="pop-h" className="h2">
            Popular this week
          </h2>
          <div className="popular">
            {top && (
              <article className="card card-feature">
                <Photo alt={top.image.alt} tone={toneFor(top.slug)} src={top.image.src} ratio="16/9" />
                <span className="rank-badge">No. 1 this week</span>
                <SaveButton slug={top.slug} title={top.title} />
                <div className="card-body">
                  <h3 className="card-title card-title-lg">
                    <Link className="card-link" to={`/recipes/${top.slug}`}>
                      {top.title}
                    </Link>
                  </h3>
                  <p className="card-meta">
                    {totalTime(top)} · {DIFFICULTY_LABELS[top.difficulty]} · {MEAL_LABELS[top.meal]}
                  </p>
                  <p className="card-desc wrap">{top.description}</p>
                  <DietTags recipe={top} />
                </div>
              </article>
            )}
            <ol className="ranked">
              {rest.map((r, i) => (
                <li key={r.slug}>
                  <RecipeRow recipe={r} rank={String(i + 2).padStart(2, '0')} />
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section className="band" aria-labelledby="season-h">
        <div className="container seasonal">
          <div className="seasonal-intro">
            <Photo alt={site.seasonal.image_alt} tone="chickpea" ratio="4/5" className="seasonal-photo" />
            <div className="stack">
              <p className="label">{site.seasonal.label}</p>
              <h2 id="season-h" className="h2 h2-lg">
                {site.seasonal.title}
              </h2>
              <p>{site.seasonal.text}</p>
              <Link to={`/recipes?${site.seasonal.link_query}`} className="more-link">
                {site.seasonal.link_label} <Icon name="arrowRight" size={16} />
              </Link>
            </div>
          </div>
          <ul className="seasonal-list">
            {seasonal.map((r) => (
              <li key={r.slug}>
                <RecipeRow recipe={r} />
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="container section" aria-labelledby="news-h">
        <div className="newsletter">
          <div>
            <h2 id="news-h" className="h3">
              One good recipe, every Friday.
            </h2>
            <p className="muted">A short email with a tested recipe and a seasonal tip. Unsubscribe anytime.</p>
          </div>
          {/* Point this form at your email provider (Buttondown, Mailchimp, ConvertKit…). */}
          <form className="newsletter-form" action="#" method="post" onSubmit={(e) => e.preventDefault()}>
            <div className="field">
              <label htmlFor="nl-email">Email address</label>
              <input id="nl-email" name="email" type="email" autoComplete="email" placeholder="you@example.com" required />
            </div>
            <button type="submit" className="btn btn-primary">
              Subscribe
            </button>
            <p className="fine">
              We only use your email for the newsletter. See our <Link to="/privacy">Privacy policy</Link>.
            </p>
          </form>
        </div>
      </section>
    </>
  );
}
