'use client';

import { Icon } from './Icon';
import { useSaved } from '../lib/useSaved';

export function SaveButton({ slug, title, variant = 'overlay' }: { slug: string; title: string; variant?: 'overlay' | 'labelled' }) {
  const { isSaved, toggle } = useSaved();
  const saved = isSaved(slug);
  if (variant === 'labelled') {
    return (
      <button type="button" className="btn btn-outline" aria-pressed={saved} onClick={() => toggle(slug)}>
        <Icon name="bookmark" filled={saved} />
        {saved ? 'Saved' : 'Save'}
      </button>
    );
  }
  return (
    <button
      type="button"
      className="save-btn"
      aria-pressed={saved}
      aria-label={saved ? `Remove ${title} from saved` : `Save ${title}`}
      onClick={() => toggle(slug)}
    >
      <span className="save-btn-inner">
        <Icon name="bookmark" filled={saved} size={18} />
      </span>
    </button>
  );
}
