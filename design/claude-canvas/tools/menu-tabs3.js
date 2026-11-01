// Builds LiveCute's bottom menus on top of the screen without them: the sticker menu (the game's
// menu, links to the tab screens) plus the folder and pencil alternatives, the `demo` mode that
// switches tabs in place, the wrappers and the canvas boards. It also pastes in the script helpers
// from sticker-nav.js the screen uses: links the prototype can take over, and the enter animation.
// Usage: node menu-tabs3.js base/LiveCute.base.dc.html <project dir>
const fs = require('fs');
const path = require('path');
const SN = require('./sticker-nav.js');
const base = process.argv[2], dir = process.argv[3];
let s = fs.readFileSync(base, 'utf8');
if (s.includes('menuFolder')) throw new Error('base already has the menus');

function once(from, to) {
  const n = s.split(from).length - 1;
  if (n !== 1) throw new Error('expected one match, got ' + n + ': ' + from.slice(0, 60));
  s = s.replace(from, to);
}

const L = 'var(--k-line)';
const PENCIL = '#4d4038';
const TINT = { people: '#ffdcd8', activities: '#dbe9ff', life: '#fff2c4', money: '#e4f5d0', odds: '#ede3ff' };
const TABS = SN.TABS;
const icon = SN.icon;
const caps = (t, size, cls) => '<span' + (cls ? ' class="' + cls + '"' : '') + ' style="position: relative; font-size: ' + size + 'px; font-weight: 700; line-height: 12px; letter-spacing: 0.04em; text-transform: uppercase">' + t + '</span>';
const press = (t) => 'onClick="{{ nt.' + t.key + '.pick }}" aria-current="{{ nt.' + t.key + '.cur }}"';
const h = (t, k) => '{{ nt.' + t.key + '.' + k + ' }}';

// A · Folder. A tall band in the open section's colour hides the names of the other tabs; only
// their icons peek out. The open tab stands up out of the band with its name showing and, once up,
// runs into the band with no line between, like the front tab of a folder.
const folderTab = (t) => '<button type="button" ' + press(t) + ' style="position: relative; z-index: ' + h(t, 'fZ') + '; height: 64px; box-sizing: border-box; padding: 9px 0 0; border: 2px solid ' + L + '; border-bottom: none; border-radius: 14px 14px 0 0; background: ' + t.color + '; box-shadow: inset 0 3px 0 rgba(255,255,255,0.45); display: flex; flex-direction: column; align-items: center; gap: 4px; font-family: inherit; cursor: pointer; transform: translateY(' + h(t, 'fY') + 'px); transition: ' + h(t, 'fTr') + '">' +
  icon(t.key, 24) + caps(t.label, t.key === 'activities' ? 8.5 : 10, 'k-os') + (t.badge ? SN.badge(t.badge, 'right: -8px; top: -10px') : '') + '</button>';
const folder = '<sc-if value="{{ menuFolder }}" hint-placeholder-val="{{ false }}">\n' +
  '<nav aria-label="Sections" style="position: absolute; left: 0px; right: 0px; bottom: 0px; z-index: 0; height: 108px">\n' +
  '<div style="position: absolute; left: 8px; right: 8px; bottom: 42px; display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 4px; align-items: end">\n' +
  TABS.map(folderTab).join('\n') + '\n</div>\n' +
  '<div aria-hidden="true" style="position: absolute; left: 0px; right: 0px; bottom: 0px; z-index: 2; height: 44px; box-sizing: border-box; border-top: 2px solid ' + L + '; background: {{ folderBg }}; transition: background-color 0.5s ease"></div>\n' +
  '</nav>\n</sc-if>';

// B · Stickers: the game's menu (see sticker-nav.js). Links to the tab screens on the real screen,
// buttons that switch in place in the demo.
const stickers = '<sc-if value="{{ menuStickers }}" hint-placeholder-val="{{ true }}">\n' +
  SN.stickerNav({ active: 'life', kraft: 'var(--k-cover)', line: L }) + '\n</sc-if>\n' +
  '<sc-if value="{{ menuStickersDemo }}" hint-placeholder-val="{{ false }}">\n' +
  SN.stickerNav({ holes: true, kraft: 'var(--k-cover)', line: L }).replace('id="kc-kraft"', 'id="kc-kraft-d"').replace('url(#kc-kraft)', 'url(#kc-kraft-d)').replace('id="kc-kraft-grain"', 'id="kc-kraft-grain-d"').replace('url(#kc-kraft-grain)', 'url(#kc-kraft-grain-d)') + '\n</sc-if>';

