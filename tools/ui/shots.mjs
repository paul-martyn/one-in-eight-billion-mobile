#!/usr/bin/env node
// Прогон экранов: проходит весь флоу игры в браузере, снимает кадры и проверяет текст.
//
// npm run shots                         — ru, 390×844 и 1920×1080, свой dev-сервер Vite
// npm run shots -- --lang ru,de         — несколько языков (подписи кнопок берутся из src/i18n/<lang>)
// npm run shots -- --size 390x844       — только телефон
// npm run shots -- --url http://localhost:4192/   — уже запущенный сервер
// npm run shots -- --strict             — код 1, если есть текст мельче 12 px или разорванные слова
// npm run shots -- --seed 7             — другая жизнь (по умолчанию одна и та же: страна, семья, события)
//
// Результат — artifacts/ui-shots/<дата-время>/: PNG каждого экрана, report.md и report.json.
// Браузер — установленный Google Chrome (playwright-core, channel «chrome»); другой путь — CHROME_PATH.
// Проверки на каждом экране: минимальный кегль (текст мельче 12 px), разорванные посреди слова слова,
// обрезанные многоточием подписи, подозрение на низкий контраст (эвристика: сплошной фон предка,
// текст с контуром не проверяется), прокрутка документа. SVG-графика (надписи на печати) не считается текстом.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const arg = (name, fallback) => { const i = process.argv.indexOf(`--${name}`); return i >= 0 ? process.argv[i + 1] : fallback; };
const langs = arg('lang', 'ru').split(',');
const sizes = arg('size', '390x844,1920x1080').split(',').map(s => s.split('x').map(Number));
const strict = process.argv.includes('--strict');
const seed = Number(arg('seed', '20261104'));
const stamp = new Date().toISOString().slice(0, 16).replace('T', '_').replace(':', '-');
const outDir = path.resolve(root, arg('out', path.join('artifacts', 'ui-shots', stamp)));

function labels(lang) {
  const dir = path.join(root, 'src', 'i18n', lang);
  if (!fs.existsSync(dir)) throw new Error(`нет перевода src/i18n/${lang}`);
  return Object.assign({}, ...fs.readdirSync(dir).filter(f => f.endsWith('.json')).map(f => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'))));
}

async function startServer() {
  const given = arg('url');
  if (given) return { url: given, close: async () => {} };
  const { createServer } = await import('vite');
  const server = await createServer({ root, logLevel: 'error', server: { host: '127.0.0.1', port: 4196, strictPort: false } });
  await server.listen();
  return { url: server.resolvedUrls.local[0], close: () => server.close() };
}

async function launch() {
  try { return await chromium.launch({ channel: 'chrome' }); }
  catch (first) {
    if (process.env.CHROME_PATH) return chromium.launch({ executablePath: process.env.CHROME_PATH });
    throw new Error(`не удалось запустить Google Chrome (${first.message.split('\n')[0]}). Установите Chrome или укажите CHROME_PATH.`);
  }
}

// Выполняется в странице: проверки текста на текущем экране.
function inspect() {
  // Видимый текст: не скрыт, не для скринридеров (.sr-only, 1 × 1 px), не графика SVG.
  const visible = el => {
    const r = el.getBoundingClientRect(); const s = getComputedStyle(el);
    return r.width > 1 && r.height > 1 && s.visibility !== 'hidden' && +s.opacity > 0.05 && !el.closest('[aria-hidden="true"],[inert],svg,.sr-only');
  };
  const rgb = c => (c.match(/[\d.]+/g) || []).map(Number);
  const lum = ([r, g, b]) => [r, g, b].map(v => v / 255).map(v => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)).reduce((a, v, i) => a + v * [0.2126, 0.7152, 0.0722][i], 0);
  const opaque = e => { const c = rgb(getComputedStyle(e).backgroundColor); return c.length >= 3 && (c[3] ?? 1) >= 0.9 ? c : null; };
  // Фон под текстом: первый сплошной фон предка; если между текстом и этим предком лежит
  // чужой сплошной слой (оверлей, плашка-соседка) — он. Текст, закрытый другим элементом,
  // не проверяется (undefined). Картинка или градиент — фон неизвестен (null).
  const background = el => {
    let own = null;
    for (let e = el; e; e = e.parentElement) {
      if (getComputedStyle(e).backgroundImage !== 'none') return null;
      if (opaque(e)) { own = e; break; }
    }
    const r = el.getBoundingClientRect(); const x = r.left + r.width / 2, y = r.top + Math.min(r.height / 2, 10);
    if (x >= 0 && y >= 0 && x < innerWidth && y < innerHeight) {
      const stack = document.elementsFromPoint(x, y);
      if (stack[0] && !el.contains(stack[0]) && !stack[0].contains(el)) return undefined;
      for (const e of stack) {
        if (e === own) break;
        if (!e.contains(el) && opaque(e)) return opaque(e);
      }
    }
    return own ? opaque(own) : [255, 255, 255];
  };
  const out = { minFont: Infinity, small: [], lowContrast: [], broken: [], truncated: [], docScroll: false, texts: 0 };
  const seen = new Set();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const node = walker.currentNode; const el = node.parentElement; const text = node.textContent.trim();
    if (!text || !el || !visible(el)) continue;
    const r = el.getBoundingClientRect();
    if (r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) continue;
    for (const m of node.textContent.matchAll(/[\p{L}\p{N}]{4,}/gu)) {
      const range = document.createRange(); range.setStart(node, m.index); range.setEnd(node, m.index + m[0].length);
      const rects = [...range.getClientRects()].filter(x => x.width > 0);
      if (rects.length > 1 && Math.abs(rects[0].top - rects[rects.length - 1].top) > 2) out.broken.push(m[0]);
    }
    if (seen.has(el)) continue; seen.add(el); out.texts++;
    const s = getComputedStyle(el); const fs = parseFloat(s.fontSize);
    out.minFont = Math.min(out.minFont, fs);
    if (fs < 12) out.small.push(`${text.slice(0, 30)} (${fs}px)`);
    if (s.textShadow === 'none') {
      const bg = background(el); const fg = rgb(s.color);
      if (bg && fg.length >= 3) {
        const [a, b] = [lum(fg), lum(bg)]; const cr = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
        const large = fs >= 24 || (fs >= 18.66 && +s.fontWeight >= 700);
        if (cr < (large ? 3 : 4.5)) out.lowContrast.push(`${text.slice(0, 30)} (${fs}px, ${cr.toFixed(2)})`);
      }
    }
  }
  for (const el of document.querySelectorAll('#root *')) {
    if (!visible(el) || getComputedStyle(el).textOverflow !== 'ellipsis') continue;
    if (el.scrollWidth > el.clientWidth + 1) out.truncated.push(el.textContent.trim().replace(/\s+/g, ' ').slice(0, 30));
  }
  out.docScroll = document.scrollingElement.scrollHeight > innerHeight + 2;
  out.broken = [...new Set(out.broken)]; out.truncated = [...new Set(out.truncated)];
  if (out.minFont === Infinity) out.minFont = null;
  return out;
}

