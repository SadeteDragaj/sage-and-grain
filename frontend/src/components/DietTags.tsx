import { Link } from 'react-router-dom';
import { DIET_LABELS, MEAL_LABELS, dietHref, mealHref } from '../lib/content';
import type { Recipe } from '../lib/types';

interface Props {
  recipe: Pick<Recipe, 'diets' | 'diet_options' | 'meal'>;
  /** On recipe pages tags link to their category pages; on cards the whole card is the link. */
  linked?: boolean;
  withMeal?: boolean;
  max?: number;
  size?: 'sm' | 'md';
}

export function DietTags({ recipe, linked = false, withMeal = false, max, size = 'sm' }: Props) {
  const tags = [
    ...recipe.diets.map((d) => ({ key: d, label: DIET_LABELS[d], href: dietHref(d), kind: 'diet' })),
    ...recipe.diet_options.map((d) => ({
      key: `${d}-option`,
      label: d === 'gluten-free' ? 'GF option' : `${DIET_LABELS[d]} option`,
      href: `/recipes?diet=${d}`,
      kind: 'option',
    })),
    ...(withMeal ? [{ key: recipe.meal, label: MEAL_LABELS[recipe.meal], href: mealHref(recipe.meal), kind: 'meal' }] : []),
  ].slice(0, max);

  return (
    <ul className={`tags tags-${size}`} aria-label="Diet">
      {tags.map((t) => (
        <li key={t.key}>
          {linked ? (
            <Link className={`tag tag-${t.kind}`} to={t.href}>
              {t.label}
            </Link>
          ) : (
            <span className={`tag tag-${t.kind}`}>{t.label}</span>
          )}
        </li>
      ))}
    </ul>
  );
}
