// Static + runtime check of a .dc.html artboard: runs its logic class in Node with the given props,
// resolves every {{ hole }} in the markup (following <sc-for ... as> aliases into the first item),
// checks <sc-if>/<sc-for> balance, and checks links: standalone, every href hole must give a
// string; hosted (props.nav is a function), every href hole must give null and every onClick on
// such a link a function, and no literal href="X.dc.html" may remain.
// Usage: node check-dc.js <file.dc.html> ['{"frame":"decision"}' ...]
// Each props JSON is run twice: standalone, then hosted ({...props, nav}).
const fs = require('fs');
const file = process.argv[2];
const propSets = process.argv.slice(3).map((j) => JSON.parse(j));
if (!propSets.length) propSets.push({});
const src = fs.readFileSync(file, 'utf8');
const markup = src.slice(src.indexOf('<x-dc>'), src.indexOf('</x-dc>'));
const tag = src.indexOf('data-dc-script');
const body = src.slice(src.indexOf('>', tag) + 1, src.lastIndexOf('</script>'));
let problems = 0;
const fail = (m) => { problems++; console.log('  FAIL ' + m); };

for (const t of ['sc-if', 'sc-for']) {
  const open = (markup.match(new RegExp('<' + t + '[\\s>]', 'g')) || []).length;
  const close = (markup.match(new RegExp('</' + t + '>', 'g')) || []).length;
  if (open !== close) fail(t + ' open ' + open + ' / close ' + close);
}
const dp = src.match(/data-props='([^']*)'/);
try { JSON.parse(dp[1].replace(/&amp;/g, '&').replace(/&#39;/g, "'")); } catch (e) { fail('data-props JSON: ' + e.message); }

// Aliases from <sc-for list="{{ X }}" as="Y">.
const alias = {};
for (const m of markup.matchAll(/<sc-for\s+list="\{\{\s*([^}]+?)\s*\}\}"\s+as="([^"]+)"/g)) alias[m[2]] = m[1];

function resolve(vals, path) {
  if (/^(true|false|null|-?\d+(\.\d+)?)$/.test(path) || /^['"]/.test(path)) return { ok: true, v: JSON.parse(path.replace(/'/g, '"')) };
  if (path === '$index') return { ok: true, v: 0 };
  const parts = path.split('.');
  let head = parts[0], guard = 0;
  let segs = parts.slice(1);
  while (alias[head] && guard++ < 10) {
    const p = alias[head].split('.');
    segs = p.slice(1).concat(['0']).concat(segs);
    head = p[0];
  }
  let v = vals[head];
  if (v === undefined && !(head in vals)) return { ok: false, v: undefined, empty: false };
  for (const s of segs) {
    if (v == null) return { ok: false, v: undefined };
    if (Array.isArray(v) && s === '0') { if (!v.length) return { ok: true, v: undefined, empty: true }; v = v[0]; continue; }
    if (!(s in Object(v))) return { ok: false, v: undefined };
    v = v[s];
  }
  return { ok: true, v: v };
}

let Logic;
try {
  Logic = new Function('DCLogic', body + '\nreturn Component;')(class {
    setState(o) { this.state = Object.assign({}, this.state, typeof o === 'function' ? o(this.state || {}, this.props) : o); }
    forceUpdate() {}
  });
} catch (e) { fail('script does not evaluate: ' + e.message); }

const navCalls = [];
for (const base of propSets) {
  for (const hosted of [false, true]) {
    const props = Object.assign({}, base, hosted ? { nav: (s) => navCalls.push(s) } : {});
    const label = JSON.stringify(base) + (hosted ? ' hosted' : ' standalone');
    if (!Logic) break;
    let vals;
    try { const o = new Logic(); o.props = props; o.state = undefined; vals = o.renderVals(); } catch (e) { fail(label + ': renderVals threw ' + e.message); continue; }
    const before = problems;
    // Every hole.
    for (const m of markup.matchAll(/\{\{\s*([^}]+?)\s*\}\}/g)) {
      const r = resolve(vals, m[1]);
      if (!r.ok) fail(label + ': hole {{ ' + m[1] + ' }} does not resolve');
    }
    // Event handlers must be functions (or null/undefined when deliberately off).
    for (const m of markup.matchAll(/on[A-Z][a-zA-Z]*="\{\{\s*([^}]+?)\s*\}\}"/g)) {
      const r = resolve(vals, m[1]);
      if (r.ok && !r.empty && r.v != null && typeof r.v !== 'function') fail(label + ': handler {{ ' + m[1] + ' }} is ' + typeof r.v);
    }
    // Links.
    for (const m of markup.matchAll(/<a\s[^>]*>/g)) {
      const a = m[0];
      const h = a.match(/href="([^"]*)"/);
      if (!h) continue;
      const hole = h[1].match(/^\{\{\s*([^}]+?)\s*\}\}$/);
      if (!hole) {
        if (/\.dc\.html$/.test(h[1])) fail(label + ': literal link ' + h[1] + ' cannot be taken over by the prototype');
        continue;
      }
      const r = resolve(vals, hole[1]);
      if (r.empty) continue;
      if (!hosted && (typeof r.v !== 'string' || !r.v)) fail(label + ': href {{ ' + hole[1] + ' }} gives ' + JSON.stringify(r.v));
      if (hosted && r.v != null && /\.dc\.html$/.test(String(r.v))) fail(label + ': href {{ ' + hole[1] + ' }} still links to ' + r.v);
      const oc = a.match(/onClick="\{\{\s*([^}]+?)\s*\}\}"/);
      if (hosted && /\.dc\.html/.test(src) && !oc && r.v == null) fail(label + ': link {{ ' + hole[1] + ' }} has no onClick to call nav');
      if (hosted && oc) { const f = resolve(vals, oc[1]); if (!f.empty && typeof f.v !== 'function') fail(label + ': onClick {{ ' + oc[1] + ' }} is not a function when hosted'); }
    }
    console.log((problems === before ? 'ok   ' : 'bad  ') + label);
  }
}
console.log(problems ? problems + ' problem(s) in ' + file : 'clean: ' + file);
process.exitCode = problems ? 1 : 0;
