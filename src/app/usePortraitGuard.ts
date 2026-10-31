import { useSyncExternalStore } from 'react';
import { needsPortrait } from './orientation';

function readOrientation() {
  const legacyAngle = (window as Window & { orientation?: number }).orientation;
  return needsPortrait({
    coarsePointer: matchMedia('(pointer: coarse)').matches,
    screenType: screen.orientation?.type,
    legacyAngle,
    screenWidth: screen.width,
    screenHeight: screen.height,
  });
}

function subscribe(update: () => void) {
  const pointer = matchMedia('(pointer: coarse)');
  pointer.addEventListener('change', update);
  screen.orientation?.addEventListener('change', update);
  window.addEventListener('orientationchange', update);
  window.addEventListener('resize', update);
  return () => {
    pointer.removeEventListener('change', update);
    screen.orientation?.removeEventListener('change', update);
    window.removeEventListener('orientationchange', update);
    window.removeEventListener('resize', update);
  };
}

export function usePortraitGuard() {
  return useSyncExternalStore(subscribe, readOrientation, () => false);
}
