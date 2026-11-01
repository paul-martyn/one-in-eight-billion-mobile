// Игровые команды нового интерфейса.
//
// Каждая функция повторяет обработчик старого интерфейса оригинала (номера
// строк — game.en.js эталона 0.8.98) тем же порядком вызовов
// оригинальных функций, но без DOM, анимаций и аналитики. Формул здесь нет:
// всё, что меняет жизнь, делают функции core. Пропущенные шаги перечислены
// в комментариях и в docs/core-derivation.md; соответствие проверяют
// tests/core/commands.test.mjs (исходный обработчик в node:vm против этих функций).
//
// T — таблица верхнеуровневых имён core (instantiateCore().top).

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Top = Record<string, any>;

export type StartOptions = {
  /** Время часов core в момент рождения (мс эпохи). */
  now: number;
  /** Отдельный поток для четырёх сопутствующих жизней (штатный путь makeCompanionsSoon(4, rng)). */
  companionRng: () => number;
  /** Вызывается, когда сопутствующие жизни досчитаны. */
  onCompanions: () => void;
};

/** Нужен ли era.js до старта жизни при текущих настройках (startNewLife 199725-199749 ждёт его через eraWait). */
export function startNeedsEra(T: Top): boolean {
  return !T.eraLoaded() && (!!T.UI.prefs.eraAny || !!T.eraYear());
}

/**
 * startNewLife (199725-199858) без DOM.
 * Пропущено: restAsk (напоминание об отдыхе по видимому времени страницы — таймер старого UI не запускается),
 * classCodeTake/eduHold (режим класса выключен, EDU_ON=false), track (аналитика отключена),
 * show("roll") и анимация рулетки. Рулетка оригинала идёт по ветке prefers-reduced-motion:
 * 25 декоративных wpick не выполняются — как в оригинале при сокращённом движении.
 */
export function startLife(T: Top, opts: StartOptions): void {
  T.lsDel(T.OPEN_KEY);
  let e = T.eraYear(), t = T.eraPick();
  let a = T.eraRand();
  if (T.UI.prefs.eraAny && !T.EDU_ON) {
    t = T.pick(['past', 'now', 'future']);
    a = t === 'past';
    e = t === 'future' ? Math.max(T.NOW_Y, new Date(opts.now).getFullYear()) : t === 'past' ? T.ERA_Y_DEF : null;
  }
  if (e && !T.eraLoaded()) throw new Error('era.js должен быть загружен до старта жизни');
  if (a) e = T.eraDrawYear();
  {
    const h = T.lsGet(T.SAVE_KEY, null);
    if (h && T.unlivedAdd(h.S)) T.lsDel(T.SAVE_KEY);
  }
  T.lsSet(T.PREF_KEY, T.UI.prefs);
  T.lsSet(T.ROLL_KEY, T.lsGet(T.ROLL_KEY, 0) + 1);
  const n = new Date(opts.now);
  T.newLife(T.UI.prefs.mode, T.UI.prefs.pace, null, e ? { era: t, by: e } : null);
  const S = T.S;
  S.home = T.UI.prefs.home || null;
  S.journal = [];
  if (S.home && !T.UI.prefs.homeHand) S.homeG = 1;
  S.comps = [];
  if (!S.era) S.by = n.getFullYear();
  S.bm = T.ri(1, 12);
  if (typeof T.tdStart === 'function') T.tdStart(n);
  S.phase = 'birth';
  // Сопутствующие жизни (199806-199832). Оригинал в режиме класса передаёт
  // отдельный поток; здесь он используется всегда, чтобы основная жизнь не
  // зависела от того, как ломтики симуляции чередуются с кадрами.
  const born = S;
  T.UI.compsOn = true;
  T.UI.certWait = null;
  T.makeCompanionsSoon(4, opts.companionRng, () => {
    if (T.S !== born) return;
    T.UI.compsOn = false;
    T.UI.certWait = null;
    opts.onCompanions();
  });
}

/**
 * Изменяющая состояние часть showCert (200286-200469): parentJobs, номер
 * свидетельства (ri из игрового потока, как в оригинале; не сохраняется в S), save.
 * Возвращает номер для отображения.
 */
