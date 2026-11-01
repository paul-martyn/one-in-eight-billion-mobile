// Builds ActivitiesCute.dc.html: what Aarav can do now to change his life, fitted to his age.
const fs = require('fs');
const C = require('./tabs-common.js');
const { L, INK, TEXT, MUTED, PANEL, FIELD, PRESS, RAISE, ICON, STATC } = C;

// Small round glyphs for each kind of activity.
const G = {
  book: ['#6f8cff', '<path d="M5 6.5c2.5-1.1 4.9-1.1 7 .6 2.1-1.7 4.5-1.7 7-.6V17c-2.5-1.1-4.9-1.1-7 .6-2.1-1.7-4.5-1.7-7-.6Z" fill="#ffffff" stroke="#7b4b2a" stroke-width="1.8" stroke-linejoin="round"></path>'],
  job: ['#ffc23d', '<rect x="5" y="8.5" width="14" height="10" rx="2" fill="#ffffff" stroke="#7b4b2a" stroke-width="1.8"></rect><path d="M9.5 8.5V6.8a1.3 1.3 0 0 1 1.3-1.3h2.4a1.3 1.3 0 0 1 1.3 1.3v1.7" fill="none" stroke="#7b4b2a" stroke-width="1.8"></path>'],
  code: ['#9fdcf5', '<path d="M9 8l-4 4 4 4M15 8l4 4-4 4" fill="none" stroke="#7b4b2a" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"></path>'],
  heart: ['#ff8fa3', '<path d="M12 18.5s-6-3.7-6-8.2A3.4 3.4 0 0 1 12 8.4a3.4 3.4 0 0 1 6 1.9c0 4.5-6 8.2-6 8.2Z" fill="#ffffff" stroke="#7b4b2a" stroke-width="1.8" stroke-linejoin="round"></path>'],
  run: ['#8fd14f', '<path d="M6 15h6l3-5 3 1M9 10l2-3h3" fill="none" stroke="#7b4b2a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path><circle cx="16.5" cy="6.5" r="1.8" fill="#ffffff" stroke="#7b4b2a" stroke-width="1.6"></circle>'],
  food: ['#ffd98a', '<path d="M6 12h12a6 6 0 0 1-12 0Z" fill="#ffffff" stroke="#7b4b2a" stroke-width="1.8" stroke-linejoin="round"></path><path d="M10 9c0-1.5 1-2 1-3M13.5 9c0-1.5 1-2 1-3" fill="none" stroke="#7b4b2a" stroke-width="1.6" stroke-linecap="round"></path>'],
  bat: ['#4cc9a0', '<path d="M7 17l8-8 2 2-8 8Z" fill="#ffffff" stroke="#7b4b2a" stroke-width="1.8" stroke-linejoin="round"></path><circle cx="16.5" cy="16.5" r="2" fill="#ff6f8a" stroke="#7b4b2a" stroke-width="1.6"></circle>'],
  music: ['#c9b6ff', '<path d="M10 16V7l7-1.5v9" fill="none" stroke="#7b4b2a" stroke-width="1.8" stroke-linejoin="round"></path><circle cx="8.3" cy="16.2" r="2" fill="#ffffff" stroke="#7b4b2a" stroke-width="1.6"></circle><circle cx="15.3" cy="14.7" r="2" fill="#ffffff" stroke="#7b4b2a" stroke-width="1.6"></circle>'],
  train: ['#ffb38a', '<rect x="7" y="5" width="10" height="11" rx="2.5" fill="#ffffff" stroke="#7b4b2a" stroke-width="1.8"></rect><path d="M7 11h10M9 19l1.5-3M15 19l-1.5-3" fill="none" stroke="#7b4b2a" stroke-width="1.8" stroke-linecap="round"></path>'],
  car: ['#e8dcc8', '<path d="M5 15v-3l2-4h10l2 4v3Z" fill="#ffffff" stroke="#7b4b2a" stroke-width="1.8" stroke-linejoin="round"></path><circle cx="8.5" cy="15.5" r="1.6" fill="#7b4b2a"></circle><circle cx="15.5" cy="15.5" r="1.6" fill="#7b4b2a"></circle>']
};
const glyph = (k, size) => `<svg width="${size || 34}" height="${size || 34}" viewBox="0 0 24 24" aria-hidden="true" style="flex: none"><rect x="1" y="1" width="22" height="22" rx="6" fill="${G[k][0]}" stroke="#7b4b2a" stroke-width="1.6"></rect>${G[k][1]}</svg>`;

