// Общие элементы интерфейса в стиле макетов (Cute).
import { useEffect, useId, useRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowIcon, CloseIcon, PauseIcon, StatIcon, TAB_ICON } from './icons';
import tokens from '../design/tokens.json';
import spec from '../design/motion.json';
import { t } from '../i18n';
import { useReducedMotion } from './motionPrefs';
import { useBack } from '../flow/useBack';
import './ui.css';

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement>;

/** Основная жёлтая кнопка со стрелкой. */
export function ChunkyButton({ children, arrow = true, tone = 'yellow', className = '', ...rest }: BtnProps & { arrow?: boolean; tone?: 'yellow' | 'green' }) {
  return (
    <button type="button" className={`chunky chunky--${tone} ${className}`} {...rest}>
      <span className="k-o chunky__label">{children}</span>
      {arrow && <ArrowIcon />}
    </button>
  );
}

/** Вторичная кремовая кнопка. */
export function SoftButton({ children, className = '', ...rest }: BtnProps) {
  return <button type="button" className={`soft-btn ${className}`} {...rest}>{children}</button>;
}

/** Круглая кнопка 42 px (меню, пауза, назад, повтор). */
export function RoundButton({ children, className = '', ...rest }: BtnProps) {
  return <button type="button" className={`round-btn ${className}`} {...rest}>{children}</button>;
}

/** Бирюзовая лента-заголовок с «ласточкиными хвостами». */
export function Ribbon({ children, as: Tag = 'h2', width }: { children: ReactNode; as?: 'h1' | 'h2' | 'p'; width?: number }) {
  return (
    <div className="ribbon" style={width ? { minWidth: width } : undefined}>
      <svg className="ribbon__tail ribbon__tail--l" width="34" height="34" viewBox="0 0 34 34" aria-hidden="true"><path d="M2 2 H32 V32 H2 L11 17 Z" fill="#2593a3" stroke="#7b4b2a" strokeWidth="2.5" strokeLinejoin="round" /></svg>
      <svg className="ribbon__tail ribbon__tail--r" width="34" height="34" viewBox="0 0 34 34" aria-hidden="true"><path d="M32 2 H2 V32 H32 L23 17 Z" fill="#2593a3" stroke="#7b4b2a" strokeWidth="2.5" strokeLinejoin="round" /></svg>
      <Tag className="ribbon__body k-o">{children}</Tag>
    </div>
  );
}

export type StatKey = 'hl' | 'h' | 'sm' | 'so';
export const STAT_COLOR: Record<StatKey, string> = {
  hl: tokens.stat.health.color, h: tokens.stat.happiness.color, sm: tokens.stat.smarts.color, so: tokens.stat.ties.color,
};

/** Полоса показателя 0–100 с иконкой и числом. */
export function StatMeter({ k, label, value, delta, progress = 1, height = 20 }: { k: StatKey; label: string; value: number; delta?: number | null; progress?: number; height?: number }) {
  const shown = Math.round(value * progress);
  return (
    <div className="meter" role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(value)}>
      <p className="meter__label">{label}</p>
      <div className="meter__bar" style={{ height }}>
        <div className="meter__fill" style={{ width: `${Math.max(0, Math.min(100, value * progress))}%`, background: STAT_COLOR[k] }} />
        <span className="meter__over">
          <StatIcon k={k} />
          <span className="k-os tabular meter__num">{shown}</span>
          {delta ? <span className="k-os meter__delta">{delta > 0 ? `+${delta}` : `−${Math.abs(delta)}`}</span> : null}
        </span>
      </div>
    </div>
  );
}

/** Плашка «Пауза · возраст · год» в шапке вкладок. */
export function StatusPill({ children }: { children: ReactNode }) {
  return <p className="status-pill" role="status"><PauseIcon size={10} />{children}</p>;
}

export type TabId = 'people' | 'activities' | 'life' | 'money' | 'odds';
const STICKERS: { id: TabId; left: number; top: number; rot: number; color: string }[] = [
  { id: 'people', left: 10, top: 24, rot: -6, color: tokens.section.people },
  { id: 'activities', left: 85, top: 15, rot: 5, color: tokens.section.activities },
  { id: 'life', left: 164, top: 26, rot: -3, color: tokens.section.life },
  { id: 'money', left: 243, top: 16, rot: 6, color: tokens.section.money },
  { id: 'odds', left: 319, top: 23, rot: -5, color: tokens.section.odds },
];
const SPARKLE_FILL = (c: string) => [c, '#ffffff', '#ffd75a', c, '#ffffff', '#ffd75a'];

