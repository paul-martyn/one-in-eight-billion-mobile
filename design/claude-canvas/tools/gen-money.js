// Builds MoneyCute.dc.html: what Aarav can afford at 15 and where his money goes.
const fs = require('fs');
const C = require('./tabs-common.js');
const { L, INK, TEXT, MUTED, PANEL, FIELD, PRESS, RAISE, ICON, STATC } = C;

const UP = '#2f7d1f', DOWN = '#b8452f';
// `to`: a key of the `to` links renderVals returns.
const linkPill = (label, to) => `<a href="{{ to.${to}.href }}" onClick="{{ to.${to}.go }}" style="flex: none; display: inline-flex; align-items: center; gap: 3px; height: 24px; padding: 0 8px; border: 2px solid ${L}; border-radius: 7px; background: ${PANEL}; box-shadow: ${PRESS}; color: ${INK}; font-size: 11.5px; font-weight: 700; text-decoration: none; white-space: nowrap; cursor: pointer">${label}<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#7b4b2a" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"></path></svg></a>`;
const line = (label, sub, amount, color, extra) => `<div style="display: flex; align-items: center; gap: 8px; padding: 8px 2px; border-top: 1.5px dashed #e2c595">
<span style="flex: 1; min-width: 0"><span style="display: block; font-size: 14px; font-weight: 600; line-height: 1.25">${label}</span>${sub ? `<span style="display: block; font-size: 12px; font-weight: 500; color: ${MUTED}">${sub}</span>` : ''}</span>
${extra || ''}<span style="flex: none; font-size: 15px; font-weight: 700; font-variant-numeric: tabular-nums; color: ${color || INK}">${amount}</span>
</div>`;
const panel = (inner) => `<div style="padding: 4px 10px 6px; border: 2px solid ${L}; border-radius: 12px; background: ${FIELD}">
${inner}
</div>`;
const sub = (t) => `<p style="margin: 6px 2px 2px; font-size: 11.5px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: ${MUTED}">${t}</p>`;
const toggle = (key, label, sub2, amount) => `<div style="display: flex; align-items: center; gap: 8px; padding: 8px 2px; border-top: 1.5px dashed #e2c595">
<span style="flex: 1; min-width: 0"><span style="display: block; font-size: 14px; font-weight: 600">${label}</span><span style="display: block; font-size: 12px; font-weight: 500; color: ${MUTED}">${sub2}</span></span>
<span style="flex: none; font-size: 14px; font-weight: 700; font-variant-numeric: tabular-nums">${amount}</span>
<button type="button" role="switch" aria-checked="{{ auto.${key}.on }}" aria-label="Pay ${label} automatically" onClick="{{ auto.${key}.flip }}" style="position: relative; flex: none; width: 48px; height: 28px; box-sizing: border-box; padding: 0; border: 2px solid ${L}; border-radius: 8px; background: {{ auto.${key}.bg }}; box-shadow: ${PRESS}; cursor: pointer"><span style="position: absolute; top: 2px; left: {{ auto.${key}.x }}; width: 18px; height: 18px; box-sizing: border-box; border: 2px solid ${L}; border-radius: 5px; background: #ffffff"></span></button>
</div>`;

const summary = `<section aria-label="Your money" style="padding: 10px 12px 12px; border: 2px solid ${L}; border-radius: 14px; background: ${PANEL}; box-shadow: ${RAISE}">
<p style="margin: 0; font-size: 12px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: ${MUTED}">Cash you can spend</p>
<p style="display: flex; align-items: center; gap: 8px; margin: 2px 0 0; font-size: 36px; font-weight: 700; line-height: 1.1; font-variant-numeric: tabular-nums">${ICON.money}₹{{ cashNow }}</p>
<div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; margin-top: 10px">
<div style="padding: 7px 9px; border: 2px solid ${L}; border-radius: 10px; background: ${FIELD}"><span style="display: block; font-size: 11.5px; font-weight: 700; color: ${MUTED}">Came in · 2041</span><span style="display: block; font-size: 17px; font-weight: 700; font-variant-numeric: tabular-nums; color: ${UP}">+₹{{ inNow }}</span></div>
<div style="padding: 7px 9px; border: 2px solid ${L}; border-radius: 10px; background: ${FIELD}"><span style="display: block; font-size: 11.5px; font-weight: 700; color: ${MUTED}">Went out · 2041</span><span style="display: block; font-size: 17px; font-weight: 700; font-variant-numeric: tabular-nums; color: ${DOWN}">−₹{{ outNow }}</span></div>
</div>
<div style="display: flex; align-items: baseline; justify-content: space-between; gap: 8px; margin-top: 10px; padding-top: 8px; border-top: 1.5px dashed #e2c595">
<span><span style="display: block; font-size: 14px; font-weight: 700">Everything you own</span><span style="display: block; font-size: 12px; font-weight: 500; color: ${MUTED}">cash + savings + bicycle · no debts</span></span>
<span style="font-size: 20px; font-weight: 700; font-variant-numeric: tabular-nums">₹{{ ownNow }}</span>
</div>
</section>`;

