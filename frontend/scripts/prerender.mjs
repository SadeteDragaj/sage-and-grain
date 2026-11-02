// Renders every route to static HTML after `vite build`.
// Output: dist/site — upload this folder to any static host.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const siteDir = path.join(root, 'dist/site');
const template = fs.readFileSync(path.join(siteDir, 'index.html'), 'utf8');
const { render, staticRoutes } = await import(pathToFileURL(path.join(root, 'dist/server/entry-server.js')).href);

function write(file, html) {
  const out = path.join(siteDir, file);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, html);
}

function page(url) {
  const { html, head } = render(url);
  return template.replace('<!--app-head-->', head).replace('<!--app-html-->', html);
}

const routes = staticRoutes();
for (const url of routes) {
  write(url === '/' ? 'index.html' : path.join(url.slice(1), 'index.html'), page(url));
}
write('404.html', page('/404'));

console.log(`Prerendered ${routes.length} pages + 404.html into dist/site`);
