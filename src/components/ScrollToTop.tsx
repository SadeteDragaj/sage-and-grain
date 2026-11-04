'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

/** Every new page starts at the top; filter and pagination changes (same path) keep their place. */
export function ScrollToTop() {
  const pathname = usePathname();
  // Braces matter: Chrome's scrollTo returns a Promise when smooth scrolling is on,
  // and React would treat a returned value as a cleanup function and crash.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}
