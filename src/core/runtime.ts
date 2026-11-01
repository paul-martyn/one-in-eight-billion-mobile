// Хост производного core. Единственное место, где создаётся экземпляр игры;
// адаптер получает CoreHost и больше никто.
import { createCoreGlobals, CoreTimers, namespacedStorage, memoryStorage, type CoreClock, type NetworkAttempt, type StorageLike } from './env.ts';
import { CoreEntropy } from './entropy.ts';

/** Пространство ключей веб-версии: не пересекается с сохранениями прежней копии игры. */
export const STORAGE_PREFIX = '1in8b-mobile/v1:';
/** Состояние потока случайности хранится рядом с сохранением жизни. */
export const ENTROPY_KEY = 'mobile.entropy';
// Оригинал разделял архив и жизнь по языкам. Здесь профиль общий.
export const sharedSaveKey = (key: string) => key.replace(/^one8b\.(?:ru|es|fr|de)\.(save|lives|past|unlived)\./, 'one8b.en.$1.');

export type CoreErrorRecord = { at: number; source: 'hook' | 'timer' | 'command' | 'read'; message: string };

export type CoreHost = {
  readonly top: Record<string, any>;
  readonly entropy: CoreEntropy;
  readonly timers: CoreTimers;
  readonly storage: StorageLike;
  readonly network: NetworkAttempt[];
  readonly errors: CoreErrorRecord[];
  /** Таймеры старого интерфейса, снятые при загрузке. */
  readonly discardedBootTimers: string[];
  readonly meta: { sourceSha256: string; generator: string };
  /** Время часов core (мс эпохи). */
  now(): number;
  /**
   * Чтение для экранов в «песочнице»: функции оригинала работают с копией S,
   * собственным rnd и собственным Math.random. Ленивые розыгрыши и мемо-поля
   * внутри представлений не затрагивают настоящую жизнь.
   */
  read<T>(fn: (top: Record<string, any>) => T): T;
  /** Выполнить задачи core, срок которых наступил. */
  drainTimers(): void;
  recordError(source: CoreErrorRecord['source'], error: unknown): void;
};

type CoreModule = {
  CORE_META: { sourceSha256: string; generator: string; freeGlobals: Record<string, string> };
  instantiateCore(env: { globals: Record<string, unknown> }): { top: Record<string, any>; setLateGlobal(name: string, value: unknown): void };
};

export type HostOptions = {
  /** localStorage браузера; null — хранение в памяти (приватный режим, тесты). */
  storage: StorageLike | null;
  /** Начальная строка потока, если сохранённого состояния нет. */
  seed: string;
  clock?: CoreClock;
  /** Случайность только для чтений в песочнице (по умолчанию Math.random браузера). */
  viewRandom?: () => number;
  loadEra?: () => Promise<unknown>;
  lang?: string;
};

const realClock: CoreClock = { now: () => Date.now(), monotonic: () => performance.now() };

