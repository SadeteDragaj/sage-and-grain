import Link from 'next/link';
import { Icon } from './Icon';

/** Real links (/recipes?page=2) so every page is crawlable. Like the filters, they keep the scroll position. */
export function Pagination({ page, pages, hrefFor }: { page: number; pages: number; hrefFor: (p: number) => string }) {
  if (pages <= 1) return null;
  return (
    <nav aria-label="Pagination" className="pagination">
      {page > 1 ? (
        <Link className="page-step" href={hrefFor(page - 1)} scroll={false}>
          <Icon name="chevronLeft" size={18} />
          Previous page
        </Link>
      ) : (
        <span className="page-step is-disabled" aria-disabled="true">
          <Icon name="chevronLeft" size={18} />
          Previous
        </span>
      )}
      {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
        <Link key={p} href={hrefFor(p)} scroll={false} className={`page-num${p === page ? ' is-current' : ''}`} aria-current={p === page ? 'page' : undefined} aria-label={`Page ${p}`}>
          {p}
        </Link>
      ))}
      {page < pages ? (
        <Link className="page-step" href={hrefFor(page + 1)} scroll={false}>
          Next page
          <Icon name="chevronRight" size={18} />
        </Link>
      ) : (
        <span className="page-step is-disabled" aria-disabled="true">
          Next
          <Icon name="chevronRight" size={18} />
        </span>
      )}
    </nav>
  );
}
