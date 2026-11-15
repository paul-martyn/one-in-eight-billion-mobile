// Peepulation — генератор персонажей (рабочее название; стиль «Nemo Peeps»). Общий модуль: им рисуют
// прототип third-party/nemo-character-creation/composer.html (каталог, возрасты) и игра «1 in 8 B»
// (one-in-eight-billion-independent: копия в src/vendor/peepulation, обновляется командой npm run peeps:sync).
// Перенесён из composer.html 2026-11-15 без изменений логики; правьте генератор здесь, а не в composer.html.
//
// Решения и числа — spec/DECISIONS.md и spec/rules.json. Детали (маски головы, волос, глаз, ртов) — parts/.
//
// Что берёт игра (меняя эти имена или их смысл, обновите адаптер игры src/ui/peeps):
//   preload({ partsRoot, rules, cache }) — загрузка деталей и правил; RULES — правила после загрузки, V1 — детали;
//   peepsCharacter(sex, origin, life), relative(base, opts) — новый человек и родственник;
//   originFromGame({ group, iso, ethnic }) — происхождение из данных игры (rules.json → profileFromGame);
//   atAge(c, band), AGES, heightK(c, band), GROUND — возраст, рост, линия земли;
//   useScale(s), peepsContent(c), babyContent(c), FRAMES — отрисовка тела и портрета (SVG-разметка);
//   ppCss(), ANIM — айдл-анимация (классы .pp-*); withRandom(rng, fn) — свой источник случайности.
// Состояние человека: c.ageYears (годы), c.state = { h, hl } (счастье, здоровье), c.dead + c.deathH.
// Маски кладутся в скрытый <defs id="filters"> (на странице прототипа он есть, в игре создаётся сам).
// Все координаты — в системе холста головы 145×143 (исходно из пака nemo, детали перерисованы, nemo-peeps/parts).
const LAYOUT = {
  canvas: { x: -10, y: 0, w: 165, h: 170 },
  head: { x: 0, y: 0, w: 145, h: 143 },
  beard: { x: 0, y: 0, w: 145, h: 148 },
  body: { x: 55, y: 121, w: 35, h: 25 },
  dress: { x: 52, y: 121, w: 41, h: 25 },
  legL: { x: 57.5, y: 136, w: 13, h: 28 },
  legR: { x: 74.5, y: 136, w: 13, h: 28 },
  armL: { x: 45, y: 115, w: 12, h: 28, rot: 12 },
  armR: { x: 88, y: 115, w: 12, h: 28, rot: -12 },
};
const GROUND = 164; // низ ботинок

// Передние причёски: первые пять — перерисовки пака, остальные новые. Порядок — как в rules.json → hairFront.
const HAIR_FRONT = ['chupchik', 'curly', 'elegant', 'regular', 'straight'];
const HAIR_FRONT_NEW = ['receding', 'buzz', 'side_part', 'top_bun', 'afro', 'bob', 'side_swept', 'spiky', 'wavy_part',
  'bowl', 'pixie', 'slicked_back', 'comb_over', 'braid_crown'];
// Некоторые передние причёски требуют конкретную заднюю (rules.json → hairFront.variants.*.pairsWithBack).
// Коса короной — без задних волос: иначе контур задних заполняет ямки между волнами косы тёмными клиньями.
// side_swept — без задних волос (решение 2026-11-14).
const FRONT_BACK = { afro: 'curly', bob: 'short', top_bun: null, buzz: null, receding: null, comb_over: null, braid_crown: null, side_swept: null };
// Возраст причёсок, лет (rules.json → hairFront.variants.*.minAge/maxAge); остальные — в любом возрасте.
const FRONT_AGES = { spiky: [2, 17], side_part: [12, 200], top_bun: [6, 200], side_swept: [12, 200], bowl: [0, 14], pixie: [12, 200], slicked_back: [16, 200], braid_crown: [4, 200] };
// Возраст стадии жизни для выбора причёски.
const AGE_YEARS = { child: 8, teen: 15, adult: 30, elder: 70 };
const BEARDS = ['short', 'middle', 'long'];
const FACES = ['smile', 'cute', 'laughs', 'willing', 'love', 'melancholic', 'sleepy', 'sad', 'gloating', 'tempered', 'angry', 'fright', 'crying'];
// Оправы (решения 2026-11-15): чёрная — сплошная (нарезанная N1); все остальные — с тёмной обводкой снаружи:
// белая и цветные — детали glasses_*_white с цветом LIGHT, металл — тоньше, glasses_*_metal.
const FRAME_HEX = { white: '#FFFFFF', brown: '#8A5A36', red: '#D2483C', blue: '#3F78C8', green: '#3E9A62', silver: '#C9CDD2', gold: '#E2A62A', gunmetal: '#6E757D' };
const FRAME_METAL = new Set(['silver', 'gold', 'gunmetal']);
// Доли групп — rules.json → glasses.frameColoursPercent; внутри металла и цветных — поровну.
const FRAME_GROUPS = { metal: ['silver', 'gold', 'gunmetal'], colour: ['red', 'blue', 'green'] };
const GLASSES = ['round', 'square'].flatMap((sh) => ['black', ...Object.keys(FRAME_HEX)].map((col) => `${sh}.${col}`));
// Цвет оправы не должен совпадать с кожей: разница цвета ΔE (CIELAB) не меньше 30, иначе выбирается другой цвет.
// Так коричневая не выпадает на средней и тёмной коже, серебро — на самой светлой. Чёрная и белая — без проверки
// (у белой своя тёмная обводка, решение о ней принято раньше).
const FRAME_DE_MIN = 30;
function toLab(hex) {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => { v /= 255; return v > 0.04045 ? ((v + 0.055) / 1.055) ** 2.4 : v / 12.92; });
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const X = f((r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047), Y = f(r * 0.2126 + g * 0.7152 + b * 0.0722), Z = f((r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883);
  return [116 * Y - 16, 500 * (X - Y), 200 * (Y - Z)];
}
const deltaE = (a, b) => { const A = toLab(a), B = toLab(b); return Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]); };
const frameFits = (col, skinHex) => col === 'black' || col === 'white' || deltaE(FRAME_HEX[col], skinHex) >= FRAME_DE_MIN;
// Оправа на всю жизнь: форма поровну, группа цвета по долям, конкретный цвет — среди подходящих к коже.
function pickGlasses(skinIdx) {
  const skin = PEEPS.skin[skinIdx ?? 2][0];
  const w = RULES?.glasses?.frameColoursPercent || { black: 45, brown: 20, metal: 15, colour: 15, white: 5 };
  const groups = Object.fromEntries(Object.entries(w).filter(([g]) => !g.startsWith('$')).map(([g, v]) => [g, (FRAME_GROUPS[g] || [g]).some((c) => frameFits(c, skin)) ? v : 0]));
  const group = wpick(groups);
  const col = pick((FRAME_GROUPS[group] || [group]).filter((c) => frameFits(c, skin)));
  return `${pick(['round', 'square'])}.${col}`;
}

const pick = (a) => a[Math.floor(Math.random() * a.length)];
const chance = (p) => Math.random() < p;

const rotAround = (b) => `rotate(${b.rot} ${b.x + b.w / 2} ${b.y + 2})`;

// ---------- Палитра Peepulation ----------
const INK = '#1D1A1A';
const DARK = { hair: '#3A3033', cloth: '#363B4A', shoes: '#463A36' };
const GREY_HAIR = ['#C9C5C0', '#E6E2DC'];
const PEEPS = {
  skin: [['#F6D7BF', '#E9BFA0'], ['#EDBE98', '#DCA47D'], ['#D69C74', '#C2845B'], ['#B97650', '#A1603C'], ['#8F5534', '#784427'], ['#653A22', '#52301B']],
  // Ни одна заливка не совпадает с цветом контура: «чёрное» — тёмное, но отличимое от INK.
  hairNatural: [DARK.hair, DARK.hair, DARK.hair, '#3B2A22', '#6B4630', '#E8C77E', '#C8642C'],
  hairFun: ['#8FD3D2', '#F2A6C8', '#B9A2E8'],
  tops: ['#8FD3D2', '#7EDC82', '#F07BBE', '#FBD27A', '#A6CDEB', DARK.cloth, '#FFFFFF', '#F28C6B', '#B9A2E8'],
  bottoms: [DARK.cloth, DARK.cloth, '#34405E', '#F07BBE', '#FBD27A', '#8FD3D2', '#5C6B87', '#C9A27A'],
  shoes: ['#FFFFFF', '#FFFFFF', DARK.shoes, '#7A5236', '#F07BBE'],
};

