import { useEffect, useRef, useState } from 'react';

/**
 * The one ad component used everywhere — replace ads here only.
 *
 * Until VITE_ADSENSE_CLIENT is set it renders the labelled placeholder from the
 * design. Each placement reserves a fixed height in CSS (.ad-<placement>) so
 * nothing shifts when the ad loads (no CLS). Map each placement to an AdSense ad
 * unit with the VITE_ADSENSE_SLOT_* variables (see .env.example). On phones the
 * homepage and article slots switch to the shared ad-mobile-1 unit (300 × 250).
 *
 * Rules from the brief: max 1 ad on the homepage, 1 on listing/category pages,
 * 3 on a recipe. Never in cooking mode, never sticky or overlaid, never above the
 * H1, never beside buttons, timers or the servings control.
 */
export type Placement = 'home-leaderboard' | 'grid' | 'in-article' | 'sidebar' | 'end';

const SLOTS: Record<Placement, { id: string; size: string; unit: string | undefined }> = {
  'home-leaderboard': { id: 'ad-home-1', size: 'Responsive · 970 × 90 desktop, 300 × 250 mobile', unit: import.meta.env.VITE_ADSENSE_SLOT_HOME },
  grid: { id: 'ad-list-1', size: 'Responsive · in-grid after row 2', unit: import.meta.env.VITE_ADSENSE_SLOT_LIST },
  'in-article': { id: 'ad-article-1', size: '336 × 280 · after intro', unit: import.meta.env.VITE_ADSENSE_SLOT_ARTICLE_1 },
  sidebar: { id: 'ad-article-2', size: '300 × 600 · sidebar', unit: import.meta.env.VITE_ADSENSE_SLOT_ARTICLE_2 },
  end: { id: 'ad-article-3', size: '336 × 280 · near end', unit: import.meta.env.VITE_ADSENSE_SLOT_ARTICLE_3 },
};

const MOBILE = { id: 'ad-mobile-1', size: '300 × 250 · mobile', unit: import.meta.env.VITE_ADSENSE_SLOT_MOBILE };
const USES_MOBILE: Placement[] = ['home-leaderboard', 'in-article', 'end'];
const PHONE_QUERY = '(max-width: 719px)';

const CLIENT = import.meta.env.VITE_ADSENSE_CLIENT;

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

export function AdSlot({ placement, className = '' }: { placement: Placement; className?: string }) {
  // Unknown until hydration (prerendered HTML has no viewport); the reserved height covers the gap.
  const [phone, setPhone] = useState<boolean | null>(null);
  const slot = phone && USES_MOBILE.includes(placement) ? MOBILE : SLOTS[placement];
  const pushed = useRef(false);
  const live = Boolean(CLIENT && slot.unit);

  useEffect(() => setPhone(window.matchMedia(PHONE_QUERY).matches), []);

  useEffect(() => {
    if (!live || phone === null || pushed.current) return;
    pushed.current = true;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // Ad blockers throw here; the reserved space simply stays empty.
    }
  }, [live, phone]);

  return (
    <aside className={`ad ad-${placement} ${className}`} aria-label="Advertisement" data-ad-slot={slot.id}>
      {live ? (
        phone !== null && (
          <ins
            className="adsbygoogle"
            style={{ display: 'block', width: '100%', height: '100%' }}
            data-ad-client={CLIENT}
            data-ad-slot={slot.unit}
            data-ad-format="auto"
            data-full-width-responsive="true"
          />
        )
      ) : (
        <>
          <span className="ad-label">Advertisement</span>
          <span className="ad-size">{slot.size}</span>
          <code className="ad-id">{slot.id}</code>
        </>
      )}
    </aside>
  );
}
