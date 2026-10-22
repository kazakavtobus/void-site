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
  if (site.brand !== 'твой казак') throw Error('Unexpected public brand');
  if (site.telegram !== 'https://t.me/tvoykazak' || site.telegramChannel !== 'https://t.me/kazakblog') throw Error('Invalid Telegram URLs');
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
  <a href="${pref}index.html" class="logo" aria-label="твой казак — главная">твой казак</a>
  <nav class="desktop-nav" aria-label="Главное меню"><a href="${pref}index.html#projects">Кейсы</a><a href="${pref}index.html#services">Чем помогу</a><a href="${pref}index.html#about">Обо мне</a></nav>
  <a class="header__contact" href="${esc(site.telegram)}" target="_blank" rel="noopener noreferrer" data-contact-link data-contact-channel="telegram">Обсудить проект <span aria-hidden="true">↗</span></a>
  <button class="menu-toggle" type="button" aria-label="Открыть меню" aria-expanded="false" aria-controls="mobile-navigation"><span></span><span></span></button>
  </div><nav class="mobile-nav" id="mobile-navigation" aria-label="Мобильное меню" hidden><a href="${pref}index.html#projects">Кейсы</a><a href="${pref}index.html#services">Чем помогу</a><a href="${pref}index.html#about">Обо мне</a><a href="${esc(site.telegramChannel)}" target="_blank" rel="noopener noreferrer" data-contact-link data-contact-channel="telegram_channel">Мой Telegram-канал ↗</a><a href="${esc(site.telegram)}" target="_blank" rel="noopener noreferrer" data-contact-link data-contact-channel="telegram">Обсудить проект ↗</a></nav></header>`;
}
function footer(pref) {
  return `<footer class="footer"><div class="container footer__inner"><a class="logo" href="${pref}index.html" aria-label="твой казак — на главную">твой казак</a><p>Данил · Дизайн и цифровые решения · © ${new Date().getFullYear()}</p><nav aria-label="Внизу страницы"><a href="${esc(site.telegramChannel)}" target="_blank" rel="noopener noreferrer" data-contact-link data-contact-channel="telegram_channel">Мой канал ↗</a><a href="${pref}privacy/">О данных</a><a href="#top">Наверх ↑</a></nav></div></footer>`;
}
// Non-breaking spaces after short Russian prepositions/conjunctions in visible text nodes.
// Does not rewrite tag attributes, external links or code.
function noOrphanPrepositions(html) {
  const shortWords = /(^|[\s.,;:!?«“(—])((?:для|без|при|под|над|про|перед|меж|через|или|что|как|не|на|по|из|за|во|ко|со|до|от|об|но|то|же|ли|а|в|к|о|с|у|и)) +(?=[А-Яа-яЁё0-9])/giu;
  return html.split(/(<[^>]*>)/g).map((part,i) => {
    if (i % 2) return part;
    let text = part;
    for (let pass = 0; pass < 5; pass++) {
      const next = text.replace(shortWords, (_, lead, word) => lead + word + '\u00a0');
      if (next === text) break;
      text = next;
    }
    return text;
  }).join('');
}
function page({ title, description, body, depth = 0, cls = '', pagePath = '', noindex = false }) {
  const pref = prefix(depth);
  const canonical = site.siteUrl ? `<link rel="canonical" href="${esc(new URL(pagePath, site.siteUrl).href)}">` : '';
  return noOrphanPrepositions(`<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#f7f8fb"><meta name="color-scheme" content="light">${noindex ? '<meta name="robots" content="noindex,follow">' : ''}<title>${esc(title)}</title><meta name="description" content="${esc(description)}"><meta property="og:type" content="website"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}">${canonical}<link rel="icon" href="${pref}assets/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="${pref}assets/site.css"><script src="${pref}assets/site.js" defer></script></head><body class="${esc(cls)}">${header(pref)}${body}${footer(pref)}</body></html>`);
}
function caseArtwork(project) {
  const className = ({ lime:'blue', slate:'gray', sand:'cream' })[project.color] || 'blue';
  return `<div class="project-art project-art--${className}" aria-hidden="true"><div class="project-art__glow"></div><div class="project-art__sheet"><span class="project-art__small">АВТОРСКИЙ КОНЦЕПТ</span><strong>${esc(project.name)}</strong><span class="project-art__decor"></span></div></div>`;
}
function projectCard(project, base = 'cases/') {
  const isLive = project.status === 'published';
  const tag = isLive ? 'a' : 'article';
  const href = isLive ? ` href="${esc(base + project.slug + '/')}"` : '';
  return `<${tag} class="project-card${isLive ? ' project-card--live' : ''}"${href}>${caseArtwork(project)}<div class="project-card__info"><div><span class="project-card__type">${esc(project.type)} · Авторский концепт</span><h3>${esc(project.name)}</h3><p>${esc(project.description)}</p></div><span class="project-card__status">${esc(statusLabel[project.status])}${isLive ? ' ↗' : ''}</span></div></${tag}>`;
}
function home() {
  return page({ title: 'твой казак — дизайн и цифровые решения для бизнеса', description: site.description, cls: 'page-home', body: `<main id="main">
  <section class="hero"><div class="hero__glow" aria-hidden="true"></div><div class="container hero__inner">
    <div class="hero__eyebrow"><span class="status-dot" aria-hidden="true"></span>Привет, я Данил — дизайнер и разработчик цифровых решений</div>
    <h1>Не просто сайты. <span>Решения для бизнеса.</span></h1>
    <p class="hero__description">Помогаю компаниям понятно рассказывать о продукте, упрощать путь до заявки и решать рабочие задачи через дизайн и технологии. Важен результат, а не количество страниц.</p>
    <div class="hero__actions"><a href="#projects" class="button button--primary">Посмотреть кейсы <span aria-hidden="true">↗</span></a><a href="${esc(site.telegram)}" target="_blank" rel="noopener noreferrer" data-contact-link data-contact-channel="telegram" class="button button--glass">Обсудить проект <span aria-hidden="true">↗</span></a></div>
    <div class="hero__note"><span>4+ года в дизайне</span><span class="hero__note-sep"></span><span>Собственная ИИ-система</span><span class="hero__note-sep"></span><span>Личная ответственность</span></div>
  </div></section>
  <section class="section projects" id="projects"><div class="container"><div class="section-heading"><div><span class="eyebrow">Портфолио</span><h2>Кейсы<span class="accent-dot">.</span></h2></div><p>Показываю, как подхожу к задачам бизнеса. Авторские концепты появятся здесь по мере завершения.</p></div><div class="projects__grid">${projects.slice(0,3).map(p => projectCard(p)).join('')}</div><p class="section-footnote">Пока это концепты вымышленных брендов. Незавершённые проекты отмечены отдельно.</p></div></section>
  <section class="section services" id="services"><div class="container"><div class="section-heading"><div><span class="eyebrow">Чем могу помочь</span><h2>От задачи к решению.</h2></div><p>Сайт, интерфейс или интеграция — выбираю инструмент под конкретную задачу, а не наоборот.</p></div><div class="services__grid"><article class="service-card"><div class="service-card__icon" aria-hidden="true">✳</div><h3>Сайты для бизнеса</h3><p>Продуманная структура, дизайн и разработка, чтобы клиенту было проще понять ваш продукт и обратиться.</p></article><article class="service-card"><div class="service-card__icon" aria-hidden="true">▤</div><h3>Интерактив и интеграции</h3><p>Калькуляторы, каталоги и нестандартные интерфейсы, которые упрощают действия пользователей и команды.</p></article><article class="service-card"><div class="service-card__icon" aria-hidden="true">⌘</div><h3>Доработка сайтов</h3><p>Улучшаю существующие решения: интерфейс, мобильную версию, функциональность и удобство.</p></article></div></div></section>
  <section class="section ai-system" id="approach"><div class="container"><div class="ai-system__panel"><div class="ai-system__visual" aria-hidden="true"><span class="ai-system__spark">✳</span><span class="ai-system__visual-label">МОЯ СИСТЕМА / ИИ + ДИЗАЙН</span></div><div class="ai-system__content"><span class="eyebrow">Мой подход</span><h2>Своя ИИ-система.<br><span>Ответственность — моя.</span></h2><p>Я разрабатываю собственную ИИ-систему для дизайна и разработки. Она помогает ускорять рутинную работу, организовывать процесс и проверять решения.</p><p>Но концепцию, технические решения и финальное качество определяю и контролирую лично. ИИ — мой инструмент, а не замена ответственности перед клиентом.</p></div></div></div></section>
  <section class="section about" id="about"><div class="container"><div class="about__panel"><div class="about__portrait" aria-label="Типографический символ автора"><span>к<span class="portrait-dot">.</span></span><div class="about__portrait-caption">ДАНИЛ / ТВОЙ КАЗАК</div></div><div class="about__text"><span class="eyebrow">Кто я</span><h2>Привет, я Данил.</h2><p>Больше четырёх лет занимаюсь дизайном. Создаю сайты, интерфейсы и цифровые решения, уделяя внимание задачам бизнеса, деталям и работе готового продукта.</p><p>Работаю с Figma, Tilda, HTML, CSS и JavaScript. Новые инструменты внедряю тогда, когда они действительно помогают задаче.</p><a class="button button--glass about__channel" href="${esc(site.telegramChannel)}" target="_blank" rel="noopener noreferrer" data-contact-link data-contact-channel="telegram_channel">Мой Telegram-канал <span aria-hidden="true">↗</span></a><div class="about__tags"><span>4+ года в дизайне</span><span>Figma / Tilda</span><span>HTML / CSS / JS</span></div></div></div></div></section>
  <section class="section contact" id="contact"><div class="container"><div class="contact__panel"><span class="eyebrow">Связаться</span><h2>Есть задача?<br><span>Давай обсудим.</span></h2><p>Расскажи, что нужно решить. Разберём задачу и подберём подходящий формат работы.</p><a class="button button--primary contact__button" href="${esc(site.telegram)}" target="_blank" rel="noopener noreferrer" data-contact-link data-contact-channel="telegram">Написать о проекте <span aria-hidden="true">↗</span></a><a class="contact__email" href="${esc(site.telegramChannel)}" target="_blank" rel="noopener noreferrer" data-contact-link data-contact-channel="telegram_channel">Заглянуть в мой Telegram-канал ↗</a><p class="contact__hint">Для обсуждения проекта откроется личный чат в Telegram.</p></div></div></section>
  </main>` });
}
function casesIndex() {
  return page({ title: 'Кейсы — твой казак', description: 'Кейсы и авторские проекты — твой казак', depth: 1, pagePath: 'cases/', body: `<main id="main" class="subpage"><section class="container"><a class="back-link" href="../index.html">← На главную</a><div class="subpage__heading"><span class="eyebrow">Работы</span><h1>Кейсы и проекты<span class="accent-dot">.</span></h1><p>Вымышленные бренды, реальные задачи для демонстрации дизайна и разработки. Завершённые кейсы можно открыть.</p></div><div class="projects__grid">${projects.map(p => projectCard(p,'' )).join('')}</div></section></main>` });
}
function casePage(project) {
  return page({ title: `${project.name} — кейс, твой казак`, description: project.description, depth: 2, pagePath: `cases/${project.slug}/`, body: `<main id="main" class="case-page"><div class="container"><a class="back-link" href="../">← Все кейсы</a><div class="case-hero"><span class="eyebrow">Авторский концепт · Вымышленный бренд</span><h1>${esc(project.name)}</h1><p>${esc(project.description)}</p></div>${caseArtwork(project)}<div class="case-sections">${project.sections.map(s => `<section class="case-section"><span class="eyebrow">${esc(s.kicker || 'О проекте')}</span><h2>${esc(s.title)}</h2><p>${esc(s.text)}</p></section>`).join('')}</div><a href="../" class="back-link">← К другим кейсам</a></div></main>` });
}
function notFound() {
  return page({
    title: 'Страница не найдена — твой казак',
    description: 'Запрошенная страница не найдена. Вернитесь на главную.',
    pagePath: '404.html',
    cls: 'page-404',
    noindex: true,
    body: `<main id="main" class="legal"><div class="container legal__inner"><span class="eyebrow">Ошибка 404</span><h1>Тут пока ничего нет.</h1><p>Возможно, адрес изменился или такой страницы ещё не существует.</p><a class="button button--primary" href="./index.html">На главную ↗</a></div></main>`
  });
}
function privacy() {
  return page({ title: 'Контакты и данные — твой казак', description: 'Как устроена связь на сайте «твой казак»', depth: 1, pagePath:'privacy/', body: `<main id="main" class="legal"><div class="container legal__inner"><a class="back-link" href="../index.html">← На главную</a><h1>Контакты и данные</h1><p>На этой версии сайта нет встроенной формы сбора персональных данных и сторонней аналитики.</p><p>Кнопки связи ведут в личный чат Telegram <a href="${esc(site.telegram)}" target="_blank" rel="noopener noreferrer" data-contact-link data-contact-channel="telegram">@tvoykazak</a>. Переписка проходит в Telegram по его правилам.</p><p>Также можно читать <a href="${esc(site.telegramChannel)}" target="_blank" rel="noopener noreferrer" data-contact-link data-contact-channel="telegram_channel">мой Telegram-канал</a>. Перед подключением аналитики или форм эта страница будет обновлена.</p></div></main>` });
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
console.log(`Site build complete: ${4+published.length} pages (including 404), ${published.length} published cases.`);
