// Люди из генератора персонажей Peepulation (src/ui/peeps): портрет «по грудь» и фигура во весь рост.
// Пока детали генератора грузятся или если они не загрузились, показывается fallback вызывающего (инициал в круге).
import { useEffect, useSyncExternalStore, type ReactNode } from 'react';
import type { PersonLook } from '../../adapters/vm/appearance';
import { bodyOf, loadPeeps, peepsStatus, portraitOf, subscribePeeps, type Face, type Frame } from '../peeps/peeps';
import './people.css';

/** true — детали генератора загружены; первый вызов запускает загрузку. */
export function usePeepsReady(): boolean {
  const status = useSyncExternalStore(subscribePeeps, peepsStatus, peepsStatus);
  useEffect(() => { loadPeeps(); }, []);
  return status === 'ready';
}

/**
 * Портрет «по грудь» (рамка генератора), заполняет квадрат: без size — родителя, рамку (круг, скругление) задаёт
 * вызывающий. face="dead" — лицо после смерти (спокойное или крестики — по счастью в момент смерти).
 * frame: 'bust' (по умолчанию) — «по грудь»; 'square' / 'circle' — человек целиком внутри рамки такой формы.
 */
export function PersonPortrait({ look, size, fallback = null, className = '', face = 'alive', frame = 'bust' }: { look: PersonLook | null | undefined; size?: number; fallback?: ReactNode; className?: string; face?: Face; frame?: Frame }) {
  const ready = usePeepsReady();
  if (!ready || !look) return <>{fallback}</>;
  return (
    <span
      className={`pa-portrait ${size == null ? 'pa-fill' : ''} ${className}`}
      style={size == null ? undefined : { width: size, height: size }}
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: portraitOf(look, face, frame) }}
    />
  );
}

/**
 * Человек во весь рост, ноги на нижнем крае. height — высота рамки тела генератора (157 × 182 единицы) в CSS px:
 * все в одном масштабе, ребёнок ниже взрослого. Айдл — у контейнера с классом .peeps-idle.
 */
export function PersonFigure({ look, height, fallback = null, className = '', face = 'alive' }: { look: PersonLook | null | undefined; height: number; fallback?: ReactNode; className?: string; face?: Face }) {
  const ready = usePeepsReady();
  if (!ready || !look) return <>{fallback}</>;
  return (
    <span
      className={`pa-figure ${face === 'dead' ? 'peeps-still' : ''} ${className}`}
      style={{ width: (height * 157) / 182, height }}
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: bodyOf(look, face).svg }}
    />
  );
}
