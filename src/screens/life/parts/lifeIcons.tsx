// Иконки экрана жизни (из LiveCute.dc.html) и метки видов записей журнала.
import type { ReactNode } from 'react';

const S = ({ w = 24, h = 24, vb = '0 0 24 24', children }: { w?: number; h?: number; vb?: string; children: ReactNode }) => (
  <svg width={w} height={h} viewBox={vb} aria-hidden="true" focusable="false" style={{ flex: 'none' }}>{children}</svg>
);

export const PinGlyph = () => (
  <S w={10} h={10}><path d="M12 22s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12Zm0-9.3a2.7 2.7 0 1 0 0-5.4 2.7 2.7 0 0 0 0 5.4Z" fill="currentColor" /></S>
);
export const FaceGlyph = () => (
  <S w={15} h={15}>
    <circle cx="12" cy="12" r="9.5" fill="#ffd2a8" stroke="#7b4b2a" strokeWidth="2.2" />
    <path d="M4 10c1.5-4.5 5-6.5 8-6.5s6.5 2 8 6.5c-2.5-1.6-5-2.2-8-2.2S6.5 8.4 4 10Z" fill="#5a3418" />
    <circle cx="9" cy="13" r="1.2" fill="#5a3418" /><circle cx="15" cy="13" r="1.2" fill="#5a3418" />
    <path d="M9.5 16.2c1.4 1.2 3.6 1.2 5 0" fill="none" stroke="#5a3418" strokeWidth="1.6" strokeLinecap="round" />
  </S>
);
export const NoteGlyph = () => (
  <S w={19} h={14} vb="0 0 32 24">
    <rect x="2" y="3" width="28" height="18" rx="4" fill="#8fd14f" stroke="#7b4b2a" strokeWidth="3" />
    <circle cx="16" cy="12" r="4.5" fill="#c9f09a" stroke="#7b4b2a" strokeWidth="2.4" />
  </S>
);
export const SchoolGlyph = () => (
  <S w={17} h={15} vb="0 0 30 26">
    <path d="M2 10 15 4l13 6-13 6Z" fill="#6f8cff" stroke="#7b4b2a" strokeWidth="2.4" strokeLinejoin="round" />
    <path d="M7 13v5c4 3 12 3 16 0v-5" fill="#a9baff" stroke="#7b4b2a" strokeWidth="2.4" strokeLinejoin="round" />
  </S>
);
export const BookGlyph = () => (
  <S w={14} h={14}>
    <path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3Z" fill="#ffd75a" stroke="#7b4b2a" strokeWidth="2.2" strokeLinejoin="round" />
    <path d="M5 17a3 3 0 0 1 3-3h11" fill="none" stroke="#7b4b2a" strokeWidth="2.2" />
  </S>
);
export const FastGlyph = () => (
  <S w={20} h={20}><path d="M3.5 6l7.5 6-7.5 6ZM12 6l7.5 6-7.5 6Z" fill="#fff" stroke="#5a3418" strokeWidth="1.8" strokeLinejoin="round" /></S>
);
export const PauseGlyph = ({ size = 16 }: { size?: number }) => (
  <S w={size} h={size}><rect x="6" y="5" width="4.5" height="14" rx="1.5" fill="currentColor" /><rect x="13.5" y="5" width="4.5" height="14" rx="1.5" fill="currentColor" /></S>
);
export const PlayGlyph = ({ size = 16 }: { size?: number }) => (
  <S w={size} h={size}><path d="M8 5.5v13l10-6.5Z" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></S>
);
export const MenuGlyph = () => (
  <S w={18} h={18}><path d="M5 7h14M5 12h14M5 17h14" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></S>
);
export const BigPauseGlyph = () => (
  <S w={52} h={52}>
    <rect x="5" y="4" width="5.4" height="16" rx="2" fill="#ffd75a" stroke="#7b4b2a" strokeWidth="1.6" />
    <rect x="13.6" y="4" width="5.4" height="16" rx="2" fill="#ffd75a" stroke="#7b4b2a" strokeWidth="1.6" />
    <rect x="6.4" y="5.6" width="1.4" height="5" rx="0.7" fill="#fff" opacity="0.7" />
    <rect x="15" y="5.6" width="1.4" height="5" rx="0.7" fill="#fff" opacity="0.7" />
  </S>
);
/** Нейтральный медальон решения: облачко с вопросом (говорящего в оригинале нет). */
export const AskGlyph = () => (
  <S w={50} h={50}>
    <path d="M4 5.5h16a1.5 1.5 0 0 1 1.5 1.5v9a1.5 1.5 0 0 1-1.5 1.5H11l-4.5 3.5V17.5H4A1.5 1.5 0 0 1 2.5 16V7A1.5 1.5 0 0 1 4 5.5Z" fill="#fff3d6" stroke="#7b4b2a" strokeWidth="1.5" strokeLinejoin="round" />
    <path d="M10 9.6a2.1 2.1 0 1 1 3 1.9c-.6.3-1 .8-1 1.5v.4" fill="none" stroke="#2593a3" strokeWidth="1.7" strokeLinecap="round" />
    <circle cx="12" cy="15.1" r="0.95" fill="#2593a3" />
  </S>
);
/** Медальон «паузы-размышления» (reflect): раскрытая тетрадь. */
export const ReflectGlyph = () => (
  <S w={50} h={50}>
    <path d="M3 6.5c3-1.4 6-1.4 9 .8 3-2.2 6-2.2 9-.8v12c-3-1.4-6-1.4-9 .8-3-2.2-6-2.2-9-.8Z" fill="#fff3d6" stroke="#7b4b2a" strokeWidth="1.5" strokeLinejoin="round" />
    <path d="M12 7.3v12" stroke="#7b4b2a" strokeWidth="1.3" />
    <path d="M5.5 10h4M5.5 12.5h4M14.5 10h4M14.5 12.5h3" stroke="#c9a874" strokeWidth="1.1" strokeLinecap="round" />
  </S>
);
export const HourglassGlyph = () => (
  <S w={11} h={11}><path d="M5 2h14v3c0 3.4-2.6 5.4-4.6 7 2 1.6 4.6 3.6 4.6 7v3H5v-3c0-3.4 2.6-5.4 4.6-7C7.6 10.4 5 8.4 5 5Z" fill="currentColor" /></S>
);
export const HouseGlyph = () => (
  <S w={15} h={15}><path d="M3.5 11 12 4l8.5 7" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /><path d="M6 9.5V20h12V9.5" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></S>
);
export const ResumeGlyph = () => (
  <S w={20} h={22} vb="0 0 20 22"><path d="M4.5 3.5 L16.5 11 L4.5 18.5 Z" fill="#fff" stroke="#7b4b2a" strokeWidth="2.6" strokeLinejoin="round" /></S>
);
export const XGlyph = () => (
  <S w={18} h={18}><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" /></S>
);
/** «Skip to the end» окна паузы: двойной треугольник (LiveCute v107). */
export const SkipGlyph = () => (
  <S w={16} h={15} vb="0 0 26 24">
    <path d="M3 5l9 7-9 7Z" fill="currentColor" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    <path d="M13 5l9 7-9 7Z" fill="currentColor" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
  </S>
);
/** Черепок окна смерти (84 px в круге 112 px). */
export const SkullGlyph = () => (
  <S w={84} h={84} vb="0 0 100 100">
    <path d="M50 9C27 9 13 25 13 45c0 13 7 21 15 25.5V80c0 4 3 7 7 7h30c4 0 7-3 7-7v-9.5C80 66 87 58 87 45 87 25 73 9 50 9Z" fill="#fffaf0" stroke="#5a3418" strokeWidth="4" strokeLinejoin="round" />
    <ellipse cx="35.5" cy="46" rx="9.5" ry="10.5" fill="#2a2333" />
    <ellipse cx="64.5" cy="46" rx="9.5" ry="10.5" fill="#2a2333" />
    <circle cx="38.5" cy="42" r="2.6" fill="#fff" />
    <circle cx="67.5" cy="42" r="2.6" fill="#fff" />
    <path d="M50 56.5l-4.5 7.5h9Z" fill="#2a2333" stroke="#2a2333" strokeWidth="1.5" strokeLinejoin="round" />
    <ellipse cx="24" cy="61" rx="6" ry="3.6" fill="#ff9fb0" />
    <ellipse cx="76" cy="61" rx="6" ry="3.6" fill="#ff9fb0" />
    <path d="M36 75.5h28M43 75.5V86M50 75.5V86M57 75.5V86" fill="none" stroke="#5a3418" strokeWidth="3" strokeLinecap="round" />
  </S>
);
/** Маленький черепок плашки «Life ended» вместо меню. */
export const SmallSkullGlyph = () => (
  <S w={16} h={16} vb="0 0 100 100">
    <path d="M50 9C27 9 13 25 13 45c0 13 7 21 15 25.5V80c0 4 3 7 7 7h30c4 0 7-3 7-7v-9.5C80 66 87 58 87 45 87 25 73 9 50 9Z" fill="#fffaf0" stroke="#2a2038" strokeWidth="7" strokeLinejoin="round" />
    <ellipse cx="35.5" cy="46" rx="10" ry="11" fill="#2a2038" />
    <ellipse cx="64.5" cy="46" rx="10" ry="11" fill="#2a2038" />
  </S>
);
/**
 * Значок карточки причины. В макете — сердце с трещиной (причина примера —
 * болезнь сердца); причина здесь любая, поэтому нейтральная свеча памяти.
 */
