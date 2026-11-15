// Ряд из трёх плашек-сведений под сценой (холст LiveCute v343–346): возраст (без года), деньги, занятие — школа,
// работа или статус. Плашки не нажимаются: без «губы», рамка как у журнала; значок 24 в квадрате 32 со своим бледным
// тоном, подпись капсом в цвет рамки, значение — белым с обводкой. Значения — из снимка (life), формул здесь нет.
import type { ReactNode } from 'react';
import { t } from '../../../i18n';
import type { LifeVM } from '../../../adapters/viewModels';

const INK = 'var(--color-ink)';

const CakeIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
    <rect x="3.5" y="11" width="17" height="9.5" rx="2.2" fill="#ff8fb0" stroke={INK} strokeWidth="1.5" />
    <path d="M3.8 14.6c2.1 1.3 4.1 1.3 6.1 0s4.1-1.3 6.1 0 2.8 1.1 4.2.5" fill="none" stroke={INK} strokeWidth="1.3" />
    <rect x="10.9" y="5.6" width="2.2" height="5.4" rx="0.6" fill="var(--color-cta)" stroke={INK} strokeWidth="1.2" />
    <path d="M12 1.8c1.1 1.2 1.1 2.2 0 3-1.1-.8-1.1-1.8 0-3Z" fill="#ff9f43" stroke={INK} strokeWidth="1" />
  </svg>
);
const MoneyIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
    <rect x="5" y="4.5" width="16.5" height="10" rx="2" fill="#6fbf3a" stroke={INK} strokeWidth="1.5" />
    <rect x="2.5" y="9.5" width="16.5" height="10" rx="2" fill="var(--color-cta-green)" stroke={INK} strokeWidth="1.5" />
    <circle cx="10.75" cy="14.5" r="2.4" fill="#e1f1ce" stroke={INK} strokeWidth="1.3" />
  </svg>
);
export const SchoolIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M6.2 11.2v4.6c1.7 1.6 3.7 2.4 5.8 2.4s4.1-.8 5.8-2.4v-4.6L12 13.8Z" fill="#9fb2ff" stroke={INK} strokeWidth="1.5" strokeLinejoin="round" />
    <path d="M1.8 9 12 4.6 22.2 9 12 13.4Z" fill="var(--color-stat-smarts)" stroke={INK} strokeWidth="1.5" strokeLinejoin="round" />
    <path d="M20.4 9.8v5.6" stroke={INK} strokeWidth="1.5" strokeLinecap="round" />
    <circle cx="20.4" cy="16.6" r="1.4" fill="var(--color-cta)" stroke={INK} strokeWidth="1.1" />
  </svg>
);
export const WorkIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M8.6 7.6V5.9a1.6 1.6 0 0 1 1.6-1.6h3.6a1.6 1.6 0 0 1 1.6 1.6v1.7" fill="none" stroke={INK} strokeWidth="1.5" />
    <rect x="2.5" y="7.5" width="19" height="12.5" rx="2.2" fill="#d79a5b" stroke={INK} strokeWidth="1.5" />
    <path d="M2.5 12.6h19" stroke={INK} strokeWidth="1.3" />
    <rect x="10.6" y="11.4" width="2.8" height="2.6" rx="0.6" fill="var(--color-cta)" stroke={INK} strokeWidth="1.1" />
  </svg>
);
const HomeIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M3.2 11.2 12 3.6l8.8 7.6V20a1.2 1.2 0 0 1-1.2 1.2h-5v-5.8H9.4v5.8h-5A1.2 1.2 0 0 1 3.2 20Z" fill="var(--color-cta)" stroke={INK} strokeWidth="1.5" strokeLinejoin="round" />
  </svg>
);

function Plate({ icon, tint, label, value }: { icon: ReactNode; tint: string; label: string; value: string }) {
  return (
    <li className="lp__plate">
      <span className="lp__icon" style={{ background: tint }} aria-hidden="true">{icon}</span>
      <span className="lp__text">
        <span className="lp__label">{label}</span>
        <b className="lp__value">{value || '—'}</b>
      </span>
    </li>
  );
}

const OCC = {
  school: { icon: <SchoolIcon />, tint: 'var(--color-plate-school)', label: 'life.plate.school' },
  work: { icon: <WorkIcon />, tint: 'var(--color-plate-work)', label: 'life.plate.work' },
  status: { icon: <HomeIcon />, tint: 'var(--color-plate-status)', label: 'life.plate.status' },
} as const;

export function Plates({ life }: { life: LifeVM }) {
  const occ = OCC[life.occupation.kind];
  return (
    <ul className="lp" aria-label={t('life.plates')}>
      <Plate icon={<CakeIcon />} tint="var(--color-plate-age)" label={t('life.plate.age')} value={String(life.age)} />
      <Plate icon={<MoneyIcon />} tint="var(--color-plate-money)" label={t('life.plate.money')} value={life.money} />
      <Plate icon={occ.icon} tint={occ.tint} label={t(occ.label)} value={life.occupation.text} />
    </ul>
  );
}
