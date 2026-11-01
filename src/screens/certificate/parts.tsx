// Общие мелочи экранов свидетельства и «Your start in life».
// Только представление: данные приходят из снимка адаптера, команды — через адаптер.
import { useCallback, useRef, useState } from 'react';
import { gestureId, useAdapter } from '../../adapters/useGame';
import { familyAppearances, type FamilyLooks, type PersonLook } from '../../adapters/vm/appearance';
import type { Nav } from '../../flow/FlowHost';
import { t } from '../../i18n';
import { useFigures, useSharedCoreView } from '../../ui/people/hooks';
import { PersonPortrait, PortraitView } from '../../ui/people/PersonArt';

const segmenter = typeof Intl !== 'undefined' && 'Segmenter' in Intl ? new Intl.Segmenter(undefined, { granularity: 'grapheme' }) : null;

/** Строка по видимым символам (чтобы «печать» не разрывала составные буквы и эмодзи). */
export function graphemes(text: string): string[] {
  if (!text) return [];
  if (segmenter) return Array.from(segmenter.segment(text), s => s.segment);
  return Array.from(text);
}

/** Первая буква имени для нейтральной заглушки портрета. */
export function initialOf(name: string): string {
  const g = graphemes(name.trim())[0];
  return g ? g.toLocaleUpperCase() : '?';
}

/** Фон заглушек по ролям (цвета портретов холста). */
export const PORTRAIT_BG = { mother: '#ffd2c8', father: '#cdeaf6', sibling: '#d6f0de', baby: '#ffe9a8' } as const;

/**
 * Кто изображён на портрете свидетельства: человек узнаётся по имени, которое
 * экран передаёт заглушке (родитель — полное имя, младенец — имя или полное
 * имя персонажа), а фон уточняет роль (матери, отца или младенца).
 */
function lookFor(fam: FamilyLooks | null, name: string, bg: string): PersonLook | null {
  if (!fam || !name) return null;
  if (bg === PORTRAIT_BG.baby) return fam.me.names.includes(name) ? fam.me.look : null;
  const parents = [fam.mother, fam.father].filter(p => p && p.name && p.name === name);
  if (parents.length > 1) return (bg === PORTRAIT_BG.father ? fam.father : fam.mother)?.look ?? null;
  return parents[0]?.look ?? null;
}

/**
 * Портрет из генератора персонажей (семья при рождении, src/adapters/vm/appearance.ts);
 * пока детали грузятся или человека нет в данных — буква в цветном круге/квадрате.
 */
export function Initial({ name, bg, className = '', shape = 'circle' }: { name: string; bg: string; className?: string; shape?: 'circle' | 'square' }) {
  const fam = useSharedCoreView(familyAppearances);
  return (
    <span className={`ph-initial ph-initial--${shape} ${className}`} style={{ background: bg }} aria-hidden="true">
      <PersonPortrait look={lookFor(fam, name, bg)} fallback={<span className="k-o ph-initial__letter">{initialOf(name)}</span>} />
    </span>
  );
}

/** Братья и сёстры при рождении: до двух портретов внахлёст; пока их нет — значок «несколько человек». */
export function PeopleGlyph({ size = 26 }: { size?: number }) {
  const fam = useSharedCoreView(familyAppearances);
  const sibs = fam ? fam.siblings.slice(0, 2) : [];
  const states = useFigures(sibs);
  const figs = states.flatMap(s => (s?.status === 'ready' ? [s.fig] : []));
  if (sibs.length && figs.length === sibs.length) {
    return (
      <span className="pa-sibs" aria-hidden="true">
        {figs.map((fig, i) => <span key={i} className="pa-sibs__one"><PortraitView fig={fig} /></span>)}
      </span>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8.5 11a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4ZM2.5 19.5c0-3.4 2.6-5.6 6-5.6s6 2.2 6 5.6ZM15.8 11a2.7 2.7 0 1 0 0-5.4 2.7 2.7 0 0 0 0 5.4ZM14.6 19.5c0-2.2-.4-3.9-1.2-5 .8-.5 1.6-.7 2.6-.7 3 0 5.5 2 5.5 5.7Z" fill="#fff" stroke="#5a3418" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

export const sexWord = (sex: 'F' | 'M') => t(sex === 'F' ? 'certificate.sexWord.F' : 'certificate.sexWord.M');
export const sexLabel = (sex: 'F' | 'M') => t(sex === 'F' ? 'certificate.sex.F' : 'certificate.sex.M');
export const birthDate = (month: string, year: number) => t('certificate.date', { month, year });

/**
 * «Start life»: команда beginLife применяется сразу (с новым id жеста), затем
 * переход на экран жизни. Повторное нажатие до перехода игнорируется.
 */
export function useStartLife(nav: Nav): { start: () => void; busy: boolean } {
  const adapter = useAdapter();
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const start = useCallback(() => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    const ok = adapter.beginLife(gestureId());
    if (ok || adapter.getSnapshot().lifePhase === 'life') {
      nav.go({ id: 'life', tab: 'life' });
    } else {
      lock.current = false;
      setBusy(false);
    }
  }, [adapter, nav]);
  return { start, busy };
}