/** Создание хоста из уже загруженного модуля (используется и в Node-проверках). */
export function createHost(mod: CoreModule, opts: HostOptions): CoreHost {
  const clock = opts.clock ?? realClock;
  const storage = opts.storage ? namespacedStorage(opts.storage, STORAGE_PREFIX) : memoryStorage();
  const timers = new CoreTimers(clock);
  const network: NetworkAttempt[] = [];
  const errors: CoreErrorRecord[] = [];
  const recordError = (source: CoreErrorRecord['source'], error: unknown) => {
    const message = error instanceof Error ? `${error.message}\n${error.stack ?? ''}` : String(error);
    errors.push({ at: clock.now(), source, message });
    if (errors.length > 200) errors.shift();
    console.error(`[core:${source}]`, error);
  };

  // Поток продолжается с сохранённого состояния, если оно есть.
  const savedRaw = storage.getItem(ENTROPY_KEY);
  const entropy = savedRaw !== null && Number.isFinite(Number(savedRaw)) ? new CoreEntropy(Number(savedRaw)) : CoreEntropy.fromSeed(opts.seed);
  const viewRandom = opts.viewRandom ?? Math.random;
  // При загрузке оригинал один раз берёт Math.random для идентификатора сессии
  // аналитики (SID, game.en.js:198256). Это число берётся из источника
  // представления, чтобы перезагрузка не сдвигала игровой поток.
  let randomSource: () => number = viewRandom;

  // Любая запись core (сохранение жизни, архив прошлых жизней, настройки)
  // сопровождается состоянием потока: перезагрузка продолжает тот же поток
  // с того места, где было сделано последнее сохранение.
  let sandboxed = false;
  const coupled: StorageLike = {
    getItem: k => storage.getItem(sharedSaveKey(k)),
    setItem: (k, v) => {
      if (sandboxed) throw new Error(`Запись ${k} из чтения представления запрещена`);
      storage.setItem(sharedSaveKey(k), v);
      storage.setItem(ENTROPY_KEY, String(entropy.getState()));
    },
    removeItem: k => {
      if (sandboxed) throw new Error(`Удаление ${k} из чтения представления запрещено`);
      storage.removeItem(sharedSaveKey(k));
    },
    key: i => storage.key(i),
    get length() { return storage.length; },
  };

  let core: ReturnType<CoreModule['instantiateCore']> | null = null;
  const globals = createCoreGlobals({
    random: () => randomSource(),
    clock,
    storage: coupled,
    timers,
    lang: opts.lang ?? 'en',
    dom: 'inert',
    onNetwork: a => network.push(a),
    loadScript: async src => {
      if (!/^\/era\.js(\?|$)/.test(src) || !opts.loadEra) throw new Error(`Неизвестный скрипт ${src}`);
      core!.setLateGlobal('ERA', await opts.loadEra());
    },
    console: { log: () => {}, info: () => {}, debug: () => {}, warn: (...a: unknown[]) => console.warn('[core]', ...a), error: (...a: unknown[]) => recordError('hook', new Error(a.map(String).join(' '))) },
  }, Object.keys(mod.CORE_META.freeGlobals));
  core = mod.instantiateCore({ globals });
  randomSource = entropy.next;
  const discardedBootTimers = timers.discardAll();
  const top = core.top;
  // Верхнеуровневые let ядра (у них есть сеттер в таблице доступа): кэши,
  // счётчики, состояние последнего действия. Песочница восстанавливает их все.
  const letNames = Object.keys(top).filter(k => Object.getOwnPropertyDescriptor(top, k)?.set);
  const ring = [top.L_RT, top.L_RS].filter(Array.isArray) as unknown[][];

  return {
    top,
    entropy,
    timers,
    storage,
    network,
    errors,
    discardedBootTimers,
    meta: { sourceSha256: mod.CORE_META.sourceSha256, generator: mod.CORE_META.generator },
    now: () => clock.now(),
    read<T>(fn: (t: Record<string, any>) => T): T {
      if (sandboxed) return fn(top);
      const S0 = top.S, n0 = top.RND_N as number, f0 = top.rndF, d0 = entropy.draws, s0 = entropy.getState();
      const timers0 = timers.pending;
      const lets0 = letNames.map(k => top[k]);
      const ui0 = { ...top.UI };
      const ring0 = ring.map(a => a.slice());
      sandboxed = true;
      randomSource = viewRandom;
      top.rndF = viewRandom;
      if (S0) top.S = structuredClone(S0);
      try {
        return fn(top);
      } finally {
        letNames.forEach((k, i) => { if (top[k] !== lets0[i]) top[k] = lets0[i]; });
        top.S = S0;
        top.RND_N = n0;
        top.rndF = f0;
        for (const k of Object.keys(top.UI)) if (!(k in ui0)) delete top.UI[k];
        Object.assign(top.UI, ui0);
        ring.forEach((a, i) => { for (let j = 0; j < a.length; j++) a[j] = ring0[i]![j]; });
        randomSource = entropy.next;
        sandboxed = false;
        if (entropy.draws !== d0 || entropy.getState() !== s0) recordError('read', new Error('Песочница не удержала поток случайности'));
        if (timers.pending !== timers0) recordError('read', new Error('Чтение представления поставило таймер core'));
      }
    },
    drainTimers() {
      timers.drain(clock.monotonic(), (e, label) => recordError('timer', new Error(`${label}: ${e instanceof Error ? e.message : String(e)}`)));
    },
    recordError,
  };
}

/** Загрузка в браузере: модуль ~7 МБ подгружается отдельно от оболочки приложения. */
export async function bootCore(opts: Omit<HostOptions, 'loadEra'>): Promise<CoreHost> {
  const loaders = {
    en: () => import('./generated/game.en.core.js'),
    ru: () => import('./generated/game.ru.core.js'),
    es: () => import('./generated/game.es.core.js'),
    fr: () => import('./generated/game.fr.core.js'),
    de: () => import('./generated/game.de.core.js'),
  };
  const lang = opts.lang && opts.lang in loaders ? opts.lang as keyof typeof loaders : 'en';
  const mod = (await loaders[lang]()) as unknown as CoreModule;
  return createHost(mod, { ...opts, loadEra: async () => (await import('./generated/era.core.js')).ERA });
}
