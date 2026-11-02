// Headless state effects formerly triggered by the inert original renderAll.
// No DOM, markup, drawing, browser callbacks, analytics or network calls.
// T is the generated engine's symbol table, not a second state owner.

const template=(...parts)=>Object.assign(parts,{raw:parts.slice()});
const sceneAria=template('지금 삶의 모습: ','');
const showNames=template('이름과 나이 보기');
const hideNames=template('이름 감추기');

/** Exact semantic tail of an inert render: no DOM, drawing or network. */
export function projectTranslationTail(T) {
  // countryRows emits >8 L calls on every path, evicting all translations
  // from earlier renderers. Only this bounded tail can affect tdKo later.
  T.countryRows(T.UI.cview === 'born' ? T.B() : T.C());
  const model = T.sceneModel(), caption = T.sceneCaption(model);
  const key = T.sceneKey(model, caption) + 'l'; // inert host: light theme
  if (key !== T.scKey) { T.scKey = key; T.L(sceneAria, caption); }
  T.L(T.UI.prefs.sceneWho ? hideNames : showNames);
  if (T.UI.prefs.sceneWho) T.sceneWho();
}

/** sceneModel's appearance memo traversal, preserving its people cap/order. */
export function refreshAppearanceState(T) {
  const S = T.S, fam = S.fam;
  const barracks = T.inBarracks();
  const home = barracks ? { kids: [] } : T.homeOthers();
  let count = 0;
  if (S.job !== 'prison' && !barracks) {
    if (home.dad) { T.skinPar('M'); count++; }
    if (home.step) count++;
    if (home.mom) { T.skinPar('F'); count++; }
    if (!home.dad && !home.mom && T.raisedHere() && S.flags.raised.k !== 'home') {
      if (S.flags.raised.k !== 'foster') T.skinMe();
      count++;
    }
  }
  T.skinMe(); count++;
  const siblings = [];
  if (!barracks) {
    for (const sib of T.sibsHome()) if (count < T.SC_PPL) {
      if (S.adopt && S.adopt.mv != null) T.skinPar(sib.sex); else T.skinMe();
      siblings.push(sib); count++;
    }
  }
  const ddSib = !barracks && S.job !== 'prison' ? T.ddSibNow() : null;
  if (ddSib && count < T.SC_PPL && !siblings.some(s => s.age === ddSib.age && s.sex === ddSib.sex)) {
    if (S.adopt && S.adopt.mv != null) T.skinPar(ddSib.sex); else T.skinMe();
    count++;
  }
  if (S.job !== 'prison' && !barracks) {
    if (home.pt) { T.skinOfP(fam.partner); count++; }
    if (home.pt2) { T.skinOfP(home.pt2); count++; }
    if (home.co) { T.skinOfP(home.co); count++; }
    const imprisoned = fam.kids.filter(k => T.kidInPr(k) && !k.away && (!k.grown || k.withMe));
    for (const kid of home.kids.concat(imprisoned)) if (count < T.SC_PPL) {
      const age = S.age - kid.bornAt;
      if (!imprisoned.includes(kid)) { T.skinOfKid(kid); count++; }
      if ((kid.wed || kid.cuT) && (!kid.grown || kid.withMe) && age >= 18 && count < T.SC_PPL) count++;
      if ((kid.withMe || !kid.grown) && (kid.kb || 0) > 0) {
        const name = kid.name ? T.callName(kid.name) : '';
        const parentHere = kid.withMe || kid.wed || kid.cuT;
        const grandchildren = (fam.grand || []).filter(g => g.of === name && g.ofSex === kid.sex && !g.gone && S.age - g.bornAt < 23 && !g.wm && (parentHere || g.solo));
        for (const grand of grandchildren.slice(0, 3)) if (count < T.SC_PPL) { T.skinOfKid(kid); count++; }
      }
    }
    for (const grand of fam.grand || []) {
      if (grand.home != null && !grand.gone && S.age - grand.bornAt < 19 && count < T.SC_PPL) { T.skinOfG(grand); count++; }
    }
  }
}

/** State/storage portion of focusHint; the mobile UI supplies its own hints. */
export function refreshFocusState(T, options) {
  const S = T.S, prefs = T.UI.prefs;
  if (S.flags.focusPicked && !prefs.focusHint) { prefs.focusHint = 1; T.lsSet(T.PREF_KEY, prefs); }
  if (!prefs.focusHint && T.lsGet(T.LIVES_KEY, []).length) { prefs.focusHint = 1; T.lsSet(T.PREF_KEY, prefs); }
  if (S.flags.foHintAt == null && options.length && !prefs.focusHint && !S.replay && !prefs.auto) S.flags.foHintAt = S.age;
  if (S.flags.foHintAt != null && !prefs.focusHint && S.age - S.flags.foHintAt >= 2) { prefs.focusHint = 1; T.lsSet(T.PREF_KEY, prefs); }
}

export function applyRenderEffects(T) {
  const S = T.S;
  if (!S) return;
  // renderId: appearance first, then idRows residence and language fields.
  refreshAppearanceState(T);
  if (T.studyWhere()) T.studyCity();
  T.homeTongue();
  // renderStats -> ownList(), at adult ages, initializes the rental ledger.
  if (S.age >= 15) T.rentals();
  // renderFamily -> famRows(): parents, siblings, then partner occupation.
  if (S.fam.dad && S.fam.dad.job === undefined) T.parentJobs();
  T.sibAliveN();
  const partner = S.fam.partner;
  if (partner && partner.alive && !partner.divorced && !partner.ret && !partner.ill && !partner.sick && !(partner.age < 18 || partner.stu) && !(partner.out > 0)) {
    if (!partner.job || !T.JOBS[partner.job]) partner.job = T.partnerJobFor(partner, T.C());
  }
  const options = T.focusOptions();
  // renderFocus -> statusLine -> expIn: old saves can lack the job ledger.
  if (!(S.age < 6 || (S.age < 8 && S.job === 'student' && !S.school && !S.edu && S.age < T.schA())) && !(S.serveLeft > 0) && !S.school && !S.retired && T.JOBS[S.job] && T.isWorking()) T.expIn(S.job);
  if (options.length) refreshFocusState(T, options);
  // The later scene pass recomputes the same memos; after the first pass it
  // consumes no RNG. Keep it until targeted exceptional-state checks confirm
  // omission is safe for all appearance branches.
  refreshAppearanceState(T);
  T.UI.dirty = false;
  // Provenance of the final eight translations affects daily-theme tags.
  // Reconstruct the exact logical ring without restoring any old renderer.
  projectTranslationTail(T);
}

// Symbols needed when the implementation is embedded in a lexical engine.
export const RENDER_EFFECT_ROOTS = [
  'inBarracks','homeOthers','skinPar','raisedHere','skinMe','sibsHome','SC_PPL',
  'ddSibNow','skinOfP','kidInPr','skinOfKid','callName','skinOfG','studyWhere',
  'studyCity','homeTongue','rentals','parentJobs','sibAliveN','partnerJobFor',
  'JOBS','C','focusOptions','schA','isWorking','expIn','lsSet','lsGet','PREF_KEY','LIVES_KEY',
  'L_RT','L_RS',
  'countryRows','B','sceneModel','sceneCaption','sceneKey','scKey','L','sceneWho',
];
