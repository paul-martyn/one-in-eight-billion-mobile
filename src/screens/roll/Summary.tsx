// Сводка о стране под планетой (RollCute холста): четыре силуэта — срок жизни, доход,
// школа, безопасность — заполняются снизу вверх, справа клевер «удача рождения» (их
// среднее). Тап по силуэту увеличивает его, подсвечивает и открывает пояснение над
// панелью; ещё один тап или тап мимо — закрывает. Та же сводка — на странице страны в хабе.
import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { t } from '../../i18n';
import { fitSize, useFontsReady, type Field } from '../../ui/frame/fit';
import { SCALE_KEYS, summarize, type Land, type ScaleKey, type ThreatKind, type TipKey } from './luck';
import './summary.css';

const INK = '#5a3418';
const OUTLINE = { fill: INK, stroke: INK, strokeWidth: 2, strokeLinejoin: 'round' as const, vectorEffect: 'non-scaling-stroke' as const };
const LEAF = 'M12 20.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.7c0 5.6-7.5 10.2-7.5 10.2Z';
const STEM = 'M10.9 12.3Q12.5 17.1 15.5 20.1A1.3 1.3 0 0 0 17.3 18.3Q14.7 15.8 13.3 11.6Z';
const LEAVES = [-45, 45, 135, -135].map(a => `translate(12 11.6) rotate(${a}) scale(0.54) translate(-12 -20.5)`);

/** Силуэты шкал: контуры, «пустой» и «полный» цвет, высота заливки = base + доля × span (при 40 px). */
const SIL: Record<ScaleKey, { d: string[]; off: string; on: string; base: number; span: number }> = {
  life: { d: ['M12 21.2C6.2 16.9 2.5 13.4 2.5 9.1 2.5 6 4.9 3.6 7.9 3.6c1.7 0 3.2.8 4.1 2.1.9-1.3 2.4-2.1 4.1-2.1 3 0 5.4 2.4 5.4 5.5 0 4.3-3.7 7.8-9.5 12.1Z'], off: '#f5cbd3', on: '#ff7f98', base: 4.67, span: 29.33 },
  money: { d: ['M8.6 3h6.8l-1.9 3.4h-3Z', 'M10.2 7.4h3.6c4 2.3 6.5 6 6.5 9.3 0 3-2.6 4.3-8.3 4.3s-8.3-1.3-8.3-4.3c0-3.3 2.5-7 6.5-9.3Z'], off: '#efdaa4', on: '#f2b52c', base: 5, span: 30 },
  school: { d: ['M12 4L23 9.2 12 14.4 1 9.2Z', 'M5.8 11.9v4.3c0 1.8 2.8 3.2 6.2 3.2s6.2-1.4 6.2-3.2v-4.3L12 14.8Z', 'M20.1 9.8h1.6v6.6h-1.6Z'], off: '#c3e1ee', on: '#4fb3e3', base: 7.67, span: 25.67 },
  safety: { d: ['M12 2.5L20 5.6v6c0 5-3.4 8.9-8 10.4-4.6-1.5-8-5.4-8-10.4v-6Z'], off: '#cfe6bf', on: '#69bf47', base: 3.33, span: 32.5 },
};

function Shape({ k, size, fill, outline }: { k: ScaleKey; size: number; fill: string; outline?: boolean }) {
  return (
    <svg className="sum-shape" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      {outline && SIL[k].d.map((d, i) => <path key={`o${i}`} d={d} {...OUTLINE} />)}
      {SIL[k].d.map((d, i) => <path key={i} d={d} fill={fill} />)}
    </svg>
  );
}
function Clover({ size, fill, outline }: { size: number; fill: string; outline?: boolean }) {
  return (
    <svg className="sum-shape" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      {outline && <path d={STEM} {...OUTLINE} />}
      {outline && LEAVES.map(tr => <path key={`o${tr}`} d={LEAF} transform={tr} {...OUTLINE} />)}
      <path d={STEM} fill={fill} />
      {LEAVES.map(tr => <path key={tr} d={LEAF} transform={tr} fill={fill} />)}
    </svg>
  );
}