export function revealCertificate(T: Top): string {
  T.parentJobs();
  const no = `${T.S.born}-${T.S.by}-${String(T.ri(1e6, 9999999))}`;
  // pHomeWord может один раз вызвать chance(), если pHome ещё не задан (93418) — вызываем там же, где оригинал.
  T.pHomeWord();
  T.save();
  return no;
}

/**
 * beginLife (200471-200517) без DOM: фаза, время, запись рождения первой в журнале,
 * запомненная скорость, затем renderAll (его изменяющая часть — renderPass) и save.
 * Пропущено: track, askKeepStore (navigator.storage), langPick (смена языка страницы), toast.
 */
export function beginLife(T: Top, now: number): void {
  const S = T.S;
  S.phase = 'life';
  S.t = 0;
  S.startedAt = now;
  const tg = null; // #tgLine и TG.w — серверная строка «сейчас живут в симуляции»
  void tg;
  T.lsSet(T.ROLL_KEY, 0);
  T.lsDel(T.REPL_KEY);
  {
    const rest = S.log.splice(0);
    T.log(
      T.birthStory(),
      'big',
      S.fam.dad.ss && typeof T.SS_PAR_F === 'function' ? T.SS_PAR_F() : S.fam.mom.ss && typeof T.SS_DAD_F === 'function' ? T.SS_DAD_F() : undefined,
    );
    S.log.push(...rest);
  }
  const e = T.UI.prefs.speed;
  if (T.SPEEDS.includes(e) && e > 1) {
    S.speed = e;
    if (!T.UI.prefs.spTold) {
      T.UI.prefs.spTold = 1;
      T.lsSet(T.PREF_KEY, T.UI.prefs);
    }
  }
  renderPass(T);
  T.save();
}

/**
 * renderAll (202917-202939) оригинала. В браузере он не только рисует, но и
 * меняет игру: ленивые розыгрыши sibDA, partnerJobFor, homeTongue, studyCity
 * и мемо-поля (S.skn). Поэтому он вызывается в тех же точках, что и в оригинале
 * (после выбора, при смене возраста, при флаге изменений) против инертного
 * документа: вывод никуда не попадает, побочные эффекты в S те же.
 */
export function renderPass(T: Top): void {
  if (!T.S || T.S.phase !== 'life') return;
  T.UI.view = 'lifeview';
  T.renderAll();
}

/** pickChoice (203513-203535) без DOM: выбор варианта открытого решения. */
export function chooseOption(T: Top, decisionId: string, key: string, note = ''): boolean {
  const S = T.S;
  if (!S || !S.pending || S.pending.id !== decisionId) return false;
  if (!(S.pending.view.choices || []).some((c: { k: string }) => c.k === key)) return false;
  T.UI.autoDec = null;
  T.bcareMine();
  try {
    T.choose(key, note);
  } catch (error) {
    if (T.S) T.S.pending = null;
    throw error;
  }
  if (T.S.phase === 'life') {
    renderPass(T);
    T.save();
  }
  return true;
}

/** Кнопка паузы (208385-208386). */
export function togglePause(T: Top): void {
  T.S.paused = !T.S.paused;
  T.S.ff = false;
  T.save();
}
export function setPaused(T: Top, paused: boolean): void {
  if (!!T.S.paused !== paused) togglePause(T);
}

/** setSpeed (200519-200531) без renderTop и подсказки. */
export function setSpeed(T: Top, speed: number): void {
  if (!T.S || !T.SPEEDS.includes(speed)) return;
  T.S.speed = speed;
  T.S.paused = false;
  T.S.ff = false;
  T.UI.prefs.speed = speed;
  T.lsSet(T.PREF_KEY, T.UI.prefs);
}

/** Кнопка «до следующего решения» (208413-208414). */
export function toggleFastForward(T: Top): void {
  T.S.ff = !T.S.ff;
  T.S.paused = false;
}

/** Выбор фокуса года (208415-208425). */
export function setFocus(T: Top, focus: string): void {
  const S = T.S;
  S.focus = focus;
  S.flags.focusPicked = S.focus;
  S.flags.auFo = null;
  if (S.flags.au) S.flags.focusOwn = 1;
  if (!T.UI.prefs.foUsed) {
    T.UI.prefs.foUsed = 1;
    T.lsSet(T.PREF_KEY, T.UI.prefs);
  }
  S.flags.focusBack = S.flags.focusAuto = null;
}