const chipsOf = (list) => list.map((c) => c[0] === '$' ? C.cost(c.slice(2)) : c[0] === '~' ? C.when(c.slice(2)) : C.fx(c.split('|')[0], STATC[c.split('|')[1]])).join('');

function row(a) {
  const tag = a.tag ? `<sc-if value="{{ ${a.tag} }}" hint-placeholder-val="{{ false }}"><span style="flex: none; height: 18px; padding: 0 6px; border: 1.5px solid ${L}; border-radius: 5px; background: #8fd9e6; font-size: 10px; font-weight: 700; line-height: 15px; color: ${INK}">Looking…</span></sc-if>` : '';
  const click = a.open ? ` onClick="{{ openDetail }}"` : '';
  return `<button type="button"${click} style="display: flex; align-items: flex-start; gap: 10px; width: 100%; box-sizing: border-box; padding: 8px 10px 10px 8px; border: 2px solid ${L}; border-radius: 12px; background: ${FIELD}; box-shadow: ${PRESS}; color: ${INK}; font-family: inherit; text-align: left; cursor: pointer">
${glyph(a.g)}
<span style="flex: 1; min-width: 0">
<span style="display: flex; align-items: center; justify-content: space-between; gap: 6px"><span style="font-size: 15px; font-weight: 700; line-height: 1.25">${a.title}</span>${tag}</span>
<span style="display: block; margin-top: 2px; font-size: 12.5px; font-weight: 500; line-height: 1.35; color: ${TEXT}">${a.what}</span>
<span style="display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px">${chipsOf(a.chips)}</span>
</span>
</button>`;
}
function locked(a) {
  return `<div style="display: flex; align-items: center; gap: 10px; padding: 8px 10px; border: 2px dashed #c9a874; border-radius: 12px; background: #f6ead2; color: ${MUTED}">
<span style="opacity: 0.55">${glyph(a.g)}</span>
<span style="flex: 1; min-width: 0"><span style="display: block; font-size: 14px; font-weight: 700">${a.title}</span><span style="display: flex; align-items: center; gap: 4px; margin-top: 2px; font-size: 12px; font-weight: 600">${ICON.lock}${a.why}</span></span>
</div>`;
}
const group = (title, note, items) => C.h2(title, `<span style="font-size: 11.5px; font-weight: 600; letter-spacing: 0; text-transform: none; color: ${MUTED}">${note}</span>`) + `<div style="display: flex; flex-direction: column; gap: 8px">\n${items.join('\n')}\n</div>`;

const JOB = { g: 'job', title: 'Look for weekend work', what: 'Ask shops and cafés in Aminabad for Saturday work.', chips: ['$ Free', '~ offer may take months', '+ ₹ if hired|money', '− free time|joy'], open: true, tag: 'started' };

