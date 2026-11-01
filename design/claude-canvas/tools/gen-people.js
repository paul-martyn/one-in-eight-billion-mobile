// Builds PeopleCute.dc.html: who is around Aarav at 15 and what is going on between them.
const fs = require('fs');
const C = require('./tabs-common.js');
const { L, INK, TEXT, MUTED, PANEL, FIELD, PRESS, RAISE, IMG, ICON, STATC } = C;

const LIST = [
  { id: 'dad', group: 'family', name: 'Rohan', role: 'Dad · 42', img: IMG.dad, bg: '#cdeaf6', status: 'Close · tense lately', tone: '#ffc23d', now: 'The shop is losing money. He wants you at the counter.', ask: true },
  { id: 'mum', group: 'family', name: 'Priya', role: 'Mum · 39', img: IMG.mum, bg: '#ffd2c8', status: 'Very close', tone: '#4cc9a0', now: 'Stitches blouses for the neighbours to help with money.' },
  { id: 'ananya', group: 'family', name: 'Ananya', role: 'Sister · 18', img: IMG.ananya, bg: '#d6f0de', status: 'Close · far away', tone: '#6f8cff', now: 'At college in Delhi since September. Calls on Sundays.' },
  { id: 'kabir', group: 'friends', name: 'Kabir', role: 'Best friend · 15', img: IMG.kabir, bg: '#ffe9a8', status: 'Best friends', tone: '#ff6f8a', now: 'Bowls for your cricket team. Wants you at Saturday practice.' },
  { id: 'meera', group: 'friends', name: 'Meera', role: 'Classmate · 15', img: IMG.meera, bg: '#e6dcff', status: 'Friendly', tone: '#4cc9a0', now: 'Also starting grade 11. You swap notes before tests.' },
  { id: 'moti', group: 'pets', name: 'Moti', role: 'Street dog · about 4', img: null, bg: '#e6dcff', status: 'Loyal', tone: '#ff6f8a', now: 'Waits at the gate. You feed him after school.' }
];
const GROUPS = [['family', 'Family'], ['friends', 'Friends'], ['pets', 'Pets']];

function card(p) {
  const pic = p.img ? C.portrait(p.img, 54, p.bg, 12) : C.DOG(54);
  const ask = p.ask ? `<span aria-label="Wants to talk" style="flex: none; display: flex; align-items: center; justify-content: center; width: 20px; height: 20px; box-sizing: border-box; border: 2px solid ${L}; border-radius: 10px; background: #ff6f8a; color: #ffffff; font-size: 12px; font-weight: 700">!</span>` : '';
  return `<sc-if value="{{ vis.${p.id} }}" hint-placeholder-val="{{ true }}"><button type="button" onClick="{{ open.${p.id} }}" style="display: flex; align-items: center; gap: 10px; width: 100%; box-sizing: border-box; margin-top: 8px; padding: 8px 10px 10px 8px; border: 2px solid ${L}; border-radius: 12px; background: ${FIELD}; box-shadow: ${PRESS}; color: ${INK}; font-family: inherit; text-align: left; cursor: pointer">
${pic}
<span style="flex: 1; min-width: 0">
<span style="display: flex; align-items: baseline; gap: 6px"><span style="font-size: 16px; font-weight: 700">${p.name}</span><span style="font-size: 12px; font-weight: 600; color: ${MUTED}">${p.role}</span></span>
<span style="display: inline-flex; align-items: center; gap: 4px; height: 20px; margin-top: 3px; padding: 0 7px 0 5px; border-radius: 6px; background: #f6ecd5; font-size: 11.5px; font-weight: 700; color: ${L}"><span style="width: 8px; height: 8px; box-sizing: border-box; border: 1.5px solid ${L}; border-radius: 4px; background: ${p.tone}"></span>${p.status}</span>
<span style="display: block; margin-top: 4px; font-size: 12.5px; font-weight: 500; line-height: 1.35; color: ${TEXT}">${p.now}</span>
</span>
${ask}${ICON.chevron}
</button></sc-if>`;
}

const list = GROUPS.map(([g, label]) => `<sc-if value="{{ vis.${g} }}" hint-placeholder-val="{{ true }}">${C.h2(label)}</sc-if>\n` + LIST.filter((p) => p.group === g).map(card).join('\n')).join('\n');

