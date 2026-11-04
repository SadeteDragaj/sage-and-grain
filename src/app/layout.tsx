import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { Footer } from '../components/Footer';
import { Header } from '../components/Header';
import { ScrollToTop } from '../components/ScrollToTop';
import { site } from '../lib/content';
import { checkContent } from '../server/content';
import '../styles/global.css';

const ADSENSE_CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;

export const metadata: Metadata = {
  metadataBase: new URL(site.site_url),
  icons: { icon: { url: '/favicon.svg', type: 'image/svg+xml' } },
};

export const viewport: Viewport = { themeColor: '#2E4A33' };

export default function RootLayout({ children }: { children: ReactNode }) {
  // Every content rule (diet labels included) is checked here, so a wrong label
  // fails `npm run build` and shows as an error in `npm run dev`.
  checkContent();
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,700&display=swap" />
        {ADSENSE_CLIENT && (
          <script async src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`} crossOrigin="anonymous" />
        )}
      </head>
      <body>
        <ScrollToTop />
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <Header />
        <main id="main">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