// C · Pencil. Divider tabs drawn in pencil stand behind a ruled notebook page; the page hides the
// names of the closed ones. The open one rises, gets cross-hatched in its colour and its name is
// underlined with a quick pencil stroke.
const tabShape = 'M2.6 72 L2.2 44 Q1.8 24 2.6 13 Q3.4 3.6 12.4 3 L35 2.4 L57.8 3.2 Q66.6 3.8 67.2 12.6 L67.8 42 L67.4 72';
const tabSketch = 'M3.6 66 L3.1 38 Q2.9 21 3.6 12.2 Q4.8 4.4 13.2 3.9 L36 3.5 L58.2 4.1 Q66 4.9 66.3 13.6 L66.7 48';
const pencilTab = (t) => '<button type="button" ' + press(t) + ' style="position: relative; height: 72px; box-sizing: border-box; padding: 7px 0 0; border: none; background: none; display: flex; flex-direction: column; align-items: center; gap: 3px; font-family: inherit; cursor: pointer; transform: translateY(' + h(t, 'pY') + 'px); transition: transform 0.32s cubic-bezier(.3,1.3,.5,1)">' +
  '<svg width="100%" height="72" viewBox="0 0 70 72" preserveAspectRatio="none" aria-hidden="true" style="position: absolute; left: 0px; top: 0px"><defs>' +
  '<pattern id="kc-h-' + t.key + '" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(-35)"><path d="M0 3 H6" stroke="' + t.color + '" stroke-width="2.2" stroke-linecap="round"></path></pattern>' +
  '<pattern id="kc-x-' + t.key + '" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(40)"><path d="M0 2.5 H5" stroke="' + t.color + '" stroke-width="2" stroke-linecap="round"></path></pattern></defs>' +
  '<path d="' + tabShape + '" fill="' + TINT[t.key] + '"></path><path d="' + tabShape + '" fill="url(#kc-h-' + t.key + ')" opacity="0.75"></path>' +
  '<path d="' + tabShape + '" fill="url(#kc-x-' + t.key + ')" style="opacity: ' + h(t, 'pX') + '; transition: opacity 0.4s ease"></path>' +
  '<path d="' + tabShape + '" fill="none" stroke="' + PENCIL + '" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path><path d="' + tabSketch + '" fill="none" stroke="' + PENCIL + '" stroke-width="0.9" stroke-linecap="round" opacity="0.45"></path></svg>' +
  icon(t.key, 24, '#fffaf0', PENCIL, 1.6) +
  '<span style="position: relative; font-family: \'Patrick Hand\', Fredoka, cursive; font-size: ' + (t.key === 'activities' ? 14 : 16) + 'px; line-height: 17px; color: ' + PENCIL + '">' + t.label + '</span>' +
  '<svg width="44" height="6" viewBox="0 0 44 6" aria-hidden="true" style="position: relative; margin-top: -2px"><path d="M2 4 Q12 1.5 22 3.5 T42 2.5" fill="none" stroke="' + t.color + '" stroke-width="2.2" stroke-linecap="round" stroke-dasharray="44" style="stroke-dashoffset: ' + h(t, 'pLine') + '; transition: stroke-dashoffset 0.35s ease 0.2s"></path></svg>' +
  (t.badge ? SN.badge(t.badge, 'right: -7px; top: -9px') : '') + '</button>';
const pencil = '<sc-if value="{{ menuPencil }}" hint-placeholder-val="{{ false }}">\n' +
  '<nav aria-label="Sections" style="position: absolute; left: 0px; right: 0px; bottom: 0px; z-index: 0; height: 108px">\n' +
  '<div style="position: absolute; left: 10px; right: 10px; bottom: 34px; display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 6px; align-items: end">\n' +
  TABS.map(pencilTab).join('\n') + '\n</div>\n' +
  '<div aria-hidden="true" style="position: absolute; left: 0px; right: 0px; bottom: 0px; z-index: 2; height: 46px; background-color: var(--k-paper); background-image: repeating-linear-gradient(to bottom, transparent 0px, transparent 13px, var(--k-rule) 13px, var(--k-rule) 14.5px); box-shadow: 0 -2px 5px rgba(77,64,56,0.16)">' +
  '<span style="position: absolute; left: 24px; top: 0px; bottom: 0px; width: 1.5px; background: var(--k-margin)"></span><span style="position: absolute; left: 28px; top: 0px; bottom: 0px; width: 1.5px; background: var(--k-margin)"></span>' +
  '<svg width="393" height="6" viewBox="0 0 393 6" style="position: absolute; left: 0px; top: -2px"><path d="M0 3 Q50 1.6 98 3.2 T196 2.6 T294 3.4 T393 2.6" fill="none" stroke="' + PENCIL + '" stroke-width="1.8" stroke-linecap="round"></path><path d="M6 4.2 Q60 3 120 4.4 T250 3.6 T388 4" fill="none" stroke="' + PENCIL + '" stroke-width="0.8" stroke-linecap="round" opacity="0.4"></path></svg>' +
  '<span style="position: absolute; left: 0px; right: 0px; bottom: 4px; text-align: center; font-family: \'Patrick Hand\', cursive; font-size: 13px; color: ' + PENCIL + '; opacity: 0.6">— 15 —</span>' +
  '</div>\n' +
  '</nav>\n</sc-if>';

