// Builds OddsLife.dc.html: Aarav's life against his country and the world.
const fs = require('fs');
const C = require('./tabs-common.js');
const { L, INK, TEXT, MUTED, PANEL, FIELD, PRESS, RAISE, IMG, ICON, STATC } = C;

// Sample survival curves (share still alive by age, %), boys born in 2026: India and the world.
const INDIA = [[0, 100], [5, 97], [15, 96.5], [30, 94], [45, 89], [60, 76], [70, 58], [80, 30], [90, 8], [100, 0.5]];
const WORLD = [[0, 100], [5, 96], [15, 95.5], [30, 93], [45, 89], [60, 79], [70, 64], [80, 38], [90, 12], [100, 1]];
const X = (a) => 34 + a * 2.85, Y = (p) => 152 - p * 1.38;
const path = (pts) => 'M' + pts.map(([a, p]) => `${X(a).toFixed(1)} ${Y(p).toFixed(1)}`).join(' L');

// The two curves sit in a nested svg as wide as the part drawn so far: they draw in from age 0.
const chart = `<svg width="100%" height="190" viewBox="0 0 329 190" role="img" aria-label="Share of boys born in 2026 still alive at each age, India against the world. Aarav is 15; 96.5 percent of boys born in India with him reach that age." style="display: block">
<g stroke="#e2c595" stroke-width="1">${[0, 25, 50, 75, 100].map((p) => `<path d="M34 ${Y(p)} H319"></path>`).join('')}</g>
<g font-family="Fredoka, sans-serif" font-size="10" font-weight="600" fill="#8a5a35">${[0, 50, 100].map((p) => `<text x="28" y="${Y(p) + 3.5}" text-anchor="end">${p}%</text>`).join('')}${[0, 20, 40, 60, 80, 100].map((a) => `<text x="${X(a)}" y="168" text-anchor="middle">${a}</text>`).join('')}<text x="319" y="182" text-anchor="end">age</text></g>
<svg width="{{ curveW }}" height="190" overflow="hidden">
<path d="${path(WORLD)}" fill="none" stroke="#2593a3" stroke-width="2.5" stroke-dasharray="5 4" stroke-linecap="round"></path>
<path d="${path(INDIA)}" fill="none" stroke="#e0702a" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"></path>
</svg>
<path d="M${X(71)} 152 V158" stroke="#7b4b2a" stroke-width="2"></path>
<text x="${X(71)}" y="146" text-anchor="middle" font-family="Fredoka, sans-serif" font-size="10" font-weight="700" fill="#7b4b2a">~71</text>
<path d="M${X(15)} ${Y(100)} V152" stroke="#7b4b2a" stroke-width="1.5" stroke-dasharray="3 3"></path>
<circle cx="${X(15)}" cy="${Y(96.5)}" r="6" fill="#ffd75a" stroke="#7b4b2a" stroke-width="2"></circle>
<g transform="translate(${X(15) + 8} ${Y(96.5) + 8})"><rect width="54" height="20" rx="6" fill="#fff3d6" stroke="#7b4b2a" stroke-width="1.5"></rect><text x="27" y="14" text-anchor="middle" font-family="Fredoka, sans-serif" font-size="11" font-weight="700" fill="#5a3418">You · 15</text></g>
</svg>`;

const finding = (icon, text) => `<li style="display: flex; align-items: flex-start; gap: 8px; padding: 7px 9px 8px 7px; border: 2px solid ${L}; border-radius: 10px; background: ${FIELD}">${icon}<span style="font-size: 13.5px; font-weight: 500; line-height: 1.35; color: ${TEXT}">${text}</span></li>`;
const dotIcon = (color, glyph) => `<span aria-hidden="true" style="flex: none; display: flex; align-items: center; justify-content: center; width: 24px; height: 24px; box-sizing: border-box; border: 2px solid ${L}; border-radius: 7px; background: ${color}; font-size: 12px; font-weight: 700; color: #ffffff">${glyph}</span>`;

