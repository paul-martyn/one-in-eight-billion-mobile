import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { verifySourceBoundaries, verifyDistributionBoundaries, REMOVED_LEGACY_TRANSLATION_KEYS } from '../tools/engine-boundaries.mjs';

function fixture(t, files, { source = false } = {}) {
  const prefix = path.join(os.tmpdir(), 'independent-engine-boundaries-');
  const root = fs.mkdtempSync(prefix);
  t.after(() => {
    assert.ok(path.resolve(root).startsWith(path.resolve(prefix)), 'Only this test temporary directory is removed');
    fs.rmSync(root, { recursive: true, force: true });
  });
  const defaults = source ? {
    'package.json': JSON.stringify({ dependencies: { react: '1.0.0' }, devDependencies: { vite: '1.0.0' } }),
    'index.html': '<script type="module" src="./src/main.tsx"></script><link rel="icon" href="./icon.svg">',
    'vite.config.ts': 'import {defineConfig} from "vite"; export default defineConfig({});',
    'public/icon.svg': '<svg xmlns="http://www.w3.org/2000/svg"/>',
    'src/main.tsx': 'import React from "react"; import {run} from "./adapters/run"; export const app=<div/>;',
    'src/adapters/run.ts': 'export const run=()=>import("../engine/game.en.js");',
    'src/engine/era.js': 'export const ERA={};',
    'src/engine/state-effects.js': 'export const effects=()=>{};',
    ...Object.fromEntries(['en', 'ru', 'es', 'fr', 'de'].map(lang => [`src/engine/game.${lang}.js`, 'export const instantiateCore=()=>({});'])),
  } : {};
  for (const [name, contents] of Object.entries({ ...defaults, ...files })) {
    const file = path.join(root, name);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, contents);
  }
  return root;
}

test('source engine is self-contained, uses adapter boundaries and preserves legal provenance', t => {
  const root = fixture(t, {
    'public/licenses/original.txt': 'Source provenance: https://1in8b.life',
    'docs/history.md': 'Historical reference/original-0.8.98; /api/keep',
    'src/core/env.ts': '// Historical loader identifier /era.js is an inert comment.\nexport const origin="http://localhost";',
  }, { source: true });
  assert.deepEqual(verifySourceBoundaries(root), []);
});

test('source engine cannot depend on a snapshot, missing module, undeclared package or remote script', t => {
  const root = fixture(t, {
    'src/engine/game.en.js': 'export * from "../../reference/original/game.js"; import "missing-sdk"; const load=()=>import("https://other.example/game.js");',
    'src/adapters/broken.ts': 'import "./missing"; const url="/api/keep/me";',
    'public/loader.js': 'const script={}; script.src="https://other.example/loader";',
    'public/raw/old.txt': 'old snapshot',
  }, { source: true });
  const failures = verifySourceBoundaries(root);
  for (const expected of ['reference/original/game.js', 'missing-sdk', 'https://other.example/game.js', './missing', 'Old API path', 'public/loader.js', 'public/raw/old.txt']) assert.ok(failures.some(f => f.includes(expected)), expected);
});

test('UI imports and computed engine imports cannot bypass the closed module graph', t => {
  const root = fixture(t, {
    'src/screens/Bad.tsx': 'import {x} from "../core/env";',
    'src/core/env.ts': 'export const x=1;',
    'src/adapters/computed.ts': 'export const load=(name:string)=>import(name); export const template=(name:string)=>import(`../engine/game.${name}.js`);',
    'src/adapters/outside.ts': 'import "../../../outside.js";',
    'src/adapters/docs.ts': 'import "../../docs/code.js";',
    'docs/code.js': 'export const historical=true;',
  }, { source: true });
  const failures = verifySourceBoundaries(root);
  for (const expected of ['UI bypasses', 'Dynamic import must', 'Module leaves the standalone', 'Module leaves the runtime']) assert.ok(failures.some(f => f.includes(expected)), expected);
});

test('production owns all engine chunks and local HTML/CSS/manifest resources', t => {
  const dist = fixture(t, {
    'index.html': '<script type="module" src="./assets/app.js"></script><link rel="stylesheet" href="./assets/app.css"><link rel="manifest" href="./manifest.webmanifest">',
    'assets/app.js': 'export const load=()=>import(`./game.en-abc.js`);',
    'assets/game.en-abc.js': 'export {effects} from "./state-effects-abc.js";',
    'assets/state-effects-abc.js': 'export const effects=()=>{};',
    'assets/app.css': '@font-face{src:url("./font.woff2?#v1")}body{background:url(data:image/png;base64,AA==)}',
    'assets/font.woff2': 'font',
    'manifest.webmanifest': JSON.stringify({ icons: [{ src: './icon.svg' }] }),
    'icon.svg': '<svg xmlns="http://www.w3.org/2000/svg"/>',
    'licenses/original.txt': 'Source provenance: https://1in8b.life',
  });
  assert.deepEqual(verifyDistributionBoundaries(dist), []);
});

test('production rejects old domains inside owned JS, raw files and remote or missing resources', t => {
  const dist = fixture(t, {
    'index.html': '<script src="https://other.example/loader"></script><link rel="stylesheet" href="./assets/app.css">',
    'assets/app.js': 'const old="customerservice@1in8b.life"; const api="/api/e"; import "./missing.js";',
    'assets/app.css': '@import "https://fonts.example/style.css";body{background:url("../../outside.png")}',
    'raw/old.txt': 'old',
    'keepx.dc1833fc3e.js': '',
  });
  const failures = verifyDistributionBoundaries(dist);
  for (const expected of ['Original domain', 'Old API path', './missing.js', 'https://other.example/loader', 'https://fonts.example/style.css', '../../outside.png', 'raw/old.txt', 'keepx.']) assert.ok(failures.some(f => f.includes(expected)), expected);
});

test('removed service dictionary keys cannot return under another language; the product name stays valid', t => {
  const key = REMOVED_LEGACY_TRANSLATION_KEYS[0];
  const root = fixture(t, {
    'src/engine/game.en.js': `export const name="One in Eight Billion"; const I18N_T={${JSON.stringify(key)}:"Реклама удалённого сервиса"};`,
  }, { source: true });
  assert.ok(verifySourceBoundaries(root).some(f => f.includes('Legacy service translation keys') && f.includes(key)));
  const dist = fixture(t, {
    'index.html': '<script type="module" src="./assets/app.js"></script>',
    'assets/app.js': `const translations={${JSON.stringify(key)}:"Ancien service"};`,
  });
  assert.ok(verifyDistributionBoundaries(dist).some(f => f.includes('Legacy service translation keys') && f.includes(key)));
  fs.writeFileSync(path.join(root, 'src/engine/game.en.js'), `export const name="One in Eight Billion"; const historicalKey=${JSON.stringify(key)};`);
  assert.deepEqual(verifySourceBoundaries(root), [], 'a textual key mention and the retained product title are allowed');
  fs.writeFileSync(path.join(root, 'src/engine/game.en.js'), 'const I18N_T={"281khouc24m":"<div class=\\"deadstack\\">Old screen</div>"};');
  assert.ok(verifySourceBoundaries(root).some(f => f.includes('Unused original death/share UI')), 'the used death-certificate key cannot regain its removed old-screen tail');
});
