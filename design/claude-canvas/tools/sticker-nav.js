// The game's bottom menu: die-cut stickers slapped a little crooked onto a strip of torn kraft
// paper. Closed tabs are line drawings; the open one is coloured in, a bit bigger and lifted.
// Opening one floods it with colour from the middle, pops it with a quick wobble and throws off
// a ring and a burst of stars.
// Tab screens get links with their own tab open; the life screen's demo gets buttons whose state
// comes from holes (`nt.<key>.*`).
const L = '#7b4b2a';
const TABS = [
  { key: 'people', label: 'People', href: 'PeopleCute.dc.html', color: '#ff6b6b', spot: [42, 24, -6], badge: 1 },
  { key: 'activities', label: 'Activities', href: 'ActivitiesCute.dc.html', color: '#5fa2ff', spot: [117, 15, 5] },
  { key: 'life', label: 'Life', href: 'LiveCute.dc.html', color: '#ffd75a', spot: [196, 26, -3] },
  { key: 'money', label: 'Money', href: 'MoneyCute.dc.html', color: '#8fd14f', spot: [275, 16, 6] },
  { key: 'odds', label: 'Odds', href: 'OddsLife.dc.html', color: '#b48cff', spot: [351, 23, -5] }
];
const ICON = {
  people: '<path d="M8.5 11a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4ZM2.5 19.5c0-3.4 2.6-5.6 6-5.6s6 2.2 6 5.6Z"></path><path d="M15.8 11a2.7 2.7 0 1 0 0-5.4 2.7 2.7 0 0 0 0 5.4ZM14.6 19.5c0-2.2-.4-3.9-1.2-5 .8-.5 1.6-.7 2.6-.7 3 0 5.5 2 5.5 5.7Z"></path>',
  activities: '<path d="M6.8 2.5h4.1l2 6H8.8ZM17.2 2.5h-4.1l-2 6h4.1Z"></path><circle cx="12" cy="15" r="6.2"></circle><path d="M12 11.9l1 1.9 2.1.3-1.5 1.4.4 2.1-2-1-2 1 .4-2.1-1.5-1.4 2.1-.3Z" fill="currentColor" stroke="none"></path>',
  life: '<path d="M12 21.5V12.5" fill="none" stroke-width="2.2" stroke-linecap="round"></path><path d="M12 12.5c0-4.4 3.3-7.2 7.6-7.2 0 4.4-3.3 7.2-7.6 7.2Z"></path><path d="M12 15c0-3.4-2.6-5.6-6.4-5.6 0 3.4 2.6 5.6 6.4 5.6Z"></path>',
  money: '<rect x="2.5" y="6" width="19" height="12.5" rx="3"></rect><circle cx="12" cy="12.25" r="3"></circle>',
  odds: '<rect x="3" y="11" width="4.6" height="9" rx="1.4"></rect><rect x="9.7" y="4" width="4.6" height="16" rx="1.4"></rect><rect x="16.4" y="8" width="4.6" height="12" rx="1.4"></rect>'
};
// White with a brown outline by default; `fill`/`line` recolour it.
const icon = (k, size, fill, line, width) => '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="' + (fill || '#ffffff') + '" stroke="' + (line || '#5a3418') + '" stroke-width="' + (width || 1.8) + '" stroke-linejoin="round" aria-hidden="true" style="position: relative; flex: none; color: ' + (line || '#5a3418') + '">' + ICON[k] + '</svg>';

// Where the stars of the burst fly to, from the sticker's middle.
const BURST = [[-44, -30], [-6, -50], [38, -38], [50, 4], [-50, 6], [24, 30]];
const CSS = [
  '@keyframes kc-stick{0%{transform:scale(1) rotate(0deg)}25%{transform:scale(1.28) rotate(-7deg)}50%{transform:scale(0.9) rotate(4deg)}75%{transform:scale(1.05) rotate(-1deg)}100%{transform:scale(1) rotate(0deg)}}',
  '@keyframes kc-fill{0%{clip-path:circle(0% at 50% 50%)}100%{clip-path:circle(75% at 50% 50%)}}',
  '@keyframes kc-ring{0%{opacity:0.9;transform:scale(0.5)}100%{opacity:0;transform:scale(1.8)}}',
  '@keyframes kc-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.1)}}'
].concat(BURST.map(([x, y], i) => '@keyframes kc-b' + i + '{0%{opacity:0;transform:translate(0px,0px) scale(0.2) rotate(0deg)}20%{opacity:1}100%{opacity:0;transform:translate(' + x + 'px,' + y + 'px) scale(1) rotate(140deg)}}'))
  .concat(['.kc-stk:active{transform:scale(0.92)}']).join('\n');

