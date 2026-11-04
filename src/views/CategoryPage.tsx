import Link from 'next/link';
import { Breadcrumbs, breadcrumbJsonLd } from '../components/Breadcrumbs';
import { FAQ } from '../components/FAQ';
import { Icon } from '../components/Icon';
import { Photo } from '../components/Photo';
import { RecipeBrowser } from '../components/RecipeBrowser';
import { JsonLd } from '../components/JsonLd';
import { bySlugs, countFor, getCategory, site } from '../lib/content';
import type { Category } from '../lib/types';

export function CategoryPage({ category }: { category: Category }) {
  const crumbs = [
    { label: 'Home', to: '/' },
    { label: category.name, to: `/${category.slug}` },
  ];
  const base = bySlugs(category.recipe_slugs);
  const options = category.option_slugs.length;
  const related = category.related.map(getCategory).filter((c): c is Category => Boolean(c));
  const lower = category.name.toLowerCase();

  return (
    <>
      <JsonLd
        data={[
          breadcrumbJsonLd(crumbs),
          {
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            name: category.h1,
            description: category.meta_description,
            url: `${site.site_url}/${category.slug}`,
          },
          {
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: category.faq.map((f) => ({
              '@type': 'Question',
              name: f.question,
              acceptedAnswer: { '@type': 'Answer', text: f.answer },
            })),
          },
        ]}
      />

      <section className="cat-hero">
        <div className="container stack">
          <Breadcrumbs items={crumbs} />
          <h1 className="h1">{category.h1}</h1>
          <p className="lede measure">{category.intro}</p>
          <p className="count">
            {base.length} {base.length === 1 ? 'recipe' : 'recipes'}
          </p>
        </div>
      </section>

      <div className="container page">
        {category.collections.length > 0 && (
          <section aria-labelledby="coll-h" className="collections">
            <h2 id="coll-h" className="h4">
              Browse {lower} collections
            </h2>
            <ul className="pill-row">
              {category.collections.map((c) => (
                <li key={c.label}>
                  <Link className="pill" href={`/recipes?${c.query}`}>
                    {c.label}
                    <span className="pill-count">{countFor(c.query)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <RecipeBrowser
          base={base}
          path={`/${category.slug}`}
          showSearch={false}
          heading={`All ${lower} recipes`}
          layout="bar"
          hide={{ diet: Boolean(category.match_diet), meal: category.match_meals.length === 1 }}
        />

        {options > 0 && (
          <p className="option-note">
            <Icon name="info" size={18} />
            {options} more {options === 1 ? 'recipe becomes' : 'recipes become'} gluten-free with one swap.{' '}
            <Link href={`/recipes?diet=${category.match_diet}`}>See recipes with a GF option</Link>
          </p>
        )}

        <div className="cat-content">
          <section aria-labelledby="guide-h" className="measure">
            <h2 id="guide-h" className="h2">
              {category.guide_title}
            </h2>
            {category.guide.map((g) => (
              <div key={g.title} className="guide-item">
                <h3 className="h4">{g.title}</h3>
                <p>{g.text}</p>
              </div>
            ))}
          </section>
          <section aria-labelledby="cfaq-h" className="cat-faq">
            <h2 id="cfaq-h" className="h2">
              {category.name} FAQ
            </h2>
            <FAQ items={category.faq} />
          </section>
        </div>

        <section aria-labelledby="rel-h" className="section">
          <h2 id="rel-h" className="h4">
            Explore related categories
          </h2>
          <ul className="related-cats">
            {related.map((c) => (
              <li key={c.slug} className="row-card boxed">
                <Photo alt="" tone={c.tone} className="row-thumb square" />
                <Link className="card-link row-title" href={`/${c.slug}`}>
                  {c.h1}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