const edu = group('Education & career', 'Grade 11', [
  row({ g: 'book', title: 'Coaching for the board exams', what: 'Evening classes three times a week, near Hazratganj.', chips: ['$ ₹1,500 a month', '~ results by March', '+ Education|mind', '− Happiness|joy'] }),
  row(JOB),
  row({ g: 'code', title: 'Learn to code online', what: 'Free videos on Dad’s old phone, an hour a night.', chips: ['$ Free', '~ slow, months', '+ Education|mind'] }),
  locked({ g: 'car', title: 'Driving lessons', why: 'From 18 · in 3 years' })
]);
const health = group('Health & habits', 'Health {{ healthNow }} · after dengue', [
  row({ g: 'heart', title: 'Check-up at the clinic', what: 'See how you recovered from July’s dengue.', chips: ['$ ₹300', '~ this week', 'Know your health|health'] }),
  row({ g: 'run', title: 'Run before school', what: 'Twenty minutes along the Gomti every morning.', chips: ['$ Free', '~ felt in a few months', '+ Health|health', '+ Happiness|joy'] }),
  row({ g: 'food', title: 'Less street food', what: 'Take Mum’s tiffin instead of samosas.', chips: ['$ saves ₹100 a month', '+ Health|health'] })
]);
const hobbies = group('Hobbies & leisure', 'Fun keeps you going', [
  row({ g: 'bat', title: 'Cricket academy trials', what: 'The district academy is picking under-16 players.', chips: ['$ ₹600 a month if picked', '~ trials in November', '+ Health|health', '+ Relationships|ties'] }),
  row({ g: 'music', title: 'Learn the guitar', what: 'A used guitar from the market and Kabir’s cousin as teacher.', chips: ['$ ₹2,500 once', '~ months of practice', '+ Happiness|joy'] }),
  row({ g: 'train', title: 'Visit Ananya in Delhi', what: 'Three days during the Diwali break.', chips: ['$ ₹2,400', '~ 3 days', '+ Happiness|joy', 'Ananya: closer|ties'] })
]);

const focusChips = [['study', 'Study', 'book'], ['work', 'Work', 'job'], ['family', 'Family', 'heart'], ['health', 'Health', 'run'], ['fun', 'Fun', 'music']].map(([k, label, g]) =>
  `<button type="button" onClick="{{ focus.${k}.pick }}" aria-pressed="{{ focus.${k}.on }}" style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px; height: 58px; box-sizing: border-box; padding: 0; border: 2px solid ${L}; border-radius: 10px; background: {{ focus.${k}.bg }}; box-shadow: ${PRESS}; color: ${INK}; font-family: inherit; font-size: 12px; font-weight: 700; cursor: pointer">${glyph(g, 24)}${label}</button>`).join('\n');

const top = `<section aria-label="Now" style="padding: 10px; border: 2px solid ${L}; border-radius: 14px; background: ${PANEL}; box-shadow: ${RAISE}">
<div style="display: flex; align-items: center; gap: 10px">
${glyph('book', 40)}
<span style="flex: 1; min-width: 0"><span style="display: block; font-size: 12px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: ${MUTED}">Now</span><span style="display: block; font-size: 17px; font-weight: 700; line-height: 1.2">Student · grade 11</span><span style="display: block; font-size: 12.5px; font-weight: 500; color: ${TEXT}">Government Inter College, Lucknow · Sundays at Dad’s shop</span></span>
</div>
<p style="margin: 12px 0 6px; font-size: 12px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: ${MUTED}">Focus this year</p>
<div role="group" aria-label="Focus this year" style="display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 6px">
${focusChips}
</div>
<p style="display: flex; flex-wrap: wrap; align-items: center; gap: 4px; margin: 8px 0 0; font-size: 12px; font-weight: 600; color: ${MUTED}"><sc-for list="{{ focusFx }}" as="f" hint-placeholder-count="2"><span style="display: inline-flex; align-items: center; gap: 4px; height: 19px; padding: 0 6px 0 5px; border-radius: 6px; background: #f6ecd5; font-size: 11px; font-weight: 700; color: ${L}; white-space: nowrap"><span style="width: 8px; height: 8px; box-sizing: border-box; border: 1.5px solid ${L}; border-radius: 3px; background: {{ f.dot }}"></span>{{ f.t }}</span></sc-for><span>· from next month</span></p>
</section>`;