// The red notification dot, with a white outlined number like the rest of the game's lettering.
const badge = (n, pos) => '<span aria-label="' + n + ' thing' + (n === 1 ? '' : 's') + ' to look at" class="k-os" style="position: absolute; ' + pos + '; z-index: 4; display: flex; align-items: center; justify-content: center; min-width: 22px; height: 22px; box-sizing: border-box; padding: 0 5px; border: 2px solid ' + L + '; border-radius: 11px; background: #f2384c; box-shadow: inset 0 2px 0 rgba(255,255,255,0.45), inset 0 -2px 0 rgba(90,52,24,0.25); font-size: 12px; font-weight: 700; line-height: 1; animation: kc-pulse 2s ease-in-out infinite">' + n + '</span>';

const caps = (t, size, cls, ink) => '<span' + (cls ? ' class="' + cls + '"' : '') + ' style="position: relative; font-size: ' + size + 'px; font-weight: 700; line-height: 12px; letter-spacing: 0.04em; text-transform: uppercase' + (ink ? '; color: ' + ink : '') + '">' + t + '</span>';
const star = (size, color) => '<path d="M12 2l2.6 6.8L22 12l-7.4 3.2L12 22l-2.6-6.8L2 12l7.4-3.2Z" fill="' + color + '" stroke="' + L + '" stroke-width="2" stroke-linejoin="round"></path>';
const burst = (t) => '<span aria-hidden="true" style="position: absolute; left: 50%; top: 50%; width: 70px; height: 70px; margin: -35px 0 0 -35px; box-sizing: border-box; border: 3px solid ' + t.color + '; border-radius: 50%; opacity: 0; pointer-events: none; animation: kc-ring 0.4s ease-out forwards"></span>' +
  BURST.map((_, i) => '<svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true" style="position: absolute; left: 50%; top: 50%; margin: -6px 0 0 -6px; opacity: 0; pointer-events: none; animation: kc-b' + i + ' 0.5s cubic-bezier(.2,.8,.3,1) 0.04s forwards">' + star(12, [t.color, '#ffffff', '#ffd75a'][i % 3]) + '</svg>').join('');

const ON = { scale: 1.1, anim: 'kc-stick 0.4s ease-out', clip: '75%', fill: 'kc-fill 0.2s ease-out', z: 3, shadow: '0 3px 0 rgba(90,52,24,0.2), 0 9px 14px rgba(90,52,24,0.24)' };
const OFF = { scale: 1, anim: 'none', clip: '0%', fill: 'none', z: 1, shadow: '0 2px 0 rgba(90,52,24,0.16), 0 4px 8px rgba(90,52,24,0.14)' };
const holes = (k) => ({ scale: '{{ nt.' + k + '.sScale }}', anim: '{{ nt.' + k + '.sAnim }}', clip: '{{ nt.' + k + '.sClip }}', fill: '{{ nt.' + k + '.sFill }}', z: '{{ nt.' + k + '.sZ }}', shadow: '{{ nt.' + k + '.sShadow }}' });

function sticker(t, opts) {
  const [cx, top, tilt] = t.spot;
  const live = !!opts.holes;
  const on = !live && t.key === opts.active;
  const v = live ? holes(t.key) : on ? ON : OFF;
  const size = t.key === 'activities' ? 8 : 9.5;
  const open = live
    ? '<button type="button" class="kc-stk" onClick="{{ nt.' + t.key + '.pick }}" aria-current="{{ nt.' + t.key + '.cur }}"'
    : '<a href="{{ sn.' + t.key + '.href }}" onClick="{{ sn.' + t.key + '.go }}" class="kc-stk"' + (on ? ' aria-current="page"' : '');
  const close = live ? '</button>' : '</a>';
  return '<div style="position: absolute; left: ' + (cx - 32) + 'px; top: ' + top + 'px; z-index: ' + v.z + '; width: 64px; height: 62px; transform: rotate(' + tilt + 'deg) scale(' + v.scale + '); transition: transform 0.25s cubic-bezier(.3,1.6,.5,1)">' +
    open + ' style="position: relative; display: block; width: 100%; height: 100%; box-sizing: border-box; padding: 0; border: 2px solid ' + L + '; border-radius: 16px; background: #ffffff; box-shadow: ' + v.shadow + '; font-family: inherit; text-decoration: none; cursor: pointer; animation: ' + v.anim + '; transition: box-shadow 0.25s ease, transform 0.08s ease">' +
    '<span style="position: absolute; left: 3px; right: 3px; top: 3px; bottom: 3px; border-radius: 11px; background: #fbf3e2; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px">' + icon(t.key, 24, '#fffaf0', '#8a5a35', 1.7) + caps(t.label, size, '', '#8a5a35') + '</span>' +
    '<span aria-hidden="true" style="position: absolute; left: 3px; right: 3px; top: 3px; bottom: 3px; border-radius: 11px; overflow: hidden; background: ' + t.color + '; box-shadow: inset 0 3px 0 rgba(255,255,255,0.45), inset 0 -3px 0 rgba(90,52,24,0.22); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; clip-path: circle(' + v.clip + ' at 50% 50%); animation: ' + v.fill + '; transition: clip-path 0.2s ease-in">' + icon(t.key, 24) + caps(t.label, size, 'k-os') + '<span style="position: absolute; left: 6px; top: 5px; width: 14px; height: 6px; border-radius: 3px; background: rgba(255,255,255,0.6); transform: rotate(-20deg)"></span></span>' +
    (t.badge ? badge(t.badge, 'right: -10px; top: -10px') : '') + close +
    (live ? '<sc-if value="{{ nt.' + t.key + '.on }}" hint-placeholder-val="{{ false }}">' + burst(t) + '</sc-if>' : on ? burst(t) : '') +
    '</div>';
}

