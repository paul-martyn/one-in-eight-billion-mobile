// Адаптер между новым интерфейсом и производным core.
//
// - Единственный владелец экземпляра игры; UI получает только снимки.
// - Каждая команда применяется ровно один раз: повтор с тем же id или
//   устаревшими ожиданиями отклоняется.
// - Игровое время идёт одним источником: кадры браузера переводятся в шаги
//   фиксированной длины (1/60 с реального времени), поэтому исход не зависит
//   от частоты кадров. Время идёт только когда интерфейс открыл экран жизни
//   без перекрывающих окон и вкладка видима.
import type { CoreHost } from '../core/runtime';
import { CoreEntropy } from '../core/entropy.ts';
import * as cmd from './commands.ts';
import { installHooks } from './hooks.ts';
import { MetaEconomy, type MetaView } from './meta.ts';
import { lifePrefsView, type LifePrefsView } from './vm/spend.ts';
import { lifeReward } from './vm/rewards.ts';
import {
  certificateVM, endedVM, familyRows, journalEntry, lifeVM, pastLives, resumeVM,
  type CertificateVM, type EndedVM, type FamilyRowVM, type JournalEntryVM, type LifeVM, type PastLifeVM, type ResumeVM,
} from './viewModels.ts';

export const STEP_SECONDS = 1 / 60;
const MAX_FRAME_SECONDS = 0.25; // как frame0: t = min(0.25, Δ)

export type Notice = { id: number; kind: 'ffStopped' | 'jobLost' | 'coreError' | 'saved' | 'focusPause' | 'noEnergy' | 'spend'; detail?: string };
export type LifePhase = 'none' | 'birth' | 'life' | 'dead';
export type Snapshot = {
  version: number;
  status: 'booting' | 'ready' | 'error';
  fatal: { message: string; detail: string } | null;
  lifeSeq: number;
  lifePhase: LifePhase;
  companionsReady: boolean;
  certificate: CertificateVM | null;
  life: LifeVM | null;
  journal: JournalEntryVM[];
  family: FamilyRowVM[];
  ended: EndedVM | null;
  resume: ResumeVM;
  pastLives: PastLifeVM[];
  notices: Notice[];
  /** Записи, добавленные последним выбором (для ответа в окне решения). */
  lastChoice: { decisionId: string; label: string; entries: JournalEntryVM[] } | null;
  /** Результат последнего действия листа «Spend & invest». */
  lastSpend: { key: string; entries: JournalEntryVM[] } | null;
  coreErrorCount: number;
  networkBlocked: number;
  /** Энергия и валюты мобильной версии (не механика оригинала). */
  meta: MetaView | null;
  /** Настройки следующей жизни (UI.prefs оригинала). */
  prefs: LifePrefsView | null;
  /** Идёт «Skip to the end». */
  skipping: boolean;
};

/**
 * Журнал команд одной жизни (формат docs/replay-format.md): начальное
 * состояние потока, время часов при каждой команде и номер шага времени.
 * Воспроизведение на том же core даёт ту же жизнь.
 */
export type ReplayCommand = { step: number; at: number; cmd: string; args: (string | number | boolean)[] };
export type Replay = { format: '1in8b-replay/1'; core: string; generator: string; entropy: number; prefs: Record<string, unknown>; stepSeconds: number; commands: ReplayCommand[]; endStep?: number };

const EMPTY: Snapshot = {
  version: 0, status: 'booting', fatal: null, lifeSeq: 0, lifePhase: 'none', companionsReady: false, certificate: null, life: null,
  journal: [], family: [], ended: null, resume: null, pastLives: [], notices: [], lastChoice: null, lastSpend: null, coreErrorCount: 0, networkBlocked: 0,
  meta: null, prefs: null, skipping: false,
};

export type AdapterPolicy = {
  /** Допустимые значения темпа жизни (минуты до ожидаемой продолжительности, UI.prefs.pace). */
  paceChoices?: number[];
  /** Темп, если сохранённый не входит в paceChoices. */
  defaultPace?: number;
};