const context = `<section aria-label="Where you stand" style="padding: 10px; border: 2px solid ${L}; border-radius: 14px; background: ${PANEL}; box-shadow: ${RAISE}">
<div style="display: flex; align-items: center; gap: 8px">
<svg width="24" height="28" viewBox="0 0 24 28" aria-hidden="true" style="flex: none"><path d="M12 26s-8.5-7.6-8.5-14.4a8.5 8.5 0 0 1 17 0C20.5 18.4 12 26 12 26Z" fill="#ff6f8a" stroke="#7b4b2a" stroke-width="2" stroke-linejoin="round"></path><circle cx="12" cy="11.5" r="3.2" fill="#ffffff" stroke="#7b4b2a" stroke-width="1.8"></circle></svg>
<span style="flex: 1; min-width: 0"><span style="display: block; font-size: 17px; font-weight: 700; line-height: 1.2">India · Lucknow</span><span style="display: block; font-size: 12px; font-weight: 600; color: ${MUTED}">City · boy born 2026 · family in the 2nd fifth</span></span>
</div>
<ul style="list-style: none; margin: 10px 0 0; padding: 0; display: flex; flex-direction: column; gap: 6px">
${finding(dotIcon('#3ec3d2', '1'), 'One in six of the world’s babies is born in India. In 2026, one of them was you.')}
${finding(dotIcon('#8fd14f', '₹'), 'Your family is richer than 38% of India — but than only 24% of the world.')}
${finding(dotIcon('#ff6f8a', '♥'), '96 in 100 boys born in India in 2026 live to 15. You are one of them.')}
</ul>
</section>`;

const tabs = [['survival', 'Survival'], ['country', 'Country'], ['lives', 'Other lives'], ['facts', 'Facts']].map(([k, label]) =>
  `<button type="button" role="tab" aria-selected="{{ tab.${k}.on }}" onClick="{{ tab.${k}.pick }}" style="flex: ${k === 'lives' ? 1.3 : 1}; height: 34px; box-sizing: border-box; padding: 0 4px; border: 2px solid ${L}; border-radius: 8px; background: {{ tab.${k}.bg }}; box-shadow: ${PRESS}; color: ${INK}; font-family: inherit; font-size: 13px; font-weight: 700; white-space: nowrap; cursor: pointer">${label}</button>`).join('\n');
const tabRow = `<div role="tablist" aria-label="Sections" style="display: flex; gap: 6px; margin-top: 14px">
${tabs}
</div>`;

const tile = (big, label) => `<div style="padding: 7px 9px; border: 2px solid ${L}; border-radius: 10px; background: ${FIELD}"><span style="display: block; font-size: 18px; font-weight: 700; line-height: 1.15; font-variant-numeric: tabular-nums">${big}</span><span style="display: block; margin-top: 1px; font-size: 11.5px; font-weight: 600; line-height: 1.3; color: ${MUTED}">${label}</span></div>`;

const survival = `<sc-if value="{{ tab.survival.on }}" hint-placeholder-val="{{ true }}"><section aria-label="Survival" style="margin-top: 10px; padding: 10px 10px 12px; border: 2px solid ${L}; border-radius: 12px; background: ${FIELD}">
<p style="margin: 0 0 4px; font-size: 14px; font-weight: 700">Still alive at each age</p>
<p style="display: flex; flex-wrap: wrap; gap: 10px; margin: 0 0 4px; font-size: 11.5px; font-weight: 600; color: ${MUTED}"><span style="display: inline-flex; align-items: center; gap: 4px"><span style="width: 16px; height: 3px; border-radius: 2px; background: #e0702a"></span>Boys born in India, 2026</span><span style="display: inline-flex; align-items: center; gap: 4px"><span style="width: 16px; height: 0; border-top: 2.5px dashed #2593a3"></span>World</span></p>
${chart}
<div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px; margin-top: 6px">
${tile('{{ num.life }} · {{ num.lifeWorld }}', 'average lifespan, India · world')}
${tile('{{ num.reach }} in 100', 'boys born here reach 15')}
</div>
<p style="margin: 8px 0 0; font-size: 12px; font-weight: 500; line-height: 1.4; color: ${MUTED}">These describe your whole generation, not you. How long Aarav lives depends on his own life.</p>
</section></sc-if>`;

