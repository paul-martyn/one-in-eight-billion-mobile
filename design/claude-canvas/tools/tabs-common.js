// Shared pieces for the cute tab screens (People, Activities, Money, Odds): page shell,
// header with the pause chip, the five-tab bar, and small markup helpers.
const SN = require('./sticker-nav.js');
const L = '#7b4b2a', INK = '#5a3418', TEXT = '#4a2c17', MUTED = '#8a5a35', PANEL = '#fff3d6', FIELD = '#fffaf0', BG = '#f2e3c6';
const PRESS = 'inset 0 -3px 0 rgba(90,52,24,0.22)';
const RAISE = '0 4px 12px rgba(90,52,24,0.2), 0 1px 3px rgba(90,52,24,0.14)';

const IMG = {
  dad: '/_blob/8d95e2321f6dfb98740afbad525a37f9', mum: '/_blob/cbd2aafdafb840b2db88bb1c3b4c0ef3', ananya: '/_blob/74d3092d1f603aad42d80848d9c28b7c',
  aarav: '/_blob/60abeeee8ef547960e0ea6b2a9d59a6f', kabir: '/_blob/f66c866a3edf1a53f0a71af84cba0113', meera: '/_blob/36fd60f21346e9dbb75db73a34fdf62d',
  hari: '/_blob/5bd74f940ba8cdd903af2b4b1890b34f', chen: '/_blob/b199b64e7eaa21e46ac924145292c6cd', amina: '/_blob/d93e605dd61161882f28229f6b213f40',
  lucas: '/_blob/a9f0f70f05c60c3cee07ab3966cd26df', emma: '/_blob/654c2bebfb923395697e6324216e438e'
};

const ICON = {
  people: '<svg width="26" height="22" viewBox="0 0 26 22" aria-hidden="true"><circle cx="9" cy="7" r="4.5" fill="#ffc2b5" stroke="#7b4b2a" stroke-width="1.8"></circle><path d="M2 20c0-4 3-6.5 7-6.5s7 2.5 7 6.5Z" fill="#ff8fa3" stroke="#7b4b2a" stroke-width="1.8" stroke-linejoin="round"></path><circle cx="18" cy="8" r="3.6" fill="#ffd98a" stroke="#7b4b2a" stroke-width="1.8"></circle><path d="M15 20c0-3.2 1.8-5.4 4.4-5.4S24 16.8 24 20Z" fill="#8fd14f" stroke="#7b4b2a" stroke-width="1.8" stroke-linejoin="round"></path></svg>',
  activities: '<svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 2h4.2l2 6.2H8.5Z" fill="#6f8cff" stroke="#7b4b2a" stroke-width="1.6" stroke-linejoin="round"></path><path d="M17.5 2h-4.2l-2 6.2h4.2Z" fill="#ff6f8a" stroke="#7b4b2a" stroke-width="1.6" stroke-linejoin="round"></path><circle cx="12" cy="15" r="6.6" fill="#ffc23d" stroke="#7b4b2a" stroke-width="1.8"></circle><path d="M12 11.4l1.1 2.2 2.4.3-1.8 1.7.5 2.4-2.2-1.2-2.2 1.2.5-2.4-1.8-1.7 2.4-.3Z" fill="#fff3d6" stroke="#7b4b2a" stroke-width="1" stroke-linejoin="round"></path></svg>',
  life: '<svg width="30" height="30" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21V12" stroke="#7b4b2a" stroke-width="2.2" stroke-linecap="round"></path><path d="M12 12c0-4.4 3.3-7.2 7.6-7.2 0 4.4-3.3 7.2-7.6 7.2Z" fill="#8fd14f" stroke="#7b4b2a" stroke-width="1.8" stroke-linejoin="round"></path><path d="M12 14.6c0-3.4-2.6-5.6-6.4-5.6 0 3.4 2.6 5.6 6.4 5.6Z" fill="#b6e57f" stroke="#7b4b2a" stroke-width="1.8" stroke-linejoin="round"></path></svg>',
  money: '<svg width="27" height="20" viewBox="0 0 32 24" aria-hidden="true"><rect x="2" y="3" width="28" height="18" rx="4" fill="#8fd14f" stroke="#7b4b2a" stroke-width="2.4"></rect><circle cx="16" cy="12" r="4.5" fill="#c9f09a" stroke="#7b4b2a" stroke-width="2"></circle></svg>',
  odds: '<svg width="24" height="22" viewBox="0 0 24 22" aria-hidden="true"><rect x="2" y="10" width="5" height="10" rx="1.5" fill="#6f8cff" stroke="#7b4b2a" stroke-width="1.6"></rect><rect x="9.5" y="3" width="5" height="17" rx="1.5" fill="#ffc23d" stroke="#7b4b2a" stroke-width="1.6"></rect><rect x="17" y="7" width="5" height="13" rx="1.5" fill="#ff6f8a" stroke="#7b4b2a" stroke-width="1.6"></rect></svg>',
  cash: '<svg width="17" height="13" viewBox="0 0 32 24" aria-hidden="true" style="flex: none"><rect x="2" y="3" width="28" height="18" rx="4" fill="#8fd14f" stroke="#7b4b2a" stroke-width="3"></rect><circle cx="16" cy="12" r="4.5" fill="#c9f09a" stroke="#7b4b2a" stroke-width="2.4"></circle></svg>',
  clock: '<svg width="13" height="13" viewBox="0 0 24 24" aria-hidden="true" style="flex: none"><circle cx="12" cy="12" r="9.5" fill="#ffffff" stroke="#7b4b2a" stroke-width="2.4"></circle><path d="M12 7v5l3.5 2" fill="none" stroke="#7b4b2a" stroke-width="2.4" stroke-linecap="round"></path></svg>',
  chevron: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7b4b2a" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="flex: none"><path d="M9 6l6 6-6 6"></path></svg>',
  back: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"></path></svg>',
  pause: '<svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="5" y="4" width="5" height="16" rx="1.5"></rect><rect x="14" y="4" width="5" height="16" rx="1.5"></rect></svg>',
  arrow: '<svg width="30" height="26" viewBox="0 0 30 26" aria-hidden="true" style="flex: none"><path d="M5 13 H22.5 M15.5 6 L22.5 13 L15.5 20" fill="none" stroke="#7b4b2a" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"></path><path d="M5 13 H22.5 M15.5 6 L22.5 13 L15.5 20" fill="none" stroke="#ffffff" stroke-width="4.6" stroke-linecap="round" stroke-linejoin="round"></path></svg>',
  lock: '<svg width="13" height="13" viewBox="0 0 24 24" aria-hidden="true" style="flex: none"><rect x="5" y="10" width="14" height="11" rx="2.5" fill="#e8d5b0" stroke="#7b4b2a" stroke-width="2.2"></rect><path d="M8 10V7.5a4 4 0 0 1 8 0V10" fill="none" stroke="#7b4b2a" stroke-width="2.2"></path></svg>',
  hourglass: '<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" style="flex: none"><path d="M6 3h12M6 21h12" stroke="#7b4b2a" stroke-width="2.4" stroke-linecap="round"></path><path d="M7 3c0 5 10 5 10 9s-10 4-10 9h10c0-5-10-5-10-9s10-4 10-9Z" fill="#9fdcf5" stroke="#7b4b2a" stroke-width="2" stroke-linejoin="round"></path></svg>'
};

