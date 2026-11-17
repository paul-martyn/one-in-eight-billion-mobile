// Полоса года на стыке сцены и плашек (холст «Жизнь · шаги», шаг 4, 17.11): во всю ширину, тёмная дорожка, жёлтая
// заливка — доля текущего года (S.t движка), слева «Возраст N», справа следующий возраст. Когда год кончается, движок
// прибавляет возраст — подпись чуть «подпрыгивает», заливка идёт с нуля. Пауза и решение останавливают время в движке —
// и заливку. После смерти полоса замирает и сереет вместе со сценой.
// Заливка обновляется каждый кадр подпиской на прогресс адаптера и пишется прямо в стиль (без перерисовки React).
import { useEffect, useRef } from 'react';
import { t } from '../../../i18n';
import { useAdapter } from '../../../adapters/useGame';

export function YearBar({ age, over }: { age: number; over: boolean }) {
  const a = useAdapter();
  const fill = useRef<HTMLSpanElement | null>(null);
  // «Прыжок» подписи — только когда возраст сменился на глазах, не при входе на экран.
  const firstAge = useRef(age);
  useEffect(() => {
    const el = fill.current;
    if (!el) return;
    const draw = () => { el.style.transform = `scaleX(${a.getProgress().toFixed(4)})`; };
    draw();
    if (over) return;
    return a.subscribeProgress(draw);
  }, [a, over]);
  return (
    <div className="yb" role="img" aria-label={t('life.yearAria', { age, next: age + 1 })}>
      <span ref={fill} className="yb__fill" aria-hidden="true" />
      <b key={age} className={`yb__age${age !== firstAge.current ? ' is-pop' : ''}`} aria-hidden="true">{t('life.yearAge', { age })}</b>
      {over ? null : <b className="yb__next" aria-hidden="true">{age + 1}</b>}
    </div>
  );
}
