import { Breadcrumbs, breadcrumbJsonLd } from '../components/Breadcrumbs';
import { JsonLd } from '../components/JsonLd';
import { site } from '../lib/content';

export const INFO_PAGES = {
  contact: {
    title: 'Contact',
    description: `How to get in touch with ${site.name}.`,
    body: ['Questions, corrections or recipe requests are always welcome.', 'Email: [your email address]'],
  },
  privacy: {
    title: 'Privacy Policy',
    description: `How ${site.name} handles your data.`,
    body: [
      '[Your privacy policy goes here. Cover: what you collect (newsletter emails, analytics), advertising cookies from Google AdSense, how long you keep data, and how to contact you.]',
      'Saved recipes are stored only in your browser on this device. We never receive them.',
    ],
  },
  cookies: {
    title: 'Cookie Policy',
    description: `Which cookies ${site.name} uses.`,
    body: ['[Your cookie policy goes here. List analytics and Google AdSense cookies, and link to your consent banner settings.]'],
  },
  terms: {
    title: 'Terms of Use',
    description: `Terms for using ${site.name}.`,
    body: ['[Your terms of use go here.]'],
  },
} as const;

export type InfoSlug = keyof typeof INFO_PAGES;

export function InfoPage({ slug }: { slug: InfoSlug }) {
  const page = INFO_PAGES[slug];
  const crumbs = [
    { label: 'Home', to: '/' },
    { label: page.title, to: `/${slug}` },
  ];
  return (
    <>
      <JsonLd data={[breadcrumbJsonLd(crumbs)]} />
      <div className="container page">
        <Breadcrumbs items={crumbs} />
        <div className="prose measure">
          <h1 className="h1">{page.title}</h1>
          {page.body.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </div>
      </div>
    </>
  );
}
