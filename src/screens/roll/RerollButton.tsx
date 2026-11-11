// Зелёная кнопка переброса 64 × 64 (RollCute / CertCute холста): круговые стрелки и на
// уголке — сколько бесплатных перебросов осталось, а когда их нет — значок AD
// (переброс за рекламу; пока рекламы нет, он тоже работает). На рулетке перебрасывается
// всё рождение, на свидетельстве — ребёнок в той же стране.
import type { ButtonHTMLAttributes } from 'react';
import { t } from '../../i18n';
import { useRerolls } from './rerolls';

export function RerollButton({ className = '', ...rest }: ButtonHTMLAttributes<HTMLButtonElement>) {
  const rerolls = useRerolls();
  return (
    <button type="button" className={`side-btn side-btn--green ${className}`} aria-label={rerolls > 0 ? t('roll.again', { n: rerolls }) : t('roll.againAd')} {...rest}>
      <svg width="34" height="34" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5.27 10.07A7 7 0 0 1 17.20 7.32M18.73 13.93A7 7 0 0 1 6.80 16.68" fill="none" stroke="#2f5a17" strokeWidth="5.6" strokeLinecap="round" />
        <path d="M19.19 4.45L20.15 10.59L14.14 9.00ZM4.81 19.55L3.85 13.41L9.86 15.00Z" fill="#2f5a17" stroke="#2f5a17" strokeWidth="3" strokeLinejoin="round" />
        <path d="M5.27 10.07A7 7 0 0 1 17.20 7.32M18.73 13.93A7 7 0 0 1 6.80 16.68" fill="none" stroke="#ffffff" strokeWidth="2.6" strokeLinecap="round" />
        <path d="M19.19 4.45L20.15 10.59L14.14 9.00ZM4.81 19.55L3.85 13.41L9.86 15.00Z" fill="#ffffff" />
      </svg>
      {rerolls > 0 ? (
        <span className="side-btn__n" aria-hidden="true">{rerolls}</span>
      ) : (
        <span className="side-btn__ad" aria-hidden="true"><svg width="9" height="9" viewBox="0 0 10 10"><path d="M2 1l7 4-7 4Z" fill="#2f5a17" /></svg>{t('roll.ad')}</span>
      )}
    </button>
  );
}
