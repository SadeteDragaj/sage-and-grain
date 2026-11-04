'use client';

import Link from 'next/link';
import { useCallback, useState } from 'react';
import { AdSlot } from '../components/AdSlot';
import { Breadcrumbs, breadcrumbJsonLd } from '../components/Breadcrumbs';
import { CookingMode } from '../components/CookingMode';
import { DietTags } from '../components/DietTags';
import { FAQ } from '../components/FAQ';
import { Icon } from '../components/Icon';
import { JsonLd } from '../components/JsonLd';
import { Photo } from '../components/Photo';
import { RecipeCard, RecipeRow } from '../components/RecipeCard';
import { SaveButton } from '../components/SaveButton';
import { ServingsStepper } from '../components/ServingsStepper';
import { DIET_LABELS, DIFFICULTY_LABELS, MEAL_LABELS, dietHref, mealHref, recipes, site } from '../lib/content';
import { ingredientName, longDate, minutes, scaledQuantity, totalTime } from '../lib/format';
import { toneFor } from '../lib/tones';
import type { Meal, Recipe } from '../lib/types';

/** The in-article ad goes after the first section: split before the second heading. */
function splitArticle(html: string | null): [string, string] {
  if (!html) return ['', ''];
  const second = html.indexOf('<h2', html.indexOf('<h2') + 1);
  if (html.indexOf('<h2') !== -1 && second !== -1) return [html.slice(0, second), html.slice(second)];
  const firstPara = html.indexOf('</p>');
  return firstPara === -1 ? [html, ''] : [html.slice(0, firstPara + 4), html.slice(firstPara + 4)];
}

const DIET_NOTE = 'Diet labels are based on the ingredients listed. If you need strict gluten-free, check the labels of packaged ingredients.';

const MEAL_PLURALS: Record<Meal, string> = {
  breakfast: 'breakfasts',
  lunch: 'lunches',
  dinner: 'dinners',
  snack: 'snacks',
  dessert: 'desserts',
};

function related(recipe: Recipe, count: number, exclude: string[] = []) {
  const score = (r: Recipe) =>
    (r.meal === recipe.meal ? 2 : 0) + r.diets.filter((d) => recipe.diets.includes(d)).length;
  return recipes
    .filter((r) => r.slug !== recipe.slug && !exclude.includes(r.slug))
    .sort((a, b) => score(b) - score(a) || a.popularity - b.popularity)
    .slice(0, count);
}

