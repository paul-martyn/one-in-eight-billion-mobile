import type { JournalEntryVM } from '../../adapters/viewModels';

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
