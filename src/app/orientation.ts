export type OrientationSignals = Readonly<{
  coarsePointer: boolean;
  screenType?: string;
  legacyAngle?: number;
  screenWidth: number;
  screenHeight: number;
}>;

// Ориентируемся на физический экран: клавиатура меняет viewport, но не поворот.
export function needsPortrait(signals: OrientationSignals): boolean {
  if (!signals.coarsePointer) return false;
  if (signals.screenType?.startsWith('portrait')) return false;
  if (signals.screenType?.startsWith('landscape')) return true;
  if (typeof signals.legacyAngle === 'number') return Math.abs(signals.legacyAngle) % 180 === 90;
  return signals.screenWidth > signals.screenHeight;
}