/** Значки угроз у шкалы безопасности: война, ВИЧ, малярия, опасные улицы. */
const THREAT: Record<ThreatKind, ReactNode> = {
  war: (<><path d="M12.0 2.2L14.0 7.6L19.2 5.2L16.8 10.4L22.2 12.4L16.8 14.4L19.2 19.6L14.0 17.2L12.0 22.6L10.0 17.2L4.8 19.6L7.2 14.4L1.8 12.4L7.2 10.4L4.8 5.2L10.0 7.6Z" fill="#ff8a5b" stroke={INK} strokeWidth="1.6" strokeLinejoin="round" /><path d="M13.4 7.2L13.8 10.6L17.2 11.0L14.5 13.1L15.8 16.2L12.7 14.9L10.6 17.6L10.2 14.2L6.8 13.8L9.5 11.7L8.2 8.6L11.3 9.9Z" fill="#ffd75a" /></>),
  hiv: <path d="M12 13.6c-1.9-2-3.5-4.1-3.5-6.4C8.5 5 10 3.5 12 3.5s3.5 1.5 3.5 3.7c0 2.3-1.6 4.4-3.5 6.4L6.4 20.5M12 13.6l5.6 6.9" fill="none" stroke="#e0475e" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />,
  mal: (<><ellipse cx="8" cy="8.5" rx="4.2" ry="2.2" transform="rotate(-35 8 8.5)" fill="#ffffff" stroke="#7b4b2a" strokeWidth="1.4" /><ellipse cx="16" cy="8.5" rx="4.2" ry="2.2" transform="rotate(35 16 8.5)" fill="#ffffff" stroke="#7b4b2a" strokeWidth="1.4" /><path d="M12 4.5V2.5M10.4 13l-4 3.5-1 3M13.6 13l4 3.5 1 3M10.6 15.5l-2.6 4.5M13.4 15.5l2.6 4.5" fill="none" stroke={INK} strokeWidth="1.4" strokeLinecap="round" /><ellipse cx="12" cy="12.5" rx="1.9" ry="5.2" fill="#a8321e" stroke={INK} strokeWidth="1.3" /></>),
  crime: (<><path d="M12 3.2L21.6 20H2.4Z" fill="#ffd75a" stroke={INK} strokeWidth="1.9" strokeLinejoin="round" /><path d="M12 9.2v5.3" stroke={INK} strokeWidth="2.4" strokeLinecap="round" /><circle cx="12" cy="17.3" r="1.4" fill={INK} /></>),
};

const VALUE_FIT: Field = [52, 13.5, 9.5];
const NAME_FIT: Field = [64, 10.5, 9];
/** Где стрелка пояснения: середины четырёх силуэтов и клевера (от левого края панели). */
const ARROW: Record<TipKey, number> = { life: 35, money: 90, school: 145, safety: 200, luck: 292.5 };

/**
 * land — страна; shown — сводка на экране (силуэты заполняются при появлении);
 * fast — бросок ускорили тапом: заполнение быстрое.
 */
