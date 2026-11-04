import Link from 'next/link';
import { site } from '../lib/content';
import { Icon } from './Icon';

const RECIPES = [
  ['/recipes', 'All Recipes'],
  ['/gluten-free', 'Gluten-Free'],
  ['/vegan', 'Vegan'],
  ['/healthy', 'Healthy'],
];
const MEALS = [
  ['/breakfast', 'Breakfast'],
  ['/lunch', 'Lunch'],
  ['/dinner', 'Dinner'],
  ['/snacks-desserts', 'Snacks & Desserts'],
];
const SITE = [
  ['/about', 'About'],
  ['/contact', 'Contact'],
  ['/privacy', 'Privacy'],
  ['/cookies', 'Cookies'],
  ['/terms', 'Terms'],
];

// Replace with your real profiles.
const SOCIAL = [
  { href: 'https://www.instagram.com/', label: 'Instagram', icon: 'instagram' },
  { href: 'https://www.pinterest.com/', label: 'Pinterest', icon: 'pin' },
  { href: 'https://www.youtube.com/', label: 'YouTube', icon: 'video' },
] as const;

function Column({ title, links }: { title: string; links: string[][] }) {
  return (
    <nav aria-label={title} className="foot-col">
      <p className="foot-title">{title}</p>
      {links.map(([to, label]) => (
        <Link key={to} href={to}>
          {label}
        </Link>
      ))}
    </nav>
  );
}

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="foot-grid">
          <div className="foot-brand">
            <p className="foot-name">{site.name}</p>
            <p>{site.tagline}</p>
            <div className="social">
              {SOCIAL.map((s) => (
                <a key={s.label} href={s.href} aria-label={`${site.name} on ${s.label}`} rel="noopener">
                  <Icon name={s.icon} />
                </a>
              ))}
            </div>
          </div>
          <Column title="Recipes" links={RECIPES} />
          <Column title="Meals" links={MEALS} />
          <Column title={site.name} links={SITE} />
        </div>
        <div className="foot-bottom">
          <span>© {new Date().getFullYear()} {site.name}</span>
          <span>Diet labels are based on ingredients. If you have an allergy, always check packaging.</span>
        </div>
      </div>
    </footer>
  );
}