const flows = C.h2('In & out · 2041') + panel(
  sub('Came in') +
  line('Pocket money', 'Mum and Dad · ₹200 a month', '+₹2,400', UP) +
  line('Birthday money', 'from relatives · March', '+₹1,500', UP) +
  line('Sundays at Dad’s shop', 'work · since October · ₹200 a Sunday', '+₹800', UP, linkPill('Work', 'activities')) +
  sub('Went out') +
  line('School books and fees', '', '−₹1,200', DOWN) +
  line('Cricket kit', '', '−₹900', DOWN) +
  line('Phone top-ups', 'automatic', '−₹700', DOWN));

const savings = C.h2('Savings') + panel(
  `<div style="display: flex; align-items: center; gap: 8px; padding: 8px 2px">
<span style="flex: 1; min-width: 0"><span style="display: block; font-size: 14px; font-weight: 600">Post office savings</span><span style="display: block; font-size: 12px; font-weight: 500; color: ${MUTED}">earns 4% a year · opened by Mum</span></span>
<span style="flex: none; font-size: 15px; font-weight: 700; font-variant-numeric: tabular-nums">₹{{ savedNow }}</span>
</div>
<button type="button" onClick="{{ openDetail }}" style="display: flex; align-items: center; justify-content: center; gap: 6px; width: 100%; height: 40px; margin-bottom: 6px; border: 2px solid ${L}; border-radius: 10px; background: #ffd75a; box-shadow: ${PRESS}, inset 0 3px 0 rgba(255,255,255,0.5); color: ${INK}; font-family: inherit; font-size: 14.5px; font-weight: 700; cursor: pointer">Put money in savings</button>
<div style="display: flex; align-items: center; gap: 8px; padding: 8px 2px; border-top: 1.5px dashed #e2c595; color: ${MUTED}">${ICON.lock}<span style="flex: 1; font-size: 13px; font-weight: 600">Shares and funds</span><span style="font-size: 12px; font-weight: 600">from 18</span></div>`);

const owned = C.h2('Home & big things') + panel(
  line('Home', 'Parents’ rented flat · 2 rooms · Dad pays ₹6,000 a month', '—', MUTED) +
  line('Bicycle', 'yours · bought 2040', '₹4,000', INK));

const owe = C.h2('Loans & what you owe') + panel(
  line('In your name', '', 'Nothing', INK) +
  `<div style="display: flex; align-items: center; gap: 8px; padding: 8px 2px; border-top: 1.5px dashed #e2c595">
<span style="flex: 1; min-width: 0"><span style="display: block; font-size: 14px; font-weight: 600">The family owes a moneylender</span><span style="display: block; font-size: 12px; font-weight: 500; color: ${MUTED}">Dad borrowed it for the shop in 2040</span></span>
<span style="flex: none; font-size: 15px; font-weight: 700; color: ${DOWN}">₹30,000</span>
</div>
<div style="display: flex; justify-content: flex-end; padding: 0 0 8px">${linkPill('Help your family', 'people')}</div>`);

const regular = C.h2('Regular payments') + panel(
  toggle('phone', 'Phone top-up', 'every month, automatic', '₹199') +
  toggle('club', 'Cricket club', 'every month, automatic', '₹100') +
  line('Insurance', 'none yet', '—', MUTED));

const main = `<div class="kt-scroll" style="position: absolute; left: 0px; right: 0px; top: 100px; bottom: 96px; overflow-y: auto; scrollbar-width: none; box-sizing: border-box; padding: 2px 12px 20px">
${summary}
${flows}
${savings}
${owned}
${owe}
${regular}
</div>
${C.header('Money')}`;

const amounts = ['500', '1000', '2000'].map((a) => `<button type="button" onClick="{{ amt.a${a}.pick }}" aria-pressed="{{ amt.a${a}.on }}" style="flex: 1; height: 40px; border: 2px solid ${L}; border-radius: 10px; background: {{ amt.a${a}.bg }}; box-shadow: ${PRESS}; color: ${INK}; font-family: inherit; font-size: 15px; font-weight: 700; cursor: pointer">₹${Number(a).toLocaleString('en-IN')}</button>`).join('\n');
const after = (label, before, now, note) => `<div style="padding: 7px 8px; border: 2px solid ${L}; border-radius: 10px; background: ${FIELD}"><span style="display: block; font-size: 11px; font-weight: 700; color: ${MUTED}">${label}</span><span style="display: block; margin-top: 2px; font-size: 12px; font-weight: 600; color: ${MUTED}; text-decoration: line-through">${before}</span><span style="display: block; font-size: 16px; font-weight: 700; font-variant-numeric: tabular-nums">${now}</span>${note ? `<span style="display: block; font-size: 11px; font-weight: 600; color: ${UP}">${note}</span>` : ''}</div>`;