export const CandleGlyph = () => (
  <S w={22} h={22}>
    <path d="M12 2.6c1.9 2.2 2.6 3.7 2.6 4.9a2.6 2.6 0 0 1-5.2 0c0-1.2.7-2.7 2.6-4.9Z" fill="#ffc23d" stroke="#5a3418" strokeWidth="1.6" strokeLinejoin="round" />
    <rect x="8" y="11" width="8" height="10.5" rx="1.6" fill="#fffaf0" stroke="#5a3418" strokeWidth="1.8" />
    <path d="M10.4 13.4v3" stroke="#e4d2ab" strokeWidth="1.6" strokeLinecap="round" />
  </S>
);
/** Песочные часы окна «Skip to the end». */
export const BigHourglassGlyph = () => (
  <S w={46} h={46}>
    <path d="M6 3h12M6 21h12" stroke="#7b4b2a" strokeWidth="2" strokeLinecap="round" />
    <path d="M7 3.5v2.2c0 2.7 2 4.4 3.8 6.3-1.8 1.9-3.8 3.6-3.8 6.3v2.2h10v-2.2c0-2.7-2-4.4-3.8-6.3C15 10.1 17 8.4 17 5.7V3.5Z" fill="#fffaf0" stroke="#7b4b2a" strokeWidth="1.6" strokeLinejoin="round" />
    <path d="M9.2 7.2h5.6c-.5 1.3-1.6 2.4-2.8 3.4-1.2-1-2.3-2.1-2.8-3.4ZM8.9 19.2c.4-1.8 1.7-3 3.1-4.1 1.4 1.1 2.7 2.3 3.1 4.1Z" fill="#ffc23d" />
  </S>
);
/** Палец «подержи» с кольцами (подсказка окна смерти). */
export const HoldGlyph = () => (
  <S w={30} h={32} vb="0 0 24 26">
    <path d="M9 13V4.5a2 2 0 0 1 4 0V12l5.2 1a2.6 2.6 0 0 1 2.1 3l-.9 5a3 3 0 0 1-3 2.5h-5a3 3 0 0 1-2.5-1.3L5 17.6a1.9 1.9 0 0 1 2.9-2.4L9 16.3Z" fill="#fffaf0" stroke="#5a3418" strokeWidth="1.6" strokeLinejoin="round" />
  </S>
);
/** Книга кнопок «Look back» и «Life summary». */
export const LookBackGlyph = ({ size = 24 }: { size?: number }) => (
  <S w={size} h={size}>
    <path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3Z" fill="#fff" stroke="#7b4b2a" strokeWidth="2.2" strokeLinejoin="round" />
    <path d="M5 17a3 3 0 0 1 3-3h11" fill="none" stroke="#7b4b2a" strokeWidth="2.2" />
  </S>
);

