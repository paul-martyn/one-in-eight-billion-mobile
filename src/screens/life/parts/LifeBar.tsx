// Полоса жизни 0–100 лет с отметкой ожидаемой продолжительности при рождении и бегунком
// возраста. В шапке варианта B2 её нет (возраст — в журнале); она остаётся на экране
// «Skip to the end».
import { t } from '../../../i18n';

export function LifeBar({ age, le, k, over = false }: { age: number; le: number; k: number; over?: boolean }) {
  const fill = Math.max(0, Math.min(100, age * k));
  const lePct = Math.max(0, Math.min(100, le));
  const leShown = Math.round(le);
  return (
    <div
      className="lt-bar"
      role="meter"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={age}
      aria-label={over ? t('death.barLabel', { age, le: leShown }) : t('life.barLabel', { age, le: leShown })}
    >
      <span className="lt-bar__fill" style={{ transform: `scaleX(${fill / 100})` }} />
      <span className="lt-bar__tick" style={{ left: `${lePct}%` }} aria-hidden="true" />
      <span
        className={`lt-bar__le k-os ${lePct > 88 ? 'is-left' : ''}`}
        style={lePct > 88 ? { right: `calc(${100 - lePct}% + 6px)` } : { left: `calc(${lePct}% + 6px)` }}
        aria-hidden="true"
      >
        ~{leShown}
      </span>
      <span className="lt-bar__rail" style={{ transform: `translateX(${fill}%)` }} aria-hidden="true">
        <svg className="lt-bar__knob" width="24" height="24" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="11" fill="#fff" stroke="#7b4b2a" strokeWidth="2" />
          <text x="12" y="16.1" textAnchor="middle" fontSize={age * k >= 99.5 ? 9 : 11.5} fontWeight="700" fill="#5a3418">{Math.round(age * k)}</text>
        </svg>
      </span>
    </div>
  );
}
