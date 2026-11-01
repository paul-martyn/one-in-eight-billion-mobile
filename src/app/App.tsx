import { useEffect } from 'react';
import { PortraitShell } from '../components/PortraitShell';
import { GameProvider } from '../adapters/useGame';
import { FlowHost } from '../flow/FlowHost';
import { adapter, startBoot } from './game';
import { setLocale, useLocale } from '../i18n';

export function App() {
  const locale = useLocale();
  useEffect(() => { setLocale(locale); }, [locale]);
  useEffect(() => { void startBoot(); }, []);
  return (
    <PortraitShell>
      <GameProvider adapter={adapter}>
        <FlowHost />
      </GameProvider>
    </PortraitShell>
  );
}
