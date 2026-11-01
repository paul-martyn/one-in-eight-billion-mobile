// Вкладка «Жизнь» (LiveCute.dc.html, frame=journal): сцена, полоса жизни,
// управление временем, показатели и журнал жизни. Все значения — из снимка
// адаптера (life, journal); формул здесь нет. После смерти (frame «died»)
// вкладка замирает: управление временем скрыто, сцена приглушена, сверху
// журнала — последняя запись die() оригинала.
import { useCallback, useEffect, useRef, useState } from 'react';
import { t } from '../../i18n';
import { useSnapshot } from '../../adapters/useGame';
import type { Snapshot } from '../../adapters/gameAdapter';
import type { JournalEntryVM } from '../../adapters/viewModels';
import type { StatKey } from '../../ui/components';
import { useReducedMotion } from '../../ui/motionPrefs';
import type { TabProps } from './tabs/types';
import { Scene } from './parts/Scene';
import { StatsPanel, type StatFlash } from './parts/StatsPanel';
import { Journal } from './parts/Journal';
import { useCountUp } from './parts/lifeHooks';
import './lifeTab.css';

export function LifeTab({ active, nav }: TabProps) {
  const snap = useSnapshot();
  const reduced = useReducedMotion();
  // Уходящая копия экрана (active=false при появлении) не повторяет входную анимацию.
  const k = useCountUp(reduced, !active);
  const track = useJournalTrack(snap.journal, snap.lifeSeq);
  const flash = useStatFlash(track, snap.lastChoice);
  const life = snap.life;
  // Жизнь закончилась: экран замирает (LiveCute frame «died»), окно смерти — в LifeScreen.
  const over = snap.lifePhase === 'dead';
  const openSettings = useCallback(() => nav.go({ id: 'settings' }), [nav]);
  if (!life) {
    return <section className="lt lt--empty"><p className="lt__wait" role="status">{t('life.loadingLife')}</p></section>;
  }
  return (
    <section className={`lt ${over ? 'is-over' : ''}`} aria-label={t('tab.life')}>
      <Scene life={life} k={k} enabled={active} over={over} onMenu={openSettings} />
      <StatsPanel life={life} k={k} flash={flash} />
      <Journal journal={snap.journal} offset={track.offset} freshFrom={track.freshFrom} reduced={reduced} lifeSeq={snap.lifeSeq} over={over} />
    </section>
  );
}

// ---- Новые записи журнала ----
// Журнал оригинала ограничен 1500 записями (старые удаляются), поэтому индекс
// записи в снимке может сдвигаться. Здесь ведётся постоянный номер записи
// (offset + индекс) и граница «новых» записей: только они появляются с
// анимацией, история при первом показе — без неё.

export type JournalTrack = {
  seq: number;
  journal: JournalEntryVM[];
  /** Сколько записей этой жизни уже удалено из начала журнала. */
  offset: number;
  /** Постоянный номер, начиная с которого записи появились «вживую». */
  freshFrom: number;
  /** Счётчик пачек новых записей и сама последняя пачка. */
  batch: number;
  fresh: JournalEntryVM[];
};

const same = (a: JournalEntryVM | undefined, b: JournalEntryVM | undefined) =>
  !!a && !!b && (a === b || (a.text === b.text && a.age === b.age && a.kind === b.kind));

function advanceTrack(tr: JournalTrack, journal: JournalEntryVM[]): JournalTrack {
  const prev = tr.journal;
  const last = prev[prev.length - 1];
  let offset = tr.offset;
  let start: number;
  if (!last) start = 0;
  else if (journal.length >= prev.length && same(journal[prev.length - 1], last)) start = prev.length;
  else {
    let idx = -1;
    for (let i = journal.length - 1; i >= Math.max(0, journal.length - 400); i--) {
      if (same(journal[i], last)) { idx = i; break; }
    }
    if (idx < 0) {
      // Журнал заменён целиком: новые ключи, без анимации.
      const base = tr.offset + prev.length;
      return { ...tr, journal, offset: base, freshFrom: base + journal.length, fresh: [] };
    }
    offset += prev.length - 1 - idx;
    start = idx + 1;
  }
  const fresh = journal.slice(start);
  return { seq: tr.seq, journal, offset, freshFrom: offset + start, batch: fresh.length ? tr.batch + 1 : tr.batch, fresh };
}

function useJournalTrack(journal: JournalEntryVM[], seq: number): JournalTrack {
  const [tr, setTr] = useState<JournalTrack>(() => ({ seq, journal, offset: 0, freshFrom: journal.length, batch: 0, fresh: [] }));
  if (tr.seq !== seq) {
    const next: JournalTrack = { seq, journal, offset: 0, freshFrom: journal.length, batch: tr.batch, fresh: [] };
    setTr(next);
    return next;
  }
  if (tr.journal !== journal) {
    const next = advanceTrack(tr, journal);
    setTr(next);
    return next;
  }
  return tr;
}

// ---- Изменения показателей рядом с полосами ----
// Сумма fx новых записей (изменения, которые посчитал core) на 1,6 с
// (motion.json sequences.statDelta). Результат решения показывается после «Continue».

function sumFx(entries: JournalEntryVM[]): Partial<Record<StatKey, number>> | null {
  const d: Partial<Record<StatKey, number>> = {};
  let any = false;
  for (const e of entries) for (const f of e.fx) { d[f.k] = (d[f.k] ?? 0) + f.d; any = true; }
  if (!any) return null;
  for (const key of Object.keys(d) as StatKey[]) if (!d[key]) delete d[key];
  return Object.keys(d).length ? d : null;
}

function useStatFlash(track: JournalTrack, lastChoice: Snapshot['lastChoice']): StatFlash | null {
  const [flash, setFlash] = useState<StatFlash | null>(null);
  const seqRef = useRef(0);
  useEffect(() => {
    if (!track.fresh.length || lastChoice) return;
    const d = sumFx(track.fresh);
    if (d) setFlash({ id: ++seqRef.current, d });
    // Только при новой пачке записей.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [track.batch]);
  const prevChoice = useRef(lastChoice);
  useEffect(() => {
    const prev = prevChoice.current;
    prevChoice.current = lastChoice;
    if (prev && !lastChoice) {
      const d = sumFx(prev.entries);
      if (d) setFlash({ id: ++seqRef.current, d });
    }
  }, [lastChoice]);
  useEffect(() => {
    if (!flash) return;
    const id = setTimeout(() => setFlash(null), 1600);
    return () => clearTimeout(id);
  }, [flash]);
  return flash;
}
