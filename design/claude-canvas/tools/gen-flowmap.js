// Writes FlowMap.dc.html: the production flow as a diagram — one card per screen, arrows for
// every transition with the button that makes it. Built from separate placed elements so each
// card and arrow can be moved on the canvas. Usage: node gen-flowmap.js <project dir>
const fs = require('fs');
const path = require('path');
const dir = process.argv[2];

const W = 2896, H = 900, CW = 208, CH = 96;
const LINE = '#7b4b2a';
const FILL = { setup: '#fff2c4', life: '#e4f5d0', popup: '#ffe2c6', tab: '#dbe9ff', hub: '#ede3ff', end: '#e6dcf5' };
const ROW1 = 200, ROW2 = 520;
const col = (i) => 64 + i * 320;

const cards = [
  { id: 'lang', x: col(0), y: ROW1, kind: 'setup', title: 'Language & currency', sub: 'LangCute · first launch; hub settings' },
  { id: 'start', x: col(1), y: ROW1, kind: 'setup', title: 'Start', sub: 'StartCute · planet, born / died' },
  { id: 'roll', x: col(2), y: ROW1, kind: 'setup', title: 'Birth roll', sub: 'RollCute · the country spin' },
  { id: 'cert', x: col(3), y: ROW1, kind: 'setup', title: 'Birth certificate', sub: 'CertCute · parents, stamp' },
  { id: 'odds', x: col(4), y: ROW1, kind: 'setup', title: 'Your odds', sub: 'OddsCute · stats, facts; back to the certificate' },
  { id: 'life', x: col(5), y: ROW1, kind: 'life', title: 'Life', sub: 'LiveCute · journal; Dad asks on a new life' },
  { id: 'pause', x: col(7), y: ROW1, kind: 'popup', title: 'Pause pop-up', sub: 'LiveCutePause · Resume or Exit to hub' },
  { id: 'people', x: col(3), y: ROW2, kind: 'tab', title: 'People', sub: 'PeopleCute · person card' },
  { id: 'acts', x: col(4), y: ROW2, kind: 'tab', title: 'Activities', sub: 'ActivitiesCute · action pop-ups' },
  { id: 'money', x: col(5), y: ROW2, kind: 'tab', title: 'Money', sub: 'MoneyCute · savings pop-up' },
  { id: 'oddsTab', x: col(6), y: ROW2, kind: 'tab', title: 'Odds', sub: 'OddsLife · born in the same second' },
  { id: 'died', x: col(8), y: ROW1, kind: 'end', title: 'Death', sub: 'LiveCuteDied · death screen; hold to see the last day' },
  { id: 'end', x: col(8), y: ROW2, kind: 'end', title: 'This life', sub: 'EndCute · summary, details on a tap' },
  { id: 'hub', x: col(7), y: ROW2, kind: 'hub', title: 'Hub', sub: 'HubCute · after a life: rewards pop-up, Claim' }
];
const C = Object.fromEntries(cards.map((c) => [c.id, c]));
const cx = (c) => c.x + CW / 2, cy = (c) => c.y + CH / 2;

