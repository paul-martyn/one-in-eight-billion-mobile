// Планета (GlobeLive холста): холст и карточка страны. Вся логика — в
// planetCore.js (без React): проекция, точки суши, вспышки рождений и смертей,
// выбор страны, бросок и нырок. Обёртка даёт ей холст, касания и перерисовку
// карточки. Случайность планеты декоративная и игровой RNG не расходует.
import { useEffect, useReducer, useRef } from 'react';
import { PlanetCore, type PlanetProps } from './planetCore.js';
import { BabyGlyph, SkullGlyph } from './glyphs';
import './planet.css';

export type PlanetLabels = {
  /** Подпись холста для экранных читалок. */
  planet: string;
  /** «в день» в карточке страны. */
  perDay: string;
  /** Кнопка «!» карточки. */
  open: string;
};

export function Planet({ labels, canOpen = true, ...props }: PlanetProps & { labels: PlanetLabels; canOpen?: boolean }) {
  const ref = useRef<PlanetCore | null>(null);
  if (!ref.current) ref.current = new PlanetCore();
  const core = ref.current;
  const [, redraw] = useReducer((n: number) => n + 1, 0);
  const prev = useRef(props);
  core.props = props;

  useEffect(() => {
    core.onChange = redraw;
    core.componentDidMount();
    return () => { core.onChange = null; core.componentWillUnmount(); };
  }, [core]);
  // Смена места, режима или команды: планета сама решает, что анимировать.
  useEffect(() => {
    const before = prev.current;
    prev.current = props;
    if (before !== props) core.componentDidUpdate(before);
  });

  const v = core.renderVals();
  return (
    <div className="planet" style={{ width: v.w, height: v.h }}>
      <canvas
        ref={v.setCanvas}
        className="planet__canvas"
        role="img"
        aria-label={labels.planet}
        onPointerDown={v.down}
        onPointerMove={v.move}
        onPointerUp={v.up}
        onPointerCancel={v.cancel}
        style={{ width: v.w, height: v.h }}
      />
      {v.tip.on && (
        <div ref={v.setTip} className="planet-tip" role="dialog" aria-label={v.tip.name}>
          <svg className="planet-tip__shape" width="176" height="72" viewBox="0 0 176 72" aria-hidden="true">
            <path ref={v.setTipPath} d={v.tip.d} fill="#fff3d6" stroke="#7b4b2a" strokeWidth="2" strokeLinejoin="round" />
          </svg>
          <div className="planet-tip__body">
            <div className="planet-tip__head">
              <p className="planet-tip__name" style={{ fontSize: v.tip.size }}>{v.tip.name}</p>
              {canOpen && (
                <button type="button" className="planet-tip__bang" aria-label={labels.open} onClick={v.tip.dive}>
                  <svg width="24" height="36" viewBox="0 0 24 36" aria-hidden="true">
                    <defs>
                      <linearGradient id="planet-bang-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffe57a" /><stop offset="1" stopColor="#ffbf1f" /></linearGradient>
                    </defs>
                    <path d="M7 3.5h10a2.6 2.6 0 0 1 2.6 2.8l-1.3 14.6a3 3 0 0 1-3 2.7H8.7a3 3 0 0 1-3-2.7L4.4 6.3A2.6 2.6 0 0 1 7 3.5Z" fill="url(#planet-bang-fill)" stroke="#c4791b" strokeWidth="2.2" strokeLinejoin="round" />
                    <circle cx="12" cy="29.4" r="4.6" fill="url(#planet-bang-fill)" stroke="#c4791b" strokeWidth="2.2" />
                    <path d="M8.6 6.6h3.6" stroke="#fff6c9" strokeWidth="2.2" strokeLinecap="round" />
                    <circle cx="10.4" cy="27.8" r="1.3" fill="#fff6c9" />
                  </svg>
                </button>
              )}
            </div>
            <p className="planet-tip__nums">
              <span className="planet-tip__num"><BabyGlyph size={18} />{v.tip.born}</span>
              <span className="planet-tip__num"><SkullGlyph size={16} />{v.tip.died}</span>
              <span className="planet-tip__unit">{labels.perDay}</span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
