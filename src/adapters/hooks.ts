// HOOK — канал, через который симуляция оригинала сообщает интерфейсу о
// событиях. Старый UI назначал свои обработчики (game.en.js:210091-210190);
// часть из них меняет игру. Здесь эти изменения повторены, а отрисовка
// заменена событиями адаптера. noPause, humRecent и calm остаются
// оригинальными: они читают настройки и локальное хранилище core.
import type { Top } from './commands';

export type HookEvents = {
  log(entry: unknown): void;
  decision(): void;
  death(): void;
  year(): void;
  /** Пауза для выбора фокуса года в 6–8 лет (правило p6 оригинала). */
  focusPause?(): void;
  error(error: unknown): void;
};

export function installHooks(T: Top, ev: HookEvents): void {
  const H = T.HOOK;
  // 210091: addFeed в журнале и тост пасхалки — только отображение.
  H.log = (entry: unknown) => ev.log(entry);
  // 210102: пометка «перерисовать».
  H.change = () => { T.UI.dirty = true; };
  // 210105 → showDecision (203114): снимает «до следующего решения», запоминает момент
  // появления (защита от случайного нажатия, DEC_ARM_MS). Авторежим не используется.
  H.decision = () => {
    T.S.ff = false;
    ev.decision();
  };
  // 210112: reportCaught — ошибка события фиксируется, жизнь продолжается, как в оригинале.
  H.err = (e: unknown) => ev.error(e);
  // 210113-210157 без серверной копии (lbSave) и анимации.
  H.death = () => {
    try {
      if (!T.S.replay && T.S.bxAvoid == null && typeof T.bxRecent === 'function') T.S.bxAvoid = T.bxRecent();
    } catch { /* как в оригинале: молча */ }
    try {
      if (!T.S.endD) T.S.endD = T.endingData();
    } catch (e) { ev.error(e); }
    try {
      T.recordLife();
      T.lsDel(T.SAVE_KEY);
    } catch (e) { ev.error(e); }
    ev.death();
  };
  // 210158-210190 без lbTick (сервер), tgLineYear (сервер) и track (аналитика).
  H.year = () => {
    T.UI.dirty = true;
    const S = T.S;
    if (
      S && S.age >= 6 && S.age <= 8 && (S.school || S.age >= T.schA()) && S.phase === 'life' && !S.flags.p6 && !S.replay &&
      !T.UI.prefs.auto && T.UI.prefs.foUsed && (S.speed >= 8 || S.ff) && T.focusOptions().length
    ) {
      S.flags.p6 = 1;
      S.paused = true;
      S.ff = false;
      ev.focusPause?.();
    }
    T.save();
    ev.year();
  };
}
