// Frozen trusted-original oracle: standalone checks need no recovery files.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { loadDerivedModules } from '../../tools/harness/runtimes.mjs';
import { createHost } from '../../src/core/runtime.ts';

const oracle=JSON.parse(fs.readFileSync(new URL('./fixtures/render-theme-net.json',import.meta.url),'utf8'));
const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
const hash=h=>crypto.createHash('sha256').update(JSON.stringify(canonical({S:h.top.S,entropy:h.entropy.getState()}))).digest('hex');

for(const expected of oracle.fixtures)test(`${expected.lang}: daily-theme provenance matches frozen original full state and RNG`,async()=>{
 const {derivedModule,eraModule}=await loadDerivedModules(expected.lang);
 const h=createHost(derivedModule,{storage:null,seed:oracle.seed,lang:expected.lang,viewRandom:()=>.5,clock:{now:()=>Date.parse(oracle.clock),monotonic:()=>0},loadEra:async()=>eraModule.ERA});
 const T=h.top;for(const k of Object.keys(T.HOOK))T.HOOK[k]=()=>{};
 T.newLife('birth',60,null);T.S.phase='life';T.S.td=structuredClone(oracle.theme);
 assert.equal(hash(h),expected.initialHash,'full initial state and RNG');
 for(let step=0;step<12000&&T.S.phase==='life';step++){
  if(step%3===0)T.renderAll();
  if(step===expected.before.step){
   assert.equal(T.S.pending?.id,expected.before.decisionId);
   assert.equal(hash(h),expected.before.hash,'full state and RNG before choice');
  }
  if(T.S.pending)T.choose(T.autoChoice(T.S.pending));else T.tick(T.S.yearSec/3);
  if(step===expected.after.step){
   assert.equal(hash(h),expected.after.hash,'full state and RNG after choice');
   assert.deepEqual(T.S.log.slice(68,70),expected.after.entries,'the outcome carries the theme marker');
   assert.equal(T.S.log[68].td,undefined,'cached decision label does not consume theme slot');
   assert.equal(T.S.log[69].td,1);
  }
 }
 assert.equal(T.S.phase,'dead');
 assert.equal(T.S.age,expected.finalAge);
 assert.equal(h.entropy.getState(),expected.finalEntropy);
 assert.equal(hash(h),expected.finalHash,'full completed life, journal and RNG');
 assert.deepEqual(h.errors,[]);
 assert.deepEqual(h.network,[]);
});