const country = `<sc-if value="{{ tab.country.on }}" hint-placeholder-val="{{ false }}"><section aria-label="Country" style="margin-top: 10px; padding: 10px; border: 2px solid ${L}; border-radius: 12px; background: ${FIELD}">
<p style="margin: 0 0 8px; font-size: 14px; font-weight: 700">India, the year you were born</p>
<div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px">
${tile('{{ num.life }} years', 'average lifespan for a boy')}
${tile('{{ num.school }} years', 'expected at school')}
${tile('{{ num.income }}', 'income per person, PPP')}
${tile('{{ num.under5 }} in 100', 'children die before 5')}
${tile('{{ num.cities }}%', 'live in cities')}
${tile('{{ num.births }}', 'children per woman')}
</div>
<p style="margin: 8px 0 0; font-size: 12px; font-weight: 500; line-height: 1.4; color: ${MUTED}">Sample figures for the mockup.</p>
</section></sc-if>`;

const PEERS = [
  { id: 'chen', pron: 'Her', name: 'Chen Yu', who: 'Girl · Chongqing, China', img: IMG.chen, bg: '#e6dcff', at: 'Grade 10 at a big city school. Boards during the week.', fifth: 4, stats: [84, 61, 82, 55], facts: ['Only child', 'School until 18 likely', 'Lives in a 30-storey block'] },
  { id: 'amina', pron: 'Her', name: 'Amina Bello', who: 'Girl · a village near Kano, Nigeria', img: IMG.amina, bg: '#ffd2c8', at: 'Left school at 12. Helps on the farm and sells at the market.', fifth: 1, stats: [66, 58, 31, 77], facts: ['Five younger siblings', 'Left school at 12', 'No electricity at home'] },
  { id: 'lucas', pron: 'His', name: 'Lucas Oliveira', who: 'Boy · Recife, Brazil', img: IMG.lucas, bg: '#cdeaf6', at: 'Grade 10. Plays futsal, works weekends at his uncle’s stall.', fifth: 3, stats: [79, 70, 60, 68], facts: ['Lives with grandmother', 'Weekend job', 'Futsal team'] },
  { id: 'emma', pron: 'Her', name: 'Emma Schulz', who: 'Girl · Leipzig, Germany', img: IMG.emma, bg: '#d6f0de', at: 'Grade 10 at a Gymnasium. Volunteers at an animal shelter.', fifth: 4, stats: [88, 66, 85, 62], facts: ['Parents divorced', 'Gymnasium', 'Animal shelter volunteer'] }
];
const AARAV = [73, 64, 77, 58];
const NAMES = ['Health', 'Happiness', 'Education', 'Relationships'];
const KEYS = ['health', 'joy', 'mind', 'ties'];
const STATS = { you: AARAV };
PEERS.forEach((p) => { STATS[p.id] = p.stats; });
const dots = (n) => `<span aria-label="Household: fifth ${n} of 5" style="display: flex; gap: 3px">${[1, 2, 3, 4, 5].map((i) => `<span style="width: 8px; height: 8px; box-sizing: border-box; border: 1.5px solid ${L}; border-radius: 4px; background: ${i <= n ? L : 'transparent'}"></span>`).join('')}</span>`;

