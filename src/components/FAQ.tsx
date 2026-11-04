import type { FAQItem } from '../lib/types';
import { Icon } from './Icon';

/** Native details/summary: answers stay in the HTML for search engines. */
export function FAQ({ items, openFirst = true }: { items: FAQItem[]; openFirst?: boolean }) {
  return (
    <div className="faq">
      {items.map((item, i) => (
        <details key={item.question} open={openFirst && i === 0}>
          <summary>
            <h3>{item.question}</h3>
            <Icon name="chevronDown" />
          </summary>
          <p>{item.answer}</p>
        </details>
      ))}
    </div>
  );
}
