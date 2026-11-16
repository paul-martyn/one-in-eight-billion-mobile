// Общие части экранов нового флоу (StartCute / HubCute / LangCute холста):
// основная кнопка 196 × 70, облачко под планетой, счётчики «с открытия игры»,
// заголовок «1 in 8 B». Размеры — в единицах кадра 393.
import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from 'react';
import { t, formatNumber, useLocale, type Locale } from '../../i18n';
import { usePlanetCounts } from '../planet/bus';
import { BabyGlyph, SkullGlyph } from '../planet/glyphs';
import { fitAll, fitCount, fitSize, useFontsReady, type Field } from './fit';
import logoEn from './logo/logo-en.svg';
import logoRu from './logo/logo-ru.svg';
import logoDe from './logo/logo-de.svg';
import logoFr from './logo/logo-fr.svg';
import logoEs from './logo/logo-es.svg';

const CTA_FIT: Field = [160, 28, 16];

/** Надпись кнопки: белые буквы с коричневым контуром и «ступенькой» снизу (SVG, как в макете). */
export function CtaText({ children, field = CTA_FIT, width = 168 }: { children: string; field?: Field; width?: number }) {
  useFontsReady();
  const size = fitSize(children, field);
  const common = { x: width / 2, textAnchor: 'middle' as const, dominantBaseline: 'central' as const, fontSize: size, fontWeight: 700, stroke: '#5a3418', strokeWidth: 3, strokeLinejoin: 'round' as const };
  return (
    <svg className="cta__text" width={width} height="52" viewBox={`0 0 ${width} 52`} aria-hidden="true">
      <text {...common} y="27.5" fill="#5a3418">{children}</text>
      <text {...common} y="25.5" fill="#ffffff" paintOrder="stroke">{children}</text>
    </svg>
  );
}

/** Основная кнопка макета. cost — цена в энергии на уголке (Be Born! в хабе). Красная — опасное действие, только последним шагом в окне подтверждения (дизайн-код, 15 ноября 2026). */
export function CtaButton({ label, tone = 'yellow', cost, className = '', children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; tone?: 'yellow' | 'green' | 'red'; cost?: ReactNode }) {
  return (
    <button type="button" className={`cta ${tone === 'green' ? 'cta--green' : tone === 'red' ? 'cta--red' : ''} ${className}`} aria-label={label} {...rest}>
      <CtaText>{label}</CtaText>
      {cost}
      {children}
    </button>
  );
}

/** Цена в энергии на уголке кнопки: молния и число. */
export function CtaCost({ n, label }: { n: number; label: string }) {
  return (
    <span className="cta__cost">
      <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path d="M13.5 2 L5 13.5 H11 L9.5 22 L19 9.5 H12.8 Z" fill="#ffd75a" stroke="#5a3418" strokeWidth="2" strokeLinejoin="round" /></svg>
      <span aria-hidden="true">{n}</span>
      <span className="sr-only">{label}</span>
    </span>
  );
}

/** Контур облачка ширины w: хвост по центру сверху, тело 13,25…87,75 (StartCute, 15.11: w = 270). */
const sayPath = (w: number) => `M19.25 13.25H${w / 2 - 11}L${w / 2} 1.25L${w / 2 + 11} 13.25H${w - 19.25}A18 18 0 0 1 ${w - 1.25} 31.25V69.75A18 18 0 0 1 ${w - 19.25} 87.75H19.25A18 18 0 0 1 1.25 69.75V31.25A18 18 0 0 1 19.25 13.25Z`;

/**
 * Облачко под планетой: две строки, вторая — акцентная. Хвост смотрит вверх и заходит на планету (StartCute, 15.11).
 * Ширина по макету старта 270; хабу с длинной второй строкой — 304, чтобы она не переносилась.
 */
export function Say({ line, accent, width = 270, style, className = '' }: { line: string; accent: string; width?: number; style?: CSSProperties; className?: string }) {
  useFontsReady();
  const size = fitAll([line, accent], [width - 24, 18, 13], 700);
  return (
    <div className={`say ${className}`} style={{ ...style, width, left: (393 - width) / 2 }}>
      <svg className="say__shape" width={width} height="89" viewBox={`0 0 ${width} 89`} aria-hidden="true">
        <path d={sayPath(width)} fill="#fff3d6" stroke="#d0b48b" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
      <p className="say__text" style={{ fontSize: size }}>
        <span>{line}</span>
        <span className="say__accent">{accent}</span>
      </p>
    </div>
  );
}