/** Метки видов записей журнала: в оригинале у записи нет месяца, поэтому вместо «SEP» — вид записи. */
const KIND: Record<string, { bg: string; node: ReactNode }> = {
  ev: { bg: '#efe1c1', node: <circle cx="12" cy="12" r="4" fill="#a77a52" /> },
  big: { bg: '#fff0b8', node: <path d="M12 3.5l2.4 5 5.5.7-4 3.8 1 5.4L12 15.8l-4.9 2.6 1-5.4-4-3.8 5.5-.7Z" fill="#ffd75a" stroke="#7b4b2a" strokeWidth="1.8" strokeLinejoin="round" /> },
  bad: { bg: '#fbd9d6', node: <path d="M13.5 3 6 13.5h5L9.5 21 18 10h-5.2Z" fill="#ef7f7f" stroke="#7b4b2a" strokeWidth="1.6" strokeLinejoin="round" /> },
  warm: { bg: '#ffe0e6', node: <path d="M12 20.5s-7.5-4.6-7.5-10.3A4.2 4.2 0 0 1 12 7.9a4.2 4.2 0 0 1 7.5 2.3c0 5.7-7.5 10.3-7.5 10.3Z" fill="#ff8fa3" stroke="#7b4b2a" strokeWidth="1.8" strokeLinejoin="round" /> },
  loss: { bg: '#e6dccb', node: <path d="M12 3v18M7 8.5h10" stroke="#5a3418" strokeWidth="2.6" strokeLinecap="round" /> },
  // Последняя запись жизни (die оригинала) — сиреневая, как LAST в LiveCute v107.
  death: { bg: '#6f5cb0', node: <path d="M12 3v18M7 8.5h10" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" /> },
  ms: { bg: '#d4f0f4', node: <><path d="M6 21V4" stroke="#7b4b2a" strokeWidth="2" strokeLinecap="round" /><path d="M6 4.5h11l-2.5 3.5 2.5 3.5H6Z" fill="#3ec3d2" stroke="#7b4b2a" strokeWidth="1.6" strokeLinejoin="round" /></> },
  dec: { bg: '#9a7650', node: <path d="M8 5l9 7-9 7Z" fill="#fff" /> },
  note: { bg: '#efe1c1', node: <><path d="M5 19l1-4L16 5l3 3L9 18Z" fill="#fff3d6" stroke="#7b4b2a" strokeWidth="1.7" strokeLinejoin="round" /><path d="M14 7l3 3" stroke="#7b4b2a" strokeWidth="1.5" /></> },
  comp: { bg: '#d3f3e7', node: <path d="M8.5 11a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4ZM2.5 19.5c0-3.4 2.6-5.6 6-5.6s6 2.2 6 5.6ZM15.8 11a2.7 2.7 0 1 0 0-5.4 2.7 2.7 0 0 0 0 5.4ZM14.6 19.5c0-2.2-.4-3.9-1.2-5 .8-.5 1.6-.7 2.6-.7 3 0 5.5 2 5.5 5.7Z" fill="#4cc9a0" stroke="#7b4b2a" strokeWidth="1.4" strokeLinejoin="round" /> },
  ledger: { bg: '#e3f4cf', node: <><circle cx="12" cy="12" r="7.5" fill="#8fd14f" stroke="#7b4b2a" strokeWidth="1.8" /><path d="M12 8.5v7" stroke="#7b4b2a" strokeWidth="1.8" strokeLinecap="round" /></> },
  hist: { bg: '#ece2ff', node: <path d="M12 3.5 19 12l-7 8.5L5 12Z" fill="#b48cff" stroke="#7b4b2a" strokeWidth="1.7" strokeLinejoin="round" /> },
};

export function kindStyle(kind: string): { bg: string; node: ReactNode } {
  return KIND[kind] ?? KIND.ev!;
}
