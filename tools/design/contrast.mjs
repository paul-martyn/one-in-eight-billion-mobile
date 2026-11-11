// Контраст по WCAG 2.x для пар «текст — фон» из tokens.json → contrast.pairs.

const HEX = /^#[0-9a-f]{3}([0-9a-f]{3})?$/i;

function luminance(hex) {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? [...h].map(c => c + c).join('') : h;
  const [r, g, b] = [0, 2, 4]
    .map(i => parseInt(full.slice(i, i + 2), 16) / 255)
    .map(v => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a, b) {
  const [x, y] = [luminance(a), luminance(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

/** Нарушения контраста; путь токена — «color.ink», «journal.life.bg». */
export function contrastFailures(tokens) {
  const get = p => p.split('.').reduce((o, k) => (o == null ? o : o[k]), tokens);
  const out = [];
  for (const pair of tokens.contrast?.pairs ?? []) {
    const fg = get(pair.fg);
    for (const bgPath of [].concat(pair.bg)) {
      const bg = get(bgPath);
      if (!HEX.test(fg ?? '') || !HEX.test(bg ?? '')) { out.push(`${pair.fg} на ${bgPath}: нет такого цвета в токенах`); continue; }
      const cr = contrastRatio(fg, bg);
      if (cr < pair.min) out.push(`${pair.fg} (${fg}) на ${bgPath} (${bg}): ${cr.toFixed(2)} : 1, нужно ${pair.min} : 1`);
    }
  }
  return out;
}
