'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { type ReactNode, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { MEAL_LABELS, getCategory } from '../lib/content';
import { useSaved } from '../lib/useSaved';
import { Icon } from './Icon';

const NAV = [
  { to: '/', label: 'Home', end: true },
  { to: '/recipes', label: 'All Recipes', end: true },
  { to: '/gluten-free', label: 'Gluten-Free' },
  { to: '/vegan', label: 'Vegan' },
  { to: '/healthy', label: 'Healthy' },
];

/** A link marked class="active" and aria-current="page" while you're on its page (or below it, unless `end`). */
function NavLink({ to, end = false, children }: { to: string; end?: boolean; children: ReactNode }) {
  const pathname = usePathname();
  const active = pathname === to || (!end && pathname.startsWith(`${to}/`));
  return (
    <Link href={to} className={active ? 'active' : undefined} aria-current={active ? 'page' : undefined}>
      {children}
    </Link>
  );
}

/** Calls onChange after every navigation, including ones that only change the query (/recipes?saved=1). */
function OnNavigate({ onChange }: { onChange: () => void }) {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  useEffect(onChange, [onChange, pathname, search]);
  return null;
}

function Logo() {
  return (
    <Link href="/" className="logo" aria-label="Sage & Grain, home">
      <span className="logo-mark">
        <Icon name="leaf" size={18} />
      </span>
      <span className="logo-word">Sage &amp; Grain</span>
    </Link>
  );
}

function SearchForm({ id, autoFocus = false, onDone }: { id: string; autoFocus?: boolean; onDone?: () => void }) {
  const router = useRouter();
  const [q, setQ] = useState('');
  return (
    <form
      role="search"
      className="header-search"
      action="/recipes"
      onSubmit={(e) => {
        e.preventDefault();
        router.push(q.trim() ? `/recipes?q=${encodeURIComponent(q.trim())}` : '/recipes');
        onDone?.();
      }}
    >
      <Icon name="search" size={18} />
      <label htmlFor={id} className="sr-only">
        Search recipes
      </label>
      <input id={id} name="q" type="search" placeholder="Search recipes" value={q} onChange={(e) => setQ(e.target.value)} autoFocus={autoFocus} />
    </form>
  );
}

export function Header() {
  const { saved } = useSaved();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);

  // Close overlays on navigation.
  const closeOverlays = useCallback(() => {
    setMenuOpen(false);
    setSearchOpen(false);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    document.body.classList.add('no-scroll');
    drawerRef.current?.querySelector<HTMLElement>('button, a')?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenuOpen(false);
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.classList.remove('no-scroll');
      window.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const savedLabel = `Saved recipes, ${saved.length} saved`;

  return (
    <header className="site-header">
      {/* Reading the query needs a Suspense boundary in the static export; it renders nothing. */}
      <Suspense fallback={null}>
        <OnNavigate onChange={closeOverlays} />
      </Suspense>
      <div className="container header-inner">
        <button type="button" className="icon-btn only-mobile" aria-label="Open menu" aria-expanded={menuOpen} onClick={() => setMenuOpen(true)}>
          <Icon name="menu" size={24} />
        </button>
        <Logo />
        <nav aria-label="Main" className="main-nav only-desktop">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end}>
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="header-actions">
          <div className="only-desktop">
            <SearchForm id="header-q" />
          </div>
          <button type="button" className="icon-btn only-mobile" aria-label="Search recipes" aria-expanded={searchOpen} onClick={() => setSearchOpen((v) => !v)}>
            <Icon name="search" size={22} />
          </button>
          <Link href="/recipes?saved=1" className="icon-btn saved-link" aria-label={savedLabel}>
            <Icon name="bookmark" size={22} />
            {saved.length > 0 && (
              <span className="badge" aria-hidden="true">
                {saved.length}
              </span>
            )}
          </Link>
        </div>
      </div>
      {searchOpen && (
        <div className="mobile-search only-mobile">
          <SearchForm id="mobile-q" autoFocus onDone={() => setSearchOpen(false)} />
        </div>
      )}

      {menuOpen && (
        <div className="drawer-backdrop" onClick={() => setMenuOpen(false)}>
          <div ref={drawerRef} className="drawer" role="dialog" aria-modal="true" aria-label="Menu" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-head">
              <Logo />
              <button type="button" className="icon-btn" aria-label="Close menu" onClick={() => setMenuOpen(false)}>
                <Icon name="close" size={24} />
              </button>
            </div>
            <SearchForm id="drawer-q" />
            <nav aria-label="Menu" className="drawer-nav">
              {NAV.map((n) => (
                <NavLink key={n.to} to={n.to} end={n.end}>
                  {n.label}
                </NavLink>
              ))}
            </nav>
            <p className="label">Meals</p>
            <div className="pill-row">
              {(['breakfast', 'lunch', 'dinner'] as const).map((m) => (
                <Link key={m} className="pill" href={`/${m}`}>
                  {MEAL_LABELS[m]}
                </Link>
              ))}
              <Link className="pill" href="/snacks-desserts">
                {getCategory('snacks-desserts')?.name}
              </Link>
            </div>
            <Link href="/recipes?saved=1" className="drawer-saved">
              <Icon name="bookmark" size={22} />
              <span>
                <strong>Saved recipes</strong>
                <small>Stored on this device</small>
              </span>
              <span className="badge badge-lg">{saved.length}</span>
            </Link>
            <div className="drawer-foot">
              <Link href="/about">About</Link>
              <Link href="/contact">Contact</Link>
              <Link href="/privacy">Privacy</Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
