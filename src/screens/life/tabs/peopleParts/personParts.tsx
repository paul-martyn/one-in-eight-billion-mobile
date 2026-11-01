// Части вкладки People: аватары, слово близости, поиск упоминаний.
// Аватар — портрет из генератора персонажей (пол, возраст и кожа из игры,
// остальное по хэшу; src/adapters/vm/appearance.ts). Пока детали грузятся,
// а также у друзей, бывших и питомцев — инициал в пастельном круге (или
// значок, если у человека в игре нет имени).
import { peopleAppearances } from '../../../../adapters/vm/appearance';
import type { BondTone } from '../../../../adapters/vm/people';
import type { JournalEntryVM } from '../../../../adapters/viewModels';
import { StatIcon } from '../../../../ui/icons';
import { useSharedCoreView } from '../../../../ui/people/hooks';
import { PersonPortrait } from '../../../../ui/people/PersonArt';

/** Пастельные фоны портретов макета (PeopleCute). */
const PASTELS = ['#cdeaf6', '#ffd2c8', '#d6f0de', '#ffe9a8', '#e6dcff'];
export const MEMORY_BG = '#e8dcc6';

/** Тон слова близости → цвет точки из палитры показателей. */
export const TONE_COLOR: Record<BondTone, string> = {
  close: '#4cc9a0',
  good: '#6f8cff',
  distant: '#ffc23d',
  hard: '#ff6f8a',
  none: '#c9a874',
};

function hash(s: string): number {
  let h = 0;
  for (const ch of s) h = (h * 31 + ch.codePointAt(0)!) >>> 0;
  return h;
}

/** Первая буква имени (с учётом составных символов). */
function initialOf(name: string): string {
  const s = name.trim();
  if (!s) return '';
  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    const seg = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
    const first = seg.segment(s)[Symbol.iterator]().next().value;
    if (first) return first.segment.toLocaleUpperCase();
  }
  return Array.from(s)[0]!.toLocaleUpperCase();
}

export function Avatar({ id, name, size, memory = false, away = false, pet = false }: { id: string; name: string; size: number; memory?: boolean; away?: boolean; pet?: boolean }) {
  const initial = initialOf(name);
  const bg = memory ? MEMORY_BG : PASTELS[hash(id) % PASTELS.length];
  const looks = useSharedCoreView(peopleAppearances);
  // Записи «In memory» — те же id с префиксом mem:.
  const look = pet || !looks ? null : looks[id.startsWith('mem:') ? id.slice(4) : id] ?? null;
  const letter = initial ? <span className="k-o ppl-ava__letter">{initial}</span> : <StatIcon k="so" size={Math.round(size * 0.5)} />;
  return (
    <span
      className={`ppl-ava ${memory || away ? 'is-faded' : ''}`}
      style={{ width: size, height: size, background: bg, fontSize: Math.round(size * 0.46) }}
      aria-hidden="true"
    >
      <PersonPortrait look={look} fallback={letter} />
      {pet && <span className="ppl-ava__paw"><PawIcon /></span>}
    </span>
  );
}

const PawIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
    <ellipse cx="12" cy="15.5" rx="5" ry="4.2" fill="#fff" stroke="#5a3418" strokeWidth="2" />
    <circle cx="6" cy="10" r="2.2" fill="#fff" stroke="#5a3418" strokeWidth="1.8" />
    <circle cx="10" cy="6.5" r="2.2" fill="#fff" stroke="#5a3418" strokeWidth="1.8" />
    <circle cx="14" cy="6.5" r="2.2" fill="#fff" stroke="#5a3418" strokeWidth="1.8" />
    <circle cx="18" cy="10" r="2.2" fill="#fff" stroke="#5a3418" strokeWidth="1.8" />
  </svg>
);

export function BondChip({ word, tone, big = false }: { word: string; tone: BondTone; big?: boolean }) {
  if (!word) return null;
  return (
    <span className={`ppl-bond ${big ? 'is-big' : ''}`}>
      <span className="ppl-bond__dot" style={{ background: TONE_COLOR[tone] }} aria-hidden="true" />
      {word}
    </span>
  );
}

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Записи дневника, где человек упомянут: имя (с учётом регистра) или фраза,
 * которой дневник его называет («your maternal grandmother»). Новые сначала.
 */
export function findMentions(journal: JournalEntryVM[], names: string[], phrases: string[], limit = 5): JournalEntryVM[] {
  const tests: RegExp[] = [
    ...names.map(n => new RegExp(`(?<![\\p{L}\\p{N}])${esc(n)}(?![\\p{L}\\p{N}])`, 'u')),
    ...phrases.map(p => new RegExp(`(?<![\\p{L}\\p{N}])${esc(p)}(?![\\p{L}\\p{N}-])`, 'iu')),
  ];
  if (!tests.length) return [];
  const out: JournalEntryVM[] = [];
  for (let i = journal.length - 1; i >= 0 && out.length < limit; i--) {
    const e = journal[i]!;
    if (tests.some(r => r.test(e.text))) out.push(e);
  }
  return out;
}