/** Стикер-меню на крафт-бумаге (выбранный вариант «stickers»). */
export function StickerBar({ active, labels, badges, onSelect }: { active: TabId; labels: Record<TabId, string>; badges?: Partial<Record<TabId, { count: number; label: string }>>; onSelect: (t: TabId) => void }) {
  const reduced = useReducedMotion();
  return (
    <nav className="stickers" aria-label={t('tab.sections')}>
      <svg className="stickers__paper" width="100%" height="100" viewBox="0 0 393 100" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <filter id="kraft-grain"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" /><feColorMatrix type="saturate" values="0" /></filter>
          <clipPath id="kraft-clip"><path d={KRAFT} /></clipPath>
        </defs>
        <path d={KRAFT} fill="#dcb27a" />
        <rect width="393" height="100" filter="url(#kraft-grain)" opacity="0.14" clipPath="url(#kraft-clip)" style={{ mixBlendMode: 'multiply' }} />
        <path d={KRAFT_EDGE} fill="none" stroke="#7b4b2a" strokeWidth="2" />
      </svg>
      <div className="stickers__row">
        {STICKERS.map(s => {
          const on = s.id === active;
          const badge = badges?.[s.id];
          return (
            // Позиция — центр стикера (left + 32 в кадре 393): ширина растёт под длинную подпись, центр остаётся на месте.
            <div key={s.id} className={`sticker ${s.id === 'activities' ? 'sticker--wide' : ''} ${on ? 'is-on' : ''}`} style={{ left: `${((s.left + 32) / 393) * 100}%`, top: s.top, transform: `translateX(-50%) rotate(${s.rot}deg) scale(${on ? 1.1 : 1})`, zIndex: on ? 3 : 1 }}>
              <button type="button" className="sticker__btn" aria-label={labels[s.id]} aria-current={on ? 'page' : undefined} onClick={() => onSelect(s.id)}>
                <span className="sticker__face">
                  <svg width="24" height="24" viewBox="0 0 24 24" className="sticker__icon" aria-hidden="true">{TAB_ICON[s.id]}</svg>
                  <span className={`sticker__label ${s.id === 'activities' ? 'is-long' : ''}`}>{labels[s.id]}</span>
                </span>
                <span className="sticker__fill" style={{ background: s.color }}>
                  <span className="sticker__gloss" />
                  <svg width="24" height="24" viewBox="0 0 24 24" className="sticker__icon sticker__icon--on" aria-hidden="true">{TAB_ICON[s.id]}</svg>
                  <span className={`k-os sticker__label ${s.id === 'activities' ? 'is-long' : ''}`}>{labels[s.id]}</span>
                </span>
              </button>
              {on && !reduced && (
                <span key={`burst-${active}`} className="sticker__burst" aria-hidden="true">
                  <span className="sticker__ring" style={{ borderColor: s.color }} />
                  {spec.sequences.sticker.sparkleOffsets.map(([dx, dy], i) => (
                    <svg key={i} className="sticker__spark" style={{ ['--dx' as string]: `${dx}px`, ['--dy' as string]: `${dy}px` }} width="12" height="12" viewBox="0 0 24 24">
                      <path d="M12 2l2.6 6.8L22 12l-7.4 3.2L12 22l-2.6-6.8L2 12l7.4-3.2Z" fill={SPARKLE_FILL(s.color)[i]} stroke="#7b4b2a" strokeWidth="2" strokeLinejoin="round" />
                    </svg>
                  ))}
                </span>
              )}
              {badge && badge.count > 0 && <span className="sticker__badge k-os" aria-label={badge.label}>{badge.count}</span>}
            </div>
          );
        })}
      </div>
    </nav>
  );
}
const KRAFT = 'M0 5 L8 2 L18 8 L25 3 L34 6 L42 2 L51 7 L60 3 L68 6 L77 2 L86 7 L95 3 L104 6 L112 2 L121 8 L130 3 L138 6 L147 2 L156 7 L165 3 L174 6 L182 2 L191 7 L200 3 L209 6 L217 2 L226 8 L235 3 L244 6 L252 2 L261 7 L270 3 L279 6 L287 2 L296 7 L305 3 L314 6 L322 2 L331 8 L340 3 L349 6 L357 2 L366 7 L375 3 L384 6 L393 1.5 L393 100 L0 100 Z';
const KRAFT_EDGE = KRAFT.replace(/ L393 100 L0 100 Z$/, '');

/** Модальное окно в стиле макетов: оранжевая карточка, медальон, лента. */
export function Popup({ open, title, medallion, medallionBg = '#bfe8ef', onClose, closeLabel, children, labelledBy }: {
  open: boolean; title: string; medallion?: ReactNode; medallionBg?: string; onClose?: () => void; closeLabel?: string; children: ReactNode; labelledBy?: string;
}) {
  const reduced = useReducedMotion();
  const id = useId();
  const ref = useRef<HTMLElement | null>(null);
  // «Назад» (Esc) закрывает окно тем же действием, что и его кнопка закрытия.
  useBack(() => { onClose?.(); }, { layer: 'dialog', enabled: open });
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const first = ref.current?.querySelector<HTMLElement>('button, [href], input, textarea');
    first?.focus({ preventScroll: true });
    return () => prev?.focus?.({ preventScroll: true });
  }, [open]);
  const e = spec.sequences.popup;
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="popup-layer" initial={reduced ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={reduced ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0, transition: { duration: e.exit.durationMs / 1000 } }} transition={{ duration: e.backdrop.durationMs / 1000 }}>
          <motion.section
            ref={ref}
            className="popup"
            role="dialog"
            aria-modal="true"
            aria-labelledby={labelledBy ?? id}
            initial={reduced ? false : { opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: e.enter.durationMs / 1000, ease: spec.easing.pop as [number, number, number, number] }}
          >
            {medallion && <div className="popup__medallion" style={{ background: medallionBg }}>{medallion}</div>}
            <div className="popup__ribbon"><Ribbon as="h2">{<span id={id}>{title}</span>}</Ribbon></div>
            <div className="popup__body">{children}</div>
            {onClose && (
              <button type="button" className="popup__close" aria-label={closeLabel} onClick={onClose}><CloseIcon size={22} /></button>
            )}
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Заголовок раздела (эйбров). */
export function Eyebrow({ children, meta }: { children: ReactNode; meta?: ReactNode }) {
  return <h2 className="eyebrow"><span>{children}</span>{meta ? <span className="eyebrow__meta">{meta}</span> : null}</h2>;
}