const chips = [['all', 'All', 6], ['family', 'Family', 3], ['friends', 'Friends', 2], ['pets', 'Pets', 1]].map(([k, label, n]) =>
  `<button type="button" onClick="{{ filt.${k}.pick }}" aria-pressed="{{ filt.${k}.on }}" style="display: flex; align-items: center; gap: 4px; height: 32px; box-sizing: border-box; padding: 0 11px; border: 2px solid ${L}; border-radius: 8px; background: {{ filt.${k}.bg }}; box-shadow: ${PRESS}; color: ${INK}; font-family: inherit; font-size: 13px; font-weight: 700; cursor: pointer">${label}<span style="font-size: 11px; color: ${MUTED}">${n}</span></button>`).join('\n');
const tree = `<button type="button" aria-label="Family tree" style="margin-left: auto; display: flex; align-items: center; justify-content: center; width: 36px; height: 32px; box-sizing: border-box; padding: 0; border: 2px solid ${L}; border-radius: 8px; background: ${PANEL}; box-shadow: ${PRESS}; cursor: pointer"><svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 9v4M6 17v-2.5h12V17M12 13v1.5" fill="none" stroke="#7b4b2a" stroke-width="2"></path><rect x="8.5" y="2.5" width="7" height="6.5" rx="2" fill="#ffc23d" stroke="#7b4b2a" stroke-width="1.8"></rect><rect x="2.5" y="16.5" width="7" height="5" rx="2" fill="#6f8cff" stroke="#7b4b2a" stroke-width="1.8"></rect><rect x="14.5" y="16.5" width="7" height="5" rx="2" fill="#ff6f8a" stroke="#7b4b2a" stroke-width="1.8"></rect></svg></button>`;
const filterRow = `<div role="group" aria-label="Show" style="position: absolute; left: 12px; right: 12px; top: 100px; display: flex; gap: 6px">
${chips}
${tree}
</div>`;

const memory = `<button type="button" onClick="{{ toggleMemory }}" aria-expanded="{{ memoryOpen }}" style="display: flex; align-items: center; gap: 8px; width: 100%; margin-top: 18px; padding: 0 4px; border: 0; background: transparent; color: ${MUTED}; font-family: inherit; font-size: 13px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; cursor: pointer"><span>In memory · 1</span><span aria-hidden="true" style="flex: 1; height: 2px; border-radius: 1px; background: #e2c595"></span><span style="font-size: 16px; line-height: 1">{{ memoryMark }}</span></button>
<sc-if value="{{ memoryOpen }}" hint-placeholder-val="{{ false }}"><div style="display: flex; align-items: center; gap: 10px; margin-top: 8px; padding: 8px 10px; border: 2px dashed #c9a874; border-radius: 12px; background: #f6ead2">
<span style="flex: none; width: 46px; height: 46px; box-sizing: border-box; border: 2px solid ${L}; border-radius: 10px; overflow: hidden; background: #e8dcc6"><img src="${IMG.hari}" alt="" style="display: block; width: 42px; height: 47px; filter: grayscale(0.7)"></span>
<span style="min-width: 0"><span style="display: block; font-size: 15px; font-weight: 700">Grandfather Hari</span><span style="display: block; font-size: 12px; font-weight: 600; color: ${MUTED}">1969–2040 · died at 71</span><span style="display: block; margin-top: 2px; font-size: 12.5px; line-height: 1.35; color: ${TEXT}">Ran the phone shop for 40 years. Taught you to fly kites.</span></span>
</div></sc-if>`;

const listView = `<sc-if value="{{ listView }}" hint-placeholder-val="{{ true }}">
<div class="kt-scroll" style="position: absolute; left: 0px; right: 0px; top: 138px; bottom: 96px; overflow-y: auto; scrollbar-width: none; box-sizing: border-box; padding: 0 12px 20px">
${list}
${memory}
</div>
${C.header('People', { h: 138, extra: filterRow })}
</sc-if>`;

// The card of one person: who they are, how things are between you, what you did lately, what you can do now.
const chip = `<sc-if value="{{ ch.isCost }}" hint-placeholder-val="{{ true }}"><span style="display: inline-flex; align-items: center; gap: 4px; height: 19px; padding: 0 6px; border: 1.5px solid ${L}; border-radius: 6px; background: ${FIELD}; font-size: 11px; font-weight: 700; color: ${L}; white-space: nowrap">${ICON.cash}{{ ch.t }}</span></sc-if><sc-if value="{{ ch.isTime }}" hint-placeholder-val="{{ false }}"><span style="display: inline-flex; align-items: center; gap: 4px; height: 19px; padding: 0 6px; border: 1.5px solid ${L}; border-radius: 6px; background: ${FIELD}; font-size: 11px; font-weight: 700; color: ${L}; white-space: nowrap">${ICON.clock}{{ ch.t }}</span></sc-if><sc-if value="{{ ch.isFx }}" hint-placeholder-val="{{ false }}"><span style="display: inline-flex; align-items: center; gap: 4px; height: 19px; padding: 0 6px 0 5px; border-radius: 6px; background: #f6ecd5; font-size: 11px; font-weight: 700; color: ${L}; white-space: nowrap"><span style="width: 8px; height: 8px; box-sizing: border-box; border: 1.5px solid ${L}; border-radius: 3px; background: {{ ch.dot }}"></span>{{ ch.t }}</span></sc-if>`;

