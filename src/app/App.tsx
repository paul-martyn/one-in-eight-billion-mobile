import { PortraitShell } from '../components/PortraitShell';
import { FoundationScreen } from '../screens/FoundationScreen';
import { foundationFixture } from '../fixtures/foundation';

export function App() {
  return (
    <PortraitShell>
      <FoundationScreen model={foundationFixture} />
    </PortraitShell>
  );
}