// ---------- Детали Nemo Peeps v1 (nemo-peeps/parts) ----------
// Растровые — нарисованы в ChatGPT и нарезаны nemo-peeps/tools/slice-sheet.html: слои-маски по ключевым цветам
// (белый + альфа, сглаживание в альфе), цвет слоя задаётся здесь. Векторные — нарисованы кодом (tools/vector-parts.mjs).
// Контур нарисован в самих деталях. Старые рисунки пака nemo больше не используются (решение 2026-11-15).
let V1_ROOT = new URL(/* @vite-ignore */ './parts/', import.meta.url).href; // папка деталей; игра задаёт свою через preload({ partsRoot })
let V1_CACHE = 'no-store'; // прототип всегда берёт свежие детали; игра — из кэша браузера: preload({ cache: 'default' })
const V1_KEYS = { SKIN: '#E8B48A', HAIR: '#3C8D3F', HAIRLINE: '#1E4720', LIGHT: '#F4F1EA', MOUTH: '#5A2424', BLUSH: '#F08C8C', HEART: '#FF4124', CLOTH1: '#4A86E8', CLOTH2: '#E8564A', CLOTH3: '#7A5236', INK: '#1D1A1A' };
let V1 = null; // манифест; null — детали недоступны (страница открыта не через сервер nemo-tools)
const v1On = (id) => V1 && V1.parts[id];
async function loadV1() {
  try {
    const r = await fetch(V1_ROOT + 'manifest.json', { cache: V1_CACHE });
    if (!r.ok) throw new Error(r.status);
    const m = await r.json();
    // Маски — data URL: так они работают и в экспортированных SVG (make-sheets рисует SVG через <img>).
    await Promise.all(Object.values(m.parts).map(async (p) => {
      // Векторные детали (нарисованы кодом, tools/vector-parts.mjs): SVG в ключевых цветах.
      if (p.format === 'svg') { p.svg = await (await fetch(V1_ROOT + p.file, { cache: V1_CACHE })).text(); return; }
      p.data = {};
      for (const [k, f] of Object.entries(p.files)) {
        const b = await (await fetch(V1_ROOT + f, { cache: V1_CACHE })).blob();
        p.data[k] = await new Promise((ok) => { const fr = new FileReader(); fr.onload = () => ok(fr.result); fr.readAsDataURL(b); });
      }
    }));
    V1 = m;
  } catch {
    document.getElementById('main')?.insertAdjacentHTML('beforebegin', '<p class="notice">Нет доступа к деталям nemo-peeps/parts. Откройте страницу через сервер nemo-tools: /third-party/nemo-character-creation/composer.html</p>');
  }
}
function v1Mask(id, key) {
  const mid = `v1_${id}_${key}`;
  if (!document.getElementById(mid)) {
    const p = V1.parts[id], b = p.box;
    defsHost().insertAdjacentHTML('beforeend',
      `<mask id="${mid}" maskUnits="userSpaceOnUse" x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}"><image href="${p.data[key]}" x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" preserveAspectRatio="none"/></mask>`);
  }
  return mid;
}
// Маска «кожа головы без контура» (2026-11-15): полупрозрачная щетина и пушок по маске кожи ложились и на внутреннюю
// половину контура и подкрашивали его. Здесь из кожи вычтен слой INK головы.
function headSkinMask() {
  const mid = 'v1_head_skin_only';
  if (!document.getElementById(mid)) {
    const p = V1.parts.head, b = p.box, ink = v1Mask('head', 'INK');
    defsHost().insertAdjacentHTML('beforeend',
      `<mask id="${mid}" maskUnits="userSpaceOnUse" x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}"><image href="${p.data.SKIN}" x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" preserveAspectRatio="none"/><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" fill="black" mask="url(#${ink})"/></mask>`);
  }
  return mid;
}
// colours: { КЛЮЧ: цвет }; неуказанные ключи — цвета палитры ключей.
function v1Part(id, colours = {}) {
  const p = V1.parts[id], b = p.box;
  if (p.format === 'svg') {
    let inner = p.svg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
    for (const k of p.keys) inner = inner.split(V1_KEYS[k]).join(colours[k] || V1_KEYS[k]);
    return `<svg x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" viewBox="0 0 ${b.w} ${b.h}" fill="none" overflow="visible">${inner}</svg>`;
  }
  return p.order.map((k) => `<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" fill="${colours[k] || V1_KEYS[k]}" mask="url(#${v1Mask(id, k)})"/>`).join('');
}
// Контур v1 нарисован в самой детали и тоньшает вместе с персонажем (у младенца вдвое).
// Решено держать линию одной толщины при любом размере, поэтому у уменьшенных добираем недостающее
// снаружи: sk — итоговый масштаб детали (персонаж × голова).
const V1_LINE_FIX = 1.04; // толщина добора на единицу недостающего масштаба: контур v1 2,5 ед. / линия добора 2,4 ед.
// Добор — запечённая маска (решение 2026-11-15, вместо SVG-фильтра): силуэт детали размывается и режется тем же
// порогом, что был у фильтра (наклон 14, сдвиг −0,7), но заранее и в родном разрешении деталей, а не в пикселях
// экрана. Фильтр на экране съедал сглаживание: в сцене игры (0,5 px на единицу) контур у детей и подростков выходил
// ступеньками. Маска считается при первом рисовании детали с таким добором (доли секунды) и до готовности пуста —
// линия на миг тоньше; кто снимает картинку или экспортирует разметку, ждёт thickReady().
const THICK_RES = 738 / 151; // px на единицу — как у растровых деталей (маска 738 px на рамку 151 ед.)
const THICK_PAD = 6; // запас рамки под утолщение, ед.
const THICK_STEP = 0.05; // шаг размытия, ед.: персонажи близкого размера делят одну маску
const THICK = new Map(); // «деталь|размытие» → { id, x, y, w, h, done }
const SILHOUETTES = new Map(); // деталь → Promise<{ a, W, H }>: непрозрачность всех слоёв детали в рамке с запасом
function silhouette(id) {
  if (!SILHOUETTES.has(id)) SILHOUETTES.set(id, (async () => {
    const p = V1.parts[id], b = p.box;
    const W = Math.round((b.w + 2 * THICK_PAD) * THICK_RES), H = Math.round((b.h + 2 * THICK_PAD) * THICK_RES);
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const g = cv.getContext('2d');
    const at = [THICK_PAD * THICK_RES, THICK_PAD * THICK_RES, b.w * THICK_RES, b.h * THICK_RES];
    const srcs = p.format === 'svg' ? [URL.createObjectURL(new Blob([p.svg], { type: 'image/svg+xml' }))] : Object.values(p.data);
    for (const src of srcs) { const im = new Image(); im.src = src; await im.decode(); g.drawImage(im, ...at); }
    const d = g.getImageData(0, 0, W, H).data, a = new Float32Array(W * H);
    for (let i = 0; i < a.length; i++) a[i] = d[i * 4 + 3] / 255;
    return { a, W, H };
  })());
  return SILHOUETTES.get(id);
}
// Гауссово размытие (как feGaussianBlur), s — в пикселях; два прохода, по строкам и по столбцам.
function gaussBlur(a, W, H, s) {
  const r = Math.ceil(3 * s), k = new Float32Array(2 * r + 1);
  let sum = 0;
  for (let i = -r; i <= r; i++) sum += (k[i + r] = Math.exp(-(i * i) / (2 * s * s)));
  for (let i = 0; i < k.length; i++) k[i] /= sum;
  const t = new Float32Array(W * H), o = new Float32Array(W * H);
  for (let y = 0; y < H; y++) {
    const row = y * W;
    for (let x = 0; x < W; x++) {
      let v = 0;
      for (let i = Math.max(-r, -x), i1 = Math.min(r, W - 1 - x); i <= i1; i++) v += a[row + x + i] * k[i + r];
      t[row + x] = v;
    }
  }
  for (let y = 0; y < H; y++) {
    const i0 = Math.max(-r, -y), i1 = Math.min(r, H - 1 - y);
    for (let x = 0; x < W; x++) {
      let v = 0;
      for (let i = i0; i <= i1; i++) v += t[(y + i) * W + x] * k[i + r];
      o[y * W + x] = v;
    }
  }
  return o;
}
async function bakeThick(e, id, sigma) {
  const { a, W, H } = await silhouette(id);
  const bl = gaussBlur(a, W, H, sigma * THICK_RES);
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const g = cv.getContext('2d'), img = g.createImageData(W, H), d = img.data;
  for (let i = 0; i < bl.length; i++) {
    d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = 255;
    d[i * 4 + 3] = Math.round(Math.min(1, Math.max(0, 14 * bl[i] - 0.7)) * 255);
  }
  g.putImageData(img, 0, 0);
  document.getElementById(e.id)?.querySelector('image').setAttribute('href', cv.toDataURL('image/png'));
}
// Маска добора для детали id с размытием sigma (ед. детали); создаётся один раз, считается в фоне.
function thickMask(id, sigma) {
  const s = Math.round(sigma / THICK_STEP) * THICK_STEP, key = `${id}|${s.toFixed(2)}`;
  if (!THICK.has(key)) {
    const b = V1.parts[id].box;
    const e = { id: `v1t_${id}_${Math.round(s * 100)}`, x: b.x - THICK_PAD, y: b.y - THICK_PAD, w: b.w + 2 * THICK_PAD, h: b.h + 2 * THICK_PAD };
    if (!document.getElementById(e.id)) {
      defsHost().insertAdjacentHTML('beforeend',
        `<mask id="${e.id}" maskUnits="userSpaceOnUse" x="${e.x}" y="${e.y}" width="${e.w}" height="${e.h}"><image x="${e.x}" y="${e.y}" width="${e.w}" height="${e.h}" preserveAspectRatio="none"/></mask>`);
    }
    e.done = bakeThick(e, id, s);
    THICK.set(key, e);
  }
  return THICK.get(key);
}
// Все начатые маски добора готовы (для снимков и экспорта разметки).
const thickReady = () => Promise.all([...THICK.values()].map((e) => e.done));
// Деталь id с добором контура цвета line; rel — доля толщины контура детали относительно обычной (у бород 0,7).
// Размытие — прежнее фильтра (1,7 × толщина / масштаб персонажа), пересчитанное в единицы детали (÷ масштаб головы).
function v1Thick(id, colours, line, sk, rel = 1) {
  const part = v1Part(id, colours);
  if (sk >= 0.9) return part;
  const e = thickMask(id, (1.7 * V1_LINE_FIX * rel * (1 - sk)) / sk);
  return `<rect x="${e.x}" y="${e.y}" width="${e.w}" height="${e.h}" fill="${line}" mask="url(#${e.id})"/>${part}`;
}
// Контур волос — тёмный оттенок самих волос той же толщины, что у головы (решение 2026-11-05; тоньше — контур головы
// выглядывает над причёской).
const v1HairColours = (c) => ({ HAIR: c.hair, HAIRLINE: shadeOf(c.hair) });

const LINE = `stroke="${INK}" stroke-linecap="round" stroke-linejoin="round" fill="none"`;


// ---------- Лица-точки: единственный стиль лица. Лицо собирается из глаз и рта ----------
// Имена совпадают с готовыми лицами пака nemo, состав взят из них.
const DOT_FACES = {
  smile: ['ordinary', 'smile'], cute: ['cute', 'smile'], laughs: ['closed', 'grin'], willing: ['love', 'saliva'],
  love: ['love', 'smile'], melancholic: ['Default', 'sad'], sleepy: ['sad', 'saliva'], sad: ['sad', 'sad'],
  gloating: ['evil', 'smile'], tempered: ['sad', 'smile'], angry: ['evil', 'teeth'], fright: ['fright', 'open_mouth'], crying: ['crying', 'sad'],
  // Лица состояний (CATALOG.md, раздел 12): усталость и болезнь, два варианта смерти.
  tired: ['Default', 'smile'], ill: ['Default', 'sad'], dead: ['dead', 'sad'], peace: ['sad', 'smile'],
  // Подмигивание — только редкое событие (DECISIONS.md), в базовых лицах его нет.
  wink: ['wink', 'smile'],
  // Новые рты (N7): ровный рот и ухмылка — базовые лица; смех и «о» — эмоции и события.
  neutral: ['ordinary', 'neutral'], smirk: ['ordinary', 'smirk'], laugh: ['closed', 'laugh'], oh: ['ordinary', 'small_o'],
};
const DOT_EYES = ['Default', 'closed', 'crying', 'cute', 'dead', 'evil', 'fright', 'love', 'ordinary', 'sad'];
const SLEEP_EYES = 'sad';
const dotFace = (c) => {
  const base = DOT_FACES[c.face] || DOT_FACES.smile;
  // Глаза и рот можно задать по отдельности (каталог, сравнения).
  const mouth = c.dotMouth || base[1];
  let eyes = c.dotEyes || base[0];
  // Слюнка = сон (решение 2026-11-14): глаза всегда спокойно закрыты (eyes_sad — дуги вниз),
  // если глаза не заданы явно. Поэтому willing (love + saliva) рисуется как sleepy.
  if (mouth === 'saliva' && !c.dotEyes) eyes = SLEEP_EYES;
  // Ресницы — вместо обычных глаз у части персонажей (rules.json → faces.lashes).
  if (eyes === 'ordinary' && c.lashes) eyes = 'lashes';
  return [eyes, mouth];
};
// Глаза и рты векторные (tools/vector-parts.mjs): обводка нарисована, белые части (слёзы, зубы, слюнка) — LIGHT.
const dotEyes = (c) => { const id = `eyes_${dotFace(c)[0].toLowerCase()}`; return v1On(id) ? v1Part(id, { LIGHT: '#FFFFFF' }) : ''; };
const dotMouth = (c) => { const id = `mouth_${dotFace(c)[1]}`; return v1On(id) ? v1Part(id, { LIGHT: '#FFFFFF' }) : ''; };
// Рот при бороде (решения 2026-11-07). В лице nemo рот почти вплотную к глазам, а верх бород и усов — на той же высоте.
// Усы: рот под ними (опущен на 7). Полные бороды: закрытые рты (улыбка, грусть, ровный…) скрыты — борода их закрывает,
// эмоцию передают глаза; открытые (смех, оскал, испуг, «о») — на обычном месте. Опущенный рот в просвете бороды
// пользователю не понравился. Эспаньолка (только бородка) и щетина рот не трогают.
// Решение 2026-11-14 (пересмотр): у полных бород рот опущен на 7, как у усов, все рты видны, линия рта обычная чёрная,
// без просвета в бороде. Светлая линия рта на тёмной бороде пробовалась и отклонена. Прежний вариант со скрытием: { hideClosed: true }.
const BEARD_MOUTH = { short: { dy: 7 }, middle: { dy: 7 }, long: { dy: 7 } };
// Очки (решение 2026-11-15): нижний край оправы на высоте рта, поэтому при любых очках рот тоже ниже на 7.
// Сдвиги не складываются: при очках и бороде — тоже 7. Носогубные складки сдвигаются вместе со ртом.
const GLASSES_MOUTH_DY = 7;
const mouthDy = (c) => Math.max(BEARD_MOUTH[c.beard]?.dy || 0, c.glasses ? GLASSES_MOUTH_DY : 0);
const shiftY = (dy, s) => (dy ? `<g transform="translate(0 ${dy})">${s}</g>` : s);
const OPEN_MOUTHS = new Set(['grin', 'laugh', 'open_mouth', 'teeth', 'small_o']);
function beardMouth(c) {
  if (BEARD_MOUTH[c.beard]?.hideClosed) return OPEN_MOUTHS.has(dotFace(c)[1]) ? dotMouth(c) : '';
  return shiftY(mouthDy(c), dotMouth(c));
}
// Контур бород и усов тоньше и бледнее, чем у волос (решение 2026-11-07): борода отличается от причёски.
// Цвет — оттенок волос 0,68 вместо 0,5; толщина задана в рисунке (1,6 ед. вместо 2,2); BEARD_LINE_WIDTH — доля
// добора контура у уменьшенных персонажей (v1Thick).
const BEARD_LINE_SHADE = 0.68, BEARD_LINE_WIDTH = 0.7;
// Морщины: набор у глаз с 55–60 лет (c.wrinkles === 60) или полный с 75; носогубные складки — отдельной деталью,
// на высоте рта (2026-11-15).
// c.wrinkles === 'folds' — только носогубные складки (раннее старение курящих, AGE_FX.smoking).
const dotWrinkles = (c) => {
  const id = c.wrinkles === 60 ? 'wrinkles_60' : c.wrinkles === 75 ? 'wrinkles_75' : null;
  return (id && v1On(id) ? v1Part(id) : '') + (v1On('wrinkles_folds') ? shiftY(mouthDy(c), v1Part('wrinkles_folds')) : '');
};
const BAGS_DOTS = ['M52 92 q5.5 2.5 11 0', 'M82 92 q5.5 2.5 11 0'].map((d) => `<path d="${d}" ${LINE} stroke-width="1.6"/>`).join('');

