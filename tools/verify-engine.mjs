import { fileURLToPath } from 'node:url';
import { verifySourceBoundaries } from './engine-boundaries.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const failures = verifySourceBoundaries(root);
if (failures.length) throw new Error(failures.join('\n'));
console.log('Standalone engine verified: owned local sources, complete imports, no original server or modules; UI uses the adapter.');