async function runFlow(browser, url, lang, [width, height]) {
  const L = labels(lang);
  const mobile = width < 600;
  const tag = `${lang}-${width}x${height}`;
  const context = await browser.newContext({ viewport: { width, height }, screen: { width, height }, deviceScaleFactor: mobile ? 2 : 1, isMobile: mobile, hasTouch: mobile, locale: lang });
  // Одна и та же жизнь в каждом прогоне: сохранённое состояние игрового генератора.
  await context.addInitScript(s => { try { if (!localStorage.getItem('1in8b-mobile/v1:mobile.entropy')) localStorage.setItem('1in8b-mobile/v1:mobile.entropy', String(s)); } catch {} }, seed);
  const page = await context.newPage();
  const shots = [];
  let n = 0;
  const screen = () => page.evaluate(() => document.querySelector('.flow')?.getAttribute('data-screen'));
  const waitScreen = id => page.waitForFunction(x => document.querySelector('.flow')?.getAttribute('data-screen') === x, id, { timeout: 30000 });
  const button = (key, exact = false) => page.getByRole('button', { name: L[key] ?? key, exact }).first();
  const shot = async name => {
    const file = `${tag}-${String(++n).padStart(2, '0')}-${name}.png`;
    await page.screenshot({ path: path.join(outDir, file) });
    shots.push({ name, file, screen: await screen(), ...(await page.evaluate(inspect)) });
  };
  const scrollToEnd = () => page.evaluate(() => {
    const s = [...document.querySelectorAll('#root *')].filter(e => /(auto|scroll)/.test(getComputedStyle(e).overflowY) && e.scrollHeight > e.clientHeight + 4).sort((a, b) => b.clientHeight - a.clientHeight)[0];
    if (s) s.scrollTop = s.scrollHeight;
    return !!s;
  });
  let failed = null;
  try {
    await page.goto(url);
    await waitScreen('language'); await page.waitForTimeout(800); await shot('language');
    await button('lang.go').click();
    await waitScreen('start'); await page.waitForTimeout(1200); await shot('start');
    await button('start.cta').click();
    await waitScreen('roll'); await page.waitForTimeout(1600); await shot('roll-spin');
    // Бросок: Spin!, планета садится на страну рождения, поднимается сводка и Meet me!.
    await button('roll.spinLabel').click();
    const who = button('roll.meet');
    await page.waitForFunction(() => document.querySelector('.rl')?.getAttribute('data-phase') === 'revealed', null, { timeout: 30000 });
    for (let i = 0; i < 60 && !(await who.isEnabled()); i++) await page.waitForTimeout(250);
    await page.waitForTimeout(2200); await shot('roll');
    await who.click();
    await waitScreen('certificate'); await page.waitForTimeout(1500);
    const skip = button('cert.skip');
    if (await skip.isVisible().catch(() => false)) await skip.click();
    await page.waitForTimeout(1200); await shot('certificate');
    await button('cert.odds').click();
    await waitScreen('birthOdds'); await page.waitForTimeout(1500); await shot('odds');
    if (await scrollToEnd()) { await page.waitForTimeout(500); await shot('odds-end'); }
    await page.keyboard.press('Escape'); // «Назад» → свидетельство
    await waitScreen('certificate'); await page.waitForTimeout(800);
    await button('cert.start').click();
    await waitScreen('life'); await page.waitForTimeout(2500); await shot('life');
    await button('life.ff').click();
    const dialog = page.getByRole('dialog');
    await dialog.first().waitFor({ timeout: 30000 }); await page.waitForTimeout(1000); await shot('decision');
    await dialog.first().locator('button.ld-opt, button:not(.ld-close)').first().click();
    await page.waitForTimeout(1500); await shot('decision-answer');
    await button('decision.continue').click(); await page.waitForTimeout(2000); await shot('life-after');
    for (const tab of ['people', 'activities', 'money', 'odds']) {
      await button(`tab.${tab}`, true).click(); await page.waitForTimeout(1300); await shot(`tab-${tab}`);
    }
    await button('tab.life', true).click(); await page.waitForTimeout(1000);
    await button('life.pause', true).click(); await dialog.first().waitFor(); await page.waitForTimeout(800); await shot('pause');
    await button('life.pauseSkip').click();
    const lookBack = button('death.lookBack');
    await lookBack.waitFor({ timeout: 90000 }); await page.waitForTimeout(3000); await shot('death');
    await lookBack.click();
    await waitScreen('ended'); await page.waitForTimeout(2500); await shot('ended');
    if (await scrollToEnd()) { await page.waitForTimeout(500); await shot('ended-end'); }
    await button('ended.toHub').click();
    await waitScreen('hub'); await page.waitForTimeout(2500);
    if (await dialog.count()) {
      await shot('hub-reward');
      await dialog.first().locator('button').last().click(); await page.waitForTimeout(3000);
    }
    await shot('hub');
    await button('hub.settingsOpen').click();
    await waitScreen('settings'); await page.waitForTimeout(1200); await shot('settings');
    await page.keyboard.press('Escape'); // «Назад» → хаб
    await waitScreen('hub');
  } catch (error) {
    failed = { at: await screen().catch(() => null), message: error.message.split('\n')[0] };
    await page.screenshot({ path: path.join(outDir, `${tag}-error.png`) }).catch(() => {});
  }
  await context.close();
  return { tag, lang, width, height, shots, failed };
}