const progress = `<sc-if value="{{ started }}" hint-placeholder-val="{{ false }}"><section aria-label="In progress" style="display: flex; align-items: center; gap: 10px; margin-top: 12px; padding: 9px 10px; border: 2px solid ${L}; border-radius: 12px; background: #dff4f7">
${ICON.hourglass}
<span style="flex: 1; min-width: 0"><span style="display: block; font-size: 14.5px; font-weight: 700">Looking for weekend work</span><span style="display: block; font-size: 12px; font-weight: 600; color: ${TEXT}">Since Oct 2041 · an offer may come within a year</span></span>
<button type="button" onClick="{{ stop }}" style="flex: none; height: 30px; padding: 0 10px; border: 2px solid ${L}; border-radius: 8px; background: ${FIELD}; box-shadow: ${PRESS}; color: ${INK}; font-family: inherit; font-size: 12px; font-weight: 700; cursor: pointer">Stop</button>
</section></sc-if>`;

const sugg = (g, title, why) => `<button type="button" style="display: flex; align-items: center; gap: 8px; box-sizing: border-box; padding: 8px 9px 9px; border: 2px solid ${L}; border-radius: 12px; background: ${FIELD}; box-shadow: ${PRESS}; color: ${INK}; font-family: inherit; text-align: left; cursor: pointer">${glyph(g, 30)}<span style="min-width: 0"><span style="display: block; font-size: 13.5px; font-weight: 700; line-height: 1.2">${title}</span><span style="display: block; margin-top: 2px; font-size: 11.5px; font-weight: 600; color: ${MUTED}">${why}</span></span></button>`;
const good = C.h2('Good right now') + `<div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px">${sugg('book', 'Coaching for the boards', 'Exams in March')}${sugg('bat', 'Cricket academy trials', 'Trials in November')}</div>`;
const main = `<div class="kt-scroll" style="position: absolute; left: 0px; right: 0px; top: 100px; bottom: 96px; overflow-y: auto; scrollbar-width: none; box-sizing: border-box; padding: 2px 12px 20px">
${top}
${progress}
${good}
${edu}
${health}
${hobbies}
</div>
${C.header('Activities')}`;

const label = (t) => '<p class="k-os" style="margin: 12px 0 6px; font-size: 13px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase">' + t + '</p>';
const factTile = (k, v) => '<div style="padding: 7px 8px; border: 2px solid ' + L + '; border-radius: 10px; background: ' + PANEL + '"><dt style="font-size: 11px; font-weight: 700; color: ' + MUTED + '">' + k + '</dt><dd style="margin: 2px 0 0; font-size: 14px; font-weight: 700">' + v + '</dd></div>';
const fxWell = (inner) => '<div style="display: flex; flex-wrap: wrap; gap: 4px; padding: 7px 8px; border: 2px solid ' + L + '; border-radius: 12px; background: ' + PANEL + '">' + inner + '</div>';
const sheet = C.popup({
  show: 'detail', close: 'closeDetail', top: 200, title: 'Weekend work', badgeBg: '#fff3d6', badge: glyph('job', 54),
  body: C.well('<p style="margin: 0; font-size: 14.5px; font-weight: 500; line-height: 1.4; color: ' + TEXT + '">Aarav asks the shops and cafés in Aminabad for Saturday work. He spends his Saturdays looking until someone says yes.</p>') +
    '<dl style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; margin: 10px 0 0">' + factTile('Costs', 'Nothing') + factTile('Takes', 'Saturdays') + factTile('Result', 'Within a year') + '</dl>' +
    label('If someone hires you') + fxWell(C.fx('+ ₹1,500–2,500 a month', STATC.money) + C.fx('− Happiness: less free time', STATC.joy) + C.fx('− Saturday cricket', STATC.ties)) +
    '<p style="margin: 10px 2px 0; font-size: 12.5px; font-weight: 600; line-height: 1.4; color: ' + INK + '">Not guaranteed. Boys your age here often find work through family friends. You already help at Dad’s shop on Sundays.</p>',
  primary: { label: 'Start looking', on: 'start' },
  secondary: { label: 'Not now', on: 'closeDetail' }
});
const toast = C.popup({
  show: 'toast', close: 'closeToast', top: 300, title: 'Search started!', badgeBg: '#dff4f7', badge: '<svg width="46" height="46" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h12M6 21h12" stroke="#7b4b2a" stroke-width="2.2" stroke-linecap="round"></path><path d="M7 3c0 5 10 5 10 9s-10 4-10 9h10c0-5-10-5-10-9s10-4 10-9Z" fill="#9fdcf5" stroke="#7b4b2a" stroke-width="1.8" stroke-linejoin="round"></path><path d="M9 19h6l-3-3Z" fill="#ffd75a"></path></svg>',
  body: C.well('<p style="margin: 0; font-size: 14.5px; font-weight: 500; line-height: 1.4; color: ' + TEXT + '">Aarav is looking for Saturday work. An offer may come in the next year — it will show up in your journal.</p>') +
    '<div style="display: flex; flex-wrap: wrap; gap: 4px; margin-top: 10px">' + C.when('Saturdays, from now') + C.cost('Free') + '</div>',
  primary: { label: 'Got it', on: 'closeToast' }
});