once('family=Fredoka:wght@500;600;700&amp;display=swap', 'family=Fredoka:wght@500;600;700&amp;family=Patrick+Hand&amp;display=swap');
once('.kc-scroll::-webkit-scrollbar{display:none}', '.kc-scroll::-webkit-scrollbar{display:none}\n' + SN.CSS);
once(';--k-fig:none}', ';--k-fig:none;--k-cover:#dcb27a;--k-rule:#d3e2f0;--k-margin:#ffa3a3}');
once(';--k-fig:brightness(0.82) saturate(0.9)}', ';--k-fig:brightness(0.82) saturate(0.9);--k-cover:#2a2036;--k-rule:#3a2f4c;--k-margin:#a65a7a}');
once('<section aria-label="Life journal" style="position: absolute; left: 10px; right: 10px; top: 392px; bottom: 108px">', '<section aria-label="Life journal" style="position: absolute; left: 10px; right: 10px; top: 392px; bottom: {{ jBottom }}">');

// The old square menu stays as an option, with the new notification dot.
const a = s.indexOf('<nav aria-label="Sections"'), b = s.indexOf('</nav>', a) + '</nav>'.length;
if (a < 0 || s.indexOf('<nav aria-label="Sections"', a + 1) >= 0) throw new Error('nav');
let squares = s.slice(a, b);
const oldDot = squares.match(/<span aria-label="1 thing to look at"[^>]*>1<\/span>/);
if (!oldDot) throw new Error('old dot');
squares = squares.replace(oldDot[0], SN.badge(1, 'right: -8px; top: -9px'));
// Its links go through the same `sn` links as the stickers'.
TABS.forEach((t) => {
  const from = '<a href="' + t.href + '"';
  if (squares.split(from).length !== 2) throw new Error('square ' + t.key);
  squares = squares.replace(from, '<a href="{{ sn.' + t.key + '.href }}" onClick="{{ sn.' + t.key + '.go }}"');
});
if (squares.split('text-decoration: none">').length !== TABS.length + 1) throw new Error('square styles');
squares = squares.split('text-decoration: none">').join('text-decoration: none; cursor: pointer">');
s = s.slice(0, a) + '<sc-if value="{{ menuSquares }}" hint-placeholder-val="{{ false }}">\n' + squares + '\n</sc-if>\n' + stickers + '\n' + folder + '\n' + pencil + s.slice(b);

once('"frame":{"editor":"enum","options":["journal","decision","pause","died","ended"],"default":"journal"},', '"frame":{"editor":"enum","options":["journal","decision","pause","died","ended"],"default":"journal"},"menu":{"editor":"enum","options":["stickers","folder","pencil","squares"],"default":"stickers"},"demo":{"editor":"enum","options":["off","on"],"default":"off"},');
once("// life). As it appears the stat bars and the life bar fill and the numbers count up.\n",
  "// life). As it appears the stat bars and the life bar fill and the numbers count up.\n" +
  "// The bottom menu is stickers on torn kraft paper, each section in its own colour. `menu` swaps it\n" +
  "// for the folder or pencil tabs tried before, or the first square buttons. With `demo: on` a tap\n" +
  "// opens the tab in place, and until the first tap the tabs take turns opening, so the switch can be\n" +
  "// seen on the canvas.\n");
once("var WHO = {", "var TABS = [" + TABS.map((t) => "'" + t.key + "'").join(', ') + "];\nvar TAB_COLOR = { " + TABS.map((t) => t.key + ": '" + t.color + "'").join(', ') + " };\n// Where the journal ends above each menu.\nvar MENU_ROOM = { stickers: '106px', folder: '112px', pencil: '112px', squares: '108px' };\nvar DEMO_MS = 1500;\nvar STICK_ON = " + JSON.stringify(SN.ON) + ";\nvar STICK_OFF = " + JSON.stringify(SN.OFF) + ";\nvar WHO = {");
once("class Component extends DCLogic {\n  componentDidMount() {\n    startEnter(this);\n    this.endStart();\n  }\n  componentWillUnmount() {\n    clearInterval(this.enterTimer);\n    this.endStop();\n  }\n",
  SN.LINK_JS + "\n" + SN.ENTER_JS + "\n\n" +
  "class Component extends DCLogic {\n" +
  "  componentDidMount() {\n" +
  "    startEnter(this);\n" +
  "    this.endStart();\n" +
  "    if (this.props.demo !== 'on') return;\n" +
  "    this.demo = setInterval(() => {\n" +
  "      const st = this.state || {};\n" +
  "      if (st.tapped) return clearInterval(this.demo);\n" +
  "      const tab = st.tab || 'life';\n" +
  "      this.setState({ tab: TABS[(TABS.indexOf(tab) + 1) % TABS.length] });\n" +
  "    }, DEMO_MS);\n" +
  "  }\n" +
  "  componentWillUnmount() {\n" +
  "    clearInterval(this.enterTimer);\n" +
  "    clearInterval(this.demo);\n" +
  "    this.endStop();\n" +
  "  }\n");
