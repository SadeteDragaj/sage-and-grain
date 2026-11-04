type Ratio = '16/9' | '4/3' | '1/1' | '4/5';

interface Props {
  alt: string;
  tone: string;
  ratio?: Ratio;
  /** Image path without the ratio suffix, e.g. "/images/recipes/vegan-chickpea-curry". */
  src?: string | null;
  /** Only the hero above the fold should be eager; everything else lazy-loads. */
  eager?: boolean;
  className?: string;
}

const SUFFIX: Record<Ratio, string> = { '16/9': '16x9', '4/3': '4x3', '1/1': '1x1', '4/5': '4x5' };

/**
 * Renders the real photo when `src` is set, otherwise a tinted placeholder with
 * the same aspect ratio and alt text, so swapping in photos causes no layout shift.
 */
export function Photo({ alt, tone, ratio = '4/3', src, eager = false, className = '' }: Props) {
  const style = { aspectRatio: ratio };
  if (src) {
    return (
      <img
        className={`photo ${className}`}
        style={style}
        src={`${src}-${SUFFIX[ratio]}.jpg`}
        alt={alt}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        fetchPriority={eager ? 'high' : undefined}
      />
    );
  }
  return <div className={`photo ph t-${tone} ${className}`} style={style} role="img" aria-label={alt} />;
}