const STATC = { health: '#ff6f8a', joy: '#ffc23d', mind: '#6f8cff', ties: '#4cc9a0', money: '#8fd14f' };

function head(title) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${title}</title>
<script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&amp;display=swap">
<style>
body{margin:0}
main a:focus-visible,main button:focus-visible{outline:3px solid #2593a3;outline-offset:3px}
.kt-scroll::-webkit-scrollbar{display:none}
${SN.CSS}
.k-o{color:#ffffff;text-shadow:1.5px 0 0 #5a3418,-1.5px 0 0 #5a3418,0 1.5px 0 #5a3418,0 -1.5px 0 #5a3418,1.1px 1.1px 0 #5a3418,-1.1px 1.1px 0 #5a3418,1.1px -1.1px 0 #5a3418,-1.1px -1.1px 0 #5a3418,0 2px 0 #5a3418}
.k-os{color:#ffffff;text-shadow:1px 0 0 #5a3418,-1px 0 0 #5a3418,0 1px 0 #5a3418,0 -1px 0 #5a3418,0.8px 0.8px 0 #5a3418,-0.8px 0.8px 0 #5a3418,0.8px -0.8px 0 #5a3418,-0.8px -0.8px 0 #5a3418,0 1.5px 0 #5a3418}
</style>
</helmet>
<main style="position: relative; width: 393px; height: 852px; overflow: hidden; background: ${BG}; color: ${INK}; font-family: Fredoka, 'Baloo 2', system-ui, sans-serif">`;
}

// Title on the left, the pause chip on the right: managing life here never moves time on.
function header(title, opts = {}) {
  const left = opts.back ? 62 : 16;
  const back = opts.back ? `<button type="button" onClick="{{ ${opts.back} }}" aria-label="Back" style="position: absolute; left: 12px; top: 50px; width: 42px; height: 42px; box-sizing: border-box; padding: 0; border: 2px solid ${L}; border-radius: 21px; background: ${PANEL}; box-shadow: ${PRESS}; color: ${L}; display: flex; align-items: center; justify-content: center; cursor: pointer">${ICON.back}</button>` : '';
  return `<header style="position: absolute; left: 0px; right: 0px; top: 0px; height: ${opts.h || 100}px; background: ${BG}">
${back}<h1 class="k-o" style="position: absolute; left: ${left}px; top: 50px; margin: 0; font-size: 28px; font-weight: 700; line-height: 40px; white-space: nowrap">${title}</h1>
<span role="status" style="position: absolute; right: 12px; top: 57px; display: flex; align-items: center; gap: 5px; height: 26px; box-sizing: border-box; padding: 0 9px; border: 2px solid ${L}; border-radius: 8px; background: ${PANEL}; color: ${L}; font-size: 11.5px; font-weight: 700; white-space: nowrap">${ICON.pause}Paused · 15 · Oct 2041</span>
${opts.extra || ''}</header>`;
}

// The game menu: stickers on torn kraft paper, this screen's own sticker coloured in.
function nav(active) {
  return SN.stickerNav({ active: active });
}

// Closes the page and writes the logic. Every tab screen gets the link helpers (the sticker menu
// reads `sn`) and declares `nav`, which the prototype passes to move between screens itself.
function tail(script, props) {
  return `</main>
</x-dc>
<script type="text/x-dc" data-dc-script data-props='${JSON.stringify(Object.assign({}, props || {}, { nav: { editor: null }, $preview: { width: 393, height: 852 } }))}'>
${SN.LINK_JS}

${script}
</script>
</body>
</html>
`;
}

// A small change marker in the one visual language for consequences.
function fx(text, color) {
  return `<span style="display: inline-flex; align-items: center; gap: 4px; height: 19px; padding: 0 6px 0 5px; border-radius: 6px; background: #f6ecd5; font-size: 11px; font-weight: 700; color: ${L}; white-space: nowrap"><span style="width: 8px; height: 8px; box-sizing: border-box; border: 1.5px solid ${L}; border-radius: 3px; background: ${color}"></span>${text}</span>`;
}
// Cost and time chips sit before the effects.
function cost(text) {
  return `<span style="display: inline-flex; align-items: center; gap: 4px; height: 19px; padding: 0 6px; border: 1.5px solid ${L}; border-radius: 6px; background: ${FIELD}; font-size: 11px; font-weight: 700; color: ${L}; white-space: nowrap">${ICON.cash}${text}</span>`;
}
function when(text) {
  return `<span style="display: inline-flex; align-items: center; gap: 4px; height: 19px; padding: 0 6px; border: 1.5px solid ${L}; border-radius: 6px; background: ${FIELD}; font-size: 11px; font-weight: 700; color: ${L}; white-space: nowrap">${ICON.clock}${text}</span>`;
}
function h2(text, extra) {
  return `<h2 style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin: 18px 4px 8px; font-size: 13px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: ${MUTED}"><span>${text}</span>${extra || ''}</h2>`;
}
function portrait(src, size, bg, radius) {
  return `<span style="flex: none; width: ${size}px; height: ${size}px; box-sizing: border-box; border: 2px solid ${L}; border-radius: ${radius || 12}px; overflow: hidden; background: ${bg || '#f6e2b8'}"><img src="${src}" alt="" style="display: block; width: ${size - 4}px; height: ${Math.round((size - 4) * 1.12)}px"></span>`;
}
const DOG = (size) => `<svg width="${size}" height="${size}" viewBox="0 0 48 48" aria-hidden="true" style="flex: none; box-sizing: border-box; border: 2px solid ${L}; border-radius: 12px; background: #e6dcff"><path d="M12 18c-4 0-6 6-4 12l4-2Z" fill="#b07a4a" stroke="#7b4b2a" stroke-width="2" stroke-linejoin="round"></path><path d="M36 18c4 0 6 6 4 12l-4-2Z" fill="#b07a4a" stroke="#7b4b2a" stroke-width="2" stroke-linejoin="round"></path><path d="M12 22c0-7 5-11 12-11s12 4 12 11v6c0 8-5 13-12 13s-12-5-12-13Z" fill="#e3b07a" stroke="#7b4b2a" stroke-width="2"></path><path d="M18 30c0-3 3-5 6-5s6 2 6 5-3 6-6 6-6-3-6-6Z" fill="#fff3d6" stroke="#7b4b2a" stroke-width="1.6"></path><circle cx="19" cy="24" r="1.8" fill="#4a2c17"></circle><circle cx="29" cy="24" r="1.8" fill="#4a2c17"></circle><path d="M22 29h4l-2 2.2Z" fill="#4a2c17"></path><path d="M24 31.5v1.6c-1 1.2-2.6 1.2-3.4.4M24 33.1c1 1.2 2.6 1.2 3.4.4" fill="none" stroke="#4a2c17" stroke-width="1.4" stroke-linecap="round"></path></svg>`;

// Screens with bars or numbers paste ENTER_JS into their script themselves.
const ENTER_JS = SN.ENTER_JS;

module.exports = { L, INK, TEXT, MUTED, PANEL, FIELD, BG, PRESS, RAISE, IMG, ICON, STATC, head, header, nav, tail, fx, cost, when, h2, portrait, DOG, ENTER_JS };

// A game pop-up in the style of the decision window on Life: a dimmed screen, a round badge
// above a teal ribbon title, an orange framed panel, one big main button, a quieter second
// choice, and a round close button under the panel. `show`, `close`: renderVals names.
function popup(o) {
  const w = Math.max(170, Math.round(o.title.length * 10.5 + 70));
  const closeBtn = o.close ? `<button type="button" onClick="{{ ${o.close} }}" aria-label="Close" style="position: absolute; left: 50%; bottom: -66px; transform: translateX(-50%); width: 48px; height: 48px; box-sizing: border-box; padding: 0; border: 2px solid ${L}; border-radius: 24px; background: #ef7f7f; box-shadow: ${PRESS}, inset 0 3px 0 rgba(255,255,255,0.4); display: flex; align-items: center; justify-content: center; cursor: pointer"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"></path></svg></button>` : '';
  return `<sc-if value="{{ ${o.show} }}" hint-placeholder-val="{{ false }}">
<div aria-hidden="true" style="position: absolute; left: 0px; top: 0px; right: 0px; bottom: 0px; background: rgba(58,34,14,0.55)"></div>
<section role="dialog" aria-modal="true" aria-label="${o.title}" style="position: absolute; left: 18px; right: 18px; top: ${o.top}px; box-sizing: border-box; padding: 34px 14px 16px; border: 2px solid ${L}; border-radius: 20px; background: #f4a940; box-shadow: 0 10px 26px rgba(58,34,14,0.35), inset 0 0 0 3px #f8c46b">
<span aria-hidden="true" style="position: absolute; left: 50%; top: -104px; transform: translateX(-50%); display: flex; align-items: center; justify-content: center; width: 84px; height: 84px; box-sizing: border-box; border: 2px solid ${L}; border-radius: 42px; background: ${o.badgeBg || '#bfe8ef'}">${o.badge}</span>
<svg width="${w}" height="44" viewBox="0 0 ${w} 44" aria-hidden="true" style="position: absolute; left: 50%; top: -24px; transform: translateX(-50%); overflow: visible">
<path d="M4 14 H28 V38 H4 L12 26 Z M${w - 4} 14 H${w - 28} V38 H${w - 4} L${w - 12} 26 Z" fill="#2593a3" stroke="${L}" stroke-width="2" stroke-linejoin="round"></path>
<rect x="20" y="4" width="${w - 40}" height="32" rx="7" fill="#3ec3d2" stroke="${L}" stroke-width="2"></rect>
<rect x="27" y="9" width="${w - 54}" height="5.5" rx="2.75" fill="#ffffff" opacity="0.35"></rect>
<text x="${w / 2}" y="27.5" text-anchor="middle" font-family="Fredoka, sans-serif" font-size="19" font-weight="700" fill="#ffffff" stroke="#5a3418" stroke-width="3.5" paint-order="stroke" stroke-linejoin="round">${o.title}</text>
</svg>
${o.body}
${o.primary ? `<button type="button" onClick="{{ ${o.primary.on} }}" style="display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; height: 56px; margin-top: 14px; box-sizing: border-box; border: 2px solid ${L}; border-radius: 16px; background: #ffd75a; box-shadow: ${PRESS}, inset 0 4px 0 rgba(255,255,255,0.5); font-family: inherit; cursor: pointer"><span class="k-o" style="font-size: 20px; font-weight: 700">${o.primary.label}</span>${ICON.arrow}</button>` : ''}
${o.secondary ? `<div style="display: flex; justify-content: center; margin-top: 10px"><button type="button" onClick="{{ ${o.secondary.on} }}" style="height: 36px; padding: 0 18px; border: 2px solid ${L}; border-radius: 10px; background: #e9cf9c; box-shadow: ${PRESS}; color: ${INK}; font-family: inherit; font-size: 14px; font-weight: 700; cursor: pointer">${o.secondary.label}</button></div>` : ''}
${closeBtn}
</section>
</sc-if>`;
}
// A cream well inside a pop-up.
const well = (inner, extra) => `<div style="padding: 9px 11px; border: 2px solid ${L}; border-radius: 12px; background: ${PANEL}${extra ? '; ' + extra : ''}">${inner}</div>`;
module.exports.popup = popup;
module.exports.well = well;
