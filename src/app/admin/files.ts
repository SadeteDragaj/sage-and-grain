import fs from 'node:fs';
import path from 'node:path';

// The admin's page, styles and scripts live in admin/ at the project root (plain
// JS, no build step) and are served from here by the dev server only.
const ADMIN_DIR = path.join(process.cwd(), 'admin');

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
};

export function adminFile(parts: string[]): Response {
  const file = path.join(ADMIN_DIR, ...parts);
  if (!file.startsWith(ADMIN_DIR + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    return Response.json({ detail: 'Not Found' }, { status: 404 });
  }
  const type = TYPES[path.extname(file)] ?? 'application/octet-stream';
  return new Response(fs.readFileSync(file), { headers: { 'content-type': type, 'cache-control': 'no-store' } });
}
