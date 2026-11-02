// Adapter for optional inherited oracle tests; never part of normal app tests.
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { oracleBaseline } from './baseline.mjs';
export { createDerivedRuntime, loadDerivedModules, harnessEntropy } from '../harness/runtimes.mjs';
const baseline = oracleBaseline();
const source = pathToFileURL(path.join(baseline, 'tools/harness/runtimes.mjs'));
source.searchParams.set('oracle', 'original');
const original = await import(source.href);
export const createOriginalRuntime = original.createOriginalRuntime;
