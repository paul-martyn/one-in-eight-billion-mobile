// Контролируемое окружение производного core.
//
// Оригинальная сборка писалась для страницы браузера. Здесь ей передаются
// только явно созданные объекты: изолированный Math.random, управляемые часы
// и таймеры, отдельное пространство ключей хранилища, инертный DOM, закрытая
// сеть. Старый интерфейс не запускается: точка входа claude.hot.ready
// принимает функцию start, но хост её не вызывает.
//
// Этот модуль не зависит от DOM и используется как в браузере, так и в
// Node-проверках эквивалентности.

export type StorageLike = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  key(index: number): string | null;
  readonly length: number;
};

export type CoreClock = {
  /** Время эпохи в миллисекундах, видимое core через Date. */
  now(): number;
  /** Монотонное время для performance.now(). */
  monotonic(): number;
};

export type CoreTask = { id: number; due: number; seq: number; fn: () => void; repeat: number | null; label: string };

/** Таймеры core. Задачи выполняет хост в определённых точках (см. drain). */
export class CoreTimers {
  private seq = 0;
  private tasks = new Map<number, CoreTask>();
  private readonly clock: CoreClock;
  constructor(clock: CoreClock) { this.clock = clock; }

  setTimeout = (fn: unknown, ms?: number, ...args: unknown[]): number => this.add(fn, ms, args, null);
  setInterval = (fn: unknown, ms?: number, ...args: unknown[]): number => this.add(fn, ms, args, Math.max(1, Number(ms) || 0));
  clearTimeout = (id?: number): void => { if (id != null) this.tasks.delete(id); };
  clearInterval = (id?: number): void => { if (id != null) this.tasks.delete(id); };
  // Кадры оригинального цикла не используются: игровым временем управляет хост.
  requestAnimationFrame = (): number => 0;

  get pending(): number { return this.tasks.size; }

  /** Снять все задачи и вернуть их описание (для журнала хоста). */
  discardAll(): string[] {
    const list = [...this.tasks.values()].map(t => `${t.repeat == null ? 'timeout' : 'interval'}:${t.label}`);
    this.tasks.clear();
    return list;
  }

  /** Выполнить все задачи со сроком не позже `until` в порядке (срок, порядок постановки). */
  drain(until = this.clock.monotonic(), onError?: (error: unknown, label: string) => void, limit = 10_000): number {
    let ran = 0;
    for (;;) {
      let next: CoreTask | null = null;
      for (const t of this.tasks.values()) if (t.due <= until && (!next || t.due < next.due || (t.due === next.due && t.seq < next.seq))) next = t;
      if (!next) return ran;
      if (++ran > limit) throw new Error('Core timers: превышен предел задач за один проход');
      if (next.repeat == null) this.tasks.delete(next.id);
      else next.due += next.repeat;
      try {
        next.fn();
      } catch (error) {
        if (!onError) throw error;
        onError(error, next.label);
      }
    }
  }

  private add(fn: unknown, ms: number | undefined, args: unknown[], repeat: number | null): number {
    if (typeof fn !== 'function') throw new Error('Core timers: строковый код не поддерживается');
    const id = ++this.seq;
    const label = (fn as { name?: string }).name || String(fn).replace(/\s+/g, ' ').slice(0, 80);
    this.tasks.set(id, { id, seq: id, due: this.clock.monotonic() + Math.max(0, Number(ms) || 0), fn: () => fn(...args), repeat, label });
    return id;
  }
}

export type NetworkAttempt = { api: string; target: string };

export type CoreEnvOptions = {
  /** Поток случайности для Math.random внутри core. */
  random: () => number;
  clock: CoreClock;
  storage: StorageLike;
  timers: CoreTimers;
  /** Язык сборки; путь страницы оригинала /<lang>/. */
  lang: string;
  /** Загрузчик дополнительных скриптов оригинала (era.js). */
  loadScript?: (src: string) => Promise<void>;
  onNetwork?: (attempt: NetworkAttempt) => void;
  /** Сообщения console.* из core. */
  console?: Pick<Console, 'log' | 'warn' | 'error' | 'info' | 'debug'>;
  /**
   * 'null' — запросы элементов возвращают null (как исходный проверочный harness);
   * 'inert' — возвращают инертные элементы, чтобы renderAll оригинала выполнился
   * целиком ради своих побочных эффектов в состоянии игры; вывод никуда не попадает.
   */
  dom?: 'null' | 'inert';
};

const noop = () => {};

