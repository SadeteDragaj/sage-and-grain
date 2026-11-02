import { useCallback, useEffect, useState } from 'react';

// Bookmarks live on the device only — there are no accounts.
const KEY = 'sage-and-grain:saved';
const EVENT = 'sage-and-grain:saved-change';

function read(): string[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function write(list: string[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // Private mode or storage blocked: bookmarks just won't persist.
  }
  window.dispatchEvent(new Event(EVENT));
}

export function useSaved() {
  // Starts empty so server and client render the same HTML; filled after hydration.
  const [saved, setSaved] = useState<string[]>([]);

  useEffect(() => {
    const sync = () => setSaved(read());
    sync();
    window.addEventListener(EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const toggle = useCallback((slug: string) => {
    const current = read();
    write(current.includes(slug) ? current.filter((s) => s !== slug) : [...current, slug]);
  }, []);

  return { saved, savedSet: new Set(saved), isSaved: (slug: string) => saved.includes(slug), toggle };
}
