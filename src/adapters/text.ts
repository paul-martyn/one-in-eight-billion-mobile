// Тексты оригинала иногда содержат простую HTML-разметку (<b>, <small>).
// Для показа она превращается в обычный текст или в сегменты с выделением.
// Это только отображение: состояние игры из текста не извлекается.

const ENTITIES: Record<string, string> = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&nbsp;': ' ' };
const decode = (s: string) => s.replace(/&(amp|lt|gt|quot|#39|nbsp);/g, m => ENTITIES[m] ?? m);

export function plain(html: unknown): string {
  if (html == null) return '';
  return decode(String(html).replace(/<!--[\s\S]*?-->/g, '').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '')).replace(/[ \t]+/g, ' ').trim();
}

export type Segment = { text: string; strong?: boolean };
/** Сохраняет только <b>/<strong> как выделение. */
export function segments(html: unknown): Segment[] {
  if (html == null) return [];
  const out: Segment[] = [];
  const re = /<(b|strong)>([\s\S]*?)<\/\1>/gi;
  const s = String(html);
  let last = 0;
  for (let m: RegExpExecArray | null; (m = re.exec(s)); ) {
    if (m.index > last) out.push({ text: plain(s.slice(last, m.index)) + (/\s$/.test(s.slice(last, m.index)) ? ' ' : '') });
    out.push({ text: plain(m[2]), strong: true });
    last = m.index + m[0].length;
  }
  if (last < s.length) out.push({ text: (/^\s/.test(s.slice(last)) ? ' ' : '') + plain(s.slice(last)) });
  return out.filter(x => x.text);
}

/** «Mother 59 · …» и подобные строки из <small class="…">: класс → значение. */
export function smallParts(html: unknown): { main: string; parts: Record<string, string> } {
  const s = String(html ?? '');
  const parts: Record<string, string> = {};
  const main = s.replace(/<small class="([^"]+)">([\s\S]*?)<\/small>/g, (_, cls: string, inner: string) => {
    parts[cls] = plain(inner).replace(/^·\s*/, '');
    return '';
  });
  return { main: plain(main), parts };
}