// Щетина: полупрозрачная зона цвета волос по челюсти и над губой, без контура, с мелкими точками.
// Зона по замеру маски головы v1 (2026-11-15): по бокам — до внутреннего края щеки (x 26,5),
// ниже 98 огибает мочку уха (она сливается с лицом до y 106) и уходит к челюсти; низ ниже подбородка — его обрезает
// маска кожи головы, поэтому край щетины совпадает с контуром челюсти и не заходит на уши.
const STUBBLE_ZONE_V1 = 'M26.5 92 Q41 96 53 95 Q60 88 72.5 88 Q85 88 92 95 Q104 96 118.5 92 V98 C118.5 102 116 105.5 112 106.5 V126 H33 V106.5 C29 105.5 26.5 102 26.5 98 Z';
const STUBBLE_DOTS = [[40, 104], [46, 110], [52, 113], [60, 115], [68, 112], [76, 115], [84, 112], [92, 114], [99, 110], [105, 104],
  [64, 104], [81, 104], [58, 108], [88, 108], [70, 107], [75, 102], [34, 98], [111, 98], [49, 101], [96, 101]];
// Смешивание двух цветов: t = 0 — первый, t = 1 — второй.
function mixHex(a, b, t) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const ch = (s) => Math.round(((pa >> s) & 255) * (1 - t) + ((pb >> s) & 255) * t).toString(16).padStart(2, '0');
  return `#${ch(16)}${ch(8)}${ch(0)}`.toUpperCase();
}
const luma = (hex) => { const n = parseInt(hex.slice(1), 16); return 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255); };
// Плотная россыпь точек для варианта «только точки»: детерминированная сетка со сдвигом внутри зоны щетины.
const STUBBLE_DOTS_DENSE = (() => {
  const out = [];
  for (let y = 97; y <= 115; y += 3) for (let x = 30 + ((y / 3) % 2) * 2.5; x <= 115; x += 5) {
    const inMouth = x > 63 && x < 82 && y < 101;
    const inside = (y > 92 + Math.abs(x - 72.5) * 0.05) && Math.hypot(Math.max(0, Math.abs(x - 72.5) - 17.5), Math.max(0, y - 87)) < 30.5;
    if (inside && !inMouth) out.push([x + ((x * 7 + y * 3) % 3) - 1, y + ((x * 3 + y) % 2)]);
  }
  return out;
})();
// Варианты щетины (c.stubbleStyle): zone — зона и точки (молодые); dots — только плотные точки;
// lightZone — лёгкая зона и плотные точки. Точки — тёмный оттенок волос, как контур волос.
const STUBBLE_DEFAULT = { young: 'zone', elder: 'zone' };
function stubble(c) {
  const skin = PEEPS.skin[c.skin][0];
  const lighter = luma(c.hair) > luma(skin);
  const style = c.stubbleStyle || (GREY_HAIR.includes(c.hair) ? STUBBLE_DEFAULT.elder : STUBBLE_DEFAULT.young);
  // Цвет точек — на контраст с кожей: у светлой (седой, светлой) щетины на светлой коже точки тёмно-серые,
  // как контур седины; на тёмной коже — светлые, цветом самих волос. Тёмная щетина — тёмный оттенок волос.
  // На тёмной коже светлые точки смешиваются с кожей: чем темнее кожа, тем сильнее (иначе — яркие искры).
  const lightHair = luma(c.hair) > 150;
  const dot = lightHair && luma(skin) <= 150 ? mixHex(c.hair, skin, 0.35 + (150 - luma(skin)) / 300) : shadeOf(c.hair, 0.5);
  // Зона продлена вниз и обрезана маской кожи головы (2026-11-15): край щетины совпадает с контуром челюсти.
  const zonePath = `<path d="${STUBBLE_ZONE_V1}" fill="${c.hair}" opacity="${style === 'lightZone' || lighter ? 0.14 : 0.32}"/>`;
  const zone = style === 'dots' ? '' : `<g mask="url(#${headSkinMask()})">${zonePath}</g>`;
  const dots = style === 'zone' ? STUBBLE_DOTS : STUBBLE_DOTS_DENSE;
  const r = style === 'zone' ? 0.6 : 0.55;
  return zone + dots.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${dot}"/>`).join('');
}
// Доли бород среди мужчин (CATALOG.md, раздел 8). Эспаньолки пока нет в рисунке — её доля отдана «нет».
// rules.json → beards.weightsPercentByAge (18–59 и 60+); short — усы (moustache), goatee — эспаньолка (только v1).
const BEARD_WEIGHTS = { adult: { none: 72, stubble: 12, short: 4, goatee: 4, middle: 6, long: 2 }, elder: { none: 62, stubble: 8, short: 8, goatee: 4, middle: 10, long: 8 } };
const pickBeard = (band) => {
  const w = Object.fromEntries(Object.entries(BEARD_WEIGHTS[band]).filter(([b]) => b !== 'goatee' || v1On('beard_goatee')));
  const b = wpick(w); return b === 'none' ? null : b;
};


// Пол влияет мягко: любая причёска возможна у всех, но веса разные. Борода — только у мужчин, платье — только у женщин.
const wpick = (weights) => {
  const entries = Object.entries(weights);
  let r = Math.random() * entries.reduce((s, [, w]) => s + w, 0);
  for (const [k, w] of entries) { r -= w; if (r <= 0) return k; }
  return entries[0][0];
};
// Передние — доли из spec/rules.json → hairFront.weightsPercent; задние — прежние веса прототипа.
const HAIR_WEIGHTS = {
  // Задние — доли из rules.json → hairBack.weightsPercent (2026-11-07, вместе с листом N6).
  m: { front: { chupchik: 12, curly: 9, elegant: 2, regular: 12, straight: 13, buzz: 12, side_part: 12, spiky: 8, top_bun: 1, afro: 6, bob: 1, side_swept: 1, wavy_part: 1, bowl: 4, pixie: 0.5, slicked_back: 7 }, back: { none: 71, short: 18, long: 3, curly: 8, ponytail_high: 0 } },
  f: { front: { chupchik: 6, curly: 9, elegant: 13, regular: 9, straight: 2, buzz: 1, side_part: 3, spiky: 1, top_bun: 10, afro: 6, bob: 13, side_swept: 12, wavy_part: 13, bowl: 3, pixie: 7, slicked_back: 1, braid_crown: 5 }, back: { none: 5, short: 18, long: 22, curly: 10, pigtails: 15, braids: 8, ponytail_high: 10, very_long: 6, wavy: 11 } },
};
// Задние причёски: первые три — перерисовки пака, остальные новые. Возраст — rules.json → hairBack.variants.
const HAIR_BACK_ALL = ['short', 'long', 'curly', 'pigtails', 'braids', 'ponytail_high', 'very_long', 'wavy'];
const BACK_AGES = { pigtails: [3, 14], ponytail_high: [6, 200], very_long: [6, 200] };
const backAvailable = (b) => b === 'none' || !!v1On(`hair_back_${b}`);
const backAgeFits = (b, years) => { const a = BACK_AGES[b]; return !a || (years >= a[0] && years <= a[1]); };
// Выбор только среди нарисованных. Залысины (receding) в случайный выбор не входят: их даёт облысение по возрасту.
const frontAvailable = (h) => !!v1On(`hair_front_${h}`);
const ageFits = (h, years) => { const a = FRONT_AGES[h]; return !a || (years >= a[0] && years <= a[1]); };
const pickFront = (sex, years = AGE_YEARS.adult, type) => wpick(typed(Object.fromEntries(Object.entries(HAIR_WEIGHTS[sex].front).filter(([h]) => frontAvailable(h) && ageFits(h, years))), TYPE_FRONT[type]));
const pickBack = (sex, type, years = AGE_YEARS.adult) => {
  const w = Object.fromEntries(Object.entries(HAIR_WEIGHTS[sex].back).filter(([b]) => backAvailable(b) && backAgeFits(b, years)));
  const b = wpick(typed(w, TYPE_BACK[type])); return b === 'none' ? null : b;
};
// ---------- Происхождение → фенотип (rules.json → phenotypeProfiles, profileFromGame; DECISIONS.md, «Происхождение и этика») ----------
// Как в игре: группа внешности → тон кожи (таблица SKIN_W движка); профиль фенотипов → цвет и тип волос.
// В прототипе группа выбирается по примерной доле рождений в мире; в игре — из страны и этнической группы рождения.
// Лица, глаза и причёски общие для всех; от происхождения зависят только фенотипы с данными.
const SKIN_W = { n: [36, 44, 15, 5, 0, 0], m: [3, 17, 42, 30, 8, 0], s: [0, 0, 14, 46, 34, 6], e: [22, 50, 28, 0, 0, 0], se: [0, 8, 44, 40, 8, 0], a: [0, 0, 0, 6, 36, 58], ha: [0, 0, 6, 32, 44, 18], l: [6, 22, 34, 26, 10, 2], c: [0, 0, 5, 15, 40, 40], ca: [6, 32, 44, 18, 0, 0], pa: [0, 0, 4, 24, 46, 26], sc: [16, 46, 28, 10, 0, 0], in: [0, 4, 30, 46, 20, 0], au: [0, 0, 5, 25, 40, 30], br: [0, 0, 10, 36, 34, 20], co: [0, 10, 36, 38, 16, 0], ro: [0, 10, 40, 40, 10, 0] };
const GROUP_BIRTHS = { s: 27, a: 24, ha: 5, e: 8, se: 7.5, m: 7, n: 8, l: 6, ca: 1.5, c: 0.5, sc: 0.7, br: 0.5, in: 0.5, pa: 0.3, au: 0.05, co: 0.1, ro: 0.1 };
// Группа n (Европа и европейское происхождение) в игре делится по странам; здесь — по примерным долям рождений.
const N_PROFILES = { westCentralEurope: 2, easternEurope: 3, southernEurope: 1.5, britishIsles: 1, nordic: 0.5, europeanOriginNA: 3, europeanOriginAUNZ: 0.4 };
const HAIR_COLOUR_NAMES = ['black', 'darkBrown', 'brown', 'blond', 'red'];
const HAIR_TYPE_NAMES = ['straight', 'wavy', 'curly', 'coily'];
let RULES = null; // spec/rules.json; null — правила недоступны, тогда кожа и волосы случайны, как раньше
const arrPick = (arr) => Number(wpick(Object.fromEntries(arr.map((w, i) => [i, w]).filter(([, w]) => w > 0))));
function pickOrigin() {
  const group = wpick(GROUP_BIRTHS);
  return { group, profile: group === 'n' ? wpick(N_PROFILES) : RULES.profileFromGame.byGroup[group] };
}
// Происхождение из данных игры (rules.json → profileFromGame): сначала этническая группа (S.eth.g), затем страна —
// группа n делится по странам (там же Бразилия и страны Залива, которые игра относит к n), затем группа внешности
// движка (ключ SKIN_W). group — код группы, iso — страна рождения, ethnic — этническая группа; профиль без данных
// в phenotypeProfiles не выбирается.
function originFromGame({ group, iso, ethnic } = {}) {
  const R = RULES?.profileFromGame, has = (p) => !!(p && RULES?.phenotypeProfiles?.[p]);
  const g = SKIN_W[group] ? group : 'n';
  let profile = ethnic ? R?.byEthnicGroup?.[ethnic] : null;
  if (!has(profile) && g === 'n' && iso) profile = Object.entries(R?.byCountryForGroupN || {}).find(([, list]) => list.split(',').includes(iso))?.[0];
  if (!has(profile)) profile = R?.byGroup?.[g];
  if (!has(profile)) profile = 'westCentralEurope';
  return { group: g, profile };
}
// Фенотип рождения: тон кожи, натуральный цвет и тип волос. origin — общий у семьи.
function phenotype(origin) {
  if (!RULES) return { skin: Math.floor(Math.random() * PEEPS.skin.length), hair: pick(PEEPS.hairNatural), hairType: null, origin: null };
  const o = origin || pickOrigin(), P = RULES.phenotypeProfiles[o.profile];
  return { origin: o, skin: arrPick(SKIN_W[o.group]), hair: RULES.hairColour.natural[HAIR_COLOUR_NAMES[arrPick(P.hairColour)]], hairType: HAIR_TYPE_NAMES[arrPick(P.hairType)] };
}
// Тип волос меняет вероятность причёсок: кудри и афро — у кудрявых и курчавых волос (rules.json → hairFront.variants.*.hairType).
const TYPE_FRONT = { straight: { afro: 0.05, curly: 0.3 }, wavy: { afro: 0.2, curly: 0.8 }, curly: { curly: 3, afro: 1.2 }, coily: { afro: 5, curly: 3, buzz: 2, elegant: 0.6, side_swept: 0.4 } };
const TYPE_BACK = { straight: { curly: 0.2 }, wavy: { curly: 0.6 }, curly: { curly: 3 }, coily: { curly: 4, long: 0.3 } };
const typed = (weights, mult) => (mult ? Object.fromEntries(Object.entries(weights).map(([k, w]) => [k, w * (mult[k] ?? 1)])) : weights);