once("    const lived = Math.min(AGE, 100);\n",
  "    const lived = Math.min(AGE, 100);\n" +
  "    const menu = MENU_ROOM[this.props.menu] ? this.props.menu : 'stickers';\n" +
  "    const demo = this.props.demo === 'on';\n" +
  "    const tab = st.tab || 'life';\n" +
  "    const ease = 'transform 0.5s cubic-bezier(.22,1,.36,1)';\n" +
  "    const nt = {};\n" +
  "    TABS.forEach((key) => {\n" +
  "      const on = key === tab;\n" +
  "      const stick = on ? STICK_ON : STICK_OFF;\n" +
  "      nt[key] = {\n" +
  "        on: on,\n" +
  "        cur: on ? 'page' : 'false',\n" +
  "        pick: () => { if (key !== tab) this.setState({ tab: key, tapped: true }); },\n" +
  "        // Stickers: colour floods in and the sticker pops with a quick wobble.\n" +
  "        sScale: stick.scale, sClip: stick.clip, sFill: stick.fill, sZ: stick.z, sShadow: stick.shadow, sAnim: stick.anim,\n" +
  "        // Folder: the open tab rises behind the band, then steps in front of it to join it;\n" +
  "        // a closing one drops behind at once and sinks.\n" +
  "        fY: on ? 0 : 26, fZ: on ? 3 : 1, fTr: on ? ease + ', z-index 0s linear 0.5s' : ease + ', z-index 0s',\n" +
  "        // Pencil: the open tab rises above the page, gets cross-hatched and its name underlined.\n" +
  "        pY: on ? 0 : 26, pX: on ? 0.9 : 0, pLine: on ? 0 : 44\n" +
  "      };\n" +
  "    });\n");
once("      theme: theme,\n", "      theme: theme,\n" +
  "      // Once the life is over its menu gives way to the way to its summary.\n" +
  "      menuStickers: !over && menu === 'stickers' && !demo,\n" +
  "      menuStickersDemo: !over && menu === 'stickers' && demo,\n" +
  "      menuFolder: !over && menu === 'folder',\n" +
  "      menuPencil: !over && menu === 'pencil',\n" +
  "      menuSquares: !over && menu === 'squares',\n" +
  "      jBottom: over ? '108px' : MENU_ROOM[menu],\n" +
  "      sn: stickerLinks(this),\n" +
  "      nt: nt,\n" +
  "      folderBg: TAB_COLOR[tab],\n");
fs.writeFileSync(path.join(dir, 'LiveCute.dc.html'), s);

const wrap = (menu, title, note) => '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<title>' + title + '</title>\n<script src="./support.js"></script>\n</head>\n<body>\n<x-dc>\n<helmet>\n<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&amp;family=Patrick+Hand&amp;display=swap">\n<style>\nbody{margin:0;background:#f2e3c6}\n</style>\n</helmet>\n<dc-import name="LiveCute" menu="' + menu + '" demo="on" hint-size="393px,852px" style="position: absolute; left: 0px; top: 0px"></dc-import>\n</x-dc>\n<script type="text/x-dc" data-dc-script data-props=\'{"$preview":{"width":393,"height":852}}\'>\n// ' + note + '\nclass Component extends DCLogic {\n  renderVals() {\n    return {};\n  }\n}\n</script>\n</body>\n</html>\n';
fs.writeFileSync(path.join(dir, 'LiveCuteMenuFolder.dc.html'), wrap('folder', 'Life — menu as folder tabs', 'The life screen with the bottom menu as folder tabs over a band of the open section’s colour; tabs switch in place.'));
fs.writeFileSync(path.join(dir, 'LiveCuteMenuStickers.dc.html'), wrap('stickers', 'Life — sticker menu', 'The game’s sticker menu switching in place, to see how a tab opens.'));
fs.writeFileSync(path.join(dir, 'LiveCuteMenuPencil.dc.html'), wrap('pencil', 'Life — menu as pencil tabs', 'The life screen with the bottom menu as pencil-drawn divider tabs behind a ruled notebook page; tabs switch in place.'));

console.log('ok', s.length);
