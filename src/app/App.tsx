import { useEffect } from 'react';
import { PortraitShell } from '../components/PortraitShell';
import { GameProvider } from '../adapters/useGame';
import { FlowHost } from '../flow/FlowHost';
import { adapter, startBoot } from './game';

export function App() {
  useEffect(() => { void startBoot(); }, []);
  return (
    <PortraitShell>
      <GameProvider adapter={adapter}>
        <FlowHost />
      </GameProvider>
    </PortraitShell>
  );
}
