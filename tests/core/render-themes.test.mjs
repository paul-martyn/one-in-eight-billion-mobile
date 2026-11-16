// Original initial-state hashes and translated decision entries remain frozen.
// Trigger the phone decision explicitly so the test does not depend on removed
// reflection prompts consuming RNG earlier in the life.
import '../frozen-environment.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { loadDerivedModules } from '../../tools/harness/runtimes.mjs';
import { createHost } from '../../src/core/runtime.ts';

const oracle=JSON.parse(fs.readFileSync(new URL('./fixtures/render-theme-net.json',import.meta.url),'utf8'));
const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
const hash=h=>crypto.createHash('sha256').update(JSON.stringify(canonical({S:h.top.S,entropy:h.entropy.getState()}))).digest('hex');

for(const expected of oracle.fixtures)test(`${expected.lang}: daily theme tags the outcome after reflection removal`,async()=>{
 const {derivedModule,eraModule}=await loadDerivedModules(expected.lang);
 const h=createHost(derivedModule,{storage:null,seed:oracle.seed,lang:expected.lang,viewRandom:()=>.5,clock:{now:()=>Date.parse(oracle.clock),monotonic:()=>0},loadEra:async()=>eraModule.ERA});
 const T=h.top;for(const k of Object.keys(T.HOOK))T.HOOK[k]=()=>{};
 T.newLife('birth',60,null);T.S.phase='life';T.S.td=structuredClone(oracle.theme);
 assert.equal(hash(h),expected.initialHash,'full initial state and RNG');
 T.S.age=16;T.S.cur='BLR';T.S.owns.phone=16;
 T.openDecision('sm_phone',{});
 assert.equal(T.S.pending?.id,expected.before.decisionId);
 for(let i=0;i<3;i++)T.renderAll();
 const start=T.S.log.length;
 T.choose('down');T.renderAll();
 const entries=T.S.log.slice(start);
 const withoutFx=({fx,...entry})=>entry;
 assert.deepEqual(entries.map(withoutFx),expected.after.entries.map(withoutFx),'original translated outcome and theme marker');
 assert.equal(entries[0].td,undefined,'cached decision label does not consume theme slot');
 assert.equal(entries[1].td,1);
 assert.ok(entries[1].fx.hl>0);
 assert.deepEqual(h.errors,[]);
 assert.deepEqual(h.network,[]);
});