/** Инертный 2D-контекст canvas: рисование никуда не выводится. */
function inertContext(canvas: unknown): Record<string, unknown> {
  const ctx: Record<string, unknown> = { canvas, globalAlpha: 1, lineWidth: 1, font: '', fillStyle: '', strokeStyle: '', textAlign: 'start', textBaseline: 'alphabetic', imageSmoothingEnabled: true };
  const methods = ['fillRect', 'clearRect', 'strokeRect', 'beginPath', 'closePath', 'moveTo', 'lineTo', 'arc', 'arcTo', 'ellipse', 'rect', 'roundRect', 'quadraticCurveTo', 'bezierCurveTo', 'fill', 'stroke', 'clip', 'save', 'restore', 'translate', 'rotate', 'scale', 'setTransform', 'resetTransform', 'transform', 'drawImage', 'fillText', 'strokeText', 'putImageData', 'setLineDash'];
  for (const m of methods) ctx[m] = noop;
  ctx.measureText = (s: string) => ({ width: String(s).length * 7, actualBoundingBoxAscent: 8, actualBoundingBoxDescent: 2 });
  ctx.createLinearGradient = () => ({ addColorStop: noop });
  ctx.createRadialGradient = () => ({ addColorStop: noop });
  ctx.createPattern = () => null;
  ctx.getImageData = (_x: number, _y: number, w: number, h: number) => ({ width: w, height: h, data: new Uint8ClampedArray(Math.max(0, w * h * 4)) });
  ctx.createImageData = (w: number, h: number) => ({ width: w, height: h, data: new Uint8ClampedArray(Math.max(0, w * h * 4)) });
  ctx.getLineDash = () => [];
  return ctx;
}

/** Инертный элемент: принимает запись свойств, методы ничего не делают. */
function inertElement(tag = 'div', permissive = false): Record<string, unknown> {
  const classes = { add: noop, remove: noop, toggle: () => false, contains: () => false, replace: noop };
  const child = () => (permissive ? inertElement('div', true) : null);
  const el: Record<string, unknown> = {
    tagName: tag.toUpperCase(), nodeName: tag.toUpperCase(), style: { setProperty: noop, getPropertyValue: () => '', removeProperty: noop },
    dataset: {}, classList: classes, hidden: true, value: '', textContent: '', innerHTML: '', children: [], childNodes: [],
    addEventListener: noop, removeEventListener: noop, appendChild: (c: unknown) => c, append: noop, prepend: noop,
    removeChild: (c: unknown) => c, remove: noop, replaceChildren: noop, insertAdjacentHTML: noop, insertBefore: (c: unknown) => c,
    setAttribute: noop, removeAttribute: noop, getAttribute: () => null, hasAttribute: () => false, toggleAttribute: () => false,
    querySelector: child, querySelectorAll: () => [], closest: child, contains: () => false,
    getBoundingClientRect: () => ({ x: 0, y: 0, top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0 }),
    focus: noop, blur: noop, click: noop, scrollTo: noop, scrollIntoView: noop, animate: () => ({ finished: Promise.resolve(), cancel: noop }),
    getContext: () => (permissive ? inertContext(el) : null), cloneNode: () => inertElement(tag, permissive),
    toBlob: (cb: (b: null) => void) => cb(null), toDataURL: () => 'data:,',
    width: 300, height: 150, offsetWidth: 0, offsetHeight: 0, clientWidth: 0, clientHeight: 0, scrollHeight: 0, scrollTop: 0,
  };
  // Соседние узлы: в инертном режиме — новые инертные элементы, чтобы
  // старый renderAll выполнялся до конца и не прерывался на первом обращении.
  for (const k of ['parentNode', 'parentElement', 'firstChild', 'firstElementChild', 'lastChild', 'lastElementChild', 'nextSibling', 'nextElementSibling', 'previousSibling', 'previousElementSibling', 'offsetParent']) {
    let cached: unknown;
    Object.defineProperty(el, k, { configurable: true, enumerable: false, get: () => (permissive ? (cached ??= inertElement('div', true)) : null), set: v => { cached = v; } });
  }
  return el;
}

/**
 * Создаёт таблицу привязок для instantiateCore(env).globals.
 * Набор ключей должен покрывать CORE_META.freeGlobals — это проверяет createCoreGlobals.
 */