export function RecipePage({ recipe }: { recipe: Recipe }) {
  const [servings, setServings] = useState(recipe.servings);
  const [cooking, setCooking] = useState(false);
  const closeCooking = useCallback(() => setCooking(false), []);
  const factor = servings / recipe.servings;
  const tone = toneFor(recipe.slug);
  const primaryDiet = recipe.diets[0];
  const crumbs = [
    { label: 'Home', to: '/' },
    { label: 'Recipes', to: '/recipes' },
    ...(primaryDiet && (primaryDiet === 'vegan' || primaryDiet === 'gluten-free')
      ? [{ label: DIET_LABELS[primaryDiet], to: `/${primaryDiet}` }]
      : [{ label: MEAL_LABELS[recipe.meal], to: mealHref(recipe.meal) }]),
    { label: recipe.title, to: `/recipes/${recipe.slug}` },
  ];
  const moreLink = crumbs[2];
  const relatedCards = related(recipe, 4);
  const sidebar = related(recipe, 3, relatedCards.map((r) => r.slug));
  const mealPlural = MEAL_PLURALS[recipe.meal];
  const [articleIntro, articleRest] = splitArticle(recipe.article_html);
  const browseMore = primaryDiet
    ? { to: `/recipes?diet=${primaryDiet}&meal=${recipe.meal}`, label: `Browse ${DIET_LABELS[primaryDiet].toLowerCase()} ${mealPlural}` }
    : { to: mealHref(recipe.meal), label: `Browse ${mealPlural}` };
  const dietLine = [...recipe.diets.map((d) => DIET_LABELS[d]), ...(recipe.diet_options.length ? ['GF option'] : [])].join(' · ');
  const domain = site.site_url.replace(/^https?:\/\//, '');
  const faqLd = recipe.faq.length
    ? [
        {
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: recipe.faq.map((f) => ({ '@type': 'Question', name: f.question, acceptedAnswer: { '@type': 'Answer', text: f.answer } })),
        },
      ]
    : [];

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: recipe.title, url });
      else await navigator.clipboard.writeText(url);
    } catch {
      // User cancelled the share sheet.
    }
  };

  return (
    <>
      <JsonLd data={[recipe.json_ld, breadcrumbJsonLd(crumbs), ...faqLd]} />

      <article className="recipe">
        <div className="print-only print-top">
          <strong>{site.name}</strong>
          <span>
            {domain}/recipes/{recipe.slug}
          </span>
        </div>
        <header className="container recipe-head">
          <div className="narrow-wide stack">
            <Breadcrumbs items={crumbs} />
            <h1 className="h1">{recipe.title}</h1>
            <p className="lede">{recipe.intro}</p>
            <p className="byline">
              By <Link href="/about">{recipe.author}</Link> · Published <time dateTime={recipe.date_published}>{longDate(recipe.date_published)}</time>
              {recipe.date_modified !== recipe.date_published && (
                <>
                  {' '}
                  · Updated <time dateTime={recipe.date_modified}>{longDate(recipe.date_modified)}</time>
                </>
              )}
            </p>
            <DietTags recipe={recipe} linked withMeal size="md" />
            <div className="meta-bar">
              <dl className="kv">
                <div>
                  <dt>Prep</dt>
                  <dd>{minutes(recipe.prep_minutes)}</dd>
                </div>
                <div>
                  <dt>Cook</dt>
                  <dd>{recipe.cook_minutes ? minutes(recipe.cook_minutes) : '—'}</dd>
                </div>
                <div>
                  <dt>Total</dt>
                  <dd>{totalTime(recipe)}</dd>
                </div>
                <div>
                  <dt>Servings</dt>
                  <dd>
                    {recipe.servings} {recipe.yield_label === 'servings' ? '' : recipe.yield_label}
                  </dd>
                </div>
                <div>
                  <dt>Difficulty</dt>
                  <dd>{DIFFICULTY_LABELS[recipe.difficulty]}</dd>
                </div>
              </dl>
              <div className="row-gap">
                <SaveButton slug={recipe.slug} title={recipe.title} variant="labelled" />
                <button type="button" className="btn btn-outline" onClick={share}>
                  <Icon name="share" /> Share
                </button>
                <a href="#recipe" className="btn btn-primary">
                  Jump to recipe <Icon name="arrowDown" size={18} />
                </a>
              </div>
            </div>
          </div>
        </header>

        <div className="container">
          <Photo alt={recipe.image.alt} tone={tone} src={recipe.image.src} ratio="16/9" eager className="recipe-hero narrow-wide" />
        </div>

        <div className="container recipe-layout narrow-wide">
          <div className="prose">
            {articleIntro && <div className="article" dangerouslySetInnerHTML={{ __html: articleIntro }} />}
            <AdSlot placement="in-article" className="ad-article" />
            {articleRest && <div className="article" dangerouslySetInnerHTML={{ __html: articleRest }} />}

            {recipe.storage && (
              <>
                <h2>Storage and reheating</h2>
                <dl className="storage">
                  {(['fridge', 'freezer', 'reheat'] as const).map((k) =>
                    recipe.storage?.[k] ? (
                      <div key={k}>
                        <dt>{k === 'reheat' ? 'Reheat' : k[0].toUpperCase() + k.slice(1)}</dt>
                        <dd>{recipe.storage[k]}</dd>
                      </div>
                    ) : null,
                  )}
                </dl>
              </>
            )}

            {/* The recipe card: the visible source of the Recipe structured data, and the print view. */}
            <section id="recipe" className="recipe-card" aria-labelledby="rc-h">
              <div className="rc-head">
                <div className="rc-title">
                  <p className="label no-print">Recipe card</p>
                  <h2 id="rc-h">{recipe.title}</h2>
                  <p className="rc-desc">{recipe.description}</p>
                  <p className="print-only print-meta">
                    <strong>Diet:</strong> {dietLine}
                    <br />
                    <strong>Category:</strong> {MEAL_LABELS[recipe.meal]} · <strong>Cuisine:</strong> {recipe.cuisine}
                    <br />
                    By {recipe.author} · Updated {longDate(recipe.date_modified)}
                  </p>
                </div>
                <Photo alt={recipe.image.alt} tone={tone} src={recipe.image.src} ratio="1/1" className="rc-photo" />
                <dl className="kv rc-kv">
                  <div>
                    <dt>Prep</dt>
                    <dd>{minutes(recipe.prep_minutes)}</dd>
                  </div>
                  <div>
                    <dt>Cook</dt>
                    <dd>{recipe.cook_minutes ? minutes(recipe.cook_minutes) : '—'}</dd>
                  </div>
                  <div>
                    <dt>Total</dt>
                    <dd>{totalTime(recipe)}</dd>
                  </div>
                  <div>
                    <dt>Servings</dt>
                    <dd>{recipe.servings}</dd>
                  </div>
                  <div>
                    <dt>Difficulty</dt>
                    <dd>{DIFFICULTY_LABELS[recipe.difficulty]}</dd>
                  </div>
                  <div className="no-print">
                    <dt>Cuisine</dt>
                    <dd>{recipe.cuisine}</dd>
                  </div>
                  <div className="no-print">
                    <dt>Category</dt>
                    <dd>
                      <Link href={mealHref(recipe.meal)}>{MEAL_LABELS[recipe.meal]}</Link>
                    </dd>
                  </div>
                  <div className="no-print">
                    <dt>Diet</dt>
                    <dd>
                      {recipe.diets.map((d, i) => (
                        <span key={d}>
                          {i > 0 && ', '}
                          <Link href={dietHref(d)}>{DIET_LABELS[d]}</Link>
                        </span>
                      ))}
                      {recipe.diet_options.length > 0 && ', GF option'}
                    </dd>
                  </div>
                </dl>
                <div className="row-gap no-print">
                  <button type="button" className="btn btn-primary btn-lg" onClick={() => setCooking(true)}>
                    <Icon name="play" /> Start cooking
                  </button>
                  <button type="button" className="btn btn-outline btn-lg" onClick={() => window.print()}>
                    <Icon name="print" /> Print
                  </button>
                </div>
              </div>

              <div className="rc-body">
                <div className="rc-ing-head">
                  <h3>Ingredients</h3>
                  <div className="no-print">
                    <ServingsStepper value={servings} onChange={setServings} label={servings === 1 ? recipe.yield_label.replace(/s$/, '') : recipe.yield_label} />
                  </div>
                </div>
                <p className="fine no-print rc-note">Quantities update automatically.</p>
                <ul className="checklist">
                  {recipe.ingredients.map((ing, i) => (
                    <li key={i}>
                      <label className="check">
                        <input type="checkbox" />
                        <span>
                          {ing.qty != null && <strong>{scaledQuantity(ing, factor)} </strong>}
                          {ingredientName(ing)}
                          {ing.gf_swap && <em className="swap"> GF option: {ing.gf_swap}</em>}
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
                <h3>Instructions</h3>
                <ol className="steps">
                  {recipe.steps.map((s, i) => (
                    <li key={i} id={`step-${i + 1}`}>
                      <span className="step-num" aria-hidden="true">
                        {i + 1}
                      </span>
                      <div>
                        <p>{s.text}</p>
                        {s.timer_seconds && (
                          <span className="step-timer no-print">
                            <Icon name="timer" size={16} /> {minutes(Math.round(s.timer_seconds / 60))} timer in cooking mode
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
                <p className="fine rc-foot no-print">{DIET_NOTE}</p>
                <section className="print-only print-notes">
                  <h3>Notes</h3>
                  <ul>
                    {recipe.storage?.fridge && <li>Fridge: {recipe.storage.fridge}</li>}
                    {recipe.storage?.freezer && <li>Freezer: {recipe.storage.freezer}</li>}
                    {recipe.storage?.reheat && <li>Reheat: {recipe.storage.reheat}</li>}
                    <li>{DIET_NOTE}</li>
                  </ul>
                </section>
              </div>
            </section>

            {recipe.faq.length > 0 && (
              <>
                <h2>FAQ</h2>
                <FAQ items={recipe.faq} />
              </>
            )}

            <section className="author-box" aria-labelledby="author-h">
              <Photo alt={`Portrait of ${recipe.author}`} tone="person" ratio="1/1" className="author-photo" />
              <div>
                <p className="label">About the author</p>
                <h2 id="author-h">{recipe.author}</h2>
                <p>
                  {recipe.author} has cooked gluten-free and plant-based food at home for [X] years. Every recipe on {site.name} is tested [3] times in an ordinary kitchen before it's published.
                </p>
                <Link href="/about" className="more-link">
                  How we test our recipes <Icon name="arrowRight" size={16} />
                </Link>
              </div>
            </section>

            <AdSlot placement="end" className="ad-article" />

            <h2>Related recipes</h2>
            <div className="grid grid-2">
              {relatedCards.map((r) => (
                <RecipeCard key={r.slug} recipe={r} />
              ))}
            </div>
            <Link href={moreLink.to} className="btn btn-outline btn-lg more-btn">
              More {moreLink.label.toLowerCase()} recipes <Icon name="arrowRight" size={18} />
            </Link>
          </div>

          <aside className="recipe-sidebar only-desktop-block" aria-label="Sidebar">
            <AdSlot placement="sidebar" />
            <section aria-labelledby="more-h">
              <h2 id="more-h" className="h4">
                More easy {mealPlural}
              </h2>
              <ul className="side-list">
                {sidebar.map((r) => (
                  <li key={r.slug}>
                    <RecipeRow recipe={r} />
                  </li>
                ))}
              </ul>
              <Link href={browseMore.to} className="more-link">
                {browseMore.label} <Icon name="arrowRight" size={16} />
              </Link>
            </section>
          </aside>
        </div>
        <p className="print-only print-foot">
          <span>
            © {new Date().getFullYear()} {site.name}
          </span>
          <span>Printed from {domain}</span>
        </p>
      </article>

      {cooking && <CookingMode recipe={recipe} servings={servings} onClose={closeCooking} />}
    </>
  );
}