export class GameAdapter {
  private readonly policy: AdapterPolicy;
  constructor(policy: AdapterPolicy = {}) { this.policy = policy; }
  private host: CoreHost | null = null;
  private meta: MetaEconomy | null = null;
  private snap: Snapshot = EMPTY;
  private listeners = new Set<() => void>();
  private progressListeners = new Set<() => void>();
  private done = new Set<string>();
  private clockActive = false;
  private raf = 0;
  private lastFrame = 0;
  private acc = 0;
  private certNo: string | null = null;
  private journalCache = new WeakMap<object, JournalEntryVM>();
  private noticeSeq = 0;
  private lastPhase: LifePhase = 'none';
  /** Для тестов и отладки: сколько шагов времени выполнено. */
  steps = 0;
  private replay: Replay | null = null;

  /** Журнал команд текущей жизни (null после перезагрузки посреди жизни). */
  exportReplay(): Replay | null {
    return this.replay ? { ...structuredClone(this.replay), endStep: this.steps } : null;
  }
  private rec(cmd: string, ...args: (string | number | boolean)[]): void {
    if (this.replay && this.host) this.replay.commands.push({ step: this.steps, at: this.host.now(), cmd, args });
  }

  getSnapshot = (): Snapshot => this.snap;
  subscribe = (l: () => void) => { this.listeners.add(l); return () => { this.listeners.delete(l); }; };
  /** Доля прошедшего года — обновляется каждый кадр отдельно от полного снимка. */
  getProgress = (): number => (this.host?.top.S?.phase === 'life' ? Math.max(0, Math.min(1, this.host.top.S.t)) : 0);
  subscribeProgress = (l: () => void) => { this.progressListeners.add(l); return () => { this.progressListeners.delete(l); }; };

  private booting: Promise<void> | null = null;
  private skipping = false;
  /** Загрузка core; повторные вызовы (StrictMode, ремонт) получают ту же загрузку. */
  boot(load: () => Promise<CoreHost>): Promise<void> {
    this.booting ??= this.boot0(load);
    return this.booting;
  }
  /** Повторить загрузку после ошибки. */
  retry(load: () => Promise<CoreHost>): Promise<void> {
    if (this.host) return Promise.resolve();
    this.booting = null;
    this.publish({ status: 'booting', fatal: null });
    return this.boot(load);
  }

  private async boot0(load: () => Promise<CoreHost>): Promise<void> {
    try {
      const host = await load();
      this.host = host;
      this.meta = new MetaEconomy(host.storage);
      // Темп следующей жизни из набора мобильной версии (10/30 мин вместо 30/60/90 оригинала).
      const pace = Number(host.top.UI.prefs.pace);
      if (this.policy.paceChoices && this.policy.defaultPace != null && !this.policy.paceChoices.includes(pace)) cmd.setPace(host.top, this.policy.defaultPace);
      installHooks(host.top, {
        log: () => {},
        decision: () => {},
        death: () => {},
        year: () => {},
        focusPause: () => this.notice('focusPause'),
        error: e => { host.recordError('hook', e); this.notice('coreError', e instanceof Error ? e.message : String(e)); },
      });
      if (typeof document !== 'undefined') {
        document.addEventListener('visibilitychange', this.onVisibility);
        addEventListener('pagehide', this.onPageHide);
      }
      this.resumeFromSave();
      this.publish({ status: 'ready' });
    } catch (error) {
      this.fail(error);
    }
  }