const script = `// Activities: what Aarav can do now to change his life, fitted to a 15-year-old in Lucknow.
// The focus of the year sits on top; then three groups of actions, each with its cost, when a
// result may come and what it changes. Locked actions say why. One action opens in a pop-up
// and, once started, shows as in progress with a confirmation pop-up. \`frame\` shows the list, the open action or after it.
// Aarav's health figure counts up as the screen appears.

${C.ENTER_JS}

var HEALTH = 73;
var FOCUS = {
  study: [['+ Education', '#6f8cff'], ['− Happiness', '#ffc23d']],
  work: [['+ ₹ money', '#8fd14f'], ['− Education', '#6f8cff']],
  family: [['+ Relationships', '#4cc9a0']],
  health: [['+ Health', '#ff6f8a'], ['+ Happiness', '#ffc23d']],
  fun: [['+ Happiness', '#ffc23d'], ['− Education', '#6f8cff']]
};
class Component extends DCLogic {
  componentDidMount() { startEnter(this); }
  componentWillUnmount() { clearInterval(this.enterTimer); }
  renderVals() {
    const st = this.state || {};
    const frame = this.props.frame;
    const k = entered(this);
    const started = st.started !== undefined ? st.started : frame === 'started';
    const detail = st.detail !== undefined ? st.detail : frame === 'detail';
    const toast = st.toast !== undefined ? st.toast : frame === 'started';
    const pick = st.focus || 'study';
    const focus = {};
    Object.keys(FOCUS).forEach((key) => { focus[key] = { on: pick === key, bg: pick === key ? '#8fd9e6' : '${FIELD}', pick: () => this.setState({ focus: key }) }; });
    return {
      healthNow: Math.round(HEALTH * k),
      focus: focus,
      focusFx: FOCUS[pick].map((f) => ({ t: f[0], dot: f[1] })),
      started: started,
      detail: detail,
      toast: toast,
      openDetail: () => { if (!started) this.setState({ detail: true }); },
      closeDetail: () => this.setState({ detail: false }),
      start: () => this.setState({ detail: false, started: true, toast: true }),
      stop: () => this.setState({ started: false, toast: false }),
      closeToast: () => this.setState({ toast: false }),
      sn: stickerLinks(this)
    };
  }
}`;

const html = C.head('Activities — cute') + '\n' + main + '\n' + C.nav('activities') + '\n' + sheet + '\n' + toast + '\n' + C.tail(script, { frame: { editor: 'enum', options: ['main', 'detail', 'started'], default: 'main' } });
fs.writeFileSync(process.argv[2] + '/ActivitiesCute.dc.html', html);
console.log('activities', html.length);
