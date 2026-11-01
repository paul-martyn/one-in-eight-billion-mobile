// Каркас вкладки жизни (People, Money): шапка с заголовком и плашкой «Paused»,
// единственная прокручиваемая область и отступ под стикер-меню, которое
// рисует LifeScreen поверх вкладки.
import { forwardRef, type ReactNode, type Ref } from 'react';
import { BackIcon } from '../../../../ui/icons';
import { StatusPill } from '../../../../ui/components';
import { t } from '../../../../i18n';
import './tabframe.css';

export type BackSpec = { label: string; onClick(): void; buttonRef?: Ref<HTMLButtonElement> };

export function TabHeader({ title, status, back, children, titleId }: { title: string; status: string | null; back?: BackSpec; children?: ReactNode; titleId?: string }) {
  return (
    <header className="tabf__head">
      <div className="tabf__bar">
        {back && (
          <button type="button" ref={back.buttonRef} className="round-btn tabf__back" aria-label={back.label} onClick={back.onClick}>
            <BackIcon size={20} />
          </button>
        )}
        <h1 id={titleId} className="k-o tabf__title">{title}</h1>
        {status && <StatusPill>{status}</StatusPill>}
      </div>
      {children}
    </header>
  );
}

/** Прокручиваемая область вкладки. */
export const TabScroll = forwardRef(function TabScroll({ children }: { children: ReactNode }, ref: Ref<HTMLDivElement>) {
  return (
    <div ref={ref} className="tabf__scroll scroll">
      {children}
    </div>
  );
});

/** Место под стикер-меню (96 px + безопасная область снизу). */
export function TabNavSpace() {
  return <div className="tabf__navspace" aria-hidden="true" />;
}

/** «Paused · 15 · 2041»: время на вкладках не идёт. */
export function pausedText(prefix: 'people' | 'money', age: number | null | undefined, year: number | null | undefined): string | null {
  if (age == null) return null;
  return year == null ? t(`${prefix}.pausedAge`, { age }) : t(`${prefix}.paused`, { age, year });
}