// ---------- Облысение (rules.json → phenotypeRules.baldness, hairFront.variants.receding/bald) ----------
// У каждого мужчины порог из сида (baldU); доля лысеющих по возрасту интерполируется по профилю bald[30/50/70] %
// его происхождения (решение 2026-11-15; без происхождения — среднее по 22 профилям).
// Залысины — с 40 лет, лысина — с 50: сначала залысины, позже лысина. Появившись, облысение остаётся.
const BALD_DEFAULT = [13, 33, 50];
const profileOf = (c) => (RULES && c.origin ? RULES.phenotypeProfiles[c.origin.profile] : null);
function baldShare(years, prof = BALD_DEFAULT) {
  if (years <= 30) return prof[0] / 100;
  if (years >= 70) return prof[2] / 100;
  const [x0, y0, x1, y1] = years < 50 ? [30, prof[0], 50, prof[1]] : [50, prof[1], 70, prof[2]];
  return (y0 + (y1 - y0) * (years - x0) / (x1 - x0)) / 100;
}
function baldStage(c, years) {
  if (c.sex !== 'm' || c.baldU == null || years < 40) return null;
  const share = baldShare(years, profileOf(c)?.bald || BALD_DEFAULT);
  if (c.baldU >= share) return null;
  // Насколько далеко зашло: чем ниже порог человека относительно доли, тем раньше он начал лысеть.
  const progress = (share - c.baldU) / share;
  if (years < 50 || progress < 0.5) return 'receding';
  // Иногда вместо лысины — зачёс на лысину (когда он нарисован, лист N10).
  return v1On('hair_front_comb_over') && c.combOverU < 0.2 ? 'comb_over' : 'bald';
}
// Причёска с учётом облысения; натуральная причёска персонажа не меняется (нужна для молодых возрастов).
function baldLook(c) {
  const st = c.ageYears == null ? null : baldStage(c, c.ageYears);
  if (!st) return c;
  return { ...c, hairFront: st === 'bald' ? null : st, hairBack: null };
}
// ---------- Старение: седина, морщины, очки (решение 2026-11-15) ----------
// rules.json → phenotypeRules.greying, phenotypeRules.glasses, ages.wrinkles, ages.greyingStages.
// У каждого свои пороги из сида (greyU, wrinkleU, glassesU), поэтому признак появляется в своём возрасте и не исчезает.
// Седина: возраст «наполовину седой» H = start + 10 + u × (50 − start) × 100 / grey60 — так к 60 годам наполовину
// седы ровно grey60 % людей профиля. Мужчинам начало на 2 года раньше и +5 п. п. к grey60.
// Стадии: свой цвет → «тронутые сединой» (50/50 свой и седой) с H − 5 → седые с H + 10. Крашеные не седеют.
const GREY_DEFAULT = { greyStart: 36, grey60: 30 };
function halfGreyAge(c) {
  const P = profileOf(c) || GREY_DEFAULT, male = c.sex === 'm';
  const start = P.greyStart - (male ? 2 : 0), g60 = Math.min(95, P.grey60 + (male ? 5 : 0));
  return start + 10 + c.greyU * (50 - start) * 100 / g60;
}
function greyStage(c, years) {
  const H = halfGreyAge(c);
  return years >= H + 10 ? 'grey' : years >= H - 5 ? 'touched' : null;
}
// Морщины: первый набор — с 55–60 лет (свой возраст из сида), полный — с 75.
const wrinklesAt = (c, years) => (years >= 75 ? 75 : years >= 55 + 5 * c.wrinkleU ? 60 : null);
// Очки: доля носящих из профиля [6–12, 13–19, 20–59, 60+] %; с 45 лет пресбиопия — ×1,5 при хорошем доступе к очкам
// (у пожилых профиля от 50%), иначе ×1,1, но не больше доли пожилых. Берётся накопленный максимум по возрасту:
// надевший очки носит их дальше. Без происхождения — средние доли.
const GLASSES_DEFAULT = [5, 15, 25, 55];
function glassesShare(c, years) {
  const g = profileOf(c)?.glasses || GLASSES_DEFAULT;
  const presby = Math.min(g[3], g[2] * (g[3] >= 50 ? 1.5 : 1.1));
  let s = 0;
  for (const [from, v] of [[6, g[0]], [13, g[1]], [20, g[2]], [45, presby], [60, g[3]]]) if (years >= from) s = Math.max(s, v);
  // Доступ к очкам (аудит 2026-11-15, п. 1.2): доли профиля — «носят у себя на родине». Если человек живёт там, где
  // доступ другой (c.access из игры: страна проживания и достаток), доля умножается на отношение доступов.
  return Math.min(0.95, (s / 100) * accessRatio(c));
}
// Доступ к коррекции зрения 0–1 (eREC 2021, research/appearance-stats.md, раздел 5) по профилю — значение по умолчанию.
// Игра передаёт c.access по стране проживания с поправкой на доход (RULES → ageEffects.access).
const ACCESS_DEFAULT = 0.4;
const profileAccess = (c) => RULES?.ageEffects?.access?.byProfile?.[c.origin?.profile] ?? ACCESS_DEFAULT;
const accessRatio = (c) => (c.access == null ? 1 : c.access / profileAccess(c));
// ---------- Привязки к образу жизни (аудит 2026-11-15, пп. 3.1.6–7, 3.2.10–13; rules.json → ageEffects) ----------
// Закрашенная седина: в США седину закрашивают 45% женщин и 8% мужчин (Pew), в Британии 40% и 7%; доля для богатых
// стран, в остальных — пропорционально доступу (замена данных о доходе, оценка). Закрашивают примерно до 70 лет.
const GREY_COVER = { f: 0.4, m: 0.07, untilAge: 70, fullAccess: 0.79 };
const coversGrey = (c, y) => c.coverU != null && y < GREY_COVER.untilAge
  && c.coverU < (GREY_COVER[c.sex] ?? GREY_COVER.f) * Math.min(1, (c.access ?? profileAccess(c)) / GREY_COVER.fullAccess);
// Курение: курят 32,5% мужчин и 6,6% женщин (ВОЗ, 2024). У курящих раньше носогубные складки и мешки под глазами,
// гусиные лапки — без разницы (Guyuron 2013, близнецы). Складки — с 45–50 лет, мешки — с 50, если ещё нет морщин.
const SMOKING = { share: { m: 0.325, f: 0.066 }, fromAge: 18, foldsFrom: 45, bagsFrom: 50 };
const smokes = (c, y) => y >= SMOKING.fromAge && (c.smoker ?? (c.smokeU != null && c.smokeU < (SMOKING.share[c.sex] ?? SMOKING.share.f)));
// Темперамент (игра: S.trait — cur любознательный, act активный, warm ласковый, grit упорный) смещает доли базового лица
// и яркой краски у подростков. Множители — замысел, не статистика.
const TEMPER_FACE = {
  warm: { smile: 1.3, cute: 1.6, gloating: 0.3, tempered: 0.7, melancholic: 0.8 },
  act: { laughs: 2, smirk: 1.6, cute: 1.2, melancholic: 0.5, tempered: 0.6, neutral: 0.7 },
  cur: { cute: 1.5, smirk: 1.4, neutral: 1.2, tempered: 0.8 },
  grit: { tempered: 1.8, neutral: 1.8, laughs: 0.6, cute: 0.7, smile: 0.9 },
};
const TEMPER_DYE = { act: 1.5, cur: 1.5, warm: 1, grit: 0.6 };
const BASE_FACES = { smile: 40, neutral: 5, smirk: 5, cute: 15, tempered: 15, laughs: 10, gloating: 5, melancholic: 5 };
// Климат страны проживания (игра) или, в прототипе, по профилю происхождения: в жару — шорты, короткий рукав, сарафаны;
// в холод — брюки, длинный рукав, худи и свитера. Множители — замысел.
const CLIMATE = {
  hot: { top: { tee: 1.4, shirt: 1.3, hoodie: 0.3, sweater: 0.3 }, legwear: { shorts: 1.8, skirt: 1.2, pants: 0.8 }, dress: { sundress: 1.8 }, longSleeve: 0.25, child: { romper: 1.5, block: 0.7 } },
  temperate: { top: {}, legwear: {}, dress: {}, longSleeve: 0.5, child: {} },
  cold: { top: { tee: 0.7, shirt: 0.9, hoodie: 1.6, sweater: 1.8 }, legwear: { shorts: 0.3, skirt: 0.9, pants: 1.3 }, dress: { sundress: 0.3 }, longSleeve: 0.75, child: { romper: 0.4, block: 1.3 } },
};
const climateOf = (c) => c.climate || RULES?.ageEffects?.climate?.byProfile?.[c.origin?.profile] || 'temperate';
const withClimate = (weights, mult) => typed(weights, mult);
// Рост из сида: мужчины в среднем на 7–8% выше женщин (NCD-RisC), разброс внутри пола около 4%; в чиби — половина:
// мужчины ×1,02, женщины ×0,985 с подросткового возраста, у всех индивидуально ±2% (не больше ±4%).
const HEIGHT = { m: 1.02, f: 0.985, sd: 0.02, max: 0.04 };
function heightK(c, age) {
  if (age === 'baby') return 1;
  const own = Math.max(-HEIGHT.max, Math.min(HEIGHT.max, (c.heightZ ?? 0) * HEIGHT.sd));
  return (age === 'child' ? 1 : HEIGHT[c.sex] ?? 1) * (1 + own);
}
// Осветление волос в детстве (rules.json → phenotypeRules.childhoodLightening): у европейских профилей в 1–8 лет
// 30% тёмно-русых становятся русыми, затем половина русых — блондинами; в 9–14 лет вдвое реже; с 15 лет — взрослый цвет.
// Пороги из сида (lightU), поэтому с возрастом ребёнок только темнеет, а не перескакивает туда-обратно.
// Коренные австралийцы (аудит 2026-11-15; rules.json → aboriginalAustralia.note): светлых до 10 лет около 60%, у взрослых 3% —
// любые натуральные тёмные волосы светлеют до блонда с той же долей и теми же возрастами.
// У меланезийцев светлые волосы — свой ген у 7% взрослых, данных о детском посветлении нет: не применяем.
const LIGHTEN_PROFILES = new Set(Object.keys(N_PROFILES));
const ABORIGINAL_CHILD_BLOND = 0.6;
function childHair(c, y) {
  const k = y >= 1 && y <= 8 ? 1 : y >= 9 && y <= 14 ? 0.5 : 0;
  if (!k || !RULES || !c.lightU) return c.hair;
  const N = RULES.hairColour.natural, prof = c.origin?.profile;
  let h = c.hair;
  if (LIGHTEN_PROFILES.has(prof)) {
    if (h === N.darkBrown && c.lightU[0] < 0.3 * k) h = N.brown;
    if (h === N.brown && c.lightU[1] < 0.5 * k) h = N.blond;
  } else if (prof === 'aboriginalAustralia' && [N.black, N.darkBrown, N.brown].includes(h) && c.lightU[0] < ABORIGINAL_CHILD_BLOND * k) h = N.blond;
  return h;
}
// Яркая краска (аудит 2026-11-15, оценка без источника): подростки 10%, 18–35 лет 4%, 36–55 лет 1,5%, старше — нет.
// Один порог dyeU на жизнь: кто красится во взрослом возрасте, красился и подростком; к старости — своя седина.
const DYE_SHARE = [[13, 0.1], [18, 0.04], [36, 0.015], [56, 0]];
const dyeShare = (y) => DYE_SHARE.reduce((s, [from, v]) => (y >= from ? v : s), 0);
// Вид по возрасту (c.ageYears); натуральные признаки персонажа не меняются. Без порогов (каталог) — как задано.
function ageLook(c) {
  if (c.ageYears == null || c.greyU == null) return c;
  const y = c.ageYears, a = { ...c, hair: childHair(c, c.ageYears) };
  const dyed = c.dyeU != null && c.dyeU < dyeShare(y) * (TEMPER_DYE[c.temperament] ?? 1);
  const st = dyed || PEEPS.hairFun.includes(c.hair) || coversGrey(c, y) ? null : greyStage(c, y);
  if (dyed) a.hair = c.dyeTone;
  else if (st) a.hair = st === 'grey' ? c.greyTone : mixHex(c.hair, c.greyTone, 0.5);
  a.wrinkles = wrinklesAt(c, y);
  if (!a.wrinkles && smokes(c, y) && y >= SMOKING.foldsFrom + 5 * c.wrinkleU) a.wrinkles = 'folds';
  if (smokes(c, y) && y >= SMOKING.bagsFrom) a.bags = true;
  a.glasses = glassesShare(c, y) > c.glassesU ? c.glassesPick : null;
  if (c.freckU != null && y >= FRECKLES.fromAge && c.freckU < FRECKLES.share(hairNameOf(c.hair), c.skin)) a.freckles = c.freckKind;
  if (c.cane == null && c.caneU != null && c.caneU < caneShare(y)) a.cane = c.caneKind;
  return a;
}
// Передняя и задняя вместе: у афро — кудрявая задняя, у каре — короткая, у пучка и ёжика задней нет.
const pickHair = (sex, years, type) => { const f = pickFront(sex, years, type); return { hairFront: f, hairBack: f in FRONT_BACK ? FRONT_BACK[f] : pickBack(sex, type, years) }; };