const personView = `<sc-if value="{{ personView }}" hint-placeholder-val="{{ false }}">
<div class="kt-scroll" style="position: absolute; left: 0px; right: 0px; top: 100px; bottom: 96px; overflow-y: auto; scrollbar-width: none; box-sizing: border-box; padding: 2px 12px 20px">
<section aria-label="About {{ p.name }}" style="display: flex; gap: 12px; padding: 10px; border: 2px solid ${L}; border-radius: 14px; background: ${PANEL}; box-shadow: ${RAISE}">
<sc-if value="{{ p.hasImg }}" hint-placeholder-val="{{ true }}"><span style="flex: none; width: 88px; height: 88px; box-sizing: border-box; border: 2px solid ${L}; border-radius: 14px; overflow: hidden; background: {{ p.bg }}"><img src="{{ p.img }}" alt="" style="display: block; width: 84px; height: 94px"></span></sc-if>
<sc-if value="{{ p.isPet }}" hint-placeholder-val="{{ false }}">${C.DOG(88)}</sc-if>
<span style="flex: 1; min-width: 0">
<span style="display: block; font-size: 20px; font-weight: 700; line-height: 1.15">{{ p.full }}</span>
<span style="display: block; margin-top: 2px; font-size: 13px; font-weight: 600; color: ${MUTED}">{{ p.role }}</span>
<span style="display: flex; flex-wrap: wrap; gap: 4px; margin-top: 7px"><sc-for list="{{ p.tags }}" as="tg" hint-placeholder-count="2"><span style="display: inline-flex; align-items: center; height: 20px; padding: 0 7px; border: 1.5px solid ${L}; border-radius: 6px; background: ${FIELD}; font-size: 11px; font-weight: 700; color: ${L}; white-space: nowrap">{{ tg.t }}</span></sc-for></span>
</span>
</section>
${C.h2('Between you')}
<div style="padding: 9px 11px 10px; border: 2px solid ${L}; border-radius: 12px; background: ${FIELD}">
<span style="display: inline-flex; align-items: center; gap: 5px; height: 22px; padding: 0 8px 0 6px; border-radius: 6px; background: #f6ecd5; font-size: 12.5px; font-weight: 700; color: ${L}"><span style="width: 9px; height: 9px; box-sizing: border-box; border: 1.5px solid ${L}; border-radius: 5px; background: {{ p.tone }}"></span>{{ p.status }}</span>
<p style="margin: 6px 0 0; font-size: 13.5px; font-weight: 500; line-height: 1.4; color: ${TEXT}">{{ p.about }}</p>
</div>
${C.h2('Lately together')}
<ol style="list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px">
<sc-for list="{{ p.recent }}" as="r" hint-placeholder-count="3"><li style="display: flex; align-items: flex-start; gap: 8px; padding: 7px 10px 8px 7px; border: 2px solid #d0b384; border-radius: 12px; background: #fffcf4"><span style="flex: none; display: flex; align-items: center; justify-content: center; min-width: 58px; height: 19px; padding: 0 5px; box-sizing: border-box; border-radius: 5px; background: #efe1c1; color: ${L}; font-size: 10px; font-weight: 700; letter-spacing: 0.03em">{{ r.m }}</span><span style="font-size: 13px; font-weight: 500; line-height: 1.35; color: ${TEXT}">{{ r.t }}</span></li></sc-for>
</ol>
${C.h2('You can now')}
<div style="display: flex; flex-direction: column; gap: 8px">
<sc-for list="{{ p.actions }}" as="a" hint-placeholder-count="3"><button type="button" style="display: block; width: 100%; box-sizing: border-box; padding: 9px 11px 11px; border: 2px solid ${L}; border-radius: 12px; background: {{ a.bg }}; box-shadow: ${PRESS}; color: ${INK}; font-family: inherit; text-align: left; cursor: pointer">
<span style="display: flex; align-items: center; justify-content: space-between; gap: 8px"><span style="font-size: 15px; font-weight: 700; line-height: 1.25">{{ a.title }}</span><sc-if value="{{ a.isNew }}" hint-placeholder-val="{{ false }}"><span style="flex: none; height: 18px; padding: 0 6px; border: 1.5px solid ${L}; border-radius: 5px; background: #8fd9e6; font-size: 10px; font-weight: 700; line-height: 15px; color: ${INK}">Right now</span></sc-if></span>
<span style="display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px"><sc-for list="{{ a.chips }}" as="ch" hint-placeholder-count="3">${chip}</sc-for></span>
</button></sc-for>
</div>
<p style="margin: 14px 4px 0; font-size: 12px; font-weight: 500; line-height: 1.4; color: ${MUTED}">Time stays paused while you’re here. What you spend shows up in Money.</p>
</div>
${C.header('{{ p.name }}', { back: 'back' })}
</sc-if>`;