  dispose(): void {
    cancelAnimationFrame(this.raf);
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.onVisibility);
      removeEventListener('pagehide', this.onPageHide);
    }
  }

  // ---- Команды ----

  /** Новая жизнь. expectLifeSeq защищает от двойного нажатия. */
  async startLife(id: string, expectLifeSeq: number): Promise<boolean> {
    if (!this.accept(id) || expectLifeSeq !== this.snap.lifeSeq) return false;
    const host = this.need();
    const T = host.top;
    // Новая жизнь стоит энергии (мобильная мета-экономика).
    if (!this.meta || !this.meta.spendLife(host.now())) {
      this.notice('noEnergy');
      return false;
    }
    try {
      if (cmd.startNeedsEra(T)) await new Promise<void>((resolve, reject) => T.eraLoad().then(resolve, reject));
      this.certNo = null;
      this.steps = 0;
      this.replay = { format: '1in8b-replay/1', core: host.meta.sourceSha256, generator: host.meta.generator, entropy: host.entropy.getState(), prefs: JSON.parse(JSON.stringify(T.UI.prefs)), stepSeconds: STEP_SECONDS, commands: [] };
      this.rec('startLife');
      const compRng = new CoreEntropy(host.entropy.getState() ^ 0x5bd1e995);
      cmd.startLife(T, {
        now: host.now(),
        companionRng: compRng.next,
        onCompanions: () => this.publish({ companionsReady: true, certificate: this.certNo ? this.buildCertificate() : this.snap.certificate }),
      });
      this.publishLife({ lifeSeq: this.snap.lifeSeq + 1, companionsReady: false, certificate: null, ended: null, lastChoice: null, lastSpend: null, family: [] });
      this.pumpTimers();
      return true;
    } catch (error) {
      this.meta?.refundLife();
      this.fail(error);
      return false;
    }
  }

  /** Свидетельство о рождении: один раз на жизнь (после сопутствующих жизней). */
  revealCertificate(id: string): boolean {
    const T = this.need().top;
    if (!this.accept(id) || !T.S || T.S.phase !== 'birth' || T.UI.compsOn) return false;
    if (this.certNo) return true;
    this.rec('revealCertificate');
    return this.guard(() => {
      this.certNo = cmd.revealCertificate(T);
      this.publish({ certificate: this.buildCertificate() });
    });
  }

  beginLife(id: string): boolean {
    const T = this.need().top;
    if (!this.accept(id) || !T.S || T.S.phase !== 'birth' || !this.certNo) return false;
    this.rec('beginLife');
    return this.guard(() => {
      cmd.beginLife(T, this.need().now());
      this.afterRender();
      this.publishLife();
    });
  }

  choose(id: string, decisionId: string, key: string, note = ''): boolean {
    const T = this.need().top;
    if (!this.accept(id) || !T.S?.pending || T.S.pending.id !== decisionId) return false;
    const label = (T.S.pending.view.choices || []).find((c: { k: string }) => c.k === key)?.label ?? '';
    const before = T.S.log.length;
    this.rec('choose', decisionId, key, note);
    return this.guard(() => {
      const ok = cmd.chooseOption(T, decisionId, key, note);
      if (!ok) return;
      this.afterRender();
      const entries = T.S.log.slice(before).map((e: object, j: number) => this.entry(e, before + j));
      this.publishLife({ lastChoice: { decisionId, label: String(label), entries } });
    }, () => {
      // Как pickChoice: ошибка решения закрывает его, жизнь продолжается.
      if (T.S) T.S.pending = null;
      this.publishLife();
    });
  }

  togglePause(id: string): boolean {
    const T = this.need().top;
    if (!this.accept(id) || T.S?.phase !== 'life' || T.S.pending) return false;
    this.rec('togglePause');
    return this.guard(() => { cmd.togglePause(T); this.publishLife(); });
  }
  setPaused(id: string, paused: boolean): boolean {
    const T = this.need().top;
    if (!this.accept(id) || T.S?.phase !== 'life') return false;
    this.rec('setPaused', paused);
    return this.guard(() => { cmd.setPaused(T, paused); this.publishLife(); });
  }
  setSpeed(id: string, speed: number): boolean {
    const T = this.need().top;
    if (!this.accept(id) || T.S?.phase !== 'life') return false;
    this.rec('setSpeed', speed);
    return this.guard(() => { cmd.setSpeed(T, speed); this.publishLife(); });
  }
  toggleFastForward(id: string): boolean {
    const T = this.need().top;
    if (!this.accept(id) || T.S?.phase !== 'life' || T.S.pending) return false;
    this.rec('toggleFastForward');
    return this.guard(() => { cmd.toggleFastForward(T); this.publishLife(); });
  }
  setFocus(id: string, focus: string): boolean {
    const T = this.need().top;
    if (!this.accept(id) || T.S?.phase !== 'life' || !T.focusOptions().includes(focus)) return false;
    this.rec('setFocus', focus);
    return this.guard(() => { cmd.setFocus(T, focus); this.publishLife(); });
  }
  /** Выход в хаб: жизнь сохраняется и может быть продолжена. */
  leaveLife(id: string): boolean {
    const T = this.need().top;
    if (!this.accept(id)) return false;
    this.setClockActive(false);
    return this.guard(() => {
      if (T.S && (T.S.phase === 'life' || T.S.phase === 'birth')) T.save();
      this.publish({ resume: this.read(resumeVM), pastLives: this.read(pastLives) });
    });
  }
  /** Продолжить сохранённую жизнь (restore0, 206472-206489). */
  resume(id: string): boolean {
    if (!this.accept(id)) return false;
    return this.guard(() => this.resumeFromSave());
  }
  // ---- «Spend & invest» и настройки ----

  /** Вход во вкладку Activities или Money (изменяющая часть openShop). */
  openSpend(id: string): boolean {
    const T = this.need().top;
    if (!this.accept(id) || T.S?.phase !== 'life') return false;
    this.rec('openSpend');
    return this.guard(() => { cmd.openSpend(T); this.publishLife(); });
  }
  /** Покупка или действие листа; рискованные действия UI подтверждает до вызова. */
  buy(id: string, key: string): boolean {
    const T = this.need().top;
    if (!this.accept(id) || T.S?.phase !== 'life' || T.S.pending) return false;
    const before = T.S.log.length;
    this.rec('buy', key);
    let ok = false;
    this.guard(() => {
      const s = cmd.buy(T, key);
      ok = !!s;
      if (s) this.notice('spend', String(s));
      const entries = T.S.log.slice(before).map((e: object, j: number) => this.entry(e, before + j));
      this.publishLife(s ? { lastSpend: { key, entries } } : {});
    });
    return ok;
  }
  private lifestyle(id: string, name: string, arg: string, run: (T: Record<string, any>) => unknown): boolean {
    const T = this.need().top;
    if (!this.accept(id) || T.S?.phase !== 'life') return false;
    this.rec(name, arg);
    return this.guard(() => { run(T); this.publishLife(); });
  }
  setGift(id: string, v: 'full' | 'some' | 'none') { return this.lifestyle(id, 'setGift', v, T => cmd.setGift(T, v)); }
  setDiet(id: string, v: 'usual' | 'good' | 'out') { return this.lifestyle(id, 'setDiet', v, T => cmd.setDiet(T, v)); }
  toggleHabit(id: string, set: string) { return this.lifestyle(id, 'toggleHabit', set, T => cmd.toggleHabit(T, set)); }
  setInsurance(id: string, v: 'base' | 'more') { return this.lifestyle(id, 'setInsurance', v, T => cmd.setInsurance(T, v)); }
  setSurname(id: string, v: 'f' | 'm') { return this.lifestyle(id, 'setSurname', v, T => cmd.setSurname(T, v)); }
  setInvest(id: string, v: string) { return this.lifestyle(id, 'setInvest', v, T => cmd.setInvest(T, v)); }

  /** Настройки следующей жизни: режим рождения, эпоха, год, темп (UI.prefs оригинала). */
  setLifePref(id: string, pref: { mode?: 'birth' | 'pop'; era?: 'now' | 'past' | 'future' | 'any'; eraYear?: 'r' | number; pace?: number }): boolean {
    const T = this.need().top;
    if (!this.accept(id)) return false;
    return this.guard(() => {
      if (pref.mode) cmd.setBirthMode(T, pref.mode);
      if (pref.era) cmd.setEra(T, pref.era);
      if (pref.eraYear != null) cmd.setEraYear(T, pref.eraYear);
      if (pref.pace != null) cmd.setPace(T, pref.pace);
      this.publish({ prefs: lifePrefsView(T) });
    });
  }

  /** Темп рождений и смертей в мире для счётчиков (tickCounters 199715; константы оригинала). */
  worldRates(): { birthsPerSec: number; deathsPerSec: number } | null {
    const T = this.host?.top;
    if (!T) return null;
    return { birthsPerSec: (T.TOTAL_BIRTHS / T.SEC_YEAR) * 1.005, deathsPerSec: T.DEATHS_PER_YEAR / T.SEC_YEAR };
  }

