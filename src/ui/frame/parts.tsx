// Общие части экранов нового флоу (StartCute / HubCute / LangCute холста):
// основная кнопка 196 × 70, облачко под планетой, счётчики «с открытия игры»,
// заголовок «1 in 8 B». Размеры — в единицах кадра 393.
import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from 'react';
import { t, formatNumber } from '../../i18n';
import { usePlanetCounts } from '../planet/bus';
import { BabyGlyph, SkullGlyph } from '../planet/glyphs';
import { fitAll, fitCount, fitSize, useFontsReady, type Field } from './fit';

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

/** Основная кнопка макета. cost — цена в энергии на уголке (Be Born! в хабе). */
export function CtaButton({ label, tone = 'yellow', cost, className = '', children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; tone?: 'yellow' | 'green'; cost?: ReactNode }) {
  return (
    <button type="button" className={`cta ${tone === 'green' ? 'cta--green' : ''} ${className}`} aria-label={label} {...rest}>
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

const SAY_FIT: Field = [272, 18, 13];

/** Облачко под планетой: две строки, вторая — оранжевая. Хвост смотрит вверх, на планету. */
export function Say({ line, accent, style, className = '' }: { line: string; accent: string; style?: CSSProperties; className?: string }) {
  useFontsReady();
  const size = fitAll([line, accent], SAY_FIT, 700);
  return (
    <div className={`say ${className}`} style={style}>
      <svg className="say__shape" width="304" height="86" viewBox="0 0 304 86" aria-hidden="true">
        <path d="M19.25 13.25H141L152 1.25L163 13.25H284.75A18 18 0 0 1 302.75 31.25V66.75A18 18 0 0 1 284.75 84.75H19.25A18 18 0 0 1 1.25 66.75V31.25A18 18 0 0 1 19.25 13.25Z" fill="#fff3d6" stroke="#d0b48b" strokeWidth="2.5" strokeLinejoin="round" />
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
        <path d={BOX} fill="none" stroke="#7b4b2a" strokeWidth="2" strokeLinejoin="round" />
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

const TITLE_FIT: Field = [352, 64, 30];

/** Заголовок «1 in 8 B»: цифра 8 жёлтая; длинные переводы ужимаются по ширине кадра. */
export function Title({ style, className = '' }: { style?: CSSProperties; className?: string }) {
  useFontsReady();
  const pre = t('start.title.pre'), eight = t('start.title.eight'), post = t('start.title.post');
  const size = fitSize(pre + eight + post, TITLE_FIT);
  // Контур и «ступенька» пропорциональны кеглю (6 и 5 px при 64).
  const k = size / 64;
  return (
    <h1 className={`title ${className}`} style={{ ...style, fontSize: size, WebkitTextStroke: `${(6 * k).toFixed(1)}px #5a3418`, textShadow: `0 ${(5 * k).toFixed(1)}px 0 #5a3418` }}>
      {pre}<span className="title__eight">{eight}</span>{post}
    </h1>
  );
}