// origin — группа и профиль происхождения; у семьи общий (relative). Без него выбирается по долям рождений.
function peepsCharacter(sex = chance(0.5) ? 'f' : 'm', origin, life = {}) {
  const dress = sex === 'f' && chance(0.45);
  const ph = phenotype(origin);
  // Темперамент — из игры (S.trait); в прототипе — случайный, поровну. Климат — из игры или по профилю.
  const temperament = life.temperament ?? pick(['cur', 'act', 'warm', 'grit']);
  const cl = CLIMATE[life.climate || RULES?.ageEffects?.climate?.byProfile?.[ph.origin?.profile] || 'temperate'];
  return {
    sex,
    origin: ph.origin, hairType: ph.hairType,
    skin: ph.skin,
    // Натуральный цвет — по профилю. Яркая краска — поверх него, по возрасту (dyeU, dyeTone; ageLook → DYE_SHARE).
    hair: ph.hair, dyeU: Math.random(), dyeTone: pick(PEEPS.hairFun),
    ...pickHair(sex, undefined, ph.hairType),
    // Порог облысения из сида и шанс зачёса на лысину; возраст для вида «случайные» — от 25 до 65 лет.
    baldU: Math.random(), combOverU: Math.random(), ageYears: 25 + Math.floor(Math.random() * 41),
    beard: sex === 'm' ? pickBeard('adult') : null,
    // Старение (ageLook): пороги из сида, оттенок седины и оправа выбираются один раз на всю жизнь.
    glasses: null, glassesU: Math.random(), glassesPick: pickGlasses(ph.skin),
    // Веснушки и трость: пороги из сида и вид — на всю жизнь (ageLook → FRECKLES, CANE).
    freckU: Math.random(), freckKind: wpick(FRECKLES.kinds), caneU: Math.random(), caneKind: wpick(CANE.kinds),
    greyU: Math.random(), greyTone: pick(GREY_HAIR), wrinkleU: Math.random(), lightU: [Math.random(), Math.random()],
    // Базовое лицо по долям из spec/rules.json → faces.baseFaceWeightsPercent с поправкой на темперамент.
    face: wpick(typed(BASE_FACES, TEMPER_FACE[temperament])), temperament,
    // Образ жизни: курение (игра: S.smoker), закрашенная седина, рост из сида; климат и доступ к очкам передаёт игра.
    smokeU: Math.random(), coverU: Math.random(), heightZ: gaussian(),
    // Ресницы вместо обычных глаз: 25% женщин, 3% мужчин (rules.json → faces.lashes.replacesOrdinary).
    lashes: chance(sex === 'f' ? 0.25 : 0.03),
    dress,
    top: pick(PEEPS.tops),
    bottom: pick(PEEPS.bottoms),
    sleeve: chance(cl.longSleeve) ? 'long' : 'short',
    // Одежда (решение 2026-11-15, rules.json → clothes): вид верха, юбка у женщин, вид платья — с поправкой на климат.
    topKind: wpick(withClimate(TOP_KINDS, cl.top)),
    dressKind: wpick(withClimate(DRESS_KINDS, cl.dress)),
    hem: wpick(SUNDRESS_HEM), // низ сарафана, один на всю жизнь
    legwear: dress ? 'naked' : wpick(withClimate(LEGWEAR[sex], cl.legwear)),
    ...(life.climate ? { climate: life.climate } : {}), ...(life.access != null ? { access: life.access } : {}), ...(life.smoker != null ? { smoker: life.smoker } : {}),
    shoe: pick(PEEPS.shoes),
  };
}
// Веснушки (решение 2026-11-15): A — по 3 точки на щеку, C — по 5 на щеку и 3 на переносице на уровне глаз.
// Доли — оценка: веснушки дают в основном варианты гена MC1R у рыжих и светлокожих (точных долей по цвету волос нет):
// рыжие 75%, блонд при коже 1–2 — 35%, русые при самой светлой коже — 15%; с 3 лет.
const FRECKLES = {
  kinds: { A: 60, C: 40 },
  share: (hairName, skin) => (hairName === 'red' ? 0.75 : hairName === 'blond' && skin <= 1 ? 0.35 : hairName === 'brown' && skin === 0 ? 0.15 : 0),
  fromAge: 3,
  dots: { A: [[44, 92], [49, 95.5], [52.5, 91.5]], C: [[43, 91.5], [47, 94.5], [51, 91.2], [54.5, 94.6], [48.5, 97.8]] },
  bridge: [[69.4, 84.2], [72.5, 82.6], [75.6, 84.2]],
};
const hairNameOf = (hex) => (RULES ? Object.entries(RULES.hairColour.natural).find(([, v]) => v === hex)?.[0] : null);
function frecklesSvg(kind, skinHex) {
  const d = FRECKLES.dots[kind]; if (!d) return '';
  const pts = [...d, ...d.map(([x, y]) => [145 - x, y]), ...(kind === 'C' ? FRECKLES.bridge : [])];
  return pts.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="0.95" fill="${mixHex(skinHex, '#7A3E22', 0.5)}"/>`).join('');
}
// Трость (решение 2026-11-15): прямая с крюком (70%) и медицинская с симметричной поперечной ручкой (30%), в правой
// руке, ручка на уровне кисти, перед рукой. Доли по возрасту: в США трость у 16,4% людей 65+ (NHATS 2011); по
// возрастам — оценка: 65–74 лет 9%, 75–84 — 18%, 85+ — 30%. Игра может задать трость явно (c.cane: инвалидность).
const CANE = {
  kinds: { crook: 70, medical: 30 },
  share: [[65, 0.09], [75, 0.18], [85, 0.3]],
};
const caneShare = (y) => CANE.share.reduce((s, [from, v]) => (y >= from ? v : s), 0);
function caneSvg(kind) {
  const two = (d, col, w, ow = 2.3) => `<path d="${d}" stroke="${INK}" stroke-width="${w + 2 * ow}" stroke-linecap="round" stroke-linejoin="round" fill="none"/><path d="${d}" stroke="${col}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;
  // Медицинская — по центру кисти (низ правой руки около x 99,4), ручка симметрична относительно трости (2026-11-15).
  if (kind === 'medical') return two('M99.5 164V141.5', '#AEB5BD', 3.8) + two('M93.5 140.4H105.5', '#4A4F56', 4.6) + two('M99.5 164V160', '#2E2E30', 3.8);
  return two('M103.6 164V140.6C103.6 136.2 98.4 134.6 95.6 137.4C94.4 138.6 94.6 140.6 95.8 141.6', '#8A5A36', 4.6);
}
// Нормальное распределение (Бокс — Мюллер) для роста.
const gaussian = () => Math.sqrt(-2 * Math.log(1 - Math.random())) * Math.cos(2 * Math.PI * Math.random());
const TOP_KINDS = { tee: 50, shirt: 20, hoodie: 15, sweater: 15 };
const DRESS_KINDS = { basic: 50, sundress: 25, belted: 25 };
const LEGWEAR = { f: { pants: 45, shorts: 25, skirt: 30 }, m: { pants: 65, shorts: 35 } };

// Загрузка деталей и правил. По умолчанию — рядом с модулем (nemo-peeps/parts, nemo-peeps/spec/rules.json);
// игра передаёт свои: preload({ partsRoot: '<url папки деталей>/', rules: <объект rules.json> }).
async function preload(opts = {}) {
  if (opts.partsRoot) V1_ROOT = opts.partsRoot;
  if (opts.cache) V1_CACHE = opts.cache;
  await Promise.all([loadV1(),
    // Правила генератора (фенотипы по происхождению). Нет доступа — кожа и волосы случайны, как раньше.
    opts.rules ? Promise.resolve().then(() => { RULES = opts.rules; })
      : fetch(opts.rulesUrl || new URL(/* @vite-ignore */ './spec/rules.json', import.meta.url).href, { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)).then((j) => { RULES = j; }).catch(() => {})]);
}

let CUR_SCALE = 1;
// Масштаб текущего персонажа: от него зависит добор контура (v1Thick), чтобы линия была одной толщины при любом размере.
function useScale(s) { CUR_SCALE = s; }
function shadeOf(hex, k = 0.5) {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v) => Math.round(v * k).toString(16).padStart(2, '0');
  return `#${ch((n >> 16) & 255)}${ch((n >> 8) & 255)}${ch(n & 255)}`.toUpperCase();
}

// Тело выше прежнего: верх футболки и платья уходит под голову (y 106 вместо 121).
const TOP_Y = 106;
const TEE_TOP = `M55 ${TOP_Y} H90 V135 H55 Z`;
const TEE_SHORTS = 'M55 135 H90 V140 C90 143.31 87.31 146 84 146 H61 C57.69 146 55 143.31 55 140 Z';
const DRESS = `M57 ${TOP_Y} H88 L92.6 142.6 Q93.1 146 89.6 146 H55.4 Q51.9 146 52.4 142.6 Z`;

// Голова масштабируется вокруг середины подбородка: так у детей она крупнее, а шея остаётся на месте.
const CHIN = { x: 72.5, y: 117 };
function headLayers(c, dy = 0) {
  const sk = PEEPS.skin[c.skin];
  const k = c.headScale || 1;
  const t = k !== 1 ? `translate(${CHIN.x} ${CHIN.y + dy}) scale(${k}) translate(${-CHIN.x} ${-CHIN.y})` : dy ? `translate(0 ${dy})` : '';
  const w = (s) => (t ? `<g transform="${t}">${s}</g>` : s);
  const hv1 = v1HairColours(c);
  const ks = CUR_SCALE * k;
  // Резинки на хвостиках и косах — цвет одежды (CLOTH1 → цвет верха). Слишком светлый верх (белая футболка)
  // давал белую резинку, которая читалась как дырка в волосах (2026-11-15): тогда цвет низа, а если и он светлый — красный.
  const light = (h) => !h || luma(h) > 200;
  const tie = c.tie || (!light(c.top) ? c.top : !light(c.bottom) ? c.bottom : V1_KEYS.CLOTH2);
  const back = c.hairBack && v1On(`hair_back_${c.hairBack}`) ? w(v1Thick(`hair_back_${c.hairBack}`, { ...hv1, CLOTH1: tie }, hv1.HAIRLINE, ks)) : '';
  // Борода: контур бледнее и тоньше, чем у волос (BEARD_LINE_*); щетина рисуется кодом.
  const bLine = shadeOf(c.hair, BEARD_LINE_SHADE);
  const beard = c.beard === 'stubble' ? w(stubble(c))
    : c.beard && v1On(`beard_${c.beard}`) ? w(v1Thick(`beard_${c.beard}`, { HAIR: c.hair, HAIRLINE: bLine }, bLine, ks, BEARD_LINE_WIDTH)) : '';
  // Очки: чёрные — нарезанные оправы N1; остальные — векторные, оправа цвета FRAME_HEX и тёмная обводка снаружи
  // (белые и цветные — glasses_*_white, металл тоньше — glasses_*_metal), без фильтра.
  const [gShape, gColour] = (c.glasses || '').split('.');
  const gPart = FRAME_METAL.has(gColour) ? `glasses_${gShape}_metal` : `glasses_${gShape}_white`;
  const glasses = !c.glasses ? ''
    : gColour !== 'black' ? (v1On(gPart) && FRAME_HEX[gColour] ? w(v1Part(gPart, { LIGHT: FRAME_HEX[gColour] })) : '')
    : v1On(`glasses_${gShape}`) ? w(v1Thick(`glasses_${gShape}`, {}, INK, ks)) : '';
  return {
    back,
    head: v1On('head') ? w(v1Thick('head', { SKIN: sk[0] }, INK, ks)) : '',
    // Глаза в своей группе внутри масштаба головы: моргание сжимает их по вертикали вокруг линии глаз (ppCss).
    face: w(blinkable(c) ? `<g class="pp-eyes">${dotEyes(c)}</g>` : dotEyes(c)),
    freckles: c.freckles ? w(frecklesSvg(c.freckles, sk[0])) : '',
    wrinkles: c.wrinkles ? w(dotWrinkles(c)) : '',
    // Мешки под глазами — признак плохого здоровья или усталости (CATALOG.md, раздел 12).
    bags: c.bags && (!c.wrinkles || c.wrinkles === 'folds') ? w(BAGS_DOTS) : '',
    mouth: w(beardMouth(c)),
    beard,
    front: c.hairFront && v1On(`hair_front_${c.hairFront}`) ? w(v1Thick(`hair_front_${c.hairFront}`, hv1, hv1.HAIRLINE, ks)) : '',
    glasses,
  };
}

