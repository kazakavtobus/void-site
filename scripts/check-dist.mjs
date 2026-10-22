import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const projects = JSON.parse(await readFile(path.join(root, 'content/projects.json'), 'utf8'));
const site = JSON.parse(await readFile(path.join(root, 'content/site.json'), 'utf8'));
const missing = [];
let links = 0;
let htmlPages = 0;

async function listFiles(dir) {
  const result = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const filename = path.join(dir, entry.name);
    if (entry.isDirectory()) result.push(...await listFiles(filename));
    else result.push(filename);
  }
  return result;
}

const files = await listFiles(dist);
const present = new Set(files.map(name => path.relative(dist, name).split(path.sep).join('/')));
const mustHave = ['index.html', '404.html', 'cases/index.html', 'privacy/index.html', 'assets/site.css', 'assets/site.js', 'assets/favicon.svg', 'robots.txt'];
for (const name of mustHave) if (!present.has(name)) missing.push(`Required file missing: ${name}`);

for (const project of projects) {
  const detail = `cases/${project.slug}/index.html`;
  if (project.status === 'published' && !present.has(detail)) missing.push(`Published case missing: ${detail}`);
  if (project.status !== 'published' && present.has(detail)) missing.push(`Draft case is exposed: ${detail}`);
}

for (const name of present) {
  if (!name.endsWith('.html')) continue;
  htmlPages++;
  const html = await readFile(path.join(dist, name), 'utf8');
  if (!html.includes('<html lang="ru">') || !html.includes('<main id="main"')) missing.push(`Basic HTML structure missing: ${name}`);
  if (name === '404.html' && !html.includes('noindex,follow')) missing.push('404.html must not be indexed');
  if (/<title>[^<]*VOID/i.test(html) || /<a[^>]*class="logo"[^>]*>void/i.test(html)) missing.push(`Old public brand found: ${name}`);
  if (html.includes('mailto:')) missing.push(`Email CTA must not remain: ${name}`);
  if (!html.includes('href="https://t.me/tvoykazak"')) missing.push(`Telegram personal contact is missing: ${name}`);
  if (!html.includes('href="https://t.me/kazakblog"')) missing.push(`Telegram channel is missing: ${name}`);
  const shortWord = /(^|[\s.,;:!?«“(—])(?:для|без|при|под|над|про|перед|меж|через|или|что|как|не|на|по|из|за|во|ко|со|до|от|об|но|то|же|ли|а|в|к|о|с|у|и) +(?=[А-Яа-яЁё0-9])/giu;
  const textNodes = html.split(/(<[^>]*>)/g).filter((_, index) => index % 2 === 0);
  if (textNodes.some(text => shortWord.test(text))) missing.push(`Possible orphan short preposition: ${name}`);

  for (const match of html.matchAll(/\b(?:href|src)="([^"]+)"/g)) {
    const href = match[1].replaceAll('&amp;', '&');
    if (/^(?:https?:|mailto:|tel:|data:|#)/i.test(href)) continue;
    links++;
    const [resource, hash] = href.split('#', 2);
    const base = path.posix.dirname('/' + name);
    let target = path.posix.normalize(path.posix.join(base, resource || path.posix.basename(name)));
    if (target.endsWith('/')) target += 'index.html';
    if (!path.posix.extname(target)) target += '/index.html';
    const rel = target.replace(/^\//, '');
    if (!present.has(rel)) missing.push(`Broken link ${name} -> ${href} (not found: ${rel})`);
    else if (hash && rel.endsWith('.html')) {
      const targetHtml = await readFile(path.join(dist, rel), 'utf8');
      if (!targetHtml.includes(`id="${hash}"`)) missing.push(`Broken anchor ${name} -> ${href}`);
    }
  }
}

const robots = await readFile(path.join(dist, 'robots.txt'), 'utf8');
if (!site.siteUrl && !robots.includes('Disallow: /')) missing.push('Pre-release site should not be indexed without configured domain');
if (site.siteUrl && !present.has('sitemap.xml')) missing.push('Sitemap missing when siteUrl is set');
if (missing.length) {
  for (const issue of missing) console.error('FAIL:', issue);
  process.exitCode = 1;
} else {
  console.log(`твой казак smoke: ${htmlPages} HTML pages, ${links} relative references checked, no broken links.`);
}
