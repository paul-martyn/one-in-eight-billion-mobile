// Загрузка core и честное состояние ошибки (без демонстрационных данных).
import { t } from '../i18n';
import { useSnapshot } from '../adapters/useGame';
import { retryBoot } from '../app/game';
import { ChunkyButton } from '../ui/components';
import type { ScreenProps } from './registry';
import './system.css';

export function LoadingScreen(_: ScreenProps) {
  return (
    <main className="screen sys" aria-busy="true">
      <div className="sys__orb" aria-hidden="true" />
      <h1 className="k-big sys__title">{t('app.title')}</h1>
      <p className="sys__text" role="status">{t('app.loading')}</p>
      <p className="sys__sub">{t('app.loadingDetail')}</p>
    </main>
  );
}

export function ErrorScreen(_: ScreenProps) {
  const snap = useSnapshot();
  return (
    <main className="screen sys sys--error">
      <h1 className="sys__title sys__title--dark">{t('error.title')}</h1>
      <p className="sys__text">{t('error.body')}</p>
      {snap.fatal && (
        <details className="sys__details">
          <summary>{t('error.details')}</summary>
          <pre>{snap.fatal.message}{'\n'}{snap.fatal.detail}</pre>
        </details>
      )}
      <ChunkyButton onClick={() => { void retryBoot(); }}>{t('error.retry')}</ChunkyButton>
    </main>
  );
}
