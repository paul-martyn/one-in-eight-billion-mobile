// «Skip to the end» идёт (snapshot.skipping): адаптер проживает остаток жизни
// порциями между кадрами, решения отвечает autoChoice оригинала. Спокойный
// слой поверх экрана жизни закрывает ввод; возраст и доля года — прогресс.
// Полный снимок на это время не публикуется, поэтому возраст читается
// отдельно (не чаще AGE_READ_MS) при обновлении доли года.
import { useCallback, useEffect, useId, useRef, useSyncExternalStore } from 'react';
import { motion } from 'motion/react';
import { t } from '../../../i18n';
import type { Top } from '../../../adapters/commands';
import { useAdapter, useYearProgress } from '../../../adapters/useGame';
import type { LifeVM } from '../../../adapters/viewModels';
import { useReducedMotion } from '../../../ui/motionPrefs';
import { LifeBar } from './Scene';
import { BigHourglassGlyph } from './lifeIcons';

const AGE_READ_MS = 250;
const readAge = (T: Top): number | null => (typeof T.S?.age === 'number' ? T.S.age : null);

/** Текущий возраст во время пропуска; до первого чтения — возраст из снимка. */
function useLiveAge(start: number): number {
  const a = useAdapter();
  const cur = useRef(start);
  const subscribe = useCallback((cb: () => void) => {
    let last = -Infinity;
    return a.subscribeProgress(() => {
      const now = performance.now();
      if (now - last < AGE_READ_MS) return;
      last = now;
      const age = a.view(readAge);
      if (age != null && age !== cur.current) {
        cur.current = age;
        cb();
      }
    });
  }, [a]);
  const get = useCallback(() => cur.current, []);
  return useSyncExternalStore(subscribe, get, get);
}

export function SkipLayer({ life }: { life: LifeVM }) {
  const reduced = useReducedMotion();
  const age = useLiveAge(life.age);
  const p = useYearProgress();
  const titleId = useId();
  const noteId = useId();
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    ref.current?.focus({ preventScroll: true });
  }, []);
  return (
    <motion.div
      ref={ref}
      className="lfs"
      role="dialog"
      aria-modal="true"
      aria-busy="true"
      aria-labelledby={titleId}
      aria-describedby={noteId}
      tabIndex={-1}
      initial={reduced ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: reduced ? 0 : 0.3 } }}
      transition={{ duration: 0.3 }}
    >
      <div className="lfs__card">
        <span className="lfs__medal" aria-hidden="true"><span className="lfs__glass"><BigHourglassGlyph /></span></span>
        <h2 id={titleId} className="lfs__title">{t('death.skip.title')}</h2>
        <p className="lfs__who">{t('death.skip.who', { name: life.given, age })}</p>
        <div className="lfs__bar"><LifeBar age={age} le={life.lifeExpectancy} k={1} /></div>
        <span className="lfs__year" aria-hidden="true"><span className="lfs__year-fill" style={{ transform: `scaleX(${p})` }} /></span>
        <p id={noteId} className="lfs__note">{t('death.skip.note')}</p>
      </div>
    </motion.div>
  );
}