// ---------- Тело кодом (решение 2026-11-15) ----------
// Геометрия пака: руки — скруглённые прямоугольники с наклоном, ноги — капсулы, торс — футболка с поясом или платье.
// Один общий контур на каждую руку (с рукавом), ногу (со штаниной и обувью) и торс; внутри швов нет — только смена цвета.
// Контур рисуется под заливкой линией 2 × BODY_OUT и делится на масштаб персонажа, чтобы на экране он был одной
// толщины с головой при любом возрасте (как фильтр контура у пака).
const BODY_OUT = 2.4;
let bodyClipN = 0;
function codeBody(c) {
  const sk = PEEPS.skin[c.skin][0], L = LAYOUT, out = [], w = (2 * BODY_OUT / CUR_SCALE).toFixed(3);
  const outline = (shape) => `<g fill="${INK}" stroke="${INK}" stroke-width="${w}" stroke-linejoin="round">${shape}</g>`;
  const clipped = (shape, inner) => { const id = `body${++bodyClipN}`; return `<clipPath id="${id}">${shape}</clipPath><g clip-path="url(#${id})">${inner}</g>`; };
  // Полосы цвета сверху вниз: каждая лежит только на своём участке и заходит на 0,5 под следующую. Под одеждой
  // нет слоя кожи: иначе на краю, где обе заливки сглажены, кожа просвечивала светлой линией (заметно на тёмной одежде).
  const bands = (x, y0, wd, y1, stops) => stops.map(([from, to, fill], i) => {
    const top = i ? from - 0.5 : y0 - 1, bottom = i === stops.length - 1 ? y1 + 1 : to;
    return `<rect x="${x - 1}" y="${top}" width="${wd + 2}" height="${bottom - top}" fill="${fill}"/>`;
  }).join('');
  // Одежда (решения 2026-11-15): вещи отличаются формой, без полосок, планок и затемнений. Верх c.topKind:
  // tee; shirt — широкий короткий рукав; hoodie — капюшон тоном и шнурки, длинный рукав; sweater — жилет с V-вырезом
  // поверх рубашки (рукава рубашки). Низ c.legwear: pants, shorts, skirt, naked; платье c.dressKind: basic, sundress, belted.
  // Детские (решение 2026-11-15, только в возрасте «ребёнок»): верх raglan, band, block; платья apron, puffy;
  // песочник — футболка и шорты одного цвета (задаётся в childOutfit). Крупные цветовые блоки, без мелких деталей.
  const kind = c.dress ? null : (c.topKind || 'tee');
  const longSleeve = kind === 'hoodie' || kind === 'sweater' || (kind !== 'shirt' && c.sleeve === 'long');
  const sleeveless = c.dress && (c.dressKind === 'sundress' || (c.dressKind === 'puffy' && c.sleeveless));
  const sleeveCol = kind === 'raglan' ? c.bottom : kind === 'sweater' ? vestShirt(c) : c.top; // реглан: рукава цвета низа; жилет: рубашки
  for (const a of [L.armL, L.armR]) {
    const cap = `<rect x="${a.x}" y="${a.y}" width="${a.w}" height="${a.h}" rx="${a.w / 2}"/>`;
    const hem = a.y + (longSleeve ? 21 : 13), end = a.y + a.h;
    const stops = sleeveless ? [[a.y, end, sk]] : [[a.y, hem, sleeveCol], [hem, end, sk]];
    // Рубашка: широкий короткий рукав — трапеция шире руки, один общий контур с рукой.
    const wide = kind === 'shirt' ? `<path d="M${a.x - 0.2} ${a.y + 3} L${a.x - 2.2} ${hem} H${a.x + a.w + 2.2} L${a.x + a.w + 0.2} ${a.y + 3} Z"/>` : '';
    const sleeveFill = wide ? wide.replace('/>', ` fill="${sleeveCol}"/>`) : '';
    // Группы .pp-* — части для анимации (ppCss): рука, нога, торс; .pp-up — всё выше ног, при шаге качается вместе.
    out.push(`<g class="pp-up"><g class="pp-arm ${a === L.armL ? 'pp-l' : 'pp-r'}"><g transform="${rotAround(a)}">${outline(cap + wide)}${clipped(cap + wide, bands(a.x, a.y, a.w, end, stops) + sleeveFill)}</g></g></g>`);
  }
  const skirt = !c.dress && c.legwear === 'skirt';
  for (const l of [L.legL, L.legR]) {
    const cap = `<path d="M${l.x} ${l.y + 6.5}a6.5 6.5 0 0 1 13 0v15a6.5 6.5 0 0 1 -13 0z"/>`;
    const pants = !c.dress && !skirt && c.legwear !== 'naked', hem = l.y + (c.legwear === 'shorts' ? 12 : 18), shoe = l.y + 18, end = l.y + l.h;
    const stops = !pants ? [[l.y, shoe, sk], [shoe, end, c.shoe]]
      : hem < shoe ? [[l.y, hem, c.bottom], [hem, shoe, sk], [shoe, end, c.shoe]] : [[l.y, shoe, c.bottom], [shoe, end, c.shoe]];
    out.push(`<g class="pp-leg ${l === L.legL ? 'pp-l' : 'pp-r'}">${outline(cap) + clipped(cap, bands(l.x, l.y, l.w, end, stops))}</g>`);
  }
  if (c.dress) {
    // Платья отличаются формой, без полос и линий (решение 2026-11-15): у сарафана — волнистый низ, у платья
    // с поясом — расклёшенная юбка от талии (линии пояса нет).
    const shape = c.dressKind === 'belted' ? DRESS_BELTED : c.dressKind === 'puffy' ? DRESS_PUFFY : c.dressKind === 'sundress' ? DRESS_WAVY[c.hem] || DRESS_WAVY.wave : DRESS;
    // Платье поверх футболки (apron): платье цвета низа сразу под подбородком, рукава — цвета верха.
    let inner = `<path d="${shape}" fill="${c.dressKind === 'apron' ? c.bottom : c.top}"/>`;
    out.push(`<g class="pp-up"><g class="pp-torso">${outline(`<path d="${shape}"/>`) + clipped(`<path d="${shape}"/>`, inner)}</g></g>`);
  } else {
    const lowerD = skirt ? SKIRT : TEE_SHORTS;
    const sil = `<path d="${TEE_TOP}"/><path d="${lowerD}"/>`;
    // Верх заходит под низ на 0,5: без нахлёста на стыке двух заливок проступает светлая щель.
    // Комбинезон одним цветом (block): торс цвета низа, из рукавов видна футболка цвета верха.
    let inner = `<path d="${TEE_TOP.replace('V135', 'V135.5')}" fill="${kind === 'block' ? c.bottom : c.top}"/>`;
    if (kind === 'band') inner += `<rect x="54" y="123" width="37" height="7" fill="${clothAccent(c.top)}"/>`;
    // Худи: только шнурки (крупные, светлым тоном); жилет: V-вырез цвета рубашки.
    if (kind === 'hoodie') inner += `<rect x="68" y="116" width="2" height="10" rx="1" fill="${clothAccent(c.top)}"/><rect x="75" y="116" width="2" height="10" rx="1" fill="${clothAccent(c.top)}"/>`;
    if (kind === 'sweater') inner += `<path d="${V_NECK}" fill="${vestShirt(c)}"/>`;
    inner += `<path d="${lowerD}" fill="${c.bottom}"/>`;
    // Капюшон худи: выглядывает из-за головы у плеч.
    const hood = kind === 'hoodie' ? `<path d="${HOOD}" fill="${clothTone(c.top, 0.9)}"/>` : '';
    out.push(`<g class="pp-up"><g class="pp-torso">${outline(sil + (hood ? `<path d="${HOOD}"/>` : '')) + hood + clipped(sil, inner)}</g></g>`);
  }
  return out.join('');
}
// Тон вещи для деталей: темнее основного цвета, у тёмных вещей — светлее (иначе деталь не видна).
const clothTone = (col, k = 0.82) => (luma(col) < 80 ? mixHex(col, '#FFFFFF', 0.22) : shadeOf(col, k));
const clothLight = (col) => mixHex(col, '#FFFFFF', 0.55);
// Светлая полоса на вещи; на белых и почти белых вещах — на тон темнее, иначе полоса не видна.
const clothAccent = (col) => (luma(col) > 200 ? shadeOf(col, 0.8) : clothLight(col));
const HOOD = 'M49 113 Q47 122 55 124 H90 Q98 122 96 113 Q72.5 128 49 113 Z';
const vestShirt = (c) => (luma(c.top) > 190 ? '#8FB3E0' : '#FFFFFF'); // рубашка под жилетом-свитером
const V_NECK = 'M60 106 H85 L72.5 131 Z'; // вырез жилета: глубокий, иначе его закрывает голова
const SKIRT = 'M55 133 H90 L93.2 148.4 Q93.6 151 91 151 H54 Q51.4 151 51.8 148.4 Z';
const DRESS_BELTED = 'M55 106 H90 V131 L94.5 148 Q95 151 92 151 H53 Q50 151 50.5 148 L55 131 Z';
// Волнистый низ платья: n полуволн по ширине подола, amp — высота волны (фестоны отклонены 2026-11-15).
function wavyDress(n, amp) {
  const yR = 145, xR = 92.9, xL = 52.1, step = (xR - xL) / n;
  let d = `M57 ${TOP_Y} H88 L${xR} ${yR}`;
  for (let i = 0; i < n; i++) {
    const x0 = xR - i * step, x1 = x0 - step, dy = i % 2 === 0 ? 2 * amp : -2 * amp;
    d += ` Q${((x0 + x1) / 2).toFixed(2)} ${yR + dy} ${x1.toFixed(2)} ${yR}`;
  }
  return d + ' Z';
}
// Сарафан: волна или волна мельче, поровну (решение 2026-11-15).
const DRESS_WAVY = { wave: wavyDress(5, 1.6), wave_small: wavyDress(7, 1.2) };
const SUNDRESS_HEM = { wave: 50, wave_small: 50 };
const DRESS_PUFFY = 'M56 106 H89 V129 L96 145 Q97 149 93 149 H52 Q48 149 49 145 L56 129 Z'; // пышное короткое детское
// Детский гардероб (возраст «ребёнок», решение 2026-11-15): простые вещи без мелких деталей и детские вещи крупными
// блоками. Рубашки, худи, свитера и платья с поясом — с подросткового возраста.
const CHILD_OUTFITS = { m: { tee: 30, raglan: 15, band: 15, block: 20, romper: 20 }, f: { tee: 15, raglan: 10, band: 10, block: 10, romper: 10, dress: 10, apron: 15, puffy: 20 } };
const CHILD_LEGWEAR = { m: { pants: 50, shorts: 50 }, f: { pants: 35, shorts: 35, skirt: 30 } };
function childOutfit(sex, climate = 'temperate') {
  const cl = CLIMATE[climate] || CLIMATE.temperate;
  const k = wpick(typed(CHILD_OUTFITS[sex] || CHILD_OUTFITS.f, cl.child));
  if (k === 'dress') return { dress: true, dressKind: chance(0.5) ? 'basic' : 'sundress', legwear: 'naked' };
  if (k === 'apron' || k === 'puffy') return { dress: true, dressKind: k, legwear: 'naked', sleeveless: k === 'puffy' && chance(0.4) };
  if (k === 'block') return { dress: false, topKind: 'block', legwear: 'pants' };
  if (k === 'romper') return { dress: false, topKind: 'tee', legwear: 'shorts', romper: true, sleeve: 'short' };
  return { dress: false, topKind: k, legwear: wpick(typed(CHILD_LEGWEAR[sex] || CHILD_LEGWEAR.f, cl.legwear)) };
}
// ---------- Анимация, прототип (PLAN-generator-v2.md, раздел 3.2; решение 2026-11-15) ----------
// Персонаж в режиме новых рисунков собран из групп: .pp-head (задние волосы и голова, два слоя), .pp-torso,
// .pp-arm.pp-l/.pp-r, .pp-leg.pp-l/.pp-r, .pp-eyes; .pp-up — всё выше ног. Движение — CSS-анимации по этим группам,
// включаются атрибутом body[data-anim] (переключатель «Анимация»). Точки вращения — в единицах холста головы, из LAYOUT.
// --pp-k — замедление (пожилые в 1,35 раза медленнее), --pp-d — сдвиг фазы, --pp-b — период моргания: из порогов
// персонажа, чтобы люди рядом не двигались в такт и не менялись при перерисовке.
const ANIM = { breath: 2.5, step: 0.8, elderSlow: 1.35, breathStretch: 1.03, headBob: 1.2, armBob: 0.8, legLift: 3, armSwing: 7, stepBob: 1.4, stepRock: 1.5, eyeY: 82 };
const NO_BLINK = ['closed', 'sad', 'dead', 'crying', 'love']; // закрытые глаза, слёзы и сердечки не моргают
const blinkable = (c) => !NO_BLINK.includes(dotFace(c)[0].toLowerCase());
function ppWrap(c, inner) {
  const u = c.greyU ?? 0.3, v = c.wrinkleU ?? 0.5, k = (c.ageYears ?? 30) >= 60 ? ANIM.elderSlow : 1;
  return `<g class="pp" style="--pp-k:${k};--pp-d:${(-u * 5).toFixed(2)}s;--pp-b:${(3.4 + v * 2.6).toFixed(2)}s">${inner}</g>`;
}
function ppCss() {
  const L = LAYOUT, A = ANIM, hipY = L.legL.y + 10, footY = L.legL.y + L.legL.h, cx = L.body.x + L.body.w / 2;
  const sh = (a) => `${a.x + a.w / 2}px ${a.y + 3}px`; // плечо: верх руки под краем головы
  const idle = 'body[data-anim="idle"]', walk = 'body[data-anim="walk"]', on = 'body[data-anim="idle"], body[data-anim="walk"]';
  const dur = (t) => `calc(${t}s * var(--pp-k, 1))`;
  return `
  ${idle} .pp-torso { transform-origin: ${cx}px ${hipY}px; animation: pp-breathe-torso ${dur(A.breath)} ease-in-out var(--pp-d, 0s) infinite; }
  ${idle} .pp-swaddle { transform-origin: ${cx}px 166px; animation: pp-breathe-torso ${dur(A.breath)} ease-in-out var(--pp-d, 0s) infinite; }
  ${idle} .pp-head { animation: pp-breathe-head ${dur(A.breath)} ease-in-out var(--pp-d, 0s) infinite; }
  ${idle} .pp-arm { animation: pp-breathe-arm ${dur(A.breath)} ease-in-out var(--pp-d, 0s) infinite; }
  :is(${on}) .pp-eyes { transform-origin: ${cx}px ${A.eyeY}px; animation: pp-blink var(--pp-b, 4s) linear var(--pp-d, 0s) infinite; }
  ${walk} .pp-up { transform-origin: ${cx}px ${footY}px; animation: pp-step-body ${dur(A.step)} ease-in-out var(--pp-d, 0s) infinite; }
  ${walk} .pp-leg.pp-l { animation: pp-step-l ${dur(A.step)} ease-in-out var(--pp-d, 0s) infinite; }
  ${walk} .pp-leg.pp-r { animation: pp-step-r ${dur(A.step)} ease-in-out var(--pp-d, 0s) infinite; }
  ${walk} .pp-arm { animation: pp-swing ${dur(A.step)} ease-in-out var(--pp-d, 0s) infinite; }
  ${walk} .pp-arm.pp-l { transform-origin: ${sh(L.armL)}; }
  ${walk} .pp-arm.pp-r { transform-origin: ${sh(L.armR)}; }
  @keyframes pp-breathe-torso { 0%, 100% { transform: scaleY(1); } 50% { transform: scaleY(${A.breathStretch}); } }
  @keyframes pp-breathe-head { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-${A.headBob}px); } }
  @keyframes pp-breathe-arm { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-${A.armBob}px); } }
  @keyframes pp-blink { 0%, 93%, 100% { transform: scaleY(1); } 96.5% { transform: scaleY(0.08); } }
  @keyframes pp-step-body { 0%, 50%, 100% { transform: translateY(0) rotate(0deg); } 25% { transform: translateY(-${A.stepBob}px) rotate(${A.stepRock}deg); } 75% { transform: translateY(-${A.stepBob}px) rotate(-${A.stepRock}deg); } }
  @keyframes pp-step-l { 0%, 50%, 100% { transform: translateY(0); } 25% { transform: translateY(-${A.legLift}px); } }
  @keyframes pp-step-r { 0%, 50%, 100% { transform: translateY(0); } 75% { transform: translateY(-${A.legLift}px); } }
  @keyframes pp-swing { 0%, 50%, 100% { transform: rotate(0deg); } 25% { transform: rotate(-${A.armSwing}deg); } 75% { transform: rotate(${A.armSwing}deg); } }
  @media (prefers-reduced-motion: reduce) { .pp * { animation: none !important; } }`;
}
// Возвращает содержимое персонажа в единицах холста головы, без обёртки <svg>.
// Тело рисуется кодом (codeBody), без швов. Детали тела N4 (ChatGPT) нарезаны, но не используются: полные контуры
// на каждом стыке делали тело «конструктором» (решение 2026-11-15).
function peepsContent(c) {
  c = baldLook(ageLook(stateLook(c)));
  const h = headLayers(c, c.headDrop || 0);
  // Части для анимации: задние волосы и голова — одна «голова» в двух слоях (за телом и перед ним).
  // Глаза под чёлкой, морщины до бороды, рот поверх бороды; щетина лежит под морщинами, иначе закрывает складки.
  const headG = (parts) => `<g class="pp-up"><g class="pp-head">${parts.join('')}</g></g>`;
  const front = c.beard === 'stubble' ? [h.head, h.freckles, h.face, h.beard, h.wrinkles, h.bags, h.mouth, h.front, h.glasses]
    : [h.head, h.freckles, h.face, h.wrinkles, h.bags, h.beard, h.mouth, h.front, h.glasses];
  // Трость — перед телом, в правой руке (CANE); у детей и подростков не бывает.
  const cane = c.cane && (c.ageYears ?? 30) >= 18 ? `<g class="pp-cane">${caneSvg(c.cane)}</g>` : '';
  return ppWrap(c, headG([h.back]) + codeBody(c) + cane + headG(front));
}

