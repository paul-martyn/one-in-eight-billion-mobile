// npm run peeps:sync [-- <путь к character-art/nemo-peeps>]
//
// Генератор персонажей Peepulation живёт вне игры, в общем модуле character-art/nemo-peeps/peepulation.js (им же
// рисует прототип). Генератор ещё будет сильно меняться, поэтому игра берёт его копией, а обновление — одна команда:
//   - модуль → src/vendor/peepulation/peepulation.js (без правок);
//   - правила spec/rules.json → src/vendor/peepulation/rules.json;
//   - детали из parts/manifest.json (только те файлы, что в манифесте) → public/peeps/parts/ (старые удаляются);
//   - откуда и что взято (размер, SHA-256) → src/vendor/peepulation/SOURCE.json.
// Игра обращается к генератору только через src/ui/peeps/peeps.ts и имена из шапки модуля. После синхронизации:
// npm run check, npm run build, посмотреть людей на экранах (npm run shots).
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SRC = path.resolve(process.argv[2] || process.env.PEEPS_SRC || path.join(ROOT, '../character-art/nemo-peeps'));
const VENDOR = path.join(ROOT, 'src/vendor/peepulation');
const PARTS = path.join(ROOT, 'public/peeps/parts');

const need = (p) => { if (!fs.existsSync(p)) throw new Error(`нет ${p} — укажите путь к character-art/nemo-peeps`); return p; };
const sha = (buf) => createHash('sha256').update(buf).digest('hex');
const files = {};
const copy = (from, to) => {
  const buf = fs.readFileSync(need(from));
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.writeFileSync(to, buf);
  files[path.relative(ROOT, to).split(path.sep).join('/')] = { from: path.relative(SRC, from).split(path.sep).join('/'), bytes: buf.length, sha256: sha(buf) };
};

copy(path.join(SRC, 'peepulation.js'), path.join(VENDOR, 'peepulation.js'));
copy(path.join(SRC, 'spec/rules.json'), path.join(VENDOR, 'rules.json'));

const manifestPath = need(path.join(SRC, 'parts/manifest.json'));
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const used = new Set();
for (const p of Object.values(manifest.parts)) {
  if (p.file) used.add(p.file);
  for (const f of Object.values(p.files || {})) used.add(f);
}
fs.rmSync(PARTS, { recursive: true, force: true });
copy(manifestPath, path.join(PARTS, 'manifest.json'));
for (const f of [...used].sort()) copy(path.join(SRC, 'parts', f), path.join(PARTS, f));

const total = Object.values(files).reduce((s, f) => s + f.bytes, 0);
fs.writeFileSync(path.join(VENDOR, 'SOURCE.json'), JSON.stringify({
  $comment: 'Копия генератора Peepulation (character-art/nemo-peeps). Не править руками: npm run peeps:sync.',
  syncedAt: new Date().toISOString().slice(0, 10),
  source: 'character-art/nemo-peeps',
  files,
}, null, 1) + '\n');
console.log(`peepulation: модуль, правила и ${used.size} деталей (${(total / 1048576).toFixed(2)} МБ) из ${SRC}`);
