// Проверка границ. Две разные гарантии:
// 1. Эталон reference/original-0.8.98 не изменён (длина и SHA-256 каждого файла).
// 2. Интерфейс обращается к игре только через адаптер: экраны и компоненты не
//    импортируют эталон, производный core и окружение напрямую и не содержат
//    адресов рабочего API оригинала.
// Эквивалентность поведения производного core проверяют тесты tests/core/.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('..', import.meta.url));
const reference = path.join(root, 'reference');
const provenance = JSON.parse(fs.readFileSync(path.join(reference, 'provenance.json'), 'utf8'));
const expected = new Set();
const failures = [];
for (const entry of provenance.files) {
  const target = path.resolve(reference, entry.path);
  if (!target.startsWith(reference + path.sep)) throw new Error('Недопустимый путь эталона');
  expected.add(target);
  if (!fs.existsSync(target)) { failures.push(`Отсутствует ${entry.path}`); continue; }
  const bytes = fs.readFileSync(target);
  if (bytes.length !== entry.bytes || crypto.createHash('sha256').update(bytes).digest('hex') !== entry.sha256) failures.push(`Изменён ${entry.path}`);
}
function walk(dir, check) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Неожиданная ссылка ${full}`);
    if (entry.isDirectory()) walk(full, check);
    else if (entry.isFile()) check(full);
  }
}
walk(path.join(reference, 'original-0.8.98'), file => {
  if (!expected.has(file)) failures.push(`Лишний файл эталона ${path.relative(reference, file)}`);
});

const src = path.join(root, 'src');
const rel = file => path.relative(root, file).split(path.sep).join('/');
const generated = path.join(src, 'core', 'generated') + path.sep;
walk(src, file => {
  if (!/\.(ts|tsx|js|jsx|css)$/.test(file) || file.startsWith(generated)) return;
  const text = fs.readFileSync(file, 'utf8');
  const name = rel(file);
  // Никакой код приложения не читает эталон напрямую.
  if (/from\s+['"][^'"]*reference\/|import\(\s*['"][^'"]*reference\/|original-0\.8\.98\//.test(text)) failures.push(`Связь с эталоном в обход генератора: ${name}`);
  // Рабочие адреса сервера оригинала не используются новым приложением.
  if (/1in8b\.life\/api|https?:\/\/(www\.)?1in8b\.life/.test(text)) failures.push(`Адрес production API оригинала: ${name}`);
  // Экраны, компоненты и flow получают данные только через адаптер.
  if (/^src\/(app|screens|components|flow|ui)\//.test(name) && /from\s+['"][^'"]*core\/(generated|env|runtime)/.test(text)) failures.push(`UI обращается к core в обход адаптера: ${name}`);
});

if (failures.length) throw new Error(failures.join('\n'));
console.log(`Эталон ${provenance.engineVersion}: ${expected.size} файлов совпадают с provenance. Границы UI → адаптер → core соблюдены.`);