function peer(p) {
  const bars = NAMES.map((n, i) => `<div style="display: grid; grid-template-columns: 82px minmax(0, 1fr); align-items: center; gap: 6px">
<span style="font-size: 11.5px; font-weight: 700; color: ${MUTED}">${n}</span>
<span style="display: flex; flex-direction: column; gap: 3px">
<span style="display: flex; align-items: center; gap: 5px"><span style="position: relative; flex: 1; height: 12px; box-sizing: border-box; border: 1.5px solid ${L}; border-radius: 4px; background: #f0dcae; overflow: hidden"><span style="display: block; width: {{ cmp.you.${KEYS[i]}.w }}%; height: 100%; background: ${STATC[KEYS[i]]}"></span></span><span style="width: 52px; font-size: 11px; font-weight: 700">You {{ cmp.you.${KEYS[i]}.n }}</span></span>
<span style="display: flex; align-items: center; gap: 5px"><span style="position: relative; flex: 1; height: 12px; box-sizing: border-box; border: 1.5px solid ${L}; border-radius: 4px; background: #f0dcae; overflow: hidden"><span style="display: block; width: {{ cmp.${p.id}.${KEYS[i]}.w }}%; height: 100%; background: #b9a7d6"></span></span><span style="width: 52px; font-size: 11px; font-weight: 700">${p.name.split(' ')[0]} {{ cmp.${p.id}.${KEYS[i]}.n }}</span></span>
</span>
</div>`).join('\n');
  return `<div style="border: 2px solid ${L}; border-radius: 12px; background: ${FIELD}; overflow: hidden">
<button type="button" onClick="{{ peer.${p.id}.toggle }}" aria-expanded="{{ peer.${p.id}.open }}" style="display: flex; align-items: center; gap: 10px; width: 100%; box-sizing: border-box; padding: 8px 10px 10px 8px; border: 0; background: transparent; box-shadow: ${PRESS}; color: ${INK}; font-family: inherit; text-align: left; cursor: pointer">
${C.portrait(p.img, 50, p.bg, 12)}
<span style="flex: 1; min-width: 0">
<span style="display: block; font-size: 15px; font-weight: 700">${p.name}</span>
<span style="display: block; font-size: 12px; font-weight: 600; color: ${MUTED}">${p.who}</span>
<span style="display: block; margin-top: 3px; font-size: 12.5px; font-weight: 500; line-height: 1.35; color: ${TEXT}"><b style="font-weight: 700">At 15:</b> ${p.at}</span>
</span>
<span style="display: flex; flex-direction: column; align-items: flex-end; gap: 6px">${dots(p.fifth)}<span style="font-size: 16px; font-weight: 700; line-height: 1; color: ${L}">{{ peer.${p.id}.mark }}</span></span>
</button>
<sc-if value="{{ peer.${p.id}.open }}" hint-placeholder-val="{{ false }}"><div style="padding: 8px 10px 10px; border-top: 2px dashed #e2c595; background: #fffcf4">
<p style="margin: 0 0 6px; font-size: 12px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: ${MUTED}">You and ${p.name.split(' ')[0]}, both 15</p>
<div style="display: flex; flex-direction: column; gap: 6px">
${bars}
</div>
<div style="display: flex; flex-wrap: wrap; gap: 4px; margin-top: 8px">${p.facts.map((f) => `<span style="display: inline-flex; align-items: center; height: 20px; padding: 0 7px; border: 1.5px solid ${L}; border-radius: 6px; background: ${FIELD}; font-size: 11px; font-weight: 700; color: ${L}">${f}</span>`).join('')}</div>
<p style="margin: 8px 0 0; font-size: 12px; font-weight: 500; line-height: 1.4; color: ${MUTED}">${p.pron} life goes on alongside yours. You’ll see what happens next as it happens.</p>
</div></sc-if>
</div>`;
}
const lives = `<sc-if value="{{ tab.lives.on }}" hint-placeholder-val="{{ false }}"><section aria-label="Born in the same second" style="margin-top: 10px">
<p style="margin: 0 4px 8px; font-size: 13px; font-weight: 500; line-height: 1.4; color: ${TEXT}"><b style="font-weight: 700">Born in the same second.</b> Four lives that began with yours, simulated alongside it. Not real players.</p>
<div style="display: flex; flex-direction: column; gap: 8px">
${PEERS.map(peer).join('\n')}
</div>
<p style="margin: 8px 4px 0; font-size: 11.5px; font-weight: 600; color: ${MUTED}">Dots: household wealth, in fifths of each country.</p>
</section></sc-if>`;

