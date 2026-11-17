// Две плашки-сведения под полосой года (холст «Жизнь · шаги», шаг 4, 17.11): слева занятие — школа, работа или статус
// (≈ 2/3 ширины): подпись капсом тёмная, ниже текст обычным шрифтом, приглушённый, с заглавной буквы, в одну строку
// (длинный — «…»); справа деньги (≈ 1/3): значок и сумма белым с обводкой, без подписи, сумма по центру места справа от
// значка. Возраста здесь нет — он на полосе года. Плашки не нажимаются: без «губы», рамка как у журнала; значок 26 без
// подложки. Значения — из снимка (life), формул здесь нет.
import { t } from '../../../i18n';
import type { LifeVM } from '../../../adapters/viewModels';

const INK = 'var(--color-ink)';

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

/** Сумма — кегль по длине строки, чтобы влезала целиком в узкую плашку. */
const numSize = (s: string) => (s.length <= 7 ? '' : s.length <= 9 ? ' lp__value--m' : s.length <= 11 ? ' lp__value--s' : ' lp__value--xs');

const OCC = {
  school: { icon: <SchoolIcon />, label: 'life.plate.school' },
  work: { icon: <WorkIcon />, label: 'life.plate.work' },
  status: { icon: <HomeIcon />, label: 'life.plate.status' },
} as const;

export function Plates({ life }: { life: LifeVM }) {
  const occ = OCC[life.occupation.kind];
  const money = life.money || '—';
  return (
    <ul className="lp" aria-label={t('life.plates')}>
      <li className="lp__plate lp__plate--occ">
        <span className="lp__icon" aria-hidden="true">{occ.icon}</span>
        <span className="lp__text">
          <span className="lp__label">{t(occ.label)}</span>
          <span className="lp__occ">{life.occupation.text || '—'}</span>
        </span>
      </li>
      <li className="lp__plate lp__plate--money">
        <span className="lp__icon" aria-hidden="true"><MoneyIcon /></span>
        <span className="lp__sum">
          <span className="sr-only">{t('life.plate.money')}: </span>
          <b className={`lp__value${numSize(money)}`}>{money}</b>
        </span>
      </li>
    </ul>
  );
}
