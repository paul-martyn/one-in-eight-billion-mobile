// Каркас вкладок Odds и Activities: шапка (заголовок + «Пауза · возраст · год»)
// и единственная область прокрутки, которая оставляет снизу место стикер-меню.
// Стикер-меню рисует LifeScreen.
import type { ReactNode } from 'react';
import { StatusPill } from '../../../../ui/components';
import './shell.css';

export function TabShell({ title, pill, className = '', children }: { title: string; pill: string | null; className?: string; children: ReactNode }) {
  return (
    <section className={`screen oat ${className}`} aria-label={title}>
      <header className="oat__head">
        <h1 className="oat__title k-o">{title}</h1>
        {pill ? <StatusPill>{pill}</StatusPill> : null}
      </header>
      <div className="oat__scroll scroll">{children}</div>
    </section>
  );
}