// Бантик на пелёнке — того же тона, что пелёнка, чуть насыщеннее и темнее (решения 2026-11-14 и 2026-11-15:
// насыщенный тон смягчён на 35% к цвету пелёнки, чтобы бантик не спорил с лицом).
const bowColour = (hex) => mixHex(deepTone(hex), hex, 0.35);
function deepTone(hex) {
  const n = parseInt(hex.slice(1), 16), [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => v / 255);
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  let h = 0;
  if (d) h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  const l0 = (mx + mn) / 2, s0 = d ? d / (1 - Math.abs(2 * l0 - 1)) : 0;
  const l = Math.max(0.4, l0 - 0.22), s = Math.min(0.85, s0 * 1.1 + 0.15);
  const c2 = (1 - Math.abs(2 * l - 1)) * s, x = c2 * (1 - Math.abs((h % 2 + 2) % 2 - 1)), m = l - c2 / 2;
  const hh = ((h % 6) + 6) % 6;
  const [r1, g1, b1] = hh < 1 ? [c2, x, 0] : hh < 2 ? [x, c2, 0] : hh < 3 ? [0, c2, x] : hh < 4 ? [0, x, c2] : hh < 5 ? [x, 0, c2] : [c2, 0, x];
  return '#' + [r1, g1, b1].map((v) => Math.round((v + m) * 255).toString(16).padStart(2, '0')).join('').toUpperCase();
}
// Младенец в пелёнке: голова, хохолок и конверт вместо тела. Пелёнки v1 — векторные (tools/vector-parts.mjs):
// wrap — со складкой, bow — с маленьким бантиком, ribbon — с маленьким бантиком и хвостиками ленты.
function babyContent(c) {
  const sk = PEEPS.skin[c.skin];
  const sw = `baby_swaddle_${c.swaddle || 'wrap'}`;
  // CLOTH2: у wrap — складка тёмным тоном пелёнки (2026-11-15), у пелёнок с бантиком — цвет бантика.
  const blanket = v1On(sw) ? v1Thick(sw, { CLOTH1: c.top, CLOTH2: sw === 'baby_swaddle_wrap' ? shadeOf(c.top, SWADDLE_FOLD_SHADE) : bowColour(c.top) }, INK, CUR_SCALE) : '';
  const head = v1On('head') ? v1Thick('head', { SKIN: sk[0] }, INK, CUR_SCALE) : '';
  // Волосы младенца v1 — векторные (решение 2026-11-15, вместо хохолка и кудряшек N8): волосинки — линии
  // тёмного оттенка волос; пушок — полупрозрачный цвет волос, обрезанный маской кожи головы (manifest → maskBy).
  // Цвет — со светлым детским сдвигом.
  const bh = c.babyHair && c.babyHair !== 'none' && `baby_hair_${c.babyHair}`;
  const hc = v1HairColours({ ...c, hair: babyHairColour(c.hair) });
  let tuft = '';
  if (bh && v1On(bh)) {
    const p = V1.parts[bh];
    // Без v1Thick: на мелком масштабе младенца утолщение склеивало завиток и волосинки в комок (проверено 2026-11-15,
    // previews/baby_hair_scene_scale.png); тонкие линии масштабируются вместе с младенцем и остаются читаемыми.
    const mask = p.maskBy === 'head:SKIN' ? headSkinMask() : p.maskBy && v1Mask(...p.maskBy.split(':'));
    tuft = mask ? `<g mask="url(#${mask})">${v1Part(bh, hc)}</g>` : v1Part(bh, hc);
  }
  // Соска (решение 2026-11-15) заменяет рот; глаза — по лицу младенца (у спящего закрыты). Цвет — насыщенный тон пелёнки.
  const paci = c.pacifier && c.pacifier !== 'none' && pacifierFits(c.swaddle) && `baby_pacifier_${c.pacifier}`;
  const mouth = paci && v1On(paci) ? v1Part(paci, { CLOTH2: deepTone(c.top), LIGHT: '#FFFFFF' }) : dotMouth(c);
  const eyes = blinkable(c) ? `<g class="pp-eyes">${dotEyes(c)}</g>` : dotEyes(c);
  const face = eyes + mouth;
  // Части для анимации: пелёнка «дышит», голова покачивается.
  return ppWrap(c, `<g class="pp-swaddle">${blanket}</g><g class="pp-head">${head + tuft + face}</g>`);
}

const BABY_BLANKET = { gendered: 0.75, bySex: { f: '#F5C6DA', m: '#BFD9F2' }, neutral: ['#F6E3A5', '#CFE8C4', '#BFE3E8', '#E8DDF2'] };
const BABY_FACES = { sleepy: 40, smile: 30, cute: 20, laughs: 10 };
// Волосы младенца (rules.json → babies.hair, 2026-11-15): волосинки, пушок, пушок с волной; у кудрявых и курчавых
// чаще пушок с волной.
// Завиток (curl) и завиток с волоском (curl_wisp) делят долю волосинок (решение 2026-11-15).
const BABY_HAIR = { none: 35, wisps: 14, curl: 8, curl_wisp: 8, fuzz: 20, fuzz_wavy: 15 };
const BABY_HAIR_CURLY = { none: 25, wisps: 11, curl: 7, curl_wisp: 7, fuzz: 15, fuzz_wavy: 35 };
// Светлый детский сдвиг: 12% белого в цвете волос. Чёрные и тёмные волосы (яркость ниже 60) не осветляются —
// иначе выглядят сероватыми, почти седыми.
const BABY_HAIR_LIGHTEN = 0.12, BABY_HAIR_DARK_LUMA = 60;
const babyHairColour = (h) => (luma(h) < BABY_HAIR_DARK_LUMA ? h : mixHex(h, '#FFFFFF', BABY_HAIR_LIGHTEN));
function babyHairWeights(type) {
  const w = { ...(type === 'curly' || type === 'coily' ? BABY_HAIR_CURLY : BABY_HAIR) };
  for (const k of ['fuzz', 'fuzz_wavy']) if (!v1On(`baby_hair_${k}`)) delete w[k];
  return w;
}
// bow — маленький бантик, ribbon — маленький с хвостиками ленты (решение 2026-11-15).
const BABY_SWADDLE = { wrap: 70, bow: 15, ribbon: 15 };
const SWADDLE_FOLD_SHADE = 0.72; // складка пелёнки wrap: цвет пелёнки × 0,72
// Соска: ring — «бабочка» с кольцом, oval — овальный щиток с кольцом (решение 2026-11-15).
// Только с пелёнкой без бантика (wrap). Доли — среди пелёнок wrap, чтобы всего соска была примерно у четверти младенцев.
const BABY_PACIFIER = { none: 64, ring: 18, oval: 18 };
const pacifierFits = (swaddle) => (swaddle || 'wrap') === 'wrap';

