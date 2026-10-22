import { readFile, mkdir, writeFile, cp, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'dist');
const readJSON = async name => JSON.parse(await readFile(path.join(root, 'content', name), 'utf8'));
const site = await readJSON('site.json');
const projects = await readJSON('projects.json');
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const published = projects.filter(project => project.status === 'published');
const statusLabel = { planned: 'В планах', draft: 'В разработке', published: 'Смотреть кейс' };

function validate() {
  if (!Array.isArray(projects)) throw Error('projects.json must be an array');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(site.email)) throw Error('Invalid email in site.json');
  if (site.siteUrl) {
    const url = new URL(site.siteUrl);
    if (url.protocol !== 'https:' || url.pathname !== '/' || url.search || url.hash || url.username || url.password)
      throw Error('siteUrl must be an HTTPS domain with root path, e.g. https://example.ru/');
  }
  const slugs = new Set();
  for (const project of projects) {
    if (!/^[a-z0-9-]+$/.test(project.slug) || slugs.has(project.slug)) throw Error('Invalid or duplicate project slug');
    if (!Object.hasOwn(statusLabel, project.status)) throw Error('Unknown project status');
    if (project.status === 'published' && (!Array.isArray(project.sections) || !project.sections.length)) throw Error(`Published project ${project.slug} requires sections`);
    slugs.add(project.slug);
  }
}
validate();