const script = `// People: who is around Aarav at 15 and what is going on between them. No 0–100 score per
// person: a short status in words, the latest thing that happened, and what can be done now.
// \`frame\` opens the list or the card of one person; a tap on a card opens it. Nothing here
// is a bar or a count, so the screen has no enter animation.
var IMG = ${JSON.stringify({ dad: IMG.dad, mum: IMG.mum, ananya: IMG.ananya, kabir: IMG.kabir, meera: IMG.meera })};
var C = ${JSON.stringify(STATC)};
// Chips: $ cost, ~ time, otherwise an effect with the colour of what it touches.
var PEOPLE = {
  dad: { name: 'Rohan', full: 'Rohan Srivastava', role: 'Your father · 42', img: IMG.dad, bg: '#cdeaf6', tags: ['Runs the phone shop', 'Lucknow'], status: 'Close · tense lately', tone: '#ffc23d',
    about: 'He took over the shop when Grandfather Hari died, and it is losing money. He is proud of your marks but wants your help at the counter.',
    recent: [{ m: 'OCT 2041', t: 'Asked you to work at the shop instead of grade 11.' }, { m: 'DEC 2040', t: 'Closed the shop early to watch your cricket final.' }, { m: 'AUG 2040', t: 'Lost his father, Hari. You stayed by him.' }],
    actions: [
      { title: 'Talk about the shop’s future', isNew: true, chips: ['~ 1 evening', 'Dad: feels heard|ties', 'Ideas for the shop|money'] },
      { title: 'Spend an evening together', chips: ['$ Free', '~ 1 evening', 'Dad: warmer|ties', '+ Happiness|joy'] },
      { title: 'Help at the shop this Sunday', chips: ['$ Free', '~ Sunday', 'Dad: relieved|ties', '− Happiness|joy', '+ ₹ for the family|money'] },
      { title: 'Buy him a small gift', chips: ['$ ₹300', 'Dad: touched|ties'] }
    ] },
  mum: { name: 'Priya', full: 'Priya Srivastava', role: 'Your mother · 39', img: IMG.mum, bg: '#ffd2c8', tags: ['Tailoring at home', 'Lucknow'], status: 'Very close', tone: '#4cc9a0',
    about: 'She is the calm one at home. She has started stitching for the neighbours so the shop worries less.',
    recent: [{ m: 'SEP 2041', t: 'Cried a little at the station when Ananya left.' }, { m: 'JUL 2041', t: 'Nursed you through dengue for a week.' }],
    actions: [{ title: 'Help her deliver orders', chips: ['$ Free', '~ Saturday', 'Mum: grateful|ties'] }, { title: 'Cook dinner for the family', chips: ['$ ₹150', '~ 1 evening', 'Family: warmer|ties'] }] },
  ananya: { name: 'Ananya', full: 'Ananya Srivastava', role: 'Your sister · 18', img: IMG.ananya, bg: '#d6f0de', tags: ['College in Delhi', 'First year'], status: 'Close · far away', tone: '#6f8cff',
    about: 'She left for college in Delhi in September. She calls on Sundays and asks about your exams.',
    recent: [{ m: 'SEP 2041', t: 'Left for college in Delhi.' }, { m: 'MAR 2041', t: 'Helped you revise for the boards.' }],
    actions: [{ title: 'Video-call her', chips: ['$ Free', '~ 1 evening', 'Ananya: closer|ties'] }, { title: 'Visit her in Delhi', chips: ['$ ₹2,400 train', '~ 3 days', 'Ananya: closer|ties', '+ Happiness|joy'] }] },
  kabir: { name: 'Kabir', full: 'Kabir Khan', role: 'Best friend · 15', img: IMG.kabir, bg: '#ffe9a8', tags: ['Cricket team', 'Same school'], status: 'Best friends', tone: '#ff6f8a',
    about: 'You have been inseparable since grade 6. He wants you at Saturday practice.',
    recent: [{ m: 'DEC 2040', t: 'Won the inter-school final together.' }],
    actions: [{ title: 'Go to cricket practice', chips: ['$ Free', '~ Saturdays', 'Kabir: closer|ties', '+ Health|health'] }, { title: 'Watch a film together', chips: ['$ ₹200', '~ 1 evening', '+ Happiness|joy'] }] },
  meera: { name: 'Meera', full: 'Meera Joshi', role: 'Classmate · 15', img: IMG.meera, bg: '#e6dcff', tags: ['Grade 11', 'Same class'], status: 'Friendly', tone: '#4cc9a0',
    about: 'She is the best in maths in your class. You swap notes before tests.',
    recent: [{ m: 'MAR 2041', t: 'Studied together for the grade 10 boards.' }],
    actions: [{ title: 'Study together', chips: ['$ Free', '~ 2 evenings a week', '+ Education|mind', 'Meera: closer|ties'] }] },
  moti: { name: 'Moti', full: 'Moti', role: 'Street dog · about 4', img: '', bg: '#e6dcff', tags: ['Lives by the gate'], status: 'Loyal', tone: '#ff6f8a',
    about: 'A street dog who adopted your family. He follows you to the corner every morning.',
    recent: [{ m: 'JAN 2041', t: 'You started feeding him after school.' }],
    actions: [{ title: 'Take him to the vet for shots', chips: ['$ ₹400', '~ 1 morning', 'Moti: healthier|health'] }, { title: 'Play with him', chips: ['$ Free', '+ Happiness|joy'] }] }
};
var ORDER = ['dad', 'mum', 'ananya', 'kabir', 'meera', 'moti'];
var GROUP = { dad: 'family', mum: 'family', ananya: 'family', kabir: 'friends', meera: 'friends', moti: 'pets' };

function chipOf(s) {
  if (s[0] === '$') return { t: s.slice(2), isCost: true, isTime: false, isFx: false, dot: '' };
  if (s[0] === '~') return { t: s.slice(2), isCost: false, isTime: true, isFx: false, dot: '' };
  var parts = s.split('|');
  return { t: parts[0], isCost: false, isTime: false, isFx: true, dot: C[parts[1]] };
}

class Component extends DCLogic {
  renderVals() {
    const st = this.state || {};
    const filter = st.filter || 'all';
    const openId = st.open !== undefined ? st.open : (this.props.frame === 'person' ? 'dad' : null);
    const vis = {};
    ORDER.forEach((id) => { vis[id] = filter === 'all' || GROUP[id] === filter; });
    ['family', 'friends', 'pets'].forEach((g) => { vis[g] = filter === 'all' || filter === g; });
    const open = {};
    ORDER.forEach((id) => { open[id] = () => this.setState({ open: id }); });
    const filt = {};
    ['all', 'family', 'friends', 'pets'].forEach((k) => {
      filt[k] = { on: filter === k, bg: filter === k ? '#8fd9e6' : '${FIELD}', pick: () => this.setState({ filter: k }) };
    });
    const src = PEOPLE[openId || 'dad'];
    const p = Object.assign({}, src, {
      tags: src.tags.map((t) => ({ t: t })),
      hasImg: !!src.img,
      isPet: !src.img,
      actions: src.actions.map((a) => ({ title: a.title, isNew: !!a.isNew, bg: a.isNew ? '#fff3d6' : '${FIELD}', chips: a.chips.map(chipOf) }))
    });
    return {
      listView: !openId,
      personView: !!openId,
      vis: vis,
      open: open,
      filt: filt,
      p: p,
      back: () => this.setState({ open: null }),
      memoryOpen: !!st.memory,
      memoryMark: st.memory ? '−' : '+',
      toggleMemory: () => this.setState({ memory: !st.memory }),
      sn: stickerLinks(this)
    };
  }
}`;

const html = C.head('People — cute') + '\n' + listView + '\n' + personView + '\n' + C.nav('people') + '\n' + C.tail(script, { frame: { editor: 'enum', options: ['list', 'person'], default: 'list' } });
fs.writeFileSync(process.argv[2] + '/PeopleCute.dc.html', html);
console.log('people', html.length);