function report(runs) {
  const lines = ['# Прогон экранов', '', `Seed ${seed}. Кадры и report.json — в этой папке.`, ''];
  for (const run of runs) {
    lines.push(`## ${run.tag}`, '');
    if (run.failed) lines.push(`**Флоу прервался** на экране «${run.failed.at}»: ${run.failed.message} (кадр ${run.tag}-error.png)`, '');
    lines.push('| Кадр | Мин. кегль | Мельче 12 px | Разорванные слова | Обрезано многоточием | Контраст (проверить) |', '|---|---|---|---|---|---|');
    for (const s of run.shots) lines.push(`| ${s.file} | ${s.minFont ?? '—'} | ${s.small.join(', ') || '—'} | ${s.broken.join(', ') || '—'} | ${s.truncated.join(', ') || '—'} | ${s.lowContrast.join(', ') || '—'} |`);
    lines.push('');
  }
  return lines.join('\n');
}

fs.mkdirSync(outDir, { recursive: true });
const server = await startServer();
const browser = await launch();
const runs = [];
try {
  for (const lang of langs) for (const size of sizes) {
    const run = await runFlow(browser, server.url, lang, size);
    runs.push(run);
    const t = k => run.shots.reduce((a, s) => a + s[k].length, 0);
    console.log(`${run.tag}: ${run.shots.length} кадров${run.failed ? `, ПРЕРВАН на «${run.failed.at}»: ${run.failed.message}` : ''}; мельче 12 px — ${t('small')}, разорванных слов — ${t('broken')}, обрезано — ${t('truncated')}, контраст проверить — ${t('lowContrast')}`);
  }
} finally {
  await browser.close();
  await server.close();
}
fs.writeFileSync(path.join(outDir, 'report.json'), JSON.stringify({ seed, runs }, null, 2));
fs.writeFileSync(path.join(outDir, 'report.md'), report(runs));
console.log(`отчёт: ${path.relative(root, path.join(outDir, 'report.md'))}`);
const bad = runs.some(r => r.failed || r.shots.some(s => s.small.length || s.broken.length));
if (strict && bad) process.exit(1);