// A torn top edge: points along the strip, nudged up and down.
const tear = [];
for (let x = 0, i = 0; x <= 393; i++) {
  tear.push([+x.toFixed(1), [5, 2, 8, 3, 6, 1.5, 7, 4, 2.5, 6.5][i % 10]]);
  x += [8, 10, 7, 9, 11, 8, 9, 7, 10, 8][i % 10];
}
tear.push([393, 4]);
const tearLine = 'M' + tear.map((p) => p[0] + ' ' + p[1]).join(' L');
const kraftShape = tearLine + ' L393 100 L0 100 Z';

// opts: { active } for a tab screen, or { holes: true } for the life screen's demo;
// `kraft` and `line` take theme colours.
function stickerNav(opts) {
  const kraft = opts.kraft || '#dcb27a', line = opts.line || L;
  return '<nav aria-label="Sections" style="position: absolute; left: 0px; right: 0px; bottom: 0px; z-index: 0; height: 100px">\n' +
    '<svg width="393" height="100" viewBox="0 0 393 100" aria-hidden="true" style="position: absolute; left: 0px; top: 0px"><defs><clipPath id="kc-kraft"><path d="' + kraftShape + '"></path></clipPath><filter id="kc-kraft-grain"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch"></feTurbulence><feColorMatrix type="saturate" values="0"></feColorMatrix></filter></defs>' +
    '<path d="' + kraftShape + '" style="fill: ' + kraft + '"></path><g clip-path="url(#kc-kraft)" opacity="0.14" style="mix-blend-mode: multiply"><rect width="393" height="100" filter="url(#kc-kraft-grain)"></rect></g><path d="' + tearLine + '" fill="none" stroke-width="2" stroke-linejoin="round" style="stroke: ' + line + '"></path></svg>\n' +
    TABS.map((t) => sticker(t, opts)).join('\n') + '\n</nav>';
}

// Script helpers every production screen carries (classic JS, pasted into its logic script).
// linkTo: inside the prototype the host passes `nav` and moves between screens itself, so a link
// gets no href and calls nav(stem) instead; on its own an artboard follows plain links.
// Markup: <a href="{{ to.x.href }}" onClick="{{ to.x.go }}">. The sticker menu reads `sn`.
const LINK_JS = [
  '// Inside the prototype the host passes `nav` and moves between screens itself; on its own an',
  '// artboard follows plain links.',
  'function linkTo(self, stem) {',
  '  return typeof self.props.nav === \'function\'',
  '    ? { href: null, go: () => self.props.nav(stem) }',
  '    : { href: stem + \'.dc.html\', go: null };',
  '}',
  'var STICKER_STEMS = { ' + TABS.map((t) => t.key + ": '" + t.href.replace('.dc.html', '') + "'").join(', ') + ' };',
  'function stickerLinks(self) {',
  '  const out = {};',
  '  Object.keys(STICKER_STEMS).forEach((k) => { out[k] = linkTo(self, STICKER_STEMS[k]); });',
  '  return out;',
  '}'
].join('\n');
// Bars fill and numbers count up once as a screen appears: startEnter(this) in componentDidMount,
// clearInterval(this.enterTimer) in componentWillUnmount, entered(this) (0 → 1, eased) in renderVals.
const ENTER_JS = [
  '// Bars fill and numbers count up once, as the screen appears.',
  'var ENTER_MS = 900;',
  'function startEnter(self) {',
  '  self.enterAt = Date.now();',
  '  self.enterTimer = setInterval(() => {',
  '    const p = Math.min(1, (Date.now() - self.enterAt) / ENTER_MS);',
  '    self.setState({ enterP: p });',
  '    if (p >= 1) clearInterval(self.enterTimer);',
  '  }, 30);',
  '}',
  'function entered(self) {',
  '  const p = (self.state && self.state.enterP) || 0;',
  '  return 1 - Math.pow(1 - p, 3);',
  '}'
].join('\n');

module.exports = { TABS, ICON, icon, CSS, badge, stickerNav, ON, OFF, LINK_JS, ENTER_JS };
