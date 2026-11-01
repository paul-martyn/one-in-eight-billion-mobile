// Иконки вариантов фокуса года в стиле плиток ActivitiesCute.dc.html
// (rect 1,1 22×22 rx6, обводка #7b4b2a, белый знак). Ключи — ключи FOCUS оригинала.
// Пять знаков (study, work, family, sport, hobby) взяты из макета, остальные дорисованы в том же стиле.
import type { ReactNode } from 'react';

const S = { stroke: '#7b4b2a', strokeWidth: 1.8, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };

export const FOCUS_STYLE: Record<string, { bg: string; glyph: ReactNode }> = {
  study: { bg: '#6f8cff', glyph: <path d="M5 6.5c2.5-1.1 4.9-1.1 7 .6 2.1-1.7 4.5-1.7 7-.6V17c-2.5-1.1-4.9-1.1-7 .6-2.1-1.7-4.5-1.7-7-.6Z" fill="#fff" {...S} /> },
  work: { bg: '#ffc23d', glyph: <><rect x="5" y="8.5" width="14" height="10" rx="2" fill="#fff" {...S} /><path d="M9.5 8.5V6.8a1.3 1.3 0 0 1 1.3-1.3h2.4a1.3 1.3 0 0 1 1.3 1.3v1.7" fill="none" {...S} /></> },
  family: { bg: '#ff8fa3', glyph: <path d="M12 18.5s-6-3.7-6-8.2A3.4 3.4 0 0 1 12 8.4a3.4 3.4 0 0 1 6 1.9c0 4.5-6 8.2-6 8.2Z" fill="#fff" {...S} /> },
  sport: { bg: '#8fd14f', glyph: <><path d="M6 15h6l3-5 3 1M9 10l2-3h3" fill="none" {...S} strokeWidth={2} /><circle cx="16.5" cy="6.5" r="1.8" fill="#fff" {...S} strokeWidth={1.6} /></> },
  hobby: { bg: '#c9b6ff', glyph: <><path d="M10 16V7l7-1.5v9" fill="none" {...S} /><circle cx="8.3" cy="16.2" r="2" fill="#fff" {...S} strokeWidth={1.6} /><circle cx="15.3" cy="14.7" r="2" fill="#fff" {...S} strokeWidth={1.6} /></> },
  play: { bg: '#4cc9a0', glyph: <><circle cx="9.3" cy="9.3" r="2.4" fill="#fff" {...S} strokeWidth={1.6} /><path d="M5 17.5c0-2.5 1.9-4.1 4.3-4.1s4.3 1.6 4.3 4.1Z" fill="#fff" {...S} strokeWidth={1.6} /><circle cx="15.2" cy="9.8" r="2" fill="#fff" {...S} strokeWidth={1.6} /><path d="M14.4 13.6c.4-.1.6-.1.9-.1 2.2 0 3.9 1.5 3.9 4h-4.3" fill="#fff" {...S} strokeWidth={1.6} /></> },
  help: { bg: '#ffb38a', glyph: <><path d="M5.5 12l6.5-5.8 6.5 5.8v6.5h-13Z" fill="#fff" {...S} /><path d="M10.4 18.5v-3.6h3.2v3.6" fill="none" {...S} /></> },
  balance: { bg: '#e9cf9c', glyph: <><path d="M12 6v12M8.5 18h7M6 8.5h12" fill="none" {...S} /><path d="M6 8.5l-2 4.2h4ZM18 8.5l-2 4.2h4Z" fill="#fff" {...S} strokeWidth={1.5} /></> },
  health: { bg: '#ff6f8a', glyph: <path d="M10 5.5h4v4.5h4.5v4H14v4.5h-4V14H5.5v-4H10Z" fill="#fff" {...S} /> },
  learn: { bg: '#9fdcf5', glyph: <><path d="M12 5a4.6 4.6 0 0 0-2.7 8.3V15h5.4v-1.7A4.6 4.6 0 0 0 12 5Z" fill="#fff" {...S} /><path d="M10 17.8h4" fill="none" {...S} /></> },
  mind: { bg: '#b9a7d6', glyph: <path d="M12 5l1.7 4.6L18.3 11l-4.6 1.7L12 17.3l-1.7-4.6L5.7 11l4.6-1.4Z" fill="#fff" {...S} /> },
  faith: { bg: '#ffe9a8', glyph: <><path d="M12 5c1.4 1.5 1.8 2.7 0 4-1.8-1.3-1.4-2.5 0-4Z" fill="#ffd75a" {...S} strokeWidth={1.5} /><rect x="9.5" y="10.5" width="5" height="8" rx="1.2" fill="#fff" {...S} /></> },
  rest: { bg: '#cdeaf6', glyph: <path d="M15 5.8a6.4 6.4 0 1 0 3.4 10.6A5.4 5.4 0 0 1 15 5.8Z" fill="#fff" {...S} /> },
  parttime: { bg: '#ffd98a', glyph: <><circle cx="12" cy="12" r="6" fill="#fff" {...S} /><path d="M12 8.6V12l2.3 1.6" fill="none" {...S} /></> },
  career: { bg: '#f4a940', glyph: <path d="M5.5 18h4v-3.5h4V11h5" fill="none" {...S} strokeWidth={2} /> },
};
const FALLBACK = { bg: '#e9cf9c', glyph: <circle cx="12" cy="12" r="4.5" fill="#fff" {...S} /> };

export const focusStyle = (k: string) => FOCUS_STYLE[k] ?? FALLBACK;

export function FocusIcon({ k, size = 24 }: { k: string; size?: number }) {
  const s = focusStyle(k);
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className="acts-ficon">
      <rect x="1" y="1" width="22" height="22" rx="6" fill={s.bg} stroke="#7b4b2a" strokeWidth="1.6" />
      {s.glyph}
    </svg>
  );
}

/** Знак «сейчас» карточки статуса: медаль раздела Activities (иконка стикера) на синем #5fa2ff. */
export function NowIcon({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className="acts-ficon">
      <rect x="1" y="1" width="22" height="22" rx="6" fill="#5fa2ff" stroke="#7b4b2a" strokeWidth="1.6" />
      <g transform="translate(3.6 3.4) scale(0.7)">
        <path d="M6.8 2.5h4.1l2 6H8.8ZM17.2 2.5h-4.1l-2 6h4.1Z" fill="#fff" stroke="#7b4b2a" strokeWidth="2.2" strokeLinejoin="round" />
        <circle cx="12" cy="15" r="6.2" fill="#fff" stroke="#7b4b2a" strokeWidth="2.2" />
        <path d="M12 11.9l1 1.9 2.1.3-1.5 1.4.4 2.1-2-1-2 1 .4-2.1-1.5-1.4 2.1-.3Z" fill="#7b4b2a" />
      </g>
    </svg>
  );
}

/** Замок «запертого» ряда макета. */
export function LockIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <rect x="5" y="10" width="14" height="11" rx="2.5" fill="#e8d5b0" stroke="#7b4b2a" strokeWidth="2" />
      <path d="M8 10V7.5a4 4 0 0 1 8 0V10" fill="none" stroke="#7b4b2a" strokeWidth="2" />
    </svg>
  );
}