export function Summary({ land, shown, fast = false, style, className = '', fallback }: {
  land: Land | null; shown: boolean; fast?: boolean; style?: CSSProperties; className?: string; fallback?: string;
}) {
  useFontsReady();
  const [tip, setTip] = useState<TipKey | null>(null);
  const [open, setOpen] = useState(false);
  const sum = summarize(land);
  // Новая страна или уход сводки закрывают пояснение.
  useEffect(() => { setOpen(false); }, [land?.iso, shown]);
  const tap = (k: TipKey) => { if (open && tip === k) setOpen(false); else { setTip(k); setOpen(true); } };
  const tipOn = !!sum && open && shown && tip != null;
  const info = sum && tip ? sum.tip(tip) : null;
  const fillT = fast ? '0.45s' : '0.9s';

  return (
    <>
      {tipOn && <button type="button" className="sum-veil" tabIndex={-1} aria-label={t('sum.close')} onClick={() => setOpen(false)} />}
      <section className={`sum ${className}`} style={style} aria-label={sum?.say} data-shown={shown || undefined} data-fast={fast || undefined}>
        {sum ? (
          <>
            <div className="sum-tip" role="note" data-hit="" data-open={tipOn || undefined} style={{ transformOrigin: `${tip ? ARROW[tip] : 35}px 100%` }} onClick={() => setOpen(false)}>
              <div className="sum-tip__head">
                {tip && tip !== 'luck' && <Shape k={tip} size={22} fill={SIL[tip].on} outline />}
                {tip === 'luck' && <Clover size={22} fill={sum.fill} outline />}
                <b className="sum-tip__title">{info?.title}</b>
                <b className="sum-tip__value">{info?.value}</b>
              </div>
              <p className="sum-tip__body">{info?.body}</p>
              <p className="sum-tip__more">{info?.more}</p>
              <svg className="sum-tip__arrow" width="22" height="13" viewBox="0 0 22 13" aria-hidden="true" style={{ left: tip ? ARROW[tip] : 35 }}>
                <path d="M0 -0.5H22V1L11 12L0 1Z" fill="#fffaf0" />
                <path d="M0 1L11 12L22 1" fill="none" stroke="#7b4b2a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="sum-row">
              <div className="sum-scales">
                {SCALE_KEYS.map((k, i) => {
                  const sc = sum.scales[k], sel = tipOn && tip === k;
                  const h = SIL[k].base + (shown ? Math.max(0.04, sc.p) : 0) * SIL[k].span;
                  const delay = fast ? 0.05 + i * 0.05 : 0.3 + i * 0.12;
                  return (
                    <button key={k} type="button" className="sum-item" data-on={sel || undefined} onClick={() => tap(k)} aria-label={sc.aria} aria-expanded={sel}>
                      <span className="sum-icon">
                        <i className="sum-glow" aria-hidden="true" />
                        <span className="sum-grow">
                          <Shape k={k} size={40} fill={SIL[k].off} outline />
                          <span className="sum-fill" style={{ height: `${h.toFixed(2)}px`, transition: `height ${fillT} cubic-bezier(.22,1,.36,1) ${delay.toFixed(2)}s` }}>
                            <span className="sum-fill__in"><Shape k={k} size={40} fill={SIL[k].on} /></span>
                          </span>
                        </span>
                      </span>
                      <span className="sum-value">
                        {sc.value && <b style={{ fontSize: fitSize(sc.value, VALUE_FIT) }}>{sc.value}</b>}
                        {sc.threats.map(w => (
                          <svg key={w.kind} width="14" height="14" viewBox="0 0 24 24" role="img" aria-label={w.label}><title>{w.label}</title>{THREAT[w.kind]}</svg>
                        ))}
                      </span>
                      <span className="sum-name" style={{ fontSize: fitSize(t(`sum.${k}`), NAME_FIT, 600) }}>{t(`sum.${k}`)}</span>
                    </button>
                  );
                })}
              </div>
              <i className="sum-rule" aria-hidden="true" />
              <button type="button" className="sum-item sum-item--luck" data-on={(tipOn && tip === 'luck') || undefined} onClick={() => tap('luck')} aria-label={sum.aria} aria-expanded={tipOn && tip === 'luck'}>
                <span className="sum-icon sum-icon--luck">
                  <i className="sum-glow" aria-hidden="true" />
                  <span className="sum-grow">
                    <Clover size={44} fill="#e6d6b8" outline />
                    <span className="sum-fill" style={{ height: `${(5.5 + (shown ? Math.max(0.04, sum.luck) : 0) * 34.47).toFixed(2)}px`, transition: `height ${fillT} cubic-bezier(.22,1,.36,1) ${fast ? '0.25s' : '1s'}` }}>
                      <span className="sum-fill__in"><Clover size={44} fill={sum.fill} /></span>
                    </span>
                  </span>
                </span>
                <span className="sum-luck"><b style={{ color: sum.ink }}>{sum.n}</b><span>/100</span></span>
                <b className="sum-verdict" style={{ color: sum.ink }}>{sum.verdict}</b>
              </button>
            </div>
          </>
        ) : (
          <p className="sum-plain">{fallback}</p>
        )}
      </section>
    </>
  );
}