let mark = 0;
const SVG_STYLE = 'overflow: visible; fill: none; stroke: ' + LINE + '; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round';
const head = () => { mark++; return '<defs><marker id="dc-arrow-head-filled-' + mark + '" orient="auto" markerWidth="5" markerHeight="5" refX="2" refY="2" overflow="visible"><path d="M0 0 L4 2 L0 4 Z" fill="' + LINE + '" stroke="none" style="stroke: none; fill: ' + LINE + '; fill: context-stroke"></path></marker></defs>'; };
// One straight segment from (x1, y1) to (x2, y2), horizontal or vertical; `tip` puts a head at (x2, y2).
function seg(x1, y1, x2, y2, tip, dashed) {
  const style = SVG_STYLE + (dashed ? '; stroke-dasharray: 6 6' : '');
  if (y1 === y2) {
    const left = Math.min(x1, x2), n = Math.abs(x2 - x1), h = tip ? 4 : 0;
    const d = x2 > x1 ? 'M 0 4 L ' + (n - h) + ' 4' : 'M ' + n + ' 4 L ' + h + ' 4';
    return '<svg width="' + n + '" height="8" viewBox="0 0 ' + n + ' 8" preserveAspectRatio="none" style="position: absolute; left: ' + left + 'px; top: ' + (y1 - 4) + 'px; width: ' + n + 'px; height: 8px; ' + style + '">' + (tip ? head() : '') + '<path d="' + d + '"' + (tip ? ' marker-end="url(#dc-arrow-head-filled-' + mark + ')"' : '') + '></path></svg>';
  }
  const top = Math.min(y1, y2), n = Math.abs(y2 - y1), h = tip ? 4 : 0;
  const d = y2 > y1 ? 'M 4 0 L 4 ' + (n - h) : 'M 4 ' + n + ' L 4 ' + h;
  return '<svg width="8" height="' + n + '" viewBox="0 0 8 ' + n + '" preserveAspectRatio="none" style="position: absolute; left: ' + (x1 - 4) + 'px; top: ' + top + 'px; width: 8px; height: ' + n + 'px; ' + style + '">' + (tip ? head() : '') + '<path d="' + d + '"' + (tip ? ' marker-end="url(#dc-arrow-head-filled-' + mark + ')"' : '') + '></path></svg>';
}
const labels = [];
const label = (text, left, top, width) => labels.push('<div style="position: absolute; left: ' + left + 'px; top: ' + top + 'px; width: ' + width + 'px; text-align: center; font-size: 13px; font-weight: 600; line-height: 16px; color: #7b4b2a">' + text + '</div>');
// A label centred over a horizontal segment between x1 and x2 at y.
const over = (text, x1, x2, y) => { const w = Math.round(text.length * 7.6 + 8); label(text, Math.round((x1 + x2) / 2 - w / 2), y - 28, w); };

const arrows = [];
// The first-launch chain, left to right, each arrow leaving a card's right edge.
[['lang', 'start', 'Continue'], ['start', 'roll', 'Be Born!'], ['roll', 'cert', 'Who am I?'], ['cert', 'odds', 'Your odds'], ['odds', 'life', 'Start life'], ['life', 'pause', 'Pause']].forEach(([a, b, t]) => {
  const y = cy(C[a]), x1 = C[a].x + CW, x2 = C[b].x - 1;
  arrows.push(seg(x1, y, x2, y, true));
  over(t, x1, x2, y);
});
// Certificate straight to the life, over the top of the odds.
const topY = ROW1 - 48;
arrows.push(seg(cx(C.cert), topY, cx(C.cert), ROW1, false, true));
arrows.push(seg(cx(C.cert), topY, cx(C.life), topY, false, true));
arrows.push(seg(cx(C.life), topY, cx(C.life), ROW1 - 1, true, true));
over('Start life (skip the odds)', cx(C.cert), cx(C.life), topY);
// Life to its four tabs through the sticker menu (they also link to each other and back).
const busY = ROW1 + CH + 112;
arrows.push(seg(cx(C.life), ROW1 + CH, cx(C.life), busY, false));
arrows.push(seg(cx(C.people), busY, cx(C.oddsTab), busY, false));
['people', 'acts', 'money', 'oddsTab'].forEach((k) => arrows.push(seg(cx(C[k]), busY, cx(C[k]), ROW2 - 1, true)));
label('Sticker menu — the tabs also lead to each other and back to Life', cx(C.people) - 4, busY - 30, 520);
// Pause pop-up down to the hub.
arrows.push(seg(cx(C.pause), ROW1 + CH, cx(C.pause), ROW2 - 1, true));
label('Exit to hub', cx(C.pause) + 12, Math.round((ROW1 + CH + ROW2) / 2) - 8, 92);
// The end of the life: the death screen leads to the summary.
arrows.push(seg(C.pause.x + CW, cy(C.pause), C.died.x - 1, cy(C.pause), true));
over('Skip to end', C.pause.x + CW, C.died.x, cy(C.pause));
arrows.push(seg(cx(C.died), ROW1 + CH, cx(C.died), ROW2 - 1, true));
label('Look back', cx(C.died) + 12, Math.round((ROW1 + CH + ROW2) / 2) - 8, 80);
arrows.push(seg(C.end.x, cy(C.end), C.hub.x + CW + 1, cy(C.end), true));
over('To the hub', C.hub.x + CW, C.end.x, cy(C.end));
// Hub back to the birth roll: a new life.
const loopY = ROW2 + CH + 144;
arrows.push(seg(cx(C.hub), ROW2 + CH, cx(C.hub), loopY, false));
arrows.push(seg(cx(C.hub), loopY, cx(C.roll), loopY, false));
arrows.push(seg(cx(C.roll), loopY, cx(C.roll), ROW1 + CH + 1, true));
over('Be Born! — a new life (costs 1 energy)', cx(C.roll), cx(C.hub), loopY);

