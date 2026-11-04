import type { Ingredient, Recipe } from './types';

const FRACTIONS: [number, string][] = [
  [0, ''],
  [0.25, '¼'],
  [1 / 3, '⅓'],
  [0.5, '½'],
  [2 / 3, '⅔'],
  [0.75, '¾'],
  [1, ''],
];

/** 0.5 → "½", 1.25 → "1¼", 480 → "480". Large amounts are rounded to tidy numbers. */
export function formatQty(x: number): string {
  if (x >= 100) return String(Math.round(x / 10) * 10);
  if (x >= 20) return String(Math.round(x / 5) * 5);
  const whole = Math.floor(x + 1e-6);
  const frac = x - whole;
  let best = FRACTIONS[0];
  for (const f of FRACTIONS) if (Math.abs(f[0] - frac) < Math.abs(best[0] - frac)) best = f;
  const w = whole + (best[0] === 1 ? 1 : 0);
  return (w ? String(w) : '') + best[1] || '¼';
}

export function scaledQuantity(ing: Ingredient, factor: number) {
  if (ing.qty == null) return '';
  return formatQty(ing.qty * factor) + (ing.unit ? ` ${ing.unit}` : '');
}

export function ingredientName(ing: Ingredient) {
  return ing.note ? `${ing.item}, ${ing.note}` : ing.item;
}

export function minutes(total: number) {
  if (total < 60) return `${total} min`;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m ? `${h} hr ${m} min` : `${h} hr`;
}

export function totalTime(r: Pick<Recipe, 'total_minutes' | 'extra_time'>) {
  return minutes(r.total_minutes) + (r.extra_time ? ` + ${r.extra_time}` : '');
}

export function clock(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function longDate(iso: string) {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}