export type StepNotice = { kind: 'ffStopped'; reason: 'kidLost' | 'loss' | 'jobLost' | 'bigDx' | 'kidDx'; lossOf?: string } | { kind: 'jobLost'; owner: boolean };

/**
 * Игровая часть одного кадра frame0 (207812-207915): auSync, ageSync, tick,
 * правила остановки «до следующего решения», затем renderAll при смене
 * возраста или флаге изменений. dt — секунды реального времени кадра (≤ 0,25).
 * Пропущено: tickCounters, unlivedPlace, UI.autoQuick/autoDec (авторежим выключен),
 * yearSnap/loopError (ошибки события ловит fire → HOOK.err), подсказки скорости и магазина.
 */
export function step(T: Top, dt: number, lossNew: (entry: unknown) => string | null): StepNotice[] {
  const S = T.S;
  const notices: StepNotice[] = [];
  if (!S || S.phase !== 'life') return notices;
  const age = S.age;
  const kidsLost = S.stats.kidsLost || 0, job = S.job, dxBig = S.stats.dxBig || 0, kidDx = S.stats.kidDx || 0;
  const lastLog = S.log[S.log.length - 1];
  const fam = S.fam;
  const parentsAlive = [fam.mom.alive, fam.dad.alive];
  T.auSync();
  T.ageSync();
  T.tick(dt * (S.ff ? 24 : 1));
  const s = T.S;
  if (s.ff && (s.stats.kidsLost || 0) > kidsLost) {
    s.ff = false;
    notices.push({ kind: 'ffStopped', reason: 'kidLost' });
  } else if (s.ff && s.phase === 'life' && s.fam === fam && s.log[s.log.length - 1] !== lastLog && lossNew(lastLog)) {
    s.ff = false;
    const who = lossNew(lastLog);
    const lossOf = who === 'pt' ? 'partner' : parentsAlive[0] && !fam.mom.alive && parentsAlive[1] && !fam.dad.alive ? 'parents' : parentsAlive[0] && !fam.mom.alive ? 'mom' : parentsAlive[1] && !fam.dad.alive ? 'dad' : 'stepfather';
    notices.push({ kind: 'ffStopped', reason: 'loss', lossOf });
  } else if (s.phase === 'life' && s.job === 'seeking' && job !== 'seeking' && T.JOBS[job] && !T.NONWORK.includes(job)) {
    if (s.ff) s.ff = false;
    notices.push({ kind: 'jobLost', owner: job === 'owner' });
  } else if (s.ff && (s.stats.dxBig || 0) > dxBig) {
    s.ff = false;
    notices.push({ kind: 'ffStopped', reason: 'bigDx' });
  } else if (s.ff && (s.stats.kidDx || 0) > kidDx) {
    s.ff = false;
    notices.push({ kind: 'ffStopped', reason: 'kidDx' });
  }
  if (s.phase === 'life' && (s.age !== age || T.UI.dirty)) renderPass(T);
  return notices;
}

// ---- «Spend & invest» (openShop 208723 и обработчики листа 208322-208367) ----

/**
 * Изменяющая состояние часть openShop: снимает «до следующего решения».
 * Список пунктов оригинал строит shopItems() при каждой отрисовке листа
 * (3–5 чисел из игрового потока); здесь список строится в песочнице, чтобы
 * открытие панели не расходовало игровой RNG. Сама покупка идёт на настоящем S.
 */
export function openSpend(T: Top): void {
  if (!T.shopCan()) return;
  if (!T.UI.prefs.shopSeen) {
    T.UI.prefs.shopSeen = 1;
    T.lsSet(T.PREF_KEY, T.UI.prefs);
  }
  T.S.ff = false;
}

/** Повторная отрисовка листа после действия (openShop): её изменяющая часть. */
function shopReopen(T: Top): void {
  openSpend(T);
}

/** data-buy (208322-208332) без shopAsk (подтверждение показывает новый UI) и без перерисовки листа. */
export function buy(T: Top, key: string): string | null {
  const s = T.buyShop(key);
  if (s) {
    T.log(s, 'big', T.SHOP_F);
    T.S.log[T.S.log.length - 1].sh = 1;
  }
  T.fxEnd();
  if (s) {
    T.S.stats.buys = (T.S.stats.buys || 0) + 1;
    renderPass(T);
    T.save();
  }
  shopReopen(T);
  return s || null;
}

