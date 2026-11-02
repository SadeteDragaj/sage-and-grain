import { Helmet } from 'react-helmet-async';
import { Outlet } from 'react-router-dom';
import { Footer } from './Footer';
import { Header } from './Header';

const ADSENSE_CLIENT = import.meta.env.VITE_ADSENSE_CLIENT;

export function Layout() {
  return (
    <>
      {ADSENSE_CLIENT && (
        <Helmet>
          <script async src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`} crossOrigin="anonymous" />
        </Helmet>
      )}
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Header />
      <main id="main">
        <Outlet />
      </main>
      <Footer />
    </>
  );
}
