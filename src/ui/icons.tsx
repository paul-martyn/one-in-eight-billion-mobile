// Иконки из макетов холста дизайна (viewBox 24, если не указано иное).
import type { ReactNode, SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & { size?: number };
const Svg = ({ size = 24, children, ...rest }: IconProps & { children: ReactNode }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" {...rest}>{children}</svg>
);

/** Жирная стрелка кнопок: коричневый штрих под белым. */
export const ArrowIcon = ({ flip = false }: { flip?: boolean }) => (
  <svg width="34" height="30" viewBox="0 0 30 26" aria-hidden="true" style={flip ? { transform: 'scaleX(-1)' } : undefined}>
    <path d="M5 13 H22.5 M15.5 6 L22.5 13 L15.5 20" stroke="#5a3418" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    <path d="M5 13 H22.5 M15.5 6 L22.5 13 L15.5 20" stroke="#fff" strokeWidth="4.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
  </svg>
);
export const ReplayIcon = (p: IconProps) => (
  <Svg {...p}><path d="M20 12a8 8 0 1 1-2.34-5.66" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" /><path d="M20 4v4.5h-4.5" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" /></Svg>
);
export const BackIcon = (p: IconProps) => (<Svg {...p}><path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></Svg>);
export const ChevronIcon = (p: IconProps) => (<Svg {...p}><path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></Svg>);
export const MenuIcon = (p: IconProps) => (<Svg {...p}><path d="M5 7h14M5 12h14M5 17h14" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></Svg>);
export const PauseIcon = (p: IconProps) => (<Svg {...p}><rect x="6" y="5" width="4.5" height="14" rx="1.5" fill="currentColor" /><rect x="13.5" y="5" width="4.5" height="14" rx="1.5" fill="currentColor" /></Svg>);
export const PlayIcon = (p: IconProps) => (<Svg {...p}><path d="M8 5.5v13l10-6.5Z" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></Svg>);
export const FastIcon = (p: IconProps) => (<Svg {...p}><path d="M4 6l7 6-7 6ZM12 6l7 6-7 6Z" fill="currentColor" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /></Svg>);
export const PinIcon = (p: IconProps) => (
  <Svg {...p}><path d="M12 22s7-7.2 7-12.4A7 7 0 0 0 5 9.6C5 14.8 12 22 12 22Z" fill="#ff6f8a" stroke="#7b4b2a" strokeWidth="2" /><circle cx="12" cy="9.6" r="2.6" fill="#fff" /></Svg>
);
export const HouseIcon = (p: IconProps) => (<Svg {...p}><path d="M4 11l8-7 8 7v9H4Z" fill="#fff3d6" stroke="#5a3418" strokeWidth="2.2" strokeLinejoin="round" /><path d="M10 20v-5h4v5" stroke="#5a3418" strokeWidth="2.2" /></Svg>);
export const CloseIcon = (p: IconProps) => (<Svg {...p}><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="4" strokeLinecap="round" /></Svg>);
export const BarsIcon = (p: IconProps) => (
  <svg width={p.size ?? 20} height={(p.size ?? 20) * 0.9} viewBox="0 0 20 18" aria-hidden="true">
    <rect x="2" y="7" width="5" height="10" rx="1.5" fill="#6f8cff" stroke="#7b4b2a" strokeWidth="1.6" />
    <rect x="9.5" y="0.8" width="5" height="16.2" rx="1.5" fill="#ffc23d" stroke="#7b4b2a" strokeWidth="1.6" />
    <rect x="17" y="4" width="2.2" height="13" rx="1" fill="#ff6f8a" stroke="#7b4b2a" strokeWidth="1.2" />
  </svg>
);
export const GearIcon = (p: IconProps) => (
  <Svg {...p}><path d="M12 2.8l1.6 2.2 2.6-.7.6 2.6 2.6.6-.7 2.6 2.2 1.6-2.2 1.6.7 2.6-2.6.6-.6 2.6-2.6-.7L12 21.2l-1.6-2.2-2.6.7-.6-2.6-2.6-.6.7-2.6L3 12.3l2.2-1.6-.7-2.6 2.6-.6.6-2.6 2.6.7Z" fill="#c9cfe0" stroke="#5a3418" strokeWidth="1.6" strokeLinejoin="round" /><circle cx="12" cy="12" r="3.2" fill="#fff3d6" stroke="#5a3418" strokeWidth="1.6" /></Svg>
);

/** Иконки четырёх показателей оригинала (Health, Happiness, Knowledge, Relationships). */
export const STAT_ICON: Record<'hl' | 'h' | 'sm' | 'so', string> = {
  hl: 'M12 20.5s-7.5-4.6-7.5-10.3A4.2 4.2 0 0 1 12 7.9a4.2 4.2 0 0 1 7.5 2.3c0 5.7-7.5 10.3-7.5 10.3Z',
  h: 'M12 3.5l2.4 5 5.5.7-4 3.8 1 5.4L12 15.8l-4.9 2.6 1-5.4-4-3.8 5.5-.7Z',
  sm: 'M3.5 6.5c2.8-1.3 5.7-1.3 8.5.8 2.8-2.1 5.7-2.1 8.5-.8V18.5c-2.8-1.3-5.7-1.3-8.5.8-2.8-2.1-5.7-2.1-8.5-.8Z',
  so: 'M8.5 11a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4ZM2.5 19.5c0-3.4 2.6-5.6 6-5.6s6 2.2 6 5.6ZM15.8 11a2.7 2.7 0 1 0 0-5.4 2.7 2.7 0 0 0 0 5.4ZM14.6 19.5c0-2.2-.4-3.9-1.2-5 .8-.5 1.6-.7 2.6-.7 3 0 5.5 2 5.5 5.7Z',
};
export const StatIcon = ({ k, size = 14 }: { k: keyof typeof STAT_ICON; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true"><path d={STAT_ICON[k]} fill="#fff" stroke="#5a3418" strokeWidth="2.2" strokeLinejoin="round" /></svg>
);

/** Иконки стикер-меню. */
export const TAB_ICON: Record<'people' | 'activities' | 'life' | 'money' | 'odds', ReactNode> = {
  people: (<><path d="M8.5 11a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4ZM2.5 19.5c0-3.4 2.6-5.6 6-5.6s6 2.2 6 5.6Z" /><path d="M15.8 11a2.7 2.7 0 1 0 0-5.4 2.7 2.7 0 0 0 0 5.4ZM14.6 19.5c0-2.2-.4-3.9-1.2-5 .8-.5 1.6-.7 2.6-.7 3 0 5.5 2 5.5 5.7Z" /></>),
  activities: (<><path d="M6.8 2.5h4.1l2 6H8.8ZM17.2 2.5h-4.1l-2 6h4.1Z" /><circle cx="12" cy="15" r="6.2" /><path d="M12 11.9l1 1.9 2.1.3-1.5 1.4.4 2.1-2-1-2 1 .4-2.1-1.5-1.4 2.1-.3Z" className="fill-current" /></>),
  life: (<><path d="M12 21.5V12.5" strokeWidth="2.2" /><path d="M12 12.5c0-4.4 3.3-7.2 7.6-7.2 0 4.4-3.3 7.2-7.6 7.2Z" /><path d="M12 15c0-3.4-2.6-5.6-6.4-5.6 0 3.4 2.6 5.6 6.4 5.6Z" /></>),
  money: (<><rect x="2.5" y="6" width="19" height="12.5" rx="3" /><circle cx="12" cy="12.25" r="3" /></>),
  odds: (<><rect x="3" y="11" width="4.6" height="9" rx="1.4" /><rect x="9.7" y="4" width="4.6" height="16" rx="1.4" /><rect x="16.4" y="8" width="4.6" height="12" rx="1.4" /></>),
};