/** data-gift (208333-208336). */
export function setGift(T: Top, v: 'full' | 'some' | 'none'): void {
  T.S.flags.gift = v === 'full' ? null : v;
  shopReopen(T);
  T.save();
}

/** data-diet (208337-208348): смена питания записывает строку в журнал. */
export function setDiet(T: Top, v: 'usual' | 'good' | 'out'): void {
  const before = T.S.flags.diet || 'usual';
  T.S.flags.diet = v === 'usual' ? null : v;
  if (before !== v) {
    const tpl = (s: string) => T.L(Object.assign([s], { raw: [s] }));
    const line = { usual: tpl('이제 주변 사람들처럼 먹기로 했습니다.'), good: tpl('싱겁게 먹고, 채소와 잡곡을 챙겨 먹기로 했습니다.'), out: tpl('바쁜 날이 많아 외식과 배달로 끼니를 해결하는 날이 늘었습니다.') }[v];
    T.log(line, 'note');
  }
  shopReopen(T);
  T.save();
}

/** data-set (208349-208353): автопривычка «делать само». */
export function toggleHabit(T: Top, set: string): string | null {
  const s = T.buyShop(set);
  T.fxEnd();
  if (s) {
    T.setNote(set, s);
    T.save();
  }
  shopReopen(T);
  return s || null;
}

/** data-ins (208354-208357). */
export function setInsurance(T: Top, v: 'base' | 'more'): void {
  T.S.flags.ins = v === 'more' ? 'more' : null;
  T.save();
  shopReopen(T);
}

/** data-sur (208358). */
export function setSurname(T: Top, v: 'f' | 'm'): void {
  if (T.surSet(v)) T.save();
  shopReopen(T);
}

/** data-inv (208359-208367). */
export function setInvest(T: Top, v: string): string | null {
  if (v === (T.S.invest || 'cash') || !T.invOK(v)) return null;
  T.S.stats.inv = (T.S.stats.inv || 0) + 1;
  const i = T.invSwitch(v);
  if (i) T.log(i, 'note');
  T.save();
  shopReopen(T);
  return i || null;
}

// ---- Настройки следующей жизни (обработчики стартового экрана 208169-208183, initEraSel 204441) ----

export function setBirthMode(T: Top, mode: 'birth' | 'pop'): void {
  T.UI.prefs.mode = mode;
  T.lsSet(T.PREF_KEY, T.UI.prefs);
}
export function setEra(T: Top, era: 'now' | 'past' | 'future' | 'any'): void {
  if (era === 'any') T.UI.prefs.eraAny = 1;
  else {
    T.UI.prefs.eraAny = 0;
    T.UI.prefs.era = era;
  }
  T.lsSet(T.PREF_KEY, T.UI.prefs);
}
/** Год прошлой эпохи: 'r' — любой год ERA_Y0…ERA_PAST1, иначе конкретный год. */
export function setEraYear(T: Top, year: 'r' | number): void {
  T.UI.prefs.eraY = year === 'r' ? 'r' : Math.round(year);
  T.lsSet(T.PREF_KEY, T.UI.prefs);
}
/** Темп жизни: минуты реального времени на жизнь длиной в ожидаемую (newLife 62701-62702). */
export function setPace(T: Top, minutes: number): void {
  T.UI.prefs.pace = +minutes;
  T.lsSet(T.PREF_KEY, T.UI.prefs);
}

/**
 * Автоматический ответ на открытое решение — путь авто-режима оригинала:
 * autoChoice при показе карточки (203156), затем pickChoice(k, true) (203519):
 * счётчик stats.auto, пометка au=1 у новых записей «Decision», renderAll, save.
 */
export function autoAnswer(T: Top): void {
  const S = T.S;
  if (!S?.pending) return;
  const k = T.autoChoice(S.pending);
  T.UI.autoDec = null;
  S.stats.auto = (S.stats.auto || 0) + 1;
  const o = S.log.length;
  try {
    T.choose(k, '');
  } catch (error) {
    if (T.S) T.S.pending = null;
    throw error;
  }
  for (let n = o; n < T.S.log.length; n++) if (T.S.log[n].kind === 'dec') T.S.log[n].au = 1;
  if (T.S.phase === 'life') {
    renderPass(T);
    T.save();
  }
}