const label = (t) => '<p class="k-os" style="margin: 12px 0 6px; font-size: 13px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase">' + t + '</p>';
const sheet = C.popup({
  show: 'detail', close: 'closeDetail', top: 196, title: 'Savings', badgeBg: '#d6f0de', badge: '<svg width="50" height="50" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 11h14v8H5Z" fill="#ffffff" stroke="#7b4b2a" stroke-width="1.6" stroke-linejoin="round"></path><path d="M3.5 11L12 5l8.5 6Z" fill="#ff6f8a" stroke="#7b4b2a" stroke-width="1.6" stroke-linejoin="round"></path><path d="M8.5 13v4M12 13v4M15.5 13v4" stroke="#7b4b2a" stroke-width="1.5"></path><rect x="4" y="19" width="16" height="2" rx="1" fill="#8fd14f" stroke="#7b4b2a" stroke-width="1.2"></rect></svg>',
  body: C.well('<p style="margin: 0; font-size: 14px; font-weight: 500; line-height: 1.4; color: ' + TEXT + '">Put money in the post office savings Mum opened. It is locked for a year and earns 4%.</p>') +
    label('How much') + '<div role="group" aria-label="Amount" style="display: flex; gap: 6px">' + amounts + '</div>' +
    label('After this') + '<div style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px">' + after('Cash to spend', '₹3,000', '₹{{ cashAfter }}') + after('Savings', '₹4,000', '₹{{ savedAfter }}', '+₹{{ interest }} by Oct 2042') + after('All you own', '₹11,000', '₹11,000', 'same total') + '</div>' +
    '<p style="margin: 10px 2px 0; font-size: 12.5px; font-weight: 600; line-height: 1.4; color: ' + INK + '">Locked until Oct 2042. Taking it out early loses the interest.</p>',
  primary: { label: 'Save ₹{{ amountLabel }}', on: 'deposit' },
  secondary: { label: 'Cancel', on: 'closeDetail' }
});

const script = `// Money: what Aarav can spend now, kept apart from what he owns and what the family owes.
// One period (2041) for money in and out. Work links to Activities, the family debt to People.
// The savings pop-up shows what he has, what gets locked and what is left after.
// \`frame\` shows the screen or the open savings pop-up. The summary amounts count up as it appears.

${C.ENTER_JS}

var CASH = 3000, SAVED = 4000, CAME_IN = 4700, WENT_OUT = 2800, OWN = 11000;
class Component extends DCLogic {
  componentDidMount() { startEnter(this); }
  componentWillUnmount() { clearInterval(this.enterTimer); }
  renderVals() {
    const st = this.state || {};
    const detail = st.detail !== undefined ? st.detail : this.props.frame === 'detail';
    const amount = st.amount || 2000;
    const done = st.done || 0;
    const k = entered(this);
    const fmt = (n) => n.toLocaleString('en-IN');
    const count = (n) => fmt(Math.round(n * k));
    const amt = {};
    [500, 1000, 2000].forEach((a) => { amt['a' + a] = { on: amount === a, bg: amount === a ? '#8fd9e6' : '${FIELD}', pick: () => this.setState({ amount: a }) }; });
    const auto = {};
    ['phone', 'club'].forEach((key) => {
      const on = !(st.off && st.off[key]);
      auto[key] = { on: on, bg: on ? '#8fd14f' : '#e8dcc8', x: on ? '24px' : '2px', flip: () => this.setState({ off: Object.assign({}, st.off, { [key]: on }) }) };
    });
    return {
      detail: detail,
      cashNow: count(CASH - done),
      inNow: count(CAME_IN),
      outNow: count(WENT_OUT),
      ownNow: count(OWN),
      savedNow: fmt(SAVED + done),
      cashAfter: fmt(CASH - done - amount),
      savedAfter: fmt(SAVED + done + amount),
      interest: fmt(Math.round((SAVED + done + amount) * 0.04 - SAVED * 0.04)),
      amountLabel: fmt(amount),
      amt: amt,
      auto: auto,
      openDetail: () => this.setState({ detail: true }),
      closeDetail: () => this.setState({ detail: false }),
      deposit: () => this.setState({ detail: false, done: done + amount }),
      to: { activities: linkTo(this, 'ActivitiesCute'), people: linkTo(this, 'PeopleCute') },
      sn: stickerLinks(this)
    };
  }
}`;

const html = C.head('Money — cute') + '\n' + main + '\n' + C.nav('money') + '\n' + sheet + '\n' + C.tail(script, { frame: { editor: 'enum', options: ['main', 'detail'], default: 'main' } });
fs.writeFileSync(process.argv[2] + '/MoneyCute.dc.html', html);
console.log('money', html.length);
