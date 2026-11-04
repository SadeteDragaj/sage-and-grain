'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Icon } from './Icon';

interface Props {
  id: string;
  label: string;
  /** Also works without JavaScript: a plain GET form to /recipes?q=… */
  crawlable?: boolean;
}

/** The large search box on the homepage and the 404 page. */
export function SearchBar({ id, label, crawlable = false }: Props) {
  const router = useRouter();
  const [q, setQ] = useState('');
  return (
    <form
      role="search"
      className="search-bar search-bar-lg"
      action={crawlable ? '/recipes' : undefined}
      onSubmit={(e) => {
        e.preventDefault();
        router.push(q.trim() ? `/recipes?q=${encodeURIComponent(q.trim())}` : '/recipes');
      }}
    >
      <Icon name="search" size={22} />
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <input id={id} name={crawlable ? 'q' : undefined} type="search" placeholder="Find your next favorite recipe…" value={q} onChange={(e) => setQ(e.target.value)} />
      <button type="submit" className="btn btn-primary">
        Search
      </button>
    </form>
  );
}