const FACTS = [
  ['Grandfather Hari died at 71 — right at the average for men of his generation in India.', 'Met at 14 · Grandfather died'],
  ['Dengue infects about 100 million people a year, most of them in Asia.', 'Met at 15 · Dengue in the monsoon'],
  ['About a quarter of Indian students take paid coaching for the board exams.', 'Met at 15 · Grade 10 boards'],
  ['India has more 15-year-olds than any other country.', 'Met at 15 · Birthday']
];
const facts = `<sc-if value="{{ tab.facts.on }}" hint-placeholder-val="{{ false }}"><section aria-label="Facts" style="margin-top: 10px">
<ul style="list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px">
${FACTS.map(([t, src]) => `<li style="padding: 8px 10px 9px; border: 2px solid ${L}; border-radius: 12px; background: ${FIELD}"><span style="display: block; font-size: 13.5px; font-weight: 500; line-height: 1.4; color: ${TEXT}">${t}</span><span style="display: inline-flex; align-items: center; height: 19px; margin-top: 5px; padding: 0 6px; border-radius: 5px; background: #efe1c1; font-size: 10.5px; font-weight: 700; color: ${L}">${src}</span></li>`).join('\n')}
</ul>
<p style="margin: 8px 4px 0; font-size: 11.5px; font-weight: 600; color: ${MUTED}">Facts collect here as you meet them in your life. Sample wording for the mockup.</p>
</section></sc-if>`;

const main = `<div class="kt-scroll" style="position: absolute; left: 0px; right: 0px; top: 100px; bottom: 96px; overflow-y: auto; scrollbar-width: none; box-sizing: border-box; padding: 2px 12px 20px">
${context}
${tabRow}
${survival}
${country}
${lives}
${facts}
</div>
${C.header('Odds')}`;

const script = `// Odds: Aarav's life against his country and the world. A few plain findings first, then
// sections behind a compact switch: survival curve, country, the four lives born in the same
// second (expandable comparison at the same age, nothing from their future), and facts met.
// \`frame\` opens on Survival or on Other lives with one comparison open.
// The curves draw in, the bars grow and the figures count up as the screen appears, and again
// for each section or comparison that opens.

${C.ENTER_JS}

var PEERS = ['chen', 'amina', 'lucas', 'emma'];
// Health, happiness, education, relationships at 15: Aarav and each of the four.
var STATS = ${JSON.stringify(STATS)};
var KEYS = ${JSON.stringify(KEYS)};
class Component extends DCLogic {
  componentDidMount() { startEnter(this); }
  componentWillUnmount() { clearInterval(this.enterTimer); }
  renderVals() {
    const st = this.state || {};
    const k = entered(this);
    const n = (v) => Math.round(v * k);
    const livesFrame = this.props.frame === 'lives';
    const section = st.section || (livesFrame ? 'lives' : 'survival');
    const openPeer = st.peer !== undefined ? st.peer : (livesFrame ? 'amina' : null);
    const replay = (patch) => { clearInterval(this.enterTimer); this.setState(Object.assign({ enterP: 0 }, patch)); startEnter(this); };
    const tab = {};
    ['survival', 'country', 'lives', 'facts'].forEach((s) => { tab[s] = { on: section === s, bg: section === s ? '#8fd9e6' : '${FIELD}', pick: () => { if (section !== s) replay({ section: s }); } }; });
    const peer = {};
    PEERS.forEach((id) => { peer[id] = { open: openPeer === id, mark: openPeer === id ? '−' : '+', toggle: () => openPeer === id ? this.setState({ peer: null }) : replay({ peer: id }) }; });
    const cmp = {};
    Object.keys(STATS).forEach((who) => {
      cmp[who] = {};
      KEYS.forEach((key, i) => { cmp[who][key] = { w: STATS[who][i] * k, n: n(STATS[who][i]) }; });
    });
    return {
      tab: tab,
      peer: peer,
      cmp: cmp,
      // From just left of age 0 to just past 100, so the line caps show once drawn.
      curveW: Math.round((30 + 293 * k) * 10) / 10,
      num: { life: n(71), lifeWorld: n(73), reach: n(96), school: n(12), income: '$' + n(10200).toLocaleString('en-US'), under5: n(3), cities: n(36), births: (2 * k).toFixed(1) },
      sn: stickerLinks(this)
    };
  }
}`;

const html = C.head('Odds — cute') + '\n' + main + '\n' + C.nav('odds') + '\n' + C.tail(script, { frame: { editor: 'enum', options: ['survival', 'lives'], default: 'survival' } });
fs.writeFileSync(process.argv[2] + '/OddsLife.dc.html', html);
console.log('odds', html.length);