/** «Skip to the end»: остаток жизни проживается без игрока — решения отвечает autoChoice
   * оригинала (как его авто-режим), время идёт обычными шагами с ускорением «до решения».
   * Выполняется порциями по ~12 мс между кадрами; порядок вызовов тот же, ввод на это время закрыт. */
  async skipToEnd(id: string): Promise<boolean> {
    const host = this.need();
    const T = host.top;
    if (!this.accept(id) || T.S?.phase !== 'life') return false;
    this.rec('skipToEnd');
    this.setClockActive(false);
    this.skipping = true;
    this.publish({ skipping: true });
    let ok = true;
    try {
      for (let guard = 0; T.S.phase === 'life' && guard < 3_000_000; ) {
        const t0 = performance.now();
        ok = this.guard(() => {
          while (T.S.phase === 'life' && performance.now() - t0 < 12 && guard++ < 3_000_000) {
            if (T.S.pending) { cmd.autoAnswer(T); continue; }
            if (T.S.paused) cmd.setPaused(T, false);
            T.S.ff = true;
            cmd.step(T, STEP_SECONDS, T.lossNew);
            this.steps++;
            host.drainTimers();
          }
        });
        if (!ok) break;
        this.progressListeners.forEach(l => l());
        if (T.S.phase === 'life') await new Promise(r => setTimeout(r, 0));
      }
    } finally {
      this.skipping = false;
      // Пропуск прерван ошибкой core: жизнь продолжается, но без «до решения», которое включил пропуск.
      if (T.S?.phase === 'life') T.S.ff = false;
      this.afterRender();
      this.publishLife({ lastChoice: null, skipping: false });
    }
    return ok;
  }

  /** Claim награды за прожитую жизнь (мета-слой). */
  claimReward(id: string): boolean {
    if (!this.accept(id) || !this.meta || !this.meta.claim()) return false;
    this.publish({});
    return true;
  }
  /** Вкладка Lives открыта: снять бейдж новых жизней. */
  seeLives(): void {
    if (!this.meta) return;
    this.meta.seeLives();
    this.publish({});
  }

  /** Обновить энергию (восстановление по времени) — вызывает таймер обратного отсчёта UI. */
  refreshMeta(): void {
    if (this.host && this.meta) this.publish({ meta: this.meta.view(this.host.now()) });
  }

  /** Данные экрана из функций оригинала в песочнице. Ошибка фиксируется и возвращается null. */
  view<T>(builder: (top: Record<string, any>) => T): T | null {
    const host = this.host;
    if (!host || !host.top.S) return null;
    try {
      return host.read(builder);
    } catch (error) {
      host.recordError('read', error);
      return null;
    }
  }

  /** Сохранённый выбор валюты текущего языка, читается core при загрузке. */
  currencyKey(): string | null {
    return this.host ? this.host.storage.getItem(this.host.top.LANG === 'es' ? this.host.top.ES_CUR_KEY : this.host.top.CUR_KEY) : null;
  }

  /** Формат уже готовых строк core; у испанского зависит и от выбранной валюты. */
  formatLocale(): string { return this.host?.top.LC.loc ?? 'en-US'; }

  /** Набор валют выбранного языка, включая особый набор ES_CURS оригинала. */
  currencies(lang?: string): { key: string; sym: string; label: string; current: boolean }[] {
    const T = this.host?.top;
    if (!T) return [];
    const locale = lang ?? T.LANG;
    const sets = locale === 'es' ? T.ES_CURS : T.CUR_SETS[locale];
    if (!sets) return [];
    const storageKey = locale === 'es' ? T.ES_CUR_KEY : 'one8b.cur.' + locale;
    const saved = this.host?.storage.getItem(storageKey);
    const fallback = locale === T.LANG ? (locale === 'es' ? T.ES_CUR : T.CUR) : sets.base;
    const selected = saved && saved in sets ? saved : fallback;
    return Object.entries(sets as Record<string, unknown>)
      .filter(([k]) => k !== 'base')
      .map(([key, v]) => {
        const c = v as { sym?: string; lbl?: string; pre?: string; post?: string; u?: string; place?: string };
        return { key, sym: String(c.sym ?? c.pre ?? c.post ?? c.u ?? '').trim(), label: String(c.lbl ?? c.place ?? key), current: key === selected };
      });
  }

  /**
   * Сменить валюту: оригинал сохраняет выбор и перезагружает страницу (initCur, 204531).
   * Здесь жизнь сохраняется и экземпляр core создаётся заново из того же хранилища.
   */
  async setCurrency(id: string, key: string, load: () => Promise<CoreHost>): Promise<boolean> {
    return this.setLanguageCurrency(id, this.host?.top.LANG ?? 'en', key, load);
  }

  /** Язык и валюта применяются вместе. Состояние, RNG и номер свидетельства сохраняются. */
  async setLanguageCurrency(id: string, lang: string, key: string, load: () => Promise<CoreHost>): Promise<boolean> {
    const host = this.host;
    if (!host || !this.accept(id)) return false;
    const T = host.top;
    if (!['en', 'ru', 'es', 'fr', 'de'].includes(lang) || !this.currencies(lang).some(c => c.key === key)) return false;
    const storageKey = lang === 'es' ? T.ES_CUR_KEY : 'one8b.cur.' + lang;
    if (lang === T.LANG && key === (lang === 'es' ? T.ES_CUR : T.CUR)) {
      // Та же валюта: только запоминаем явный выбор (первый запуск пройден).
      host.storage.setItem(storageKey, key);
      return true;
    }
    this.setClockActive(false);
    const previousCurrency = host.storage.getItem(storageKey);
    try {
      if (T.S && (T.S.phase === 'life' || T.S.phase === 'birth')) T.save();
      host.storage.setItem(storageKey, key);
      const next = await load();
      // Без restore/renderAll: смена языка не расходует игровой RNG.
      next.top.S = T.S;
      next.top.RND_N = T.RND_N;
      if (next.top.S?.phase === 'life') { next.top.S.paused = true; next.top.S.ff = false; }
      Object.assign(next.top.UI.prefs, T.UI.prefs);
      this.host = next;
      installHooks(next.top, {
        log: () => {}, decision: () => {}, death: () => {}, year: () => {},
        focusPause: () => this.notice('focusPause'),
        error: e => { next.recordError('hook', e); this.notice('coreError', String(e)); },
      });
      this.journalCache = new WeakMap();
      this.replay = null;
      this.afterRender();
      this.publishLife({ certificate: this.certNo ? this.buildCertificate() : null,
        pastLives: this.read(pastLives), resume: this.read(resumeVM), lastChoice: null, lastSpend: null, notices: [] });
      return true;
    } catch (error) {
      this.host = host;
      if (previousCurrency == null) host.storage.removeItem(storageKey);
      else host.storage.setItem(storageKey, previousCurrency);
      host.recordError('command', error);
      return false;
    }
  }

  dismissLastSpend(): void {
    if (this.snap.lastSpend) this.publish({ lastSpend: null });
  }
  dismissLastChoice(): void {
    if (this.snap.lastChoice) this.publish({ lastChoice: null });
  }
  dismissNotice(noticeId: number): void {
    this.publish({ notices: this.snap.notices.filter(n => n.id !== noticeId) });
  }

  /** Время идёт, только пока виден экран жизни без перекрытий. */
  setClockActive(active: boolean): void {
    if (this.clockActive === active) return;
    this.clockActive = active;
    this.acc = 0;
    cancelAnimationFrame(this.raf);
    if (active && typeof requestAnimationFrame === 'function') {
      this.lastFrame = performance.now();
      this.raf = requestAnimationFrame(this.frame);
    }
  }

  /** Продвинуть игровое время вручную (тесты, отладка): seconds реального времени. */
  advance(seconds: number): void {
    this.acc += seconds;
    this.runSteps();
  }

  // ---- Внутреннее ----

  private frame = (now: number) => {
    if (!this.clockActive) return;
    this.raf = requestAnimationFrame(this.frame);
    const dt = Math.min(MAX_FRAME_SECONDS, Math.max(0, (now - this.lastFrame) / 1000));
    this.lastFrame = now;
    if (typeof document !== 'undefined' && document.hidden) return;
    this.acc += dt;
    this.runSteps();
  };

  private runSteps(): void {
    const host = this.host;
    if (!host) return;
    const T = host.top;
    let changed = false;
    const age0 = T.S?.age, log0 = T.S?.log.length, pend0 = T.S?.pending;
    try {
      while (this.acc >= STEP_SECONDS) {
        this.acc -= STEP_SECONDS;
        const S = T.S;
        if (!S || S.phase !== 'life' || S.pending || S.paused) { this.acc = 0; break; }
        const notices = cmd.step(T, STEP_SECONDS, T.lossNew);
        this.steps++;
        host.drainTimers();
        for (const n of notices) this.notice(n.kind, n.kind === 'ffStopped' ? n.reason : n.owner ? 'owner' : undefined);
        if (T.S.phase !== 'life' || T.S.pending) { this.acc = 0; changed = true; break; }
      }
    } catch (error) {
      this.fail(error);
      return;
    }
    const S = T.S;
    if (changed || S?.age !== age0 || S?.log.length !== log0 || S?.pending !== pend0 || S?.phase !== this.lastPhase) {
      if (S?.age !== age0) this.afterRender();
      this.publishLife();
    }
    this.progressListeners.forEach(l => l());
  }

  private onVisibility = () => {
    // Оригинал сохраняет при скрытии вкладки (208610-208616).
    if (document.hidden) this.saveQuietly();
    else this.lastFrame = performance.now();
  };
  private onPageHide = () => this.saveQuietly();
  private saveQuietly() {
    const T = this.host?.top;
    if (T?.S && (T.S.phase === 'life' || T.S.phase === 'birth')) {
      try { T.save(); } catch (e) { this.host?.recordError('command', e); }
    }
  }

  private resumeFromSave(): void {
    const host = this.need();
    const T = host.top;
    const saved = T.lsGet(T.SAVE_KEY, null);
    const S = saved && saved.S;
    if (!S || !(S.phase === 'life' || S.phase === 'birth')) {
      this.publish({ resume: null, pastLives: this.read(pastLives), lifePhase: 'none', life: null, certificate: null });
      return;
    }
    // Жизнь из сохранения: журнал команд этой сессии не начинается с рождения.
    this.replay = null;
    // restore0: S = e; S.ff = false; healStats(S); ageSync()
    T.S = S;
    T.S.ff = false;
    T.healStats(T.S);
    T.ageSync();
    this.certNo = null;
    if (T.S.phase === 'birth') {
      // Оригинал при восстановлении в фазе рождения сразу показывает свидетельство (showCert).
      this.publish({ lifeSeq: this.snap.lifeSeq + 1, companionsReady: true, resume: this.read(resumeVM), pastLives: this.read(pastLives) });
      this.certNo = cmd.revealCertificate(T);
      this.publish({ certificate: this.buildCertificate() });
      this.publishLife();
      return;
    }
    // Жизнь возобновляется на паузе (как resumeLive, 206356-206379).
    T.S.paused = true;
    cmd.renderPass(T);
    this.afterRender();
    this.publish({ lifeSeq: this.snap.lifeSeq + 1, companionsReady: true, resume: this.read(resumeVM), pastLives: this.read(pastLives) });
    this.publishLife();
  }

  private buildCertificate(): CertificateVM | null {
    const T = this.need().top;
    if (!this.certNo || !T.S) return null;
    const no = this.certNo;
    return this.read(t => certificateVM(t, no));
  }

  /** famRows уже вызван в точке renderAll — здесь только превращение строк в данные экрана. */
  private afterRender(): void {
    const T = this.need().top;
    if (!T.S || T.S.phase !== 'life') return;
    this.snap = { ...this.snap, family: familyRows(this.read(t => t.famRows())) };
  }

  private publishLife(extra: Partial<Snapshot> = {}): void {
    const host = this.need();
    const T = host.top;
    const S = T.S;
    const phase: LifePhase = !S ? 'none' : S.phase;
    const life = S && (S.phase === 'life' || S.phase === 'dead') ? this.read(lifeVM) : null;
    const journal = S && S.phase !== 'birth' ? (S.log as object[]).map((e, i) => this.entry(e, i)) : [];
    const ended = S && S.phase === 'dead' ? this.read(endedVM) : null;
    const patch: Partial<Snapshot> = { lifePhase: phase, life, journal, ...extra };
    if (ended) Object.assign(patch, { ended, pastLives: this.read(pastLives), resume: this.read(resumeVM) });
    if (phase !== this.lastPhase) {
      this.lastPhase = phase;
      if (phase === 'dead') {
        this.setClockActive(false);
        // Награда мета-слоя за прожитую жизнь (вне исполнения core, в песочнице).
        const reward = this.read(lifeReward);
        if (reward && this.meta) this.meta.setPendingReward(reward);
      }
    }
    this.publish(patch);
  }

  private entry(e: object, i: number): JournalEntryVM {
    let vm = this.journalCache.get(e);
    if (!vm || vm.i !== i) {
      vm = this.read(t => journalEntry(t, e as Record<string, any>, i));
      this.journalCache.set(e, vm);
    }
    return vm;
  }

  private read<T>(fn: (top: Record<string, any>) => T): T {
    return this.need().read(fn);
  }

  private pumpTimers(): void {
    // Задачи core (ломтики сопутствующих жизней) выполняются между кадрами.
    const host = this.host;
    if (!host || host.timers.pending === 0) return;
    const run = () => {
      try { host.drainTimers(); } catch (e) { this.fail(e); return; }
      if (host.timers.pending > 0) setTimeout(run, 0);
    };
    setTimeout(run, 0);
  }

  private accept(id: string): boolean {
    if (this.snap.status !== 'ready' || this.skipping || this.done.has(id)) return false;
    this.done.add(id);
    if (this.done.size > 500) this.done = new Set([...this.done].slice(-250));
    return true;
  }

  private guard(fn: () => void, onError?: () => void): boolean {
    try {
      fn();
      return true;
    } catch (error) {
      this.host?.recordError('command', error);
      this.notice('coreError', error instanceof Error ? error.message : String(error));
      try { onError?.(); } catch (e) { this.fail(e); }
      return false;
    }
  }

  private notice(kind: Notice['kind'], detail?: string): void {
    const n: Notice = { id: ++this.noticeSeq, kind, detail };
    this.publish({ notices: [...this.snap.notices.slice(-4), n] });
  }

  private need(): CoreHost {
    if (!this.host) throw new Error('Core ещё не загружен');
    return this.host;
  }

  private fail(error: unknown): void {
    const message = error instanceof Error ? error.message : String(error);
    const detail = error instanceof Error ? error.stack ?? '' : '';
    console.error('[adapter]', error);
    this.setClockActive(false);
    this.publish({ status: 'error', fatal: { message, detail } });
  }

  private publish(patch: Partial<Snapshot>): void {
    const host = this.host;
    this.snap = {
      ...this.snap, ...patch, version: this.snap.version + 1,
      coreErrorCount: host?.errors.length ?? 0, networkBlocked: host?.network.length ?? 0,
      meta: host && this.meta ? this.meta.view(host.now()) : null,
      prefs: host ? lifePrefsView(host.top) : null,
    };
    this.listeners.forEach(l => l());
  }
}