const card = (c) => '<div style="position: absolute; left: ' + c.x + 'px; top: ' + c.y + 'px; width: ' + CW + 'px; height: ' + CH + 'px; box-sizing: border-box; padding: 10px 14px; display: flex; align-items: center; border: 2px solid ' + LINE + '; border-radius: 14px; background: ' + FILL[c.kind] + '; box-shadow: 0 3px 0 rgba(90,52,24,0.15)"><span><b style="font-size: 17px; font-weight: 700; line-height: 22px; color: #4a2c17">' + c.title + '</b><br><span style="font-size: 13px; font-weight: 500; line-height: 17px; color: #7b4b2a">' + c.sub + '</span></span></div>';
const legendItems = [['setup', 'First launch'], ['life', 'Life'], ['popup', 'Pop-up in the life'], ['tab', 'Life tabs'], ['end', 'End of a life'], ['hub', 'Between lives']];
const legend = legendItems.map(([k, t], i) => '<div style="position: absolute; left: ' + (64 + i * 200) + 'px; top: ' + (H - 96) + 'px; height: 28px; box-sizing: border-box; padding: 0 12px; display: flex; align-items: center; border: 2px solid ' + LINE + '; border-radius: 8px; background: ' + FILL[k] + '; font-size: 13px; font-weight: 600; color: #4a2c17">' + t + '</div>').join('\n');

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Flow map</title>
<script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&amp;display=swap">
<style>
body{margin:0}
</style>
</helmet>
<div style="position: relative; width: ${W}px; height: ${H}px; background: #f7eedc; font-family: Fredoka, system-ui, sans-serif; color: #4a2c17">
${arrows.join('\n')}
<div style="position: absolute; left: 64px; top: 56px; font-size: 32px; font-weight: 700; line-height: 40px; color: #5a3418">1 in 8 B · production flow</div>
<div style="position: absolute; left: 64px; top: 98px; font-size: 15px; font-weight: 500; line-height: 20px; color: #7b4b2a">Light theme. Every arrow is a button on the screen it leaves; tap through it all in the Prototype artboard.</div>
${cards.map(card).join('\n')}
${labels.join('\n')}
${legend}
</div>
</x-dc>
<script type="text/x-dc" data-dc-script data-props='{"$preview":{"width":${W},"height":${H}}}'>
// The production flow of the light-theme app as a map: first launch left to right, the life's
// tabs under it, the pause pop-up, the end of the life and the hub on the right, and the hub's Be Born! looping back
// to the birth roll for a new life.
class Component extends DCLogic {
  renderVals() {
    return {};
  }
}
</script>
</body>
</html>
`;
fs.writeFileSync(path.join(dir, 'FlowMap.dc.html'), html);
console.log('flowmap', html.length, 'arrows', mark);