export function createCoreGlobals(opts: CoreEnvOptions, required: readonly string[]): Record<string, unknown> {
  const { clock } = opts;
  const net = (api: string, target: unknown) => {
    opts.onNetwork?.({ api, target: String(target) });
  };

  const BaseDate = Date;
  // Date ядра: без аргументов — время управляемых часов.
  class CoreDate extends BaseDate {
    constructor(...args: unknown[]) {
      if (args.length === 0) super(clock.now());
      else super(...(args as [number]));
    }
    static now() { return clock.now(); }
  }

  const coreMath: Math = Object.create(Math);
  Object.defineProperty(coreMath, 'random', { value: () => opts.random(), enumerable: false });

  const permissive = opts.dom === 'inert';
  const head = inertElement('head', permissive);
  // Единственная используемая загрузка: era.js по требованию eraLoad().
  head.appendChild = (node: unknown) => {
    const script = node as { tagName?: string; src?: string; onload?: (() => void) | null; onerror?: ((e: unknown) => void) | null };
    if (String(script?.tagName).toUpperCase() === 'SCRIPT' && script.src) {
      const src = script.src;
      if (!opts.loadScript) {
        net('script', src);
        opts.timers.setTimeout(() => script.onerror?.(new Error('offline')), 0);
      } else {
        opts.loadScript(src).then(() => script.onload?.(), e => script.onerror?.(e));
      }
    }
    return node;
  };

  const document = {
    documentElement: inertElement('html', permissive), body: inertElement('body', permissive), head,
    visibilityState: 'hidden', hidden: true, referrer: '', readyState: 'complete', cookie: '', title: '',
    querySelector: () => (permissive ? inertElement('div', true) : null), querySelectorAll: () => [], getElementById: () => (permissive ? inertElement('div', true) : null), getElementsByTagName: () => [],
    createElement: (tag: string) => inertElement(tag, permissive), createElementNS: (_ns: string, tag: string) => inertElement(tag, permissive),
    createTextNode: () => inertElement('#text'), createDocumentFragment: () => inertElement('#fragment'),
    createTreeWalker: () => ({ nextNode: () => null }),
    addEventListener: noop, removeEventListener: noop, execCommand: () => false, hasFocus: () => false,
    fonts: { ready: Promise.resolve(), load: () => Promise.resolve([]) },
  };

  const path = `/${opts.lang}/`;
  const location = {
    hostname: 'localhost', host: 'localhost', origin: 'http://localhost', protocol: 'http:', port: '',
    pathname: path, search: '', hash: '', href: `http://localhost${path}`,
    reload: noop, assign: noop, replace: noop,
  };
  const navigator = {
    userAgent: 'one-in-eight-billion-mobile/core', language: opts.lang, languages: [opts.lang],
    // Без согласия на аналитику оригинал не включает STATS_ON.
    globalPrivacyControl: true, doNotTrack: '1', onLine: false, maxTouchPoints: 0,
    sendBeacon: (url: unknown) => { net('beacon', url); return false; },
    clipboard: { writeText: () => Promise.reject(new Error('clipboard unavailable in core')) },
    share: undefined, vibrate: () => false,
  };
  const history = { replaceState: noop, pushState: noop, back: noop, state: null, length: 1 };
  // Старый UI не показывается: для него движение всегда сокращено.
  const matchMedia = (query: string) => ({
    matches: /prefers-reduced-motion:\s*reduce/.test(query), media: query,
    addEventListener: noop, removeEventListener: noop, addListener: noop, removeListener: noop,
  });
  const fetch = (input: unknown) => {
    net('fetch', typeof input === 'string' ? input : (input as { url?: string })?.url);
    return Promise.reject(new TypeError('Network is disabled for the game core'));
  };
  const unavailable = (name: string) =>
    class Unavailable { constructor() { throw new Error(`${name} недоступен в core`); } };
  const coreCrypto = {
    getRandomValues: (array: Uint8Array | Uint32Array) => {
      // Случайность ядра проходит через один управляемый поток.
      for (let i = 0; i < array.length; i++) array[i] = Math.floor(opts.random() * 2 ** (8 * array.BYTES_PER_ELEMENT));
      return array;
    },
    randomUUID: () => {
      const h = Array.from({ length: 32 }, () => Math.floor(opts.random() * 16).toString(16));
      h[12] = '4';
      return `${h.slice(0, 8).join('')}-${h.slice(8, 12).join('')}-${h.slice(12, 16).join('')}-${h.slice(16, 20).join('')}-${h.slice(20).join('')}`;
    },
  };
  const performance = { now: () => clock.monotonic(), mark: noop, measure: noop, timeOrigin: 0 };
  const coreConsole = opts.console ?? { log: noop, warn: noop, error: noop, info: noop, debug: noop };

  const window: Record<string, unknown> = {
    // Встраивание через hot-хост: оригинал отдаёт start(), хост его не вызывает.
    claude: { hot: { ready: noop } },
    document, location, navigator, history, localStorage: opts.storage, sessionStorage: opts.storage,
    matchMedia, fetch, performance, crypto: coreCrypto, console: coreConsole,
    innerWidth: 393, innerHeight: 852, scrollY: 0, devicePixelRatio: 1,
    addEventListener: noop, removeEventListener: noop, scrollTo: noop, open: () => null, print: noop,
    setTimeout: opts.timers.setTimeout, clearTimeout: opts.timers.clearTimeout,
    setInterval: opts.timers.setInterval, clearInterval: opts.timers.clearInterval,
    requestAnimationFrame: opts.timers.requestAnimationFrame, cancelAnimationFrame: noop,
    getComputedStyle: () => ({ getPropertyValue: () => '' }),
  };
  window.window = window;
  window.self = window;

  const globals: Record<string, unknown> = {
    // Встроенные объекты JS — без изменений из текущего realm.
    Array, Boolean, Error, Float64Array, Int16Array, Int32Array, Intl, JSON, Map, Number, Object, Promise,
    RegExp, Set, String, Uint8Array, Uint8ClampedArray, WeakMap, encodeURIComponent, isFinite, parseFloat, parseInt,
    // Управляемые источники времени и случайности.
    Math: coreMath, Date: CoreDate, performance, crypto: coreCrypto,
    setTimeout: opts.timers.setTimeout, clearTimeout: opts.timers.clearTimeout,
    setInterval: opts.timers.setInterval, clearInterval: opts.timers.clearInterval,
    requestAnimationFrame: opts.timers.requestAnimationFrame,
    // Хост-объекты браузера.
    window, document, location, navigator, history, localStorage: opts.storage, matchMedia, fetch,
    console: coreConsole, addEventListener: noop, getComputedStyle: window.getComputedStyle,
    innerWidth: window.innerWidth, innerHeight: window.innerHeight, scrollY: 0,
    atob: (s: string) => globalThis.atob(s), btoa: (s: string) => globalThis.btoa(s),
    TextEncoder: globalThis.TextEncoder, URL: globalThis.URL, URLSearchParams: globalThis.URLSearchParams,
    Blob: globalThis.Blob, Response: globalThis.Response,
    CompressionStream: globalThis.CompressionStream, DecompressionStream: globalThis.DecompressionStream,
    File: unavailable('File'), FileReader: unavailable('FileReader'), Worker: unavailable('Worker'),
    IntersectionObserver: unavailable('IntersectionObserver'), ResizeObserver: unavailable('ResizeObserver'),
    HTMLCanvasElement: unavailable('HTMLCanvasElement'), CanvasRenderingContext2D: unavailable('CanvasRenderingContext2D'),
    NodeFilter: { SHOW_TEXT: 4, SHOW_ELEMENT: 1 }, IDBKeyRange: unavailable('IDBKeyRange'),
    // IndexedDB старых жизней (PDB) в этой версии не подключён: оригинал обрабатывает отказ открытия.
    indexedDB: undefined,
  };
  const missing = required.filter(n => !(n in globals) && !isLate(n));
  if (missing.length) throw new Error(`Окружение core не покрывает: ${missing.join(', ')}`);
  return globals;
}

