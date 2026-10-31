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
// Проверка прямых ссылок дополняет запрет раздачи reference в dev-сервере.
// Произвольно вычисляемые пути проверяются при code review.
walk(path.join(root, 'src'), file => {
  if (!/\.(ts|tsx|js|jsx|css)$/.test(file)) return;
  if (/reference\/|reference\\|original-0\.8\.98|1in8b\.life\/api\//.test(fs.readFileSync(file, 'utf8'))) failures.push(`Недопустимая связь UI с эталоном/production API: ${path.relative(root, file)}`);
});
if (failures.length) throw new Error(failures.join('\n'));
console.log(`Эталон ${provenance.engineVersion}: ${expected.size} файлов совпадают. UI не подключён к core.`);
