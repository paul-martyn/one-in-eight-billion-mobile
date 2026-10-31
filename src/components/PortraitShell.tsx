import type { ReactNode } from 'react';
import { usePortraitGuard } from '../app/usePortraitGuard';

export function PortraitShell({ children }: { children: ReactNode }) {
  const rotate = usePortraitGuard();
  return (
    <div className="preview-stage">
      {/* Дерево экранов остаётся смонтированным при повороте устройства. */}
      <div className="mobile-viewport" hidden={rotate} inert={rotate} data-testid="mobile-viewport">
        {children}
      </div>
      {rotate && (
        <section className="orientation-notice" role="status" aria-live="polite">
          <svg viewBox="0 0 64 80" width="48" height="60" fill="none" aria-hidden="true">
            <rect x="12" y="4" width="40" height="72" rx="7" stroke="currentColor" strokeWidth="2" />
            <path d="M26 66h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <h1>Поверните телефон</h1>
          <p>Эта история живёт в портретном режиме.</p>
        </section>
      )}
    </div>
  );
}
