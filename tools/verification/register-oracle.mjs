// Resolve inherited tests against the independent adapter/host without modifying either repository.
import path from 'node:path';
import { registerHooks } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { oracleBaseline } from './baseline.mjs';
const project = fileURLToPath(new URL('../..', import.meta.url));
const baseline = oracleBaseline();
const baselineUrl = pathToFileURL(baseline + path.sep).href;
const projectUrl = pathToFileURL(project + path.sep).href;
registerHooks({ resolve(specifier, context, nextResolve) {
  const result = nextResolve(specifier, context);
  if (!result.url.startsWith(baselineUrl)) return result;
  const relative = result.url.slice(baselineUrl.length);
  if (relative === 'tools/harness/runtimes.mjs') return { ...result, url: new URL('tools/verification/oracle-runtimes.mjs', projectUrl).href };
  if (relative === 'tools/harness/replay.mjs' || relative.startsWith('src/adapters/') || relative === 'src/core/runtime.ts' || relative === 'src/core/entropy.ts' || relative.startsWith('src/core/localization/')) return { ...result, url: new URL(relative, projectUrl).href };
  return result;
} });
