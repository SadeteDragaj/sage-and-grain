import { Link } from 'react-router-dom';
import type { CSSProperties } from 'react';
import type { Recipe } from '../lib/types';
import { DIFFICULTY_LABELS } from '../lib/content';
import { totalTime } from '../lib/format';
import { toneFor } from '../lib/tones';
import { DietTags } from './DietTags';
import { Icon } from './Icon';
import { Photo } from './Photo';
import { SaveButton } from './SaveButton';

interface Props {
  recipe: Recipe;
  headingLevel?: 'h2' | 'h3';
  style?: CSSProperties;
}

/** The whole card is one link (the title's ::after covers the card); Save sits above it. */
export function RecipeCard({ recipe, headingLevel: H = 'h3', style }: Props) {
  return (
    <article className="card" style={style}>
      <Photo alt={recipe.image.alt} tone={toneFor(recipe.slug)} src={recipe.image.src} ratio="4/3" />
      <SaveButton slug={recipe.slug} title={recipe.title} />
      <div className="card-body">
        <H className="card-title">
          <Link className="card-link" to={`/recipes/${recipe.slug}`}>
            {recipe.title}
          </Link>
        </H>
        <p className="card-meta">
          <Icon name="clock" size={16} />
          {totalTime(recipe)} · {DIFFICULTY_LABELS[recipe.difficulty]}
        </p>
        <p className="card-desc">{recipe.description}</p>
        <DietTags recipe={recipe} max={3} />
      </div>
    </article>
  );
}

/** Small horizontal card for lists (popular, seasonal, sidebar). */
export function RecipeRow({ recipe, rank, meta }: { recipe: Recipe; rank?: string; meta?: string }) {
  return (
    <div className="row-card">
      {rank && (
        <span className="row-rank" aria-hidden="true">
          {rank}
        </span>
      )}
      <Photo alt={recipe.image.alt} tone={toneFor(recipe.slug)} src={recipe.image.src} className="row-thumb" />
      <div className="row-body">
        <Link className="card-link row-title" to={`/recipes/${recipe.slug}`}>
          {recipe.title}
        </Link>
        <span className="row-meta">{meta ?? `${totalTime(recipe)} · ${DIFFICULTY_LABELS[recipe.difficulty]}`}</span>
      </div>
    </div>
  );
}
