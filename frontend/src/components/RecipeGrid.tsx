import type { Recipe } from '../lib/types';
import { AdSlot } from './AdSlot';
import { RecipeCard } from './RecipeCard';

/**
 * Card grid with one in-grid ad "after row 2". Rows are 2 cards on phones and
 * 3 on desktop, so the ad is positioned with CSS `order` (see .grid-ad in CSS).
 */
export function RecipeGrid({ items, withAd = true }: { items: Recipe[]; withAd?: boolean }) {
  return (
    <div className="grid">
      {items.map((r, i) => (
        <RecipeCard key={r.slug} recipe={r} style={{ order: i * 2 }} />
      ))}
      {withAd && items.length > 4 && <AdSlot placement="grid" className="grid-ad" />}
    </div>
  );
}
