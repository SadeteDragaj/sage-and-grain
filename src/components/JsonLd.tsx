/** Structured data for search engines, rendered into the page's HTML. */
export function JsonLd({ data }: { data: Record<string, unknown>[] }) {
  return (
    <>
      {data.map((item, i) => (
        // "<" is escaped so text such as "</script>" in content can't end the tag early.
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(item).replace(/</g, '\\u003c') }} />
      ))}
    </>
  );
}
