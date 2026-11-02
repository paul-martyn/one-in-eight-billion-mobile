// Optional development input, never discovered from a neighbouring project.
import fs from 'node:fs';
import path from 'node:path';

export function oracleBaseline(input = process.env.INDEPENDENT_BASELINE) {
  if (!input) throw new Error('Pass an archived comparison repository explicitly: npm run test:oracle -- <path>, or set INDEPENDENT_BASELINE. Normal checks and builds need no archive.');
  const baseline = path.resolve(input);
  for (const name of ['tools/harness/runtimes.mjs', 'reference/original-0.8.98']) {
    if (!fs.existsSync(path.join(baseline, name))) throw new Error(`Comparison archive is incomplete: ${path.join(baseline, name)}`);
  }
  for (const lang of ['en', 'ru', 'es', 'fr', 'de']) {
    const meta = path.join(baseline, 'src/core/generated', `game.${lang}.core.meta.json`);
    if (!fs.existsSync(meta)) throw new Error(`Historical comparison checkout is not prepared: ${meta}. Run npm ci and npm run core:extract inside that historical checkout first. This is only required for the optional oracle.`);
  }
  return baseline;
}
