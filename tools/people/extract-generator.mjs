// Однократное извлечение деталей персонажей из демо-генератора команды
// (character-art/demo/generator.html): манифест деталей и атласы PNG.
// Генератор хранит манифест в <script id="manifest" type="application/json">,
// а атласы — data URI в `const ATLAS = {...}`. Скрипт ничего не преобразует:
// манифест сохраняется тем же JSON, атласы — теми же байтами PNG.
// Запуск: node tools/people/extract-generator.mjs [путь к generator.html]
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../..', import.meta.url));
const source = path.resolve(process.argv[2] || path.join(root, '../character-art/demo/generator.html'));
const manifestOut = path.join(root, 'src/ui/people/manifest.json');
const assets = path.join(root, 'src/assets/people');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');

const html = fs.readFileSync(source);
const text = html.toString('utf8');

const m = text.match(/<script id="manifest" type="application\/json">([\s\S]*?)<\/script>/);
if (!m) throw new Error('В генераторе не найден <script id="manifest">');
const manifest = JSON.parse(m[1]);

const a = text.match(/\nconst ATLAS = (\{[^\n]*\});\n/);
if (!a) throw new Error('В генераторе не найден const ATLAS');
const atlas = JSON.parse(a[1]);

// Имена файлов атласов берутся из манифеста (bodies[*].atlas, babyAtlas).
const fileOf = { babies: manifest.babyAtlas };
for (const [id, body] of Object.entries(manifest.bodies)) fileOf[id] = body.atlas;
for (const id of Object.keys(atlas)) if (!fileOf[id]) throw new Error(`Атлас ${id} не описан в манифесте`);
for (const id of Object.keys(fileOf)) if (!atlas[id]) throw new Error(`Манифест ссылается на отсутствующий атлас ${id}`);

fs.mkdirSync(assets, { recursive: true });
fs.mkdirSync(path.dirname(manifestOut), { recursive: true });

const files = {};
for (const [id, uri] of Object.entries(atlas)) {
  const d = /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/.exec(uri);
  if (!d) throw new Error(`Атлас ${id}: ожидался data:image/png;base64`);
  const bytes = Buffer.from(d[1], 'base64');
  if (bytes.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') throw new Error(`Атлас ${id}: не PNG`);
  const name = fileOf[id];
  if (!/^[a-z0-9_]+\.png$/.test(name)) throw new Error(`Недопустимое имя атласа ${name}`);
  fs.writeFileSync(path.join(assets, name), bytes);
  files[name] = { atlas: id, bytes: bytes.length, sha256: sha(bytes) };
}

const manifestText = JSON.stringify(manifest, null, 1) + '\n';
fs.writeFileSync(manifestOut, manifestText);

const record = {
  source: path.relative(root, source).split(path.sep).join('/'),
  sourceBytes: html.length,
  sourceSha256: sha(html),
  tool: 'tools/people/extract-generator.mjs',
  note: 'Atlases are the generator data URIs decoded byte for byte; manifest.json is the generator <script id="manifest"> JSON.',
  manifest: { path: 'src/ui/people/manifest.json', bytes: Buffer.byteLength(manifestText), sha256: sha(manifestText) },
  files,
};
fs.writeFileSync(path.join(assets, 'SOURCE.json'), JSON.stringify(record, null, 2) + '\n');
console.log(`Извлечено: ${Object.keys(files).length} атласов, манифест ${record.manifest.bytes} байт; источник ${record.sourceSha256.slice(0, 12)}…`);