// Лицо по состоянию (CATALOG.md, раздел 12): c.state = { h: счастье 0–100, hl: здоровье 0–100 },
// c.dead — умер, c.deathH — счастье в момент смерти. Возвращает копию персонажа с нужным лицом.
const HAPPY_FACES = ['cute', 'laughs', 'smile', 'love'];
function stateLook(c) {
  if (!c.state && !c.dead) return c;
  const a = { ...c };
  if (c.dead) { a.face = (c.deathH ?? 50) >= 40 ? 'peace' : 'dead'; return a; }
  const { h = 50, hl = 100 } = c.state;
  if (h >= 70) a.face = HAPPY_FACES.includes(c.face) ? c.face : 'cute';
  else if (h < 20) a.face = 'sad';
  else if (h < 40) a.face = 'melancholic';
  if (hl < 20) Object.assign(a, { face: 'ill', bags: true, headDrop: (a.headDrop || 0) + 2 });
  else if (hl < 40) Object.assign(a, { face: h < 40 ? 'ill' : 'tired', bags: true, headDrop: (a.headDrop || 0) + 1 });
  return a;
}

// Возрасты: общий масштаб относительно взрослого и размер головы относительно тела.
const AGES = {
  baby: { label: 'младенец', scale: 0.52, head: 1 },
  child: { label: 'ребёнок', scale: 0.56, head: 1.18 },
  teen: { label: 'подросток', scale: 0.78, head: 1.07 },
  adult: { label: 'взрослый', scale: 1, head: 1 },
  elder: { label: 'пожилой', scale: 0.95, head: 1 },
};
function atAge(c, age) {
  const a = { ...c, headScale: AGES[age].head, ageYears: AGE_YEARS[age] ?? 0 };
  // Случайные «возрастные» черты запоминаются в самом персонаже, чтобы не меняться при перерисовке.
  if (age === 'baby') {
    // Пелёнка: чаще розовая или голубая по полу, иногда нейтральная пастель (оценка по опросу Mintel 2017, rules.json).
    const blanket = chance(BABY_BLANKET.gendered) ? BABY_BLANKET.bySex[c.sex || 'f'] : pick(BABY_BLANKET.neutral);
    c.baby ??= { face: wpick(BABY_FACES), babyHair: wpick(babyHairWeights(c.hairType)), top: blanket, swaddle: wpick(BABY_SWADDLE) };
    c.baby.pacifier ??= pacifierFits(c.baby.swaddle) ? wpick(BABY_PACIFIER) : 'none';
    Object.assign(a, c.baby, { beard: null, glasses: null });
  }
  // Очки, седину и морщины по возрасту считает ageLook (по a.ageYears).
  if (age === 'child' || age === 'teen') Object.assign(a, { beard: null });
  // Фазы внешности: в подростковом возрасте иногда крашеные волосы и другая стрижка,
  // взрослый может сменить причёску, цвет возвращается к натуральному, к старости седина.
  // В игре шансы можно привязать к темпераменту; здесь — просто случайность от персонажа.
  const sex = c.sex || 'f';
  // Детская стрижка: своя, если взрослая причёска ребёнку не по возрасту (например, зачёс назад), а иногда и просто так.
  if (age === 'child') {
    c.childLook ??= !ageFits(c.hairFront, AGE_YEARS.child) || chance(0.4) ? pickHair(sex, AGE_YEARS.child, c.hairType) : {};
    Object.assign(a, c.childLook);
    // Детская одежда — свой гардероб (childOutfit); песочник — шорты цвета футболки.
    c.childOutfit ??= childOutfit(sex, climateOf(c));
    Object.assign(a, c.childOutfit);
    if (a.romper) a.bottom = a.top;
  }
  if (age === 'teen') {
    const recut = !ageFits(c.hairFront, AGE_YEARS.teen) || chance(0.4);
    // Яркую краску считает ageLook по возрасту (DYE_SHARE), здесь — только новая стрижка.
    c.teenLook ??= recut ? pickHair(sex, AGE_YEARS.teen, c.hairType) : {};
    Object.assign(a, c.teenLook);
  }
  if (age === 'adult' || age === 'elder') {
    c.adultLook ??= chance(0.4) ? pickHair(sex, AGE_YEARS.adult, c.hairType) : {};
    Object.assign(a, c.adultLook);
  }
  if (age === 'elder') {
    // Борода к старости выбирается заново, с вероятностью 60% остаётся прежней.
    if (sex === 'm') c.elderBeard ??= chance(0.6) ? c.beard : pickBeard('elder');
    Object.assign(a, { headDrop: 2, beard: sex === 'm' ? c.elderBeard : null });
    // Седину и морщины считает ageLook; у персонажа без порогов старения — как раньше: седой и с морщинами.
    if (c.greyU == null) {
      c.grey ??= GREY_HAIR.includes(c.hair) ? c.hair : pick(GREY_HAIR);
      Object.assign(a, { hair: c.grey, wrinkles: 75 });
    }
  }
  return a;
}
function contentAt(c, age) {
  const a = atAge(c, age);
  return age === 'baby' ? babyContent(a) : peepsContent(a);
}

// Рамки вывода — общие для всех персонажей (решение 2026-11-06, rules.json → output.frames).
// body — полный рост: ноги взрослого на линии GROUND, голова на своём месте, над головой запас под пышные причёски.
// portrait — рамка по голове (по грудь), а не по краям причёски: лица у всех одного размера.
// Разница между персонажами — только естественная (объём волос внутри запаса, масштаб возраста).
const FRAMES = {
  body: { x: LAYOUT.canvas.x - 4, y: LAYOUT.canvas.y, w: LAYOUT.canvas.w + 8, h: LAYOUT.canvas.h + 4 },
  // По грудь, как аватар: голова и плечи. Квадрат до колен выглядел как обрезанные ноги.
  portrait: { x: -6, y: 2, w: 157, h: 130 },
};
// Якоря для игры (единицы холста головы, взрослый, масштаб 1): где ноги и где центр головы.
const ANCHORS = { feet: { x: 72.5, y: GROUND }, headCenter: { x: 72.5, y: 77 } };
function standalone(content, frame = FRAMES.body) {
  return `<svg viewBox="${frame.x} ${frame.y} ${frame.w} ${frame.h}" xmlns="http://www.w3.org/2000/svg">${content}</svg>`;
}
const renderPeeps = (c) => { useScale(1); return standalone(peepsContent(c)); };
const renderPortrait = (c) => { useScale(1); return standalone(peepsContent(c), FRAMES.portrait); };
// Младенец в каталоге: в масштабе 1, рамка по голове и пелёнке.
const renderBaby = (c) => { useScale(1); return standalone(babyContent(c), { x: -6, y: 20, w: 157, h: 150 }); };

// Сцена: несколько персонажей на одной линии земли, каждый в своём масштабе.
function scene(items) {
  const gap = 8, width = 150, ground = 186;
  let x = 0, body = '';
  for (const it of items) {
    const s = AGES[it.age].scale * heightK(it.c, it.age);
    useScale(s);
    const w = width * s;
    const bottom = it.age === 'baby' ? 166 : GROUND;
    body += `<g transform="translate(${x + w / 2 - 72.5 * s} ${ground - bottom * s}) scale(${s})">${contentAt(it.c, it.age)}</g>`;
    body += `<text x="${x + w / 2}" y="${ground + 14}" font-size="9" text-anchor="middle" fill="#77706a" font-family="system-ui, sans-serif">${it.label}</text>`;
    x += w + gap;
  }
  return `<svg viewBox="-6 0 ${x + 6} ${ground + 20}" xmlns="http://www.w3.org/2000/svg"><path d="M-6 ${ground + 1} H${x}" stroke="#e4ded6" stroke-width="1"/>${body}</svg>`;
}

// Семья: общие черты — близкий тон кожи и цвет волос.
// Родственник: то же происхождение; тон кожи близкий, цвет и тип волос наследуются в 75% (rules.json → hairColour.inheritFromParent).
function relative(base, opts = {}) {
  const c = peepsCharacter(opts.sex, base.origin || undefined);
  c.skin = Math.max(0, Math.min(PEEPS.skin.length - 1, base.skin + pick([-1, 0, 0, 1])));
  if (chance(RULES?.hairColour?.inheritFromParent ?? 0.6)) c.hair = base.hair;
  // Тип волос наследуется после выбора причёски в peepsCharacter, поэтому при смене типа причёска выбирается заново
  // (аудит 2026-11-15: иначе у родственника с унаследованными курчавыми волосами оставалась причёска «чужого» типа).
  if (base.hairType && base.hairType !== c.hairType && chance(RULES?.hairType?.inheritFromParent ?? 0.75)) {
    c.hairType = base.hairType;
    Object.assign(c, pickHair(c.sex, undefined, c.hairType));
  }
  return Object.assign(c, opts);
}


// ---------- Для встраивания (игра) ----------
// Скрытый <defs> для масок и фильтров: на странице прототипа он есть, в остальных местах создаётся при первой отрисовке.
function defsHost() {
  let d = document.getElementById('filters');
  if (!d) {
    document.body.insertAdjacentHTML('afterbegin', '<svg width="0" height="0" aria-hidden="true" style="position:absolute;left:0;top:0"><defs id="filters"></defs></svg>');
    d = document.getElementById('filters');
  }
  return d;
}
// Генератор берёт случайность из Math.random. withRandom подменяет её на время одного синхронного вызова: игра так
// получает одного и того же человека от его ключа и не трогает свой игровой RNG. rng — функция, как Math.random.
function withRandom(rng, fn) {
  const keep = Math.random;
  Math.random = rng;
  try { return fn(); } finally { Math.random = keep; }
}

export { V1_CACHE, originFromGame, LAYOUT, GROUND, HAIR_FRONT, HAIR_FRONT_NEW, FRONT_BACK, FRONT_AGES, AGE_YEARS, BEARDS, FACES, FRAME_HEX, FRAME_METAL, FRAME_GROUPS, GLASSES, FRAME_DE_MIN, toLab, deltaE, frameFits, pickGlasses, pick, chance, rotAround, INK, DARK, GREY_HAIR, PEEPS, V1_ROOT, V1_KEYS, V1, v1On, loadV1, v1Mask, headSkinMask, v1Part, V1_LINE_FIX, thickMask, thickReady, v1Thick, v1HairColours, LINE, DOT_FACES, DOT_EYES, SLEEP_EYES, dotFace, dotEyes, dotMouth, BEARD_MOUTH, GLASSES_MOUTH_DY, mouthDy, shiftY, OPEN_MOUTHS, beardMouth, BEARD_LINE_SHADE, BEARD_LINE_WIDTH, dotWrinkles, BAGS_DOTS, STUBBLE_ZONE_V1, STUBBLE_DOTS, mixHex, luma, STUBBLE_DOTS_DENSE, STUBBLE_DEFAULT, stubble, BEARD_WEIGHTS, pickBeard, wpick, HAIR_WEIGHTS, HAIR_BACK_ALL, BACK_AGES, backAvailable, backAgeFits, frontAvailable, ageFits, pickFront, pickBack, SKIN_W, GROUP_BIRTHS, N_PROFILES, HAIR_COLOUR_NAMES, HAIR_TYPE_NAMES, RULES, arrPick, pickOrigin, phenotype, TYPE_FRONT, TYPE_BACK, typed, BALD_DEFAULT, profileOf, baldShare, baldStage, baldLook, GREY_DEFAULT, halfGreyAge, greyStage, wrinklesAt, GLASSES_DEFAULT, glassesShare, ACCESS_DEFAULT, profileAccess, accessRatio, GREY_COVER, coversGrey, SMOKING, smokes, TEMPER_FACE, TEMPER_DYE, BASE_FACES, CLIMATE, climateOf, withClimate, HEIGHT, heightK, LIGHTEN_PROFILES, ABORIGINAL_CHILD_BLOND, childHair, DYE_SHARE, dyeShare, ageLook, pickHair, peepsCharacter, FRECKLES, hairNameOf, frecklesSvg, CANE, caneShare, caneSvg, gaussian, TOP_KINDS, DRESS_KINDS, LEGWEAR, preload, CUR_SCALE, useScale, shadeOf, TOP_Y, TEE_TOP, TEE_SHORTS, DRESS, CHIN, headLayers, BODY_OUT, bodyClipN, codeBody, clothTone, clothLight, clothAccent, HOOD, vestShirt, V_NECK, SKIRT, DRESS_BELTED, wavyDress, DRESS_WAVY, SUNDRESS_HEM, DRESS_PUFFY, CHILD_OUTFITS, CHILD_LEGWEAR, childOutfit, ANIM, NO_BLINK, blinkable, ppWrap, ppCss, peepsContent, bowColour, deepTone, babyContent, BABY_BLANKET, BABY_FACES, BABY_HAIR, BABY_HAIR_CURLY, BABY_HAIR_LIGHTEN, BABY_HAIR_DARK_LUMA, babyHairColour, babyHairWeights, BABY_SWADDLE, SWADDLE_FOLD_SHADE, BABY_PACIFIER, pacifierFits, HAPPY_FACES, stateLook, AGES, atAge, contentAt, FRAMES, ANCHORS, standalone, renderPeeps, renderPortrait, renderBaby, scene, relative, defsHost, withRandom };