const LATE = new Set(['ERA', 'AR_G', 'COUNTRY_A', 'COUNTRY_G', 'COUNTRY_GX', 'COUNTRY_IN', 'DE_G', 'IT_G', 'PT_G', 'RU_CS', 'RU_G', 'ZH_HK_T']);
const isLate = (n: string) => LATE.has(n);

/** Хранилище с отдельным пространством ключей поверх localStorage браузера. */
export function namespacedStorage(base: StorageLike, prefix: string): StorageLike {
  const own = () => {
    const keys: string[] = [];
    for (let i = 0; i < base.length; i++) {
      const k = base.key(i);
      if (k && k.startsWith(prefix)) keys.push(k.slice(prefix.length));
    }
    return keys;
  };
  return {
    getItem: k => base.getItem(prefix + k),
    setItem: (k, v) => base.setItem(prefix + k, String(v)),
    removeItem: k => base.removeItem(prefix + k),
    key: i => own()[i] ?? null,
    get length() { return own().length; },
  };
}

/** Хранилище в памяти для проверок и для режима без localStorage. */
export function memoryStorage(initial?: Iterable<[string, string]>): StorageLike & { dump(): Record<string, string> } {
  const store = new Map<string, string>(initial);
  return {
    getItem: k => store.get(String(k)) ?? null,
    setItem: (k, v) => { store.set(String(k), String(v)); },
    removeItem: k => { store.delete(String(k)); },
    key: i => [...store.keys()][i] ?? null,
    get length() { return store.size; },
    dump: () => Object.fromEntries(store),
  };
}
