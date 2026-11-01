// Общие части экранов Start, Roll, Hub и Ended: счётчики «Since you opened»,
// подгонка размера глобуса, новая жизнь и продолжение сохранённой жизни.
// Команды вызываются только из обработчиков нажатий.
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { gestureId, useAdapter } from '../../adapters/useGame';
import { APPROX_WORLD_RATES, worldRates } from '../../adapters/vm/hub';
import type { Nav } from '../../flow/FlowHost';
import { t, UI_LANG, formatNumber } from '../../i18n';
import './world.css';

export const fmtInt = (n: number) => formatNumber(n);

/** Первая буква заглавной: «the United Kingdom» в крупном заголовке. Только показ. */
export const capFirst = (s: string) => (s ? s.charAt(0).toLocaleUpperCase(UI_LANG) + s.slice(1) : s);

/** Заголовок «1 in 8 B» (цифра 8 — жёлтая). */
export function BrandTitle({ className = '' }: { className?: string }) {
  return (
    <h1 className={`brand-title k-big ${className}`}>
      {t('start.title.pre')}<span className="brand-title__eight">{t('start.title.eight')}</span>{t('start.title.post')}
    </h1>
  );
}

/** Секунды с открытия экрана (только показ), обновление каждые stepMs. */
function useSecondsOpen(stepMs: number): number {
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    const t0 = performance.now();
    const id = setInterval(() => setSecs((performance.now() - t0) / 1000), stepMs);
    return () => clearInterval(id);
  }, [stepMs]);
  return secs;
}

/**
 * Рождения и смерти в мире с открытия экрана. Скорости — из констант оригинала
 * (worldRates, tickCounters). Пока у core нет жизни, адаптер не даёт прочитать
 * константы, и показываются приближённые средние (APPROX_WORLD_RATES).
 */
export function WorldCounters({ className = '', style }: { className?: string; style?: CSSProperties }) {
  const adapter = useAdapter();
  const rates = useMemo(() => adapter.view(worldRates) ?? APPROX_WORLD_RATES, [adapter]);
  const secs = useSecondsOpen(250);
  const born = fmtInt(Math.floor(secs * rates.birthsPerSec));
  const died = fmtInt(Math.floor(secs * rates.deathsPerSec));
  return (
    <div role="group" aria-label={t('start.countersLabel', { born, died })} className={`wc ${className}`} style={style} data-approx={rates.approximate || undefined}>
      <span className="wc__legend">{t('start.since')}</span>
      <div className="wc__col">
        <p className="wc__num tabular">{born}</p>
        <p className="wc__lbl"><span className="wc__dot wc__dot--born" aria-hidden="true" />{t('start.born')}</p>
      </div>
      <span className="wc__div" aria-hidden="true" />
      <div className="wc__col">
        <p className="wc__num tabular">{died}</p>
        <p className="wc__lbl"><span className="wc__dot wc__dot--died" aria-hidden="true" />{t('start.died')}</p>
      </div>
    </div>
  );
}

/** Сторона квадрата, который помещается в контейнер (для холста глобуса). */
export function useFitSize<T extends HTMLElement>(max: number) {
  const ref = useRef<T | null>(null);
  const [size, setSize] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    // clientWidth/Height не зависят от transform переходов flow.
    const measure = () => setSize(Math.max(0, Math.floor(Math.min(max, el.clientWidth, el.clientHeight))));
    measure();
    if (typeof ResizeObserver !== 'function') return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [max]);
  return [ref, size] as const;
}

/**
 * Новая жизнь: startLife (оригинальный startNewLife) с защитой от двойного
 * нажатия. Возвращает true, если команда применена; навигацию делает экран.
 * Без энергии адаптер отказывает (notice 'noEnergy'): экран уже показывает
 * это строкой ожидания, поэтому уведомление снимается, чтобы не всплыть
 * позже в жизни под чужим текстом.
 */
export function useStartNewLife() {
  const adapter = useAdapter();
  const busyRef = useRef(false);
  const [busy, setBusy] = useState(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const start = useCallback(async (): Promise<boolean> => {
    if (busyRef.current) return false;
    const snap = adapter.getSnapshot();
    if (snap.status !== 'ready') return false;
    busyRef.current = true;
    setBusy(true);
    // id создаётся синхронно, внутри обработчика нажатия.
    const ok = await adapter.startLife(gestureId(), snap.lifeSeq);
    if (!ok) {
      busyRef.current = false;
      if (mounted.current) setBusy(false);
      for (const n of adapter.getSnapshot().notices) if (n.kind === 'noEnergy') adapter.dismissNotice(n.id);
    }
    return ok;
  }, [adapter]);
  return { start, busy };
}

/**
 * «Continue»: жизнь уже в памяти core — просто открыть её; иначе (после
 * перезагрузки без восстановления) — adapter.resume, затем открыть.
 */
export function useContinueLife(nav: Nav) {
  const adapter = useAdapter();
  return useCallback(() => {
    const open = () => {
      const s = adapter.getSnapshot();
      if (s.lifePhase === 'life') { nav.go({ id: 'life', tab: 'life' }); return true; }
      if (s.lifePhase === 'birth') { nav.go(s.certificate ? { id: 'certificate', filled: true } : { id: 'roll' }); return true; }
      return false;
    };
    if (open()) return;
    if (adapter.resume(gestureId())) open();
  }, [adapter, nav]);
}
