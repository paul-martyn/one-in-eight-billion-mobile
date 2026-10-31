// Однократное копирование эталона. Не преобразует код и не запускает игру.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('..', import.meta.url));
const source = path.resolve(process.argv[2] || path.join(root, '../recovery-life-2026-10-31'));
const reference = path.join(root, 'reference');
const destination = path.join(reference, 'original-0.8.98');
if (fs.existsSync(destination)) throw new Error('Эталон уже существует; автоматическая перезапись запрещена');
const read = name => JSON.parse(fs.readFileSync(path.join(source, name), 'utf8'));
const sources = read('recovered-source-index.json');
if (sources.find(x => x.source === 'src/game.en.js')?.originalSha256 !== 'ab507954eb3698691b32aaabec8696c919325ce90993c822a5ec9f39ee570cb2') throw new Error('Ожидался проверенный снимок 0.8.98');
const names = new Set(['recovered-source-index.json', 'data-index.json', 'SNAPSHOT-VERSION.json', 'LICENSES.md']);
for (const entry of sources) { names.add(entry.source); names.add(entry.original); }
for (const entry of read('data-index.json')) names.add(entry.file);
function collect(relative) {
  for (const entry of fs.readdirSync(path.join(source, relative), { withFileTypes: true })) {
    const name = `${relative}/${entry.name}`;
    if (entry.isDirectory()) collect(name);
    else if (entry.isFile()) names.add(name);
  }
}
collect('examples');
collect('licenses');
const files = [];
for (const name of [...names].sort()) {
  const input = fs.readFileSync(path.join(source, name));
  const target = path.join(destination, name);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, input);
  files.push({ path: `original-0.8.98/${name}`, bytes: input.length, sha256: crypto.createHash('sha256').update(input).digest('hex') });
}
const provenance = {
  schema: 1, engineVersion: '0.8.98 beta', origin: 'https://1in8b.life', captureDate: '2026-10-31',
  importedAt: new Date().toISOString(), sourceSnapshot: 'recovery-life-2026-10-31',
  role: 'Immutable reference only; not a standalone headless SDK and not imported into the web application.',
  scope: 'Six exact public bundles and their formatted equivalents, 210 literal datasets, synthetic lifecycle examples, metadata and license notices. This is not a complete website copy.',
  hashAlgorithm: 'SHA-256', files,
};
fs.writeFileSync(path.join(reference, 'provenance.json'), JSON.stringify(provenance, null, 2) + '\n');
console.log(`Сохранён эталон 0.8.98: ${files.length} файлов без изменений.`);