const BOX = 'M17 1H130A16 16 0 0 1 146 17V43A16 16 0 0 1 130 59H110.5V72A9 9 0 0 1 101.5 81H45.5A9 9 0 0 1 36.5 72V59H17A16 16 0 0 1 1 43V17A16 16 0 0 1 17 1Z';
const BOX_TAB = 'M36.5 59H110.5V72A9 9 0 0 1 101.5 81H45.5A9 9 0 0 1 36.5 72Z';
const COUNT_FIT: Field = [68, 28, 16];
const WORD_FIT: Field = [66, 13.5, 11];

function CountBox({ kind, n, size, word }: { kind: 'born' | 'died'; n: string; size: number; word: string }) {
  const born = kind === 'born';
  return (
    <div className="since__box">
      <svg className="since__shape" width="147" height="82" viewBox="0 0 147 82" aria-hidden="true">
        <path d={BOX} fill={born ? '#ffe8ee' : '#f0eafc'} />
        <path d={BOX_TAB} fill={born ? '#ffcdd9' : '#ddd2ff'} />
        {/* Счётчик не нажимается — обводка в его собственном тоне, а не коричневая кнопочная (StartCute, 15.11). */}
        <path d={BOX} fill="none" stroke={born ? '#e09aae' : '#ab97e6'} strokeWidth="2" strokeLinejoin="round" />
      </svg>
      <div className="since__top">
        {born ? <BabyGlyph size={40} /> : <SkullGlyph size={38} />}
        <b className="since__num" style={{ fontSize: size }}>{n}</b>
      </div>
      <span className={`since__word since__word--${kind}`} style={{ fontSize: fitSize(word, WORD_FIT) }}>{word}</span>
    </div>
  );
}

/**
 * Рождения и смерти в мире с открытия игры: считаются вспышки самой планеты
 * (около 4,2 рождения и 2 смертей в секунду). Плашки не меняют размер: меняются
 * только цифры, оба числа одним кеглем — тем, при котором помещается более длинное.
 */
export function Since({ style, className = '' }: { style?: CSSProperties; className?: string }) {
  useFontsReady();
  const counts = usePlanetCounts();
  const born = formatNumber(counts.born), died = formatNumber(counts.died);
  const size = Math.min(fitCount(born, COUNT_FIT), fitCount(died, COUNT_FIT));
  return (
    <div className={`since ${className}`} style={style} role="group" aria-label={t('start.countersLabel', { born, died })}>
      <p className="since__title">{t('start.since')}</p>
      <div className="since__row">
        <CountBox kind="born" n={born} size={size} word={t('since.born')} />
        <CountBox kind="died" n={died} size={size} word={t('since.died')} />
      </div>
    </div>
  );
}

// Логотип — рисунок на каждый язык (production-ui/tools/gen-logo.js; размер рисунка при кегле 64).
const LOGOS: Record<Locale, { src: string; w: number; h: number }> = {
  en: { src: logoEn, w: 199, h: 80 },
  ru: { src: logoRu, w: 350, h: 80 },
  de: { src: logoDe, w: 341, h: 80 },
  fr: { src: logoFr, w: 442, h: 80 },
  es: { src: logoEs, w: 414, h: 80 },
};
const TITLE_W = 352;

/** Заголовок «1 in 8 B»: рисунок, цифра 8 жёлтая; длинные переводы ужимаются по ширине кадра. */
export function Title({ style, className = '' }: { style?: CSSProperties; className?: string }) {
  const lang = useLocale();
  const logo = LOGOS[lang] ?? LOGOS.en;
  const k = Math.min(1, TITLE_W / logo.w);
  const label = t('start.title.pre') + t('start.title.eight') + t('start.title.post');
  return (
    <h1 className={`title ${className}`} style={style} aria-label={label}>
      <img className="title__logo" src={logo.src} width={Math.round(logo.w * k)} height={Math.round(logo.h * k)} alt="" draggable={false} />
    </h1>
  );
}
