import { useEffect, useState } from 'react';

/**
 * False during prerender and the first client render, true afterwards.
 * Pages are prerendered without query strings, so anything that depends on
 * ?filters must wait for this to avoid a hydration mismatch.
 */
export function useHydrated() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return hydrated;
}
