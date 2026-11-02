import { Breadcrumbs, breadcrumbJsonLd } from '../components/Breadcrumbs';
import { Photo } from '../components/Photo';
import { Seo } from '../components/Seo';
import { site } from '../lib/content';

const CRUMBS = [
  { label: 'Home', to: '/' },
  { label: 'About', to: '/about' },
];

// Fill in the bracketed placeholders with your own details before launch.
export function AboutPage() {
  return (
    <>
      <Seo
        title="About"
        description={`Who's behind ${site.name}, how every recipe is tested, and how we verify gluten-free and vegan labels.`}
        path="/about"
        jsonLd={[
          breadcrumbJsonLd(CRUMBS),
          { '@context': 'https://schema.org', '@type': 'AboutPage', name: `About ${site.name}`, url: `${site.site_url}/about` },
        ]}
      />
      <div className="container page">
        <Breadcrumbs items={CRUMBS} />
        <div className="about-hero">
          <div className="stack">
            <h1 className="h1">About {site.name}</h1>
            <p className="lede">
              {site.name} is a home-cooking site for gluten-free, vegan and healthy recipes — tested in an ordinary kitchen and labelled honestly, so you can cook with confidence.
            </p>
            <a className="btn btn-primary self-start" href="#contact">
              Contact us
            </a>
          </div>
          <Photo alt={`${site.author} cooking at the stove in their home kitchen`} tone="kitchen" ratio="4/3" eager />
        </div>

        <div className="about-layout">
          <div className="prose">
            <h2>Who's behind the site</h2>
            <div className="author-inline">
              <Photo alt={`Portrait of ${site.author}`} tone="person" ratio="1/1" className="author-photo" />
              <div>
                <p className="author-name">{site.author}</p>
                <p>[Short bio: your cooking background, why gluten-free and plant-based food matters to you, and where you're based. Two or three sentences in your own words.]</p>
              </div>
            </div>

            <h2>Our cooking philosophy</h2>
            <p>
              Good food doesn't need a long shopping list. We cook with whole, mostly plant-based ingredients, keep processed products to a minimum, and write recipes for busy weeknights — not restaurant kitchens.
            </p>
            <p>No long life stories before the recipe: every page opens with what you need to know, and “Jump to recipe” is always one tap away.</p>

            <h2>How we test every recipe</h2>
            <ol className="numbered">
              <li>Each recipe is cooked at least [3] times in a regular home kitchen before it's published.</li>
              <li>Timings are checked with a real timer, and quantities at both half and double servings.</li>
              <li>Photos show the actual result of the recipe as written.</li>
              <li>When readers spot an issue, we retest and show the change with an “Updated” date.</li>
            </ol>

            <h2>How we verify diet labels</h2>
            <p>
              A label only goes on a recipe when every ingredient supports it. Oats only count as gluten-free when they are certified gluten-free oats. If a recipe needs a swap to qualify, it gets a “GF option” label instead of a full Gluten-Free label.
            </p>
            <p>We're home cooks, not dietitians. If you have a medical condition or allergy, always check product packaging and talk to a professional.</p>

            <h2 id="contact">Get in touch</h2>
            <p>
              Questions, corrections or recipe requests are always welcome. Write to us at <a href="mailto:[your email address]">[your email address]</a>.
            </p>
          </div>
          <aside className="labels-box" aria-labelledby="labels-h">
            <h2 id="labels-h" className="h4">
              Our labels
            </h2>
            <ul>
              <li>
                <span className="tag tag-diet">Gluten-Free</span> Every ingredient is gluten-free.
              </li>
              <li>
                <span className="tag tag-option">GF option</span> Gluten-free with one named swap.
              </li>
              <li>
                <span className="tag tag-diet">Vegan</span> No animal products at all.
              </li>
              <li>
                <span className="tag tag-meal">Healthy</span> An editorial collection, not a diet claim.
              </li>
            </ul>
          </aside>
        </div>
      </div>
    </>
  );
}
