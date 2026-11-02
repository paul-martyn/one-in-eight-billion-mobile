// Explicit opt-in: preserved original fixtures and UI handlers are an external development oracle.
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { oracleBaseline } from './baseline.mjs';
const project = fileURLToPath(new URL('../..', import.meta.url));
const baseline = oracleBaseline(process.argv[2] ?? process.env.INDEPENDENT_BASELINE);
const environment = { ...process.env, INDEPENDENT_BASELINE: baseline };
const parity = spawnSync(process.execPath, ['--experimental-strip-types', path.join(project, 'tools/verification/compare-engines.mjs'), '--baseline', baseline], { cwd: project, env: environment, stdio: 'inherit' });
if (parity.status !== 0) process.exit(parity.status ?? 1);
// These two files compare original immutable examples/handlers with the new engine/adapter.
const tests = ['equivalence.test.mjs', 'commands.test.mjs'].map(file => path.join(baseline, 'tests/core', file));
const registration = pathToFileURL(path.join(project, 'tools/verification/register-oracle.mjs')).href;
const handlers = spawnSync(process.execPath, ['--experimental-strip-types', '--import', registration, '--test', ...tests], { cwd: project, env: environment, stdio: 'inherit' });
process.exitCode = handlers.status ?? 1;