const prefix = depth => '../'.repeat(depth) || './';
function header(pref) {
  return `<a class="skip-link" href="#main">К содержимому</a>
  <header class="header" id="top"><div class="header__inner container">
  <a href="${pref}index.html" class="logo" aria-label="VOID — главная"><span class="logo__symbol" aria-hidden="true">◈</span>void<span class="logo__dot">.</span></a>
  <nav class="desktop-nav" aria-label="Главное меню"><a href="${pref}index.html#projects">Кейсы</a><a href="${pref}index.html#services">Услуги</a><a href="${pref}index.html#about">Обо мне</a></nav>
  <a class="header__contact" href="${pref}index.html#contact">Обсудить проект <span aria-hidden="true">↗</span></a>
  <button class="menu-toggle" type="button" aria-label="Открыть меню" aria-expanded="false" aria-controls="mobile-navigation"><span></span><span></span></button>
  </div><nav class="mobile-nav" id="mobile-navigation" aria-label="Мобильное меню" hidden><a href="${pref}index.html#projects">Кейсы</a><a href="${pref}index.html#services">Услуги</a><a href="${pref}index.html#about">Обо мне</a><a href="${pref}index.html#contact">Обсудить проект</a></nav></header>`;
}
function footer(pref) {
  return `<footer class="footer"><div class="container footer__inner"><a class="logo" href="${pref}index.html" aria-label="VOID — на главную"><span class="logo__symbol" aria-hidden="true">◈</span>void<span class="logo__dot">.</span></a><p>Дизайн и разработка сайтов. © ${new Date().getFullYear()}</p><nav aria-label="Внизу страницы"><a href="${pref}privacy/">О данных</a><a href="#top">Наверх ↑</a></nav></div></footer>`;
}
function page({ title, description, body, depth = 0, cls = '', pagePath = '', noindex = false }) {
  const pref = prefix(depth);
  const canonical = site.siteUrl ? `<link rel="canonical" href="${esc(new URL(pagePath, site.siteUrl).href)}">` : '';
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#f7f8fb"><meta name="color-scheme" content="light">${noindex ? '<meta name="robots" content="noindex,follow">' : ''}<title>${esc(title)}</title><meta name="description" content="${esc(description)}"><meta property="og:type" content="website"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}">${canonical}<link rel="icon" href="${pref}assets/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="${pref}assets/site.css"><script src="${pref}assets/site.js" defer></script></head><body class="${esc(cls)}">${header(pref)}${body}${footer(pref)}</body></html>`;
}
function caseArtwork(project) {
  const className = ({ lime:'blue', slate:'gray', sand:'cream' })[project.color] || 'blue';
  return `<div class="project-art project-art--${className}" aria-hidden="true"><div class="project-art__glow"></div><div class="project-art__sheet"><span class="project-art__small">VOID / CONCEPT</span><strong>${esc(project.name)}</strong><span class="project-art__decor"></span></div></div>`;
}
function projectCard(project, base = 'cases/') {
  const isLive = project.status === 'published';
  const tag = isLive ? 'a' : 'article';
  const href = isLive ? ` href="${esc(base + project.slug + '/')}"` : '';
  return `<${tag} class="project-card${isLive ? ' project-card--live' : ''}"${href}>${caseArtwork(project)}<div class="project-card__info"><div><span class="project-card__type">${esc(project.type)} · Авторский концепт</span><h3>${esc(project.name)}</h3><p>${esc(project.description)}</p></div><span class="project-card__status">${esc(statusLabel[project.status])}${isLive ? ' ↗' : ''}</span></div></${tag}>`;
}
const mail = `mailto:${encodeURIComponent(site.email)}?subject=${encodeURIComponent('Хочу обсудить проект с VOID')}`;
function home() {
  return page({ title: 'VOID — Данил, дизайн и разработка сайтов', description: site.description, cls: 'page-home', body: `<main id="main">
  <section class="hero"><div class="hero__glow" aria-hidden="true"></div><div class="container hero__inner">
    <div class="hero__eyebrow"><span class="status-dot" aria-hidden="true"></span>Привет, я Данил — веб-дизайнер и разработчик</div>
    <h1>Делаю сайты, <span>которые просто работают.</span></h1>
    <p class="hero__description">Продумываю дизайн, собираю сайт и довожу его до запуска. Без лишней сложности — с вниманием к деталям и вашей задаче.</p>
    <div class="hero__actions"><a href="#projects" class="button button--primary">Посмотреть кейсы <span aria-hidden="true">↗</span></a><a href="#contact" class="button button--glass">Обсудить проект <span aria-hidden="true">↗</span></a></div>
    <div class="hero__note"><span>Дизайн</span><span class="hero__note-sep"></span><span>Разработка</span><span class="hero__note-sep"></span><span>Запуск</span></div>
  </div></section>
  <section class="section projects" id="projects"><div class="container"><div class="section-heading"><div><span class="eyebrow">Портфолио</span><h2>Избранные кейсы<span class="accent-dot">.</span></h2></div><p>Авторские проекты, над которыми сейчас работаю. Новые кейсы появятся здесь по мере завершения.</p></div><div class="projects__grid">${projects.slice(0,3).map(p => projectCard(p)).join('')}</div><p class="section-footnote">Все представленные здесь бренды вымышленные. Незавершённые проекты отмечены отдельно.</p></div></section>
  <section class="section services" id="services"><div class="container"><div class="section-heading"><div><span class="eyebrow">Чем могу помочь</span><h2>От идеи до готового сайта.</h2></div><p>Беру на себя дизайн и реализацию, чтобы в итоге получился не только красивый, но и удобный продукт.</p></div><div class="services__grid"><article class="service-card"><div class="service-card__icon" aria-hidden="true">✳</div><h3>Дизайн сайтов</h3><p>Понятная структура, визуальная концепция и адаптивные макеты.</p></article><article class="service-card"><div class="service-card__icon" aria-hidden="true">▤</div><h3>Разработка</h3><p>Создание сайтов на Tilda, HTML, CSS и JavaScript. А также доработка существующих.</p></article><article class="service-card"><div class="service-card__icon" aria-hidden="true">⌘</div><h3>Интерактивные решения</h3><p>Калькуляторы, нестандартные блоки, интерфейсы и интеграции под задачу.</p></article></div></div></section>
  <section class="section about" id="about"><div class="container"><div class="about__panel"><div class="about__portrait" aria-label="Типографический символ VOID"><span>V<span class="portrait-dot">.</span></span><div class="about__portrait-caption">ДАНИЛ / ВЕБ-ДИЗАЙНЕР</div></div><div class="about__text"><span class="eyebrow">Немного обо мне</span><h2>Привет, я Данил.</h2><p>Уже больше трёх лет работаю с веб-дизайном и разработкой сайтов. Люблю понятные интерфейсы, аккуратные детали и решения, которые можно проверить в деле.</p><p>Использую ИИ, чтобы быстрее справляться с рутиной, но за дизайн, технические решения и финальное качество отвечаю сам.</p><div class="about__tags"><span>Figma</span><span>Tilda</span><span>HTML / CSS</span><span>JavaScript</span></div></div></div></div></section>
  <section class="section contact" id="contact"><div class="container"><div class="contact__panel"><span class="eyebrow">Связаться</span><h2>Есть задача?<br><span>Давай обсудим.</span></h2><p>Коротко расскажи, что нужно сделать. Я уточню детали и предложу подходящий вариант.</p><a class="button button--primary contact__button" href="${mail}" data-contact-link data-contact-channel="email">Написать о проекте <span aria-hidden="true">↗</span></a><a class="contact__email" href="mailto:${esc(site.email)}" data-contact-link data-contact-channel="email">${esc(site.email)}</a><p class="contact__hint">Сейчас кнопка открывает письмо в почтовом приложении. Онлайн-форма будет добавлена после настройки защищённого приёма заявок.</p></div></div></section>
  </main>` });
}
function casesIndex() {
  return page({ title: 'Кейсы — VOID', description: 'Кейсы и авторские проекты VOID', depth: 1, pagePath: 'cases/', body: `<main id="main" class="subpage"><section class="container"><a class="back-link" href="../index.html">← На главную</a><div class="subpage__heading"><span class="eyebrow">Работы</span><h1>Кейсы и проекты<span class="accent-dot">.</span></h1><p>Вымышленные бренды, реальные задачи для демонстрации дизайна и разработки. Завершённые кейсы можно открыть.</p></div><div class="projects__grid">${projects.map(p => projectCard(p,'' )).join('')}</div></section></main>` });
}
function casePage(project) {
  return page({ title: `${project.name} — кейс VOID`, description: project.description, depth: 2, pagePath: `cases/${project.slug}/`, body: `<main id="main" class="case-page"><div class="container"><a class="back-link" href="../">← Все кейсы</a><div class="case-hero"><span class="eyebrow">Авторский концепт · Вымышленный бренд</span><h1>${esc(project.name)}</h1><p>${esc(project.description)}</p></div>${caseArtwork(project)}<div class="case-sections">${project.sections.map(s => `<section class="case-section"><span class="eyebrow">${esc(s.kicker || 'О проекте')}</span><h2>${esc(s.title)}</h2><p>${esc(s.text)}</p></section>`).join('')}</div><a href="../" class="back-link">← К другим кейсам</a></div></main>` });
}
function notFound() {
  return page({
    title: 'Страница не найдена — VOID',
    description: 'Запрошенная страница не найдена. Вернитесь на главную VOID.',
    pagePath: '404.html',
    cls: 'page-404',
    noindex: true,
    body: `<main id="main" class="legal"><div class="container legal__inner"><span class="eyebrow">Ошибка 404</span><h1>Тут пока ничего нет.</h1><p>Возможно, адрес изменился или такой страницы ещё не существует.</p><a class="button button--primary" href="./index.html">На главную ↗</a></div></main>`
  });
}
function privacy() {
  return page({ title: 'Контакты и данные — VOID', description: 'Как обрабатываются данные на сайте VOID', depth: 1, pagePath:'privacy/', body: `<main id="main" class="legal"><div class="container legal__inner"><a class="back-link" href="../index.html">← На главную</a><h1>Контакты и данные</h1><p>В этой версии сайта нет встроенной формы сбора персональных данных и не подключены сторонние системы аналитики.</p><p>При нажатии на кнопку связи откроется почтовое приложение. Вы решаете, отправлять сообщение или нет.</p><p>Адрес для обращения: <a href="mailto:${esc(site.email)}">${esc(site.email)}</a>. Перед подключением формы и аналитики этот раздел будет обновлён.</p></div></main>` });
}

await rm(output, { recursive:true, force:true });
await mkdir(output, { recursive:true });
await cp(path.join(root,'public'), output, { recursive:true });
async function save(file, body) { const full = path.join(output, file); await mkdir(path.dirname(full), { recursive:true }); await writeFile(full, body, 'utf8'); }
await save('index.html', home());
await save('cases/index.html', casesIndex());
await save('privacy/index.html', privacy());
await save('404.html', notFound());
for (const project of published) await save(`cases/${project.slug}/index.html`, casePage(project));
if (site.siteUrl) {
  const paths = ['', 'cases/', 'privacy/', ...published.map(p=>`cases/${p.slug}/`)];
  await save('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${paths.map(p=>`<url><loc>${esc(new URL(p, site.siteUrl).toString())}</loc></url>`).join('')}</urlset>`);
}
await save('robots.txt', site.siteUrl
  ? `User-agent: *\nAllow: /\nSitemap: ${new URL('sitemap.xml', site.siteUrl)}\n`
  : 'User-agent: *\nDisallow: /\n');
console.log(`VOID build complete: ${4+published.length} pages (including 404), ${published.length} published cases.`);
