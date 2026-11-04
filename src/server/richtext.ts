// Cleaning and helpers for the article HTML written in the admin's editor.
//
// The article is rendered as raw HTML on the site, so everything is cleaned here,
// on every save and every build: only the tags the editor can make survive, images
// must come from /images/ (uploaded through the admin), and links can only be web,
// mail or site-relative links.

import sanitizeHtml from 'sanitize-html';

const TAGS = ['h2', 'h3', 'p', 'br', 'strong', 'em', 'u', 's', 'a', 'ul', 'ol', 'li', 'blockquote', 'img'];

const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: TAGS,
  allowedAttributes: { a: ['href', 'title'], img: ['src', 'alt', 'width', 'height', 'loading', 'decoding'] },
  allowedSchemes: ['http', 'https', 'mailto'],
  allowedSchemesAppliedToAttributes: ['href', 'src'],
  allowProtocolRelative: false,
  transformTags: {
    img: (tagName, attribs) => {
      const out: Record<string, string> = {};
      for (const [k, v] of Object.entries(attribs)) {
        if (k === 'src' && !v.startsWith('/images/')) continue;
        if ((k === 'width' || k === 'height') && !/^\d+$/.test(v)) continue;
        out[k] = v;
      }
      return { tagName, attribs: { ...out, loading: 'lazy', decoding: 'async' } };
    },
  },
};

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

function unescape(text: string) {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, code: string) => {
    if (code[0] === '#') return String.fromCodePoint(code[1].toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : Number(code.slice(1)));
    return ENTITIES[code.toLowerCase()] ?? whole;
  });
}

function plainText(article: string) {
  return unescape(article.replace(/<[^>]+>/g, ' '));
}

/** Safe HTML, or null when the article is empty. */
export function cleanArticle(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let text = raw.replaceAll('&nbsp;', ' ').replaceAll(' ', ' ');
  text = text.replace(/<h1(\s[^>]*)?>/g, '<h2>').replaceAll('</h1>', '</h2>'); // the page already has the H1
  text = text.replace(/<h[456](\s[^>]*)?>/g, '<h3>').replace(/<\/h[456]>/g, '</h3>');
  let out = sanitizeHtml(text, OPTIONS);
  out = out.replace(/<img(?![^>]*\ssrc=)[^>]*>/g, ''); // images whose source was rejected
  out = out.replace(/<(p|h2|h3|li)>(\s|<br\s*\/?>)*<\/\1>/g, ''); // empty blocks the editor leaves behind
  out = out.replace(/<(ul|ol)>\s*<\/\1>/g, '').trim();
  return out || null;
}

/** [Bracketed] example text from the article template that hasn't been replaced. */
export function placeholders(article: string | null): string[] {
  return plainText(article ?? '').match(/\[[^\]]{3,}\]/g) ?? [];
}

export function wordCount(article: string | null): number {
  if (!article) return 0;
  return plainText(article).split(/\s+/).filter(Boolean).length;
}

export function imageCount(article: string | null): number {
  return (article ?? '').match(/<img\s/g)?.length ?? 0;
}
