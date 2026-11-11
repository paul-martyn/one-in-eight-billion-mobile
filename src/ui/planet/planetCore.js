// Планета: логика без React. Перенесена с холста дизайна (GlobeLive, tools/globe-live.logic.js)
// 11 ноября 2026 почти дословно: проекция, точки суши, вспышки рождений и смертей, выбор страны,
// бросок рождения, нырок в страну. Комментарии внутри — авторские, на английском.
// Обёртка для React — Planet.tsx: она задаёт props, даёт canvas и рисует карточку страны.
// Данные (META, SHAPES, CODE, POOLS) пишет tools/planet/gen-planet-data.mjs из границ Natural
// Earth 1:110m и таблицы стран движка. Вся случайность здесь декоративная (Math.random браузера).
import { META, SHAPES, CODE, POOLS } from './planetData.js';
import { BABY_SVGS, SKULL_SVG, COIN_SVG, GEM_SVG } from './planetIcons.js';

// The old dots' land mask is not carried over: the game uses the even grid only.
var LAND = '';
// What the canvas's component base gave: props, state and a way to ask for a redraw.
class DCLogic {
  constructor() { this.props = {}; this.state = null; this.onChange = null; }
  setState(patch) { this.state = Object.assign({}, this.state, patch); if (this.onChange) this.onChange(); }
  forceUpdate() { if (this.onChange) this.onChange(); }
}

var D2R = Math.PI / 180, TAU = Math.PI * 2;
// Births and deaths a second worldwide; the start screen's counters run at the same pace.
var WORLD = { born: 4.2, died: 2 };
var LX = -0.42, LY = 0.48, LZ = 0.77;
var COL = {
  land: '#5bb54a', ocean: '#9fdcf5', shade: '#5cb3e0', night: 'rgba(90,52,24,0.14)', rim: '#7b4b2a',
  born: '#ff6f8a', died: '#8f73d9', pick: '#ffc93c', gold: '#ffc93c', line: '#7b4b2a', ring: '#fff3d6',
  paper: '#fffaf0', ink: '#4a2c17', dark: '#5a3418'
};
// Evenly spread points: a Fibonacci spiral over the whole sphere, the land ones kept.
var FIB_N = 20000;
var GOLD_DEG = 180 * (3 - Math.sqrt(5));
var SPIN = 8;
// A flick faster than this (degrees a second) rolls the birth; on screen about 450 px a second.
var FLICK = 200;
// Zooming by hand (the wheel, a two-finger pinch) and two quick taps into a country are off
// (2026-11-05): a country is opened only by tapping it and then the "!" on its card.
var ZOOM_GESTURES = false;
// Dots of the country we dive into end up this far apart on screen.
var FINE_PX = 6;
// Faces and names are caught by tapping them (not the dot under them): a face within FACE_R of
// its middle, a name within NAME_PAD of its bubble. Golden flashes (one in LUCKY_N, a gem each)
// are off for now (LUCKY_N 0): gems are the hard currency.
var FACE_R = 30, NAME_PAD = 10, LUCKY_N = 0;
var TIP_W = 176, TIP_H = 62, TIP_TAIL = 10;
var HALO = [[0, 'rgba(255,255,255,0.95)'], [0.38, 'rgba(255,253,246,0.8)'], [0.64, 'rgba(255,249,234,0.45)'], [1, 'rgba(255,246,225,0)']];

function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
function smooth(v, a, b) { var t = clamp01((v - a) / (b - a)); return t * t * (3 - 2 * t); }
function inOut(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
function outCubic(t) { return 1 - Math.pow(1 - t, 3); }
function backOut(t) { var c = 1.9, u = t - 1; return 1 + (c + 1) * u * u * u + c * u * u; }
function wrap(lon) { return ((lon + 180) % 360 + 360) % 360 - 180; }
function rnd(list) { return list[(Math.random() * list.length) | 0]; }
// CSS cubic-bezier(x1, y1, x2, y2) as a function of time.
function bezier(x1, y1, x2, y2) {
  var cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx, cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  return function (t) {
    var u = t;
    for (var i = 0; i < 8; i++) {
      var x = ((ax * u + bx) * u + cx) * u - t, d = (3 * ax * u + 2 * bx) * u + cx;
      if (Math.abs(x) < 1e-5 || !d) break;
      u -= x / d;
    }
    u = clamp01(u);
    return ((ay * u + by) * u + cy) * u;
  };
}
// The screens' own glide between places.
var GLIDE = bezier(0.22, 1, 0.36, 1);

// ---- borders ----
function readRings(str) {
  var out = [];
  if (!str) return out;
  var parts = str.split(' ');
  for (var j = 0; j < parts.length; j++) {
    var r = parts[j], c = r.indexOf(':'), head = r.slice(0, c).split(',');
    var x = +head[0], y = +head[1], pole = +head[2], pts = [x / 10, y / 10], k = c + 1;
    while (k < r.length) {
      for (var a = 0; a < 2; a++) {
        var u = CODE.indexOf(r.charAt(k++));
        if (u >= 80) u = (u - 79) * 80 + CODE.indexOf(r.charAt(k++));
        var v = u & 1 ? -((u + 1) >> 1) : u >> 1;
        if (a === 0) x += v; else y += v;
      }
      pts.push(x / 10, y / 10);
    }
    // A ring round a pole (Antarctica) is closed along the pole.
    if (pole) pts.push(x / 10, pole * 90, +head[0] / 10, pole * 90);
    var p = new Float64Array(pts), x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    for (var i = 0; i < p.length; i += 2) {
      if (p[i] < x0) x0 = p[i];
      if (p[i] > x1) x1 = p[i];
      if (p[i + 1] < y0) y0 = p[i + 1];
      if (p[i + 1] > y1) y1 = p[i + 1];
    }
    out.push({ p: p, x0: x0, x1: x1, y0: y0, y1: y1 });
  }
  return out;
}

function inRing(p, x, y) {
  var inside = false, n = p.length;
  for (var i = 0, j = n - 2; i < n; j = i, i += 2) {
    var yi = p[i + 1], yj = p[j + 1];
    if ((yi > y) !== (yj > y) && x < (p[j] - p[i]) * (y - yi) / (yj - yi) + p[i]) inside = !inside;
  }
  return inside;
}

var WORLD_DATA = null;
function world() {
  if (WORLD_DATA) return WORLD_DATA;
  var shapes = SHAPES.split(';').map(readRings);
  // Countries whose rings touch each 10° cell, to test only a few.
  var cells = [];
  for (var q = 0; q < 18 * 36; q++) cells.push([]);
  shapes.forEach(function (rings, ci) {
    rings.forEach(function (r) {
      var r0 = Math.max(0, Math.floor((r.y0 + 90) / 10)), r1 = Math.min(17, Math.floor((r.y1 + 90) / 10));
      var c0 = Math.floor((r.x0 + 180) / 10), c1 = Math.floor((r.x1 + 180) / 10);
      for (var a = r0; a <= r1; a++) for (var b = c0; b <= c1; b++) {
        var cell = cells[a * 36 + ((b % 36) + 36) % 36];
        if (cell.indexOf(ci) < 0) cell.push(ci);
      }
    });
  });
  var totalBorn = 0, totalDied = 0;
  var countries = META.map(function (m, i) {
    totalBorn += m[2];
    totalDied += m[3];
    return {
      i: i, iso: m[10] || '', name: m[0], short: m[1], born: m[2], died: m[3], clat: m[4], clon: m[5], angR: m[6] * D2R,
      cities: m[7] ? m[7].split('|').map(function (s) { var f = s.split(','); return { n: f[0], lat: +f[1], lon: +f[2] }; }) : [],
      pool: POOLS[m[8]] || POOLS.EU,
      // From the game's table, or none: [0 people (thousands), 1 life expectancy, 2 children per
      // woman, 3 income a person ($), 4 urban %, 5 online %, 6 years at school, 7 infants dying per
      // 1000, 8 under-fives dying per 1000, 9 Gini, 10 wider income spread (1/0), 11 war 0–3,
      // 12 murders per 100k, 13 malaria 0–1.5, 14 HIV % of adults, 15 women married before 18 %,
      // 16 life satisfaction 0–10 (-1 none), 17 years women outlive men, 18 income factor].
      info: m[9] || null
    };
  });
  WORLD_DATA = { shapes: shapes, cells: cells, countries: countries, totalBorn: totalBorn, totalDied: totalDied, sets: {} };
  return WORLD_DATA;
}

function inCountry(W, ci, lon, lat) {
  var rings = W.shapes[ci], inside = false;
  for (var k = 0; k < rings.length; k++) {
    var r = rings[k];
    if (lat < r.y0 || lat > r.y1) continue;
    var x = lon;
    if (x < r.x0) x += 360; else if (x > r.x1) x -= 360;
    if (x < r.x0 || x > r.x1) continue;
    if (inRing(r.p, x, lat)) inside = !inside;
  }
  return inside;
}

function classify(W, lon, lat) {
  var a = Math.max(0, Math.min(17, Math.floor((lat + 90) / 10)));
  var b = ((Math.floor((lon + 180) / 10) % 36) + 36) % 36;
  var cand = W.cells[a * 36 + b];
  for (var k = 0; k < cand.length; k++) if (inCountry(W, cand[k], lon, lat)) return cand[k];
  return -1;
}

function findCountry(W, name) {
  if (!name) return -1;
  var n = String(name).toLowerCase(), i, c;
  // The game's own id first (names change with the language).
  for (i = 0; i < W.countries.length; i++) if (W.countries[i].iso && W.countries[i].iso.toLowerCase() === n) return i;
  for (i = 0; i < W.countries.length; i++) {
    c = W.countries[i];
    if (c.name.toLowerCase() === n || c.short.toLowerCase() === n) return i;
  }
  return -1;
}

// ---- points ----
function pointSet(list) {
  var n = list.length, s = { n: n, sl: new Float64Array(n), cl: new Float64Array(n), so: new Float64Array(n), co: new Float64Array(n), c: new Int16Array(n), lat: new Float64Array(n), lon: new Float64Array(n) };
  for (var i = 0; i < n; i++) {
    var la = list[i][0] * D2R, lo = list[i][1] * D2R;
    s.sl[i] = Math.sin(la); s.cl[i] = Math.cos(la); s.so[i] = Math.sin(lo); s.co[i] = Math.cos(lo);
    s.c[i] = list[i][2]; s.lat[i] = list[i][0]; s.lon[i] = list[i][1];
  }
  return s;
}

function landSet(W, kind) {
  if (W.sets[kind]) return W.sets[kind];
  var list = [];
  if (kind === 'old') {
    // The first planet's dots: rows 1.5° apart, every 2nd, 3rd… dot skipped towards the poles.
    var bin = atob(LAND);
    for (var r = 0; r < 120; r++) {
      var lat = 90 - (r + 0.5) * 1.5, step = Math.max(1, Math.round(1 / Math.cos(lat * D2R)));
      for (var c = 0; c < 240; c += step) {
        var i = r * 240 + c;
        if ((bin.charCodeAt(i >> 3) >> (7 - (i & 7))) & 1) {
          var lon = -180 + (c + 0.5) * 1.5;
          list.push([lat, lon, classify(W, lon, lat)]);
        }
      }
    }
  } else {
    for (var k = 0; k < FIB_N; k++) {
      var la = Math.asin(1 - (2 * k + 1) / FIB_N) / D2R, lo = wrap(k * GOLD_DEG);
      var ci = classify(W, lo, la);
      if (ci >= 0) list.push([la, lo, ci]);
    }
  }
  // A country of the game too small for the grid still gets one dot, in its middle.
  var dotted = {};
  list.forEach(function (p) { dotted[p[2]] = 1; });
  W.countries.forEach(function (co) { if (co.iso && !dotted[co.i]) list.push([co.clat, co.clon, co.i]); });
  var s = pointSet(list);
  s.kind = kind;
  s.by = W.countries.map(function () { return []; });
  for (var j = 0; j < s.n; j++) if (s.c[j] >= 0) s.by[s.c[j]].push(j);
  // Who may be born or die here: countries with dots, by their share.
  s.pick = {};
  ['born', 'died'].forEach(function (kd) {
    var ids = [], cum = [], t = 0;
    W.countries.forEach(function (co) { if (co[kd] > 0 && s.by[co.i].length) { t += co[kd]; ids.push(co.i); cum.push(t); } });
    s.pick[kd] = { ids: ids, cum: cum, total: t };
  });
  W.sets[kind] = s;
  return s;
}

function unit(lat, lon) {
  var la = lat * D2R, lo = lon * D2R;
  return [Math.cos(la) * Math.cos(lo), Math.cos(la) * Math.sin(lo), Math.sin(la)];
}

// The country's dots up close: a hexagonal lattice on the plane that touches the planet at the
// country's middle (so it looks even once we look straight down), kept where the country is.
function fineSet(W, ci, spacing) {
  var co = W.countries[ci], c = unit(co.clat, co.clon);
  var la = co.clat * D2R, lo = co.clon * D2R;
  var e = [-Math.sin(lo), Math.cos(lo), 0], nn = [-Math.sin(la) * Math.cos(lo), -Math.sin(la) * Math.sin(lo), Math.cos(la)];
  var ext = Math.min(0.98, Math.sin(Math.min(1.45, co.angR + 0.12))), list = [], row = 0;
  for (var v = -ext; v <= ext; v += spacing * 0.866, row++) {
    for (var u = -ext + (row & 1 ? spacing / 2 : 0); u <= ext; u += spacing) {
      var d2 = u * u + v * v;
      if (d2 >= 0.995) continue;
      var w = Math.sqrt(1 - d2);
      var x = c[0] * w + e[0] * u + nn[0] * v, y = c[1] * w + e[1] * u + nn[1] * v, z = c[2] * w + e[2] * u + nn[2] * v;
      var lat = Math.asin(z) / D2R, lon = Math.atan2(y, x) / D2R;
      if (inCountry(W, ci, lon, lat)) list.push([lat, lon, ci]);
    }
  }
  return pointSet(list);
}

function svgImage(svg) {
  var img = new Image();
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  return img;
}

// A speech bubble and its tail in one outline.
function bubblePath(g, x, y, w, h, r, tipX, tipY) {
  var tx = Math.max(x + r + 7, Math.min(x + w - r - 7, tipX));
  g.beginPath();
  g.moveTo(x + r, y);
  g.lineTo(x + w - r, y);
  g.arcTo(x + w, y, x + w, y + r, r);
  g.lineTo(x + w, y + h - r);
  g.arcTo(x + w, y + h, x + w - r, y + h, r);
  g.lineTo(tx + 6, y + h);
  g.lineTo(tipX, tipY);
  g.lineTo(tx - 6, y + h);
  g.lineTo(x + r, y + h);
  g.arcTo(x, y + h, x, y + h - r, r);
  g.lineTo(x, y + r);
  g.arcTo(x, y, x + r, y, r);
  g.closePath();
}

// The country card's outline with its tail at tx (one path, drawn in its own svg).
function tipPath(tx) {
  var w = TIP_W - 1, h = TIP_H, r = 14, t = Math.max(r + 8, Math.min(TIP_W - r - 8, tx));
  return 'M' + (1 + r) + ' 1H' + (w - r) + 'A' + r + ' ' + r + ' 0 0 1 ' + w + ' ' + (1 + r) + 'V' + (h - r) +
    'A' + r + ' ' + r + ' 0 0 1 ' + (w - r) + ' ' + h + 'H' + (t + 8) + 'L' + tx + ' ' + (h + TIP_TAIL) + 'L' + (t - 8) + ' ' + h +
    'H' + (1 + r) + 'A' + r + ' ' + r + ' 0 0 1 1 ' + (h - r) + 'V' + (1 + r) + 'A' + r + ' ' + r + ' 0 0 1 ' + (1 + r) + ' 1Z';
}

// Short numbers: 63.3K, 1.4M, 1.44B (tight: 63K).
function abbr(n, tight) {
  var a = Math.abs(n), s = n < 0 ? '−' : '';
  var f = function (v, u) { return s + (v >= 100 || (tight && v >= 10) ? Math.round(v) : Math.round(v * 10) / 10) + u; };
  if (a >= 1e9) return f(a / 1e9, 'B');
  if (a >= 1e6) return f(a / 1e6, 'M');
  if (a >= 1e3) return f(a / 1e3, 'K');
  return s + (a >= 1 ? Math.round(a) : a > 0 ? '<1' : '0');
}
function oneIn(share) { return '1 in ' + Math.max(1, Math.round(1 / share)).toLocaleString('en-US'); }
// How good a start a country gives, 0..1: life expectancy, income (log), years at school and
// infants surviving, each between a low and a high, averaged.
function lifeScore(f) {
  var lin = function (v, a, b) { return Math.max(0, Math.min(1, (v - a) / (b - a))); };
  var lg = function (v, a, b) { return lin(Math.log(Math.max(1, v)), Math.log(a), Math.log(b)); };
  return (lin(f[1], 50, 85) + lg(f[3], 800, 100000) + lin(f[6], 6, 20) + (1 - lin(f[7], 2, 80))) / 4;
}
// The share of today's babies (by births) born where the start is worse than in this country.
function startRank(W, ci) {
  if (!W.rank) {
    var list = W.countries.filter(function (c) { return c.info && c.born > 0; }).map(function (c) { return { i: c.i, s: lifeScore(c.info), b: c.born }; });
    var total = list.reduce(function (t, c) { return t + c.b; }, 0);
    W.rank = {};
    list.forEach(function (c) {
      var below = 0;
      list.forEach(function (o) { if (o.s < c.s) below += o.b; else if (o.s === c.s && o.i !== c.i) below += o.b / 2; });
      W.rank[c.i] = below / total;
    });
  }
  return W.rank[ci] === undefined ? null : W.rank[ci];
}
// A fair start from the country's averages: the UN's Human Development Index pillars — a long
// life (life expectancy, 20..85), schooling (expected years, ..18) and money (income a person, log
// $100..$75K) — multiplied out (geometric mean), then the share of today's babies born where it is
// lower. The family (rich or poor, city or village) is not in it: that comes with the birth itself.
function hdi(f) {
  var c = function (v) { return Math.max(0.001, Math.min(1, v)); };
  return Math.cbrt(c((f[1] - 20) / 65) * c(f[6] / 18) * c((Math.log(Math.max(100, f[3])) - Math.log(100)) / (Math.log(75000) - Math.log(100))));
}
function fairStart(W, ci) {
  if (!W.fair) {
    var list = W.countries.filter(function (c) { return c.info && c.born > 0; }).map(function (c) { return { i: c.i, s: hdi(c.info), b: c.born }; });
    var total = list.reduce(function (t, c) { return t + c.b; }, 0);
    W.fair = {};
    list.forEach(function (c) {
      var below = 0;
      list.forEach(function (o) { if (o.s < c.s) below += o.b; else if (o.s === c.s && o.i !== c.i) below += o.b / 2; });
      W.fair[c.i] = below / total;
    });
  }
  return W.fair[ci] === undefined ? null : W.fair[ci];
}
// Safety from the country's averages, 0..1 (1 is calm): war (0–3, from 1.5 on the worst), murders
// (per 100k, log 1..40), malaria (0–1.5, from 1 on the worst) and HIV (% of adults, log 0.3..20).
function safetyOf(f) {
  var lin = function (v, a, b) { return Math.max(0, Math.min(1, (v - a) / (b - a))); };
  var lg = function (v, a, b) { return lin(Math.log(Math.max(0.01, v)), Math.log(a), Math.log(b)); };
  return 1 - (0.4 * lin(f[11], 0, 1.5) + 0.3 * lg(f[12], 1, 40) + 0.15 * lin(f[13], 0, 1) + 0.15 * lg(f[14], 0.3, 20));
}
// The start's four scales, each the share of today's babies (by births) born where it is lower:
// life (life expectancy), money (income a person), school (years at school) and safety (above).
// Luck is their average: the summary's total is the scales added up, nothing else.
function scalesOf(W, ci) {
  if (!W.scales) {
    var list = W.countries.filter(function (c) { return c.info && c.born > 0; });
    var total = list.reduce(function (t, c) { return t + c.born; }, 0);
    var keys = { life: function (f) { return f[1]; }, money: function (f) { return f[3]; }, school: function (f) { return f[6]; }, safety: safetyOf };
    W.scales = {};
    list.forEach(function (c) { W.scales[c.i] = {}; });
    Object.keys(keys).forEach(function (k) {
      var val = list.map(function (c) { return keys[k](c.info); });
      list.forEach(function (c, a) {
        var below = 0;
        list.forEach(function (o, b) { if (val[b] < val[a]) below += o.born; else if (val[b] === val[a] && b !== a) below += o.born / 2; });
        W.scales[c.i][k] = below / total;
      });
    });
    list.forEach(function (c) { var s = W.scales[c.i]; s.luck = (s.life + s.money + s.school + s.safety) / 4; });
  }
  return W.scales[ci] || null;
}
// "a new baby every 1.4 s / 12 min / 3 h".
function every(perDay) {
  if (!(perDay > 0)) return '—';
  var sec = 86400 / perDay;
  if (sec < 60) return (sec < 10 ? Math.round(sec * 10) / 10 : Math.round(sec)) + ' s';
  if (sec < 3600) return Math.round(sec / 60) + ' min';
  if (sec < 86400 * 2) return Math.round(sec / 3600) + ' h';
  return Math.round(sec / 86400) + ' days';
}

class Component extends DCLogic {
  opt(key, fallback) {
    var v = this.props[key];
    return v === undefined || v === null || v === '' ? fallback : v;
  }
  num(key, fallback) {
    var v = Number(this.opt(key, fallback));
    return isFinite(v) ? v : fallback;
  }
  target() {
    var w = this.num('width', 393), h = this.num('height', 852), s = this.num('size', 290);
    return { cx: this.num('cx', w / 2), cy: this.num('cy', h / 2), s: s };
  }
  // Where the planet is now (it glides when its place changes).
  geom() {
    var w = this.num('width', 393), h = this.num('height', 852), g = this.geo || this.target();
    return { w: w, h: h, s: g.s, cx: g.cx, cy: g.cy, R0: g.s / 2 - g.s * 0.06 };
  }
  mode() { return this.opt('mode', 'hub'); }
  set() { return landSet(this.W, this.opt('grid', 'even') === 'old' ? 'old' : 'even'); }
  point(key, fallback) {
    var v = String(this.opt(key, '')).split(',');
    return v.length === 2 && isFinite(+v[0]) && isFinite(+v[1]) ? { x: +v[0], y: +v[1] } : fallback;
  }
  tell(type, payload) {
    var f = this.props.report, bus = this.props.bus;
    setTimeout(function () {
      if (typeof f === 'function') f(type, payload);
      if (bus && typeof bus.emit === 'function') bus.emit(type, payload);
    }, 0);
  }

  // The game's own names of the countries (in its language): { ISO: [name, short] }.
  applyNames() {
    var names = this.props.names;
    if (!names || names === this.namesDone || !this.W) return;
    this.namesDone = names;
    this.W.countries.forEach(function (c) { var n = c.iso && names[c.iso]; if (n) { c.name = n[0]; c.short = n[1] || n[0]; } });
  }

  componentDidMount() {
    this.W = world();
    this.applyNames();
    this.set();
    this.geo = this.target();
    this.lon = -40;
    this.lat = 12;
    this.vel = 0;
    this.zoom = 1;
    this.diveP = 0;
    this.phase = 'idle';
    this.events = [];
    this.bubbles = [];
    this.fx = [];
    this.flyers = [];
    this.ptrs = {};
    this.nextB = 0.3;
    this.nextD = 0.6;
    this.lastBubble = 0;
    this.bornPending = this.mode() === 'roll' && (this.props.born === true || this.props.born === 'true');
    this.icons = { born: BABY_SVGS.map(svgImage), died: [svgImage(SKULL_SVG)], coin: svgImage(COIN_SVG), gem: svgImage(GEM_SVG) };
    var self = this, bus = this.props.bus;
    if (bus && typeof bus.on === 'function') this.unsub = bus.on(function (type, p) { if (type === 'cmd') self.command(p); });
    this.last = performance.now();
    // One clock for everything: the frame's own timestamp can lag behind the one taken in a handler.
    var loop = function () {
      self.frame(performance.now());
      self.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }
  componentWillUnmount() {
    cancelAnimationFrame(this.raf);
    clearTimeout(this.wheelEnd);
    clearTimeout(this.toastT);
    if (this.io) this.io.disconnect();
    if (this.unsub) this.unsub();
  }
  componentDidUpdate(prev) {
    if (!this.W) return;
    this.applyNames();
    var now = performance.now();
    if (prev.grid !== this.props.grid) {
      if (this.sel) this.deselect(now);
      if (this.dive) this.dive.cap = this.capFor(this.dive.ci);
    }
    if (prev.mode !== this.props.mode) this.reset();
    if (prev.fate !== this.props.fate) this.fateUsed = false;
    if (prev.cmd !== this.props.cmd && this.props.cmd) this.command(String(this.props.cmd).split('#')[0]);
    if (prev.cx !== this.props.cx || prev.cy !== this.props.cy || prev.size !== this.props.size) {
      var to = this.target(), ms = this.num('moveMs', 750);
      if (ms > 0) this.geoTw = { t0: now, dur: ms, from: Object.assign({}, this.geo), to: to };
      else { this.geoTw = null; this.geo = to; }
    }
  }

  // ---- what the host asks for ----
  command(name) {
    var now = performance.now();
    if (name === 'dive' && this.sel && this.phase === 'idle') this.startDive(this.sel.ci, false, now);
    else if (name === 'undive' && this.phase === 'dived') this.undive(now);
    else if (name === 'spin' && this.mode() === 'roll' && (this.phase === 'idle' || this.phase === 'undiving')) {
      // Spin! may come while a reroll is still pulling out: finish that at once and roll.
      if (this.phase === 'undiving') this.finishTween(now);
      this.startRoll(-(820 + Math.random() * 280), now);
    }
    else if (name === 'reset') this.reset();
    else if (name === 'reroll') this.reroll(now);
    else if (name === 'deselect') this.deselect(now, true);
    else if (name === 'hurry' && (this.phase === 'roll' || this.phase === 'landed' || this.phase === 'diving')) this.hurry(now);
  }
  finishTween(now) {
    var tw = this.tween;
    if (!tw) return;
    this.tween = null;
    this.applyDive(tw.p1);
    tw.done(now);
  }
  // Another roll: one move back out to the whole planet that also turns it to where a roll starts
  // (upright, tilted as at rest), so it is ready for Spin! the moment it is out. Only the first
  // roll keeps to `fate`.
  reroll(now) {
    if (this.phase !== 'dived' && this.phase !== 'landed' && this.phase !== 'diving') return;
    this.roll = null;
    this.marker = null;
    this.pin = null;
    this.tween = null;
    var d = this.dive;
    if (d) { d.lon0 = this.lon; d.dLon = 0; d.lat0 = 12; }
    this.undive(now, 560);
  }
  // A tap while the birth spins or dives in: the whole rest of it, quickly (the spin, the pause on
  // the country, the zoom), and the roll screen hears it ('hurry') to bring its summary up quickly.
  hurry(now) {
    var r = this.roll;
    if (!this.hurried) { this.hurried = true; this.tell('hurry', true); }
    if (r && !r.zoomed) {
      // Whole turns left are dropped (the same place, sooner); what is left plays out in 0.45 s.
      var end = r.lon0 + r.D, left = end - this.lon, dir = left < 0 ? -1 : 1;
      left = dir * (Math.abs(left) % 360);
      r.lon0 = this.lon; r.D = left; r.lat0 = this.lat; r.t0 = now; r.T = 450;
    } else if (this.phase === 'landed') this.diveAt = now;
    else if (this.phase === 'diving' && this.tween) {
      var tw = this.tween;
      this.tween = { t0: now, dur: 260, p0: this.diveP, p1: tw.p1, done: tw.done };
      if (r) { var e = r.lon0 + r.D; r.lon0 = this.lon; r.D = e - this.lon; r.lat0 = this.lat; r.t0 = now; r.T = 260; }
    }
  }
  reset() {
    var now = performance.now();
    this.fateUsed = false;
    this.roll = null;
    this.marker = null;
    this.pin = null;
    this.gest = null;
    this.turn = null;
    this.deselect(now, true);
    if (this.dive || this.zoom > 1.001 || this.diveP > 0.001) this.undive(now);
    else this.phase = 'idle';
  }

  // ---- picking a country ----
  // The small card on the planet: the name, births and deaths a day, a magnifier to dive in.
  tipInfo(ci) {
    var co = this.W.countries[ci];
    return {
      on: true, name: co.name, size: Math.min(16, Math.floor(118 / Math.max(1, co.name.length * 0.55))) + 'px',
      born: abbr(co.born * 1000 / 365, true), died: abbr(co.died * 1000 / 365, true)
    };
  }
  // The country's page, once we are down on it: what the game knows about it.
  pageInfo(ci) {
    var co = this.W.countries[ci], share = co.born / this.W.totalBorn, f = co.info, bd = co.born * 1000 / 365, dd = co.died * 1000 / 365;
    var tiles = [
      { v: abbr(bd), k: 'born a day' }, { v: abbr(dd), k: 'pass a day' }, { v: every(bd), k: 'a new baby every' }
    ];
    if (f) tiles.push(
      { v: abbr(f[0] * 1000), k: 'people' }, { v: Math.round(f[1]) + ' yrs', k: 'life expectancy' }, { v: Math.round(f[2] * 10) / 10 + '', k: 'kids per woman' },
      { v: '$' + abbr(f[3]), k: 'income a person' }, { v: Math.round(f[6]) + ' yrs', k: 'at school' }, { v: Math.round(f[4]) + '%', k: 'live in cities' }
    );
    else tiles.push({ v: (bd - dd >= 0 ? '+' : '') + abbr(bd - dd), k: 'more people a day' });
    return {
      on: true, name: co.name, size: Math.min(38, Math.floor(330 / Math.max(1, co.name.length * 0.6))) + 'px',
      chance: share > 0 ? oneIn(share) + ' babies in the world is born here' : 'Hardly anyone is born here',
      tiles: tiles
    };
  }
  info(ci, city) {
    var co = this.W.countries[ci];
    // stats: the game's [people (k), life expectancy, kids per woman, income $, urban %, online %,
    // years at school, infants dying per 1000], when it has the country; better: the share of
    // today's babies born where life starts worse; fair: the same by the UN's three pillars.
    return { iso: co.iso, name: co.name, short: co.short, bornDay: co.born * 1000 / 365, diedDay: co.died * 1000 / 365, share: co.born / this.W.totalBorn, city: city ? city.n : '', stats: co.info || null, better: startRank(this.W, ci), fair: fairStart(this.W, ci), scales: scalesOf(this.W, ci) };
  }
  select(ci, lat, lon, now) {
    // How far each dot of the country is from the finger, for the wave of light.
    var S = this.set(), t = unit(lat, lon), d = new Float32Array(S.n), list = S.by[ci];
    for (var k = 0; k < list.length; k++) {
      var j = list[k], dotp = S.cl[j] * S.co[j] * t[0] + S.cl[j] * S.so[j] * t[1] + S.sl[j] * t[2];
      d[j] = Math.acos(Math.max(-1, Math.min(1, dotp)));
    }
    this.sel = { ci: ci, t0: now, d: d };
    this.turnTo(ci, now);
    this.setState({ tip: this.tipInfo(ci) });
    this.tell('pick', this.info(ci, null));
  }
  // The planet turns the country to the middle, a little low, so its card fits above it.
  turnTo(ci, now) {
    var co = this.W.countries[ci];
    this.turn = { t0: now, dur: 550, lon0: this.lon, lat0: this.lat, lon1: this.lon + wrap(co.clon - this.lon), lat1: Math.max(-60, Math.min(60, co.clat + 10)) };
    this.vel = 0;
  }
  deselect(now, silent) {
    if (!this.sel || this.sel.out) return;
    this.sel.out = now;
    this.turn = null;
    this.setState({ tip: null });
    if (!silent) this.tell('pick', null);
  }

  // ---- diving into a country ----
  capFor(ci) {
    var co = this.W.countries[ci], c = unit(co.clat, co.clon), lim = Math.cos(co.angR + 0.12), S = this.set();
    var cap = new Uint8Array(S.n), list = S.by[ci];
    for (var k = 0; k < list.length; k++) {
      var j = list[k];
      if (S.cl[j] * S.co[j] * c[0] + S.cl[j] * S.so[j] * c[1] + S.sl[j] * c[2] >= lim) cap[j] = 1;
    }
    return cap;
  }
  // How close the dive goes on a country, and its close-up (fine dots, cap): worked out ahead for a
  // roll (when the spin starts), else on the spot.
  diveZoom(ci) {
    var G = this.geom(), co = this.W.countries[ci];
    // `diveR`: the radius the country fits up close (150 px on the designs; less on a short phone).
    return Math.max(1.5, Math.min(24, this.num('diveR', 150) / (G.R0 * Math.sin(Math.max(0.004, co.angR)))));
  }
  closeUp(ci) {
    var G = this.geom(), Z = this.diveZoom(ci);
    return { ci: ci, Z: Z, cap: this.capFor(ci), fine: fineSet(this.W, ci, FINE_PX / (G.R0 * Z)) };
  }
  prepareDive(ci, roll) {
    var co = this.W.countries[ci];
    var near = roll && this.rollCloseUp && this.rollCloseUp.ci === ci ? this.rollCloseUp : this.closeUp(ci), Z = near.Z;
    this.rollCloseUp = null;
    this.turn = null;
    this.vel = 0;
    // `page: host` (the hub, 2026-11-04): the country looks as it does down on a roll (the land
    // colour) and the host screen shows its summary, so it hears the country as the roll's 'land'.
    var host = this.pageHost();
    this.dive = {
      ci: ci, Z: Z, roll: roll, color: roll || host ? COL.land : COL.pick, cap: near.cap, fine: near.fine,
      lon0: this.lon, lat0: this.lat, dLon: wrap(co.clon - this.lon), lat1: co.clat
    };
    if (!roll && host) this.tell('land', Object.assign(this.info(ci, null), { place: '' }));
  }
  // The country's page comes from the host screen (the hub's summary, as the roll's), not from here.
  pageHost() { return this.opt('page', 'own') === 'host'; }
  // p = 0 is the planet as it was, 1 the country up close; the turn comes first, the zoom after.
  applyDive(p) {
    var d = this.dive, s = 1 - Math.pow(1 - Math.min(1, p * 1.5), 2);
    this.diveP = p;
    this.lon = d.lon0 + d.dLon * s;
    this.lat = d.lat0 + (d.lat1 - d.lat0) * s;
    this.zoom = Math.exp(Math.log(d.Z) * p);
  }
  animateDive(p1, dur, done, now) {
    this.tween = { t0: now, dur: dur, p0: this.diveP, p1: p1, done: done };
  }
  startDive(ci, roll, now) {
    var self = this;
    this.prepareDive(ci, roll);
    this.phase = 'diving';
    this.tell('zoom', 'start');
    // A tap into a country from the hub (page: host) goes as briskly as a hurried roll.
    this.animateDive(1, roll ? (this.hurried ? 480 : 1300) : this.pageHost() ? 680 : 900, function (t) { self.landDive(t); }, now);
  }
  // Down on the country: its page comes up (in the hub) and births and deaths there get names.
  landDive(t) {
    this.phase = 'dived';
    if (this.dive.roll && this.marker) this.pin = { t0: t, lat: this.marker.lat, lon: this.marker.lon };
    this.seen = { born: 0, died: 0 };
    this.setState({ dived: true, page: this.dive.roll || this.pageHost() ? null : this.pageInfo(this.dive.ci), seen: this.seen, toast: '' });
    this.tell('dive', 'in');
  }
  undive(now, dur, after) {
    var self = this;
    if (!this.dive) { this.phase = 'idle'; this.zoom = 1; this.diveP = 0; if (after) after(); return; }
    this.phase = 'undiving';
    this.setState({ dived: false, page: null, toast: '' });
    this.animateDive(0, dur || 650, function () {
      self.phase = 'idle';
      self.dive = null;
      self.pin = null;
      self.marker = null;
      self.zoom = 1;
      if (after) after();
      self.tell('dive', 'out');
    }, now);
  }

  // ---- zooming with two fingers, the wheel or a double tap ----
  beginZoom(pt, now) {
    if (this.mode() !== 'hub') return false;
    if (this.phase === 'dived') { this.phase = 'zooming'; this.gest = { from: 1 }; this.setState({ dived: false, page: null, toast: '' }); return true; }
    if (this.phase !== 'idle') return false;
    var ci = this.countryAt(pt);
    if (ci < 0 && this.sel && !this.sel.out) ci = this.sel.ci;
    if (ci < 0) ci = this.countryAt(null);
    if (ci < 0) return false;
    if (!this.sel || this.sel.out || this.sel.ci !== ci) {
      var co = this.W.countries[ci];
      this.select(ci, co.clat, co.clon, now);
    }
    this.turn = null;
    this.prepareDive(ci, false);
    this.phase = 'zooming';
    this.gest = { from: 0 };
    this.tell('zoom', 'start');
    return true;
  }
  zoomBy(dp) {
    if (this.phase !== 'zooming' || !this.dive) return;
    this.applyDive(Math.max(0, Math.min(1, this.diveP + dp)));
  }
  endZoom(now) {
    if (this.phase !== 'zooming' || !this.gest) return;
    // Let go past a quarter of the way in (or still most of the way, coming out) and it finishes.
    var self = this, keep = this.diveP > (this.gest.from ? 0.7 : 0.25);
    this.gest = null;
    if (keep) {
      this.phase = 'diving';
      this.animateDive(1, 160 + 420 * (1 - this.diveP), function (t) { self.landDive(t); }, now);
    } else this.undive(now, 160 + 380 * this.diveP);
  }
  countryAt(pt) {
    var V = this.view, G = this.geom();
    if (!V) return -1;
    var x = pt ? pt.x : V.cx, y = pt ? pt.y : V.cy;
    var X = (x - V.cx) / V.R, Y = -(y - V.cy) / V.R, d2 = X * X + Y * Y;
    if (d2 >= 1 || Math.hypot(x - V.cx, y - V.cy) > G.R0 + 2) return -1;
    var Z = Math.sqrt(1 - d2), lat = Math.asin(V.cp * Y + V.sp * Z) / D2R;
    var lon = wrap(this.lon + Math.atan2(X, -V.sp * Y + V.cp * Z) / D2R);
    return classify(this.W, lon, lat);
  }

  // ---- the birth roll: the player flicks, the planet slows down on a country picked by births ----
  pickCountry(kind) {
    var P = this.set().pick[kind], x = Math.random() * P.total;
    for (var k = 0; k < P.cum.length; k++) if (x < P.cum[k]) return P.ids[k];
    return P.ids.length ? P.ids[P.ids.length - 1] : -1;
  }
  startRoll(v, now) {
    // `fate` ("India,Lucknow") rigs the first roll for the prototype's sample life; a reroll is free.
    var fate = this.fateUsed ? [] : String(this.opt('fate', '')).split(','), ci = findCountry(this.W, fate[0]);
    if (ci >= 0) this.fateUsed = true;
    if (ci < 0) ci = this.pickCountry('born');
    if (ci < 0) return;
    var co = this.W.countries[ci], dir = v < 0 ? -1 : 1;
    var d0 = dir > 0 ? ((co.clon - this.lon) % 360 + 360) % 360 : -(((this.lon - co.clon) % 360 + 360) % 360);
    // Eased out, the spin starts at the flick's speed: T = 3·distance / speed. Whole turns are added
    // until it lasts long enough to feel like a roll.
    var D = d0, T = 3 * Math.abs(D) / Math.abs(v), k = 0;
    while (T < 2.6 && k < 12) { k++; D = d0 + dir * 360 * k; T = 3 * Math.abs(D) / Math.abs(v); }
    var city = null;
    co.cities.forEach(function (c) { if (fate[1] && c.n.toLowerCase() === fate[1].toLowerCase()) city = c; });
    // A free roll lands on one of the country's cities; a rigged one whose city the planet does not
    // know (or a birth in the countryside) lands somewhere on the country's land.
    if (!city && co.cities.length && !fate[0]) city = rnd(co.cities);
    if (!city) {
      var S = this.set(), j = rnd(S.by[ci]);
      city = { n: '', lat: S.lat[j], lon: S.lon[j] };
    }
    this.deselect(now, true);
    this.vel = 0;
    this.hurried = false;
    // The close-up now, while the planet has not got going: none of it is left for the stop.
    this.rollCloseUp = this.closeUp(ci);
    this.roll = { t0: performance.now(), T: Math.min(6.5, T) * 1000, lon0: this.lon, D: D, lat0: this.lat, lat1: co.clat, ci: ci, city: city };
    this.phase = 'roll';
    this.centerCi = -2;
    this.tell('roll', null);
  }

  // One frame of the birth spin. Before it stops, the dive begins (it only zooms; the spin turns the
  // planet the rest of the way), so stopping and zooming in are one move with no pause: in the last
  // quarter of a spin (1.1 s at most), in the last half of one hurried by a tap.
  rollStep(now) {
    var r = this.roll, u = clamp01((now - r.t0) / r.T), ee = outCubic(u);
    this.lon = r.lon0 + r.D * ee;
    this.lat = r.lat0 + (r.lat1 - r.lat0) * ee;
    // The country under the middle of the planet names itself as it passes.
    var under = classify(this.W, wrap(this.lon), this.lat);
    if (under !== this.centerCi) {
      this.centerCi = under;
      if (under >= 0) this.tell('center', this.W.countries[under].short);
    }
    var lead = this.hurried ? r.T * 0.5 : Math.min(r.T * 0.25, 1100);
    if (!r.zoomed && now >= r.t0 + r.T - lead) {
      r.zoomed = true;
      var label = this.placeLabel(r.ci, r.city);
      this.marker = { t0: now, lat: r.city.lat, lon: r.city.lon, label: label };
      this.landCi = r.ci;
      this.tell('land', Object.assign(this.info(r.ci, r.city), { place: label }));
      this.startDive(r.ci, true, now);
      // The dive's own turn starts where the spin will stop (on the country), so it adds none.
      var d = this.dive;
      d.lon0 = r.lon0 + r.D; d.lat0 = r.lat1; d.dLon = wrap(this.W.countries[r.ci].clon - d.lon0);
    }
    if (u >= 1) this.roll = null;
  }

  // ---- every frame ----
  // The pin's label: the host's words for the rigged city (`pin-label`), else the city and country.
  placeLabel(ci, city) {
    var co = this.W.countries[ci], fate = String(this.opt('fate', '')).split(',');
    // The game's own words for the place whenever the roll was its (the country is the fated one).
    if (this.opt('pinLabel', '') && fate[0] && findCountry(this.W, fate[0]) === ci) return this.opt('pinLabel', '');
    return city.n ? city.n + ', ' + co.short : 'Somewhere in ' + co.short;
  }
  // `born`: a board that opens already born (down on the fated country, the pin in place), so the
  // born state can be looked at without rolling; a reroll from there works as usual.
  landNow(now) {
    var fate = String(this.opt('fate', '')).split(','), ci = findCountry(this.W, fate[0]);
    if (ci < 0) ci = this.pickCountry('born');
    if (ci < 0) return;
    this.fateUsed = true;
    var co = this.W.countries[ci], city = null;
    co.cities.forEach(function (c) { if (fate[1] && c.n.toLowerCase() === fate[1].toLowerCase()) city = c; });
    if (!city) city = co.cities[0] || { n: '', lat: co.clat, lon: co.clon };
    var label = this.placeLabel(ci, city);
    this.lon = co.clon;
    this.lat = co.clat;
    this.marker = { t0: now - 1000, lat: city.lat, lon: city.lon, label: label };
    this.tell('land', Object.assign(this.info(ci, city), { place: label }));
    this.prepareDive(ci, true);
    this.applyDive(1);
    this.landDive(now - 1000);
  }
  frame(now) {
    if (this.bornPending && this.W) { this.bornPending = false; this.landNow(now); }
    if (!this.canvas) return;
    // Off screen (an artboard scrolled away on the canvas) the planet rests and costs nothing.
    if (this.visible === false || this.props.asleep) { this.last = now; return; }
    var dt = Math.max(0, Math.min(0.05, (now - this.last) / 1000));
    this.last = now;
    this.update(now, dt);
    this.spawn(now, dt);
    this.draw(now, dt);
    this.place(now);
  }
  update(now, dt) {
    if (this.geoTw) {
      var gt = this.geoTw, gu = clamp01((now - gt.t0) / gt.dur), ge = GLIDE(gu);
      this.geo = { cx: gt.from.cx + (gt.to.cx - gt.from.cx) * ge, cy: gt.from.cy + (gt.to.cy - gt.from.cy) * ge, s: gt.from.s + (gt.to.s - gt.from.s) * ge };
      if (gu >= 1) this.geoTw = null;
    }
    if (this.tween) {
      var tw = this.tween, t = clamp01((now - tw.t0) / tw.dur);
      this.applyDive(tw.p0 + (tw.p1 - tw.p0) * inOut(t));
      // The zoom has begun while the spin slows down: the spin still turns the planet till it ends.
      if (this.roll) this.rollStep(now);
      if (t >= 1) { this.tween = null; tw.done(now); }
    } else if (this.roll) {
      this.rollStep(now);
    } else if (this.phase === 'landed') {
      if (now >= this.diveAt) this.startDive(this.landCi, true, now);
    } else if (this.turn) {
      var tn = this.turn, tu = clamp01((now - tn.t0) / tn.dur), te = outCubic(tu);
      this.lon = tn.lon0 + (tn.lon1 - tn.lon0) * te;
      this.lat = tn.lat0 + (tn.lat1 - tn.lat0) * te;
      if (tu >= 1) this.turn = null;
    } else if (!this.dragging && this.phase === 'idle') {
      // A picked country with its card open holds the planet still; otherwise it turns slowly and
      // coasts after a fling.
      var held = this.sel && !this.sel.out && !this.sel.cardOff;
      this.lon += ((held ? 0 : -SPIN) + this.vel) * dt;
      this.vel *= Math.pow(0.04, dt);
      if (!held) this.lat += (12 - this.lat) * Math.min(1, dt * 0.6);
    }
  }

  // ---- births and deaths, at the world's pace ----
  spawn(now, dt) {
    this.nextB -= dt;
    while (this.nextB <= 0) { this.nextB += -Math.log(1 - Math.random()) / WORLD.born; this.emit('born', now); }
    this.nextD -= dt;
    while (this.nextD <= 0) { this.nextD += -Math.log(1 - Math.random()) / WORLD.died; this.emit('died', now); }
  }
  emit(kind, now) {
    var bus = this.props.bus;
    if (bus) bus[kind] = (bus[kind] || 0) + 1;
    this.tell('event', kind);
    var ci = this.pickCountry(kind);
    if (ci < 0) return;
    var S = this.set(), src = S, j;
    if (this.dive && this.dive.ci === ci && this.dive.fine.n) { src = this.dive.fine; j = (Math.random() * src.n) | 0; }
    else j = rnd(S.by[ci]);
    var co = this.W.countries[ci];
    var ev = {
      kind: kind, ci: ci, sl: src.sl[j], cl: src.cl[j], so: src.so[j], co: src.co[j], t: 0,
      lucky: LUCKY_N > 0 && Math.random() < 1 / LUCKY_N, tone: (Math.random() * BABY_SVGS.length) | 0,
      name: rnd(co.pool), age: 92 - Math.floor(Math.random() * Math.random() * 60)
    };
    this.events.push(ev);
    if (this.events.length > 90) this.events.shift();
    // On the country's page: what happened there while you look (at the country's own pace).
    if (this.phase === 'dived' && this.dive && ci === this.dive.ci && this.seen) {
      this.seen[kind] += 1;
      this.setState({ seen: { born: this.seen.born, died: this.seen.died } });
    }
    this.offerBubble(ev, now);
  }
  screenOf(ev) {
    var V = this.view;
    if (!V) return null;
    var cd = ev.co * V.c0 + ev.so * V.s0, sd = ev.so * V.c0 - ev.co * V.s0;
    var x = ev.cl * sd, y = V.cp * ev.sl - V.sp * ev.cl * cd, z = V.sp * ev.sl + V.cp * ev.cl * cd;
    return { x: V.cx + V.R * x, y: V.cy - V.R * y, z: z };
  }
  caption(ev) {
    var co = this.W.countries[ev.ci];
    return ev.kind === 'born' ? ev.name + ' · ' + co.short : ev.name + ', ' + ev.age + ' · ' + co.short;
  }
  // Some flashes get a face (the planet) or a name (down on a country, at that country's pace).
  offerBubble(ev, now) {
    var dived = this.phase === 'dived' && this.dive && !this.dive.roll;
    var mode = dived ? 'names' : this.opt('events', 'icons');
    if (mode === 'dots') return;
    var icons = mode === 'icons', G = this.geom();
    if (this.dive && ev.ci !== this.dive.ci) return;
    if (this.phase !== 'idle' && this.phase !== 'dived') return;
    if (this.sel && !this.sel.out && !this.sel.cardOff) return;
    if (this.bubbles.length >= 3) return;
    if (now - this.lastBubble < (icons ? 520 : dived ? 450 : 1100)) return;
    var s = this.screenOf(ev);
    if (!s || s.z < 0.35 || s.x < 40 || s.x > G.w - 40 || s.y < 70 || s.y > G.h - 40) return;
    for (var k = 0; k < this.bubbles.length; k++) {
      var o = this.screenOf(this.bubbles[k].ev);
      if (o && Math.abs(o.x - s.x) < (icons ? 30 : 120) && Math.abs(o.y - s.y) < (icons ? 30 : 40)) return;
    }
    this.bubbles.push({ ev: ev, t0: now, icons: icons, text: icons ? '' : this.caption(ev), w: 0 });
    this.lastBubble = now;
  }

  // ---- catching a face or a name: a dollar flies to the wallet ----
  // The face or the bubble itself is the target (the dot under it is not), with room to spare, so a
  // finger after a face never lands on the country by mistake.
  tryCatch(pt, now) {
    var best = null, bd = 1e9;
    for (var k = 0; k < this.bubbles.length; k++) {
      var b = this.bubbles[k], h = b.hit;
      if (!h || b.ev.caught) continue;
      var dx = Math.abs(pt.x - h.x), dy = Math.abs(pt.y - h.y), d;
      if (b.icons) { d = Math.hypot(dx, dy); if (d > FACE_R) continue; }
      else { if (dx > h.hw + NAME_PAD || dy > h.hh + NAME_PAD) continue; d = dx + dy; }
      if (d < bd) { bd = d; best = b; }
    }
    if (!best) return false;
    var e = best.ev, reward = e.lucky ? 'gem' : 'coin', G = this.geom(), x = best.hit.x, y = best.hit.y;
    e.caught = now;
    this.bubbles.splice(this.bubbles.indexOf(best), 1);
    this.fx.push({ x: x, y: y, t0: now, lucky: e.lucky, kind: e.kind, text: best.icons ? '+1 ' + (e.kind === 'born' ? e.name : e.name + ', ' + e.age) : '+1' });
    var to = this.point(reward === 'gem' ? 'gemAt' : 'coinAt', { x: G.w - 40, y: 40 });
    this.flyers.push({ x: x, y: y - 6, to: to, t0: now + 160, reward: reward });
    return true;
  }

  // ---- drawing ----
  draw(now, dt) {
    var cv = this.canvas, G = this.geom();
    var dpr = Math.min(2, (window.devicePixelRatio || 1) * this.num('pixelScale', 1));
    var pw = Math.round(G.w * dpr), ph = Math.round(G.h * dpr);
    if (cv.width !== pw || cv.height !== ph) { cv.width = pw; cv.height = ph; }
    var g = cv.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, G.w, G.h);

    // Down on a country the view may sit higher than the planet did (`dive-y`, px), to leave room.
    var p = this.diveP, cx = G.cx, cy = G.cy + this.num('diveY', 0) * p, R0 = G.R0, R = R0 * this.zoom;
    var lam0 = this.lon * D2R, ph0 = this.lat * D2R;
    var V = this.view = { cx: cx, cy: cy, R: R, c0: Math.cos(lam0), s0: Math.sin(lam0), cp: Math.cos(ph0), sp: Math.sin(ph0) };
    var c0 = V.c0, s0 = V.s0, cp0 = V.cp, sp0 = V.sp;
    var clipR = R0 + (R + 12 - R0) * smooth(p, 0, 0.85);

    // The warm halo, gone once we are down on the country.
    if (p < 0.999) {
      var hr = G.s * 1.643 / 2, hg = g.createRadialGradient(cx, cy, 0, cx, cy, hr);
      HALO.forEach(function (st) { hg.addColorStop(st[0], st[1]); });
      g.globalAlpha = 1 - p;
      g.fillStyle = hg;
      g.fillRect(cx - hr, cy - hr, hr * 2, hr * 2);
      g.globalAlpha = 1;
    }

    g.save();
    g.beginPath();
    g.arc(cx, cy, clipR, 0, TAU);
    g.clip();

    // The sea fades away as we dive: the country is left on the paper.
    if (p < 0.999) {
      var sea = g.createRadialGradient(cx + LX * R * 0.55, cy - LY * R * 0.55, R * 0.05, cx, cy, R * 1.02);
      sea.addColorStop(0, COL.ocean);
      sea.addColorStop(1, COL.shade);
      g.globalAlpha = 1 - p;
      g.fillStyle = sea;
      g.beginPath();
      g.arc(cx, cy, R, 0, TAU);
      g.fill();
      g.globalAlpha = 1;
    }

    var S = this.set(), even = S.kind !== 'old';
    var base = 1.15 * R0 / 150 * (1 + (Math.min(this.zoom, 3) - 1) * 0.55);
    var dive = this.dive, sel = this.sel;
    var selA = 0, selT = 0;
    if (sel) {
      selT = (now - sel.t0) / 1000;
      selA = sel.out ? 1 - (now - sel.out) / 260 : 1;
      if (selA <= 0) { this.sel = sel = null; selA = 0; }
    }
    var others = new Path2D(), mine = new Path2D(), capped = new Path2D(), gold = new Path2D();
    var W = G.w, H = G.h, M = 12;
    // Round dots (an ellipse costs six times a circle); the tiniest as squares, which look the same.
    var dot = function (path, X, Y, r) {
      if (r < 0.75) path.rect(X - r, Y - r, r * 2, r * 2);
      else { path.moveTo(X + r, Y); path.arc(X, Y, r, 0, TAU); }
    };
    var waving = [];
    for (var i = 0; i < S.n; i++) {
      var sl = S.sl[i], cl = S.cl[i];
      var cd = S.co[i] * c0 + S.so[i] * s0;
      var z = sp0 * sl + cp0 * cl * cd;
      if (z <= 0.02) continue;
      var x = cl * (S.so[i] * c0 - S.co[i] * s0), y = cp0 * sl - sp0 * cl * cd;
      var X = cx + R * x, Y = cy - R * y;
      if (X < -M || X > W + M || Y < -M || Y > H + M) continue;
      var light = x * LX + y * LY + z * LZ;
      var r = base * (0.3 + 1.3 * (light > 0 ? light : 0)) * (even ? 0.72 + 0.28 * z : 1), ci = S.c[i];
      if (dive && ci === dive.ci) dot(dive.cap[i] ? capped : mine, X, Y, r);
      else if (sel && ci === sel.ci) {
        var h = clamp01((selT - sel.d[i] * 0.8) / 0.25);
        if (h >= 1) dot(gold, X, Y, r);
        else if (h <= 0) dot(others, X, Y, r);
        else waving.push([X, Y, r, h]);
      } else dot(others, X, Y, r);
    }
    g.fillStyle = COL.land;
    g.globalAlpha = dive ? 1 - 0.84 * p : 1;
    g.fill(others);
    if (sel) {
      // The tapped country: a wave of gold from the finger, each dot popping as it turns.
      if (selA < 1) { g.globalAlpha = 1; g.fill(gold); }
      g.globalAlpha = selA;
      g.fillStyle = COL.pick;
      g.fill(gold);
      for (var w = 0; w < waving.length; w++) {
        var q = waving[w], one = new Path2D();
        dot(one, q[0], q[1], q[2] * (1 + 0.8 * Math.sin(Math.PI * q[3])));
        g.globalAlpha = 1;
        g.fillStyle = COL.land;
        g.fill(one);
        g.globalAlpha = q[3] * selA;
        g.fillStyle = COL.pick;
        g.fill(one);
      }
    }
    if (dive) {
      g.fillStyle = dive.color;
      g.globalAlpha = 1;
      g.fill(mine);
      g.globalAlpha = 1 - smooth(p, 0.2, 0.7);
      g.fill(capped);
      // Up close the country's dots split into finer ones.
      var fa = smooth(p, 0.3, 0.85);
      if (fa > 0) {
        var F = dive.fine, fine = new Path2D(), grow = Math.min(1, this.zoom / dive.Z);
        var fr = FINE_PX * 0.36 * (0.55 + 0.45 * grow);
        for (var f = 0; f < F.n; f++) {
          var fsl = F.sl[f], fcl = F.cl[f];
          var fcd = F.co[f] * c0 + F.so[f] * s0;
          var fz = sp0 * fsl + cp0 * fcl * fcd;
          if (fz <= 0.02) continue;
          var fx = fcl * (F.so[f] * c0 - F.co[f] * s0), fy = cp0 * fsl - sp0 * fcl * fcd;
          var FX = cx + R * fx, FY = cy - R * fy;
          if (FX < -M || FX > W + M || FY < -M || FY > H + M) continue;
          var fl = fx * LX + fy * LY + fz * LZ;
          dot(fine, FX, FY, fr * (0.6 + 0.6 * (fl > 0 ? fl : 0)));
        }
        g.globalAlpha = fa;
        g.fill(fine);
      }
    }
    g.globalAlpha = 1;

    if (p < 0.999) {
      var sh = g.createRadialGradient(cx + LX * R * 0.7, cy - LY * R * 0.7, R * 0.2, cx, cy, R * 1.05);
      sh.addColorStop(0, 'rgba(0,0,0,0)');
      sh.addColorStop(1, COL.night);
      g.globalAlpha = 1 - p;
      g.fillStyle = sh;
      g.beginPath();
      g.arc(cx, cy, R, 0, TAU);
      g.fill();
      g.globalAlpha = 1;
    }

    // The border of the country we look at.
    var lineCi = -1, lineA = 0;
    if (dive) { lineCi = dive.ci; lineA = Math.max(smooth(p, 0.45, 1), sel && sel.ci === dive.ci ? selA * 0.9 : 0); }
    else if (sel) { lineCi = sel.ci; lineA = 0.9 * selA * clamp01(selT / 0.4); }
    if (lineCi >= 0 && lineA > 0) this.outline(g, lineCi, V, lineA, dive ? 1.6 + 0.6 * p : 1.6);

    this.drawEvents(g, now, dt, p);
    this.drawMarker(g, now);
    g.restore();

    // The planet's edge grows with the dive and fades out.
    if (p < 0.999) {
      g.globalAlpha = 1 - smooth(p, 0, 0.6);
      g.strokeStyle = COL.rim;
      g.lineWidth = Math.max(1, R0 / 90);
      g.beginPath();
      g.arc(cx, cy, clipR, 0, TAU);
      g.stroke();
      g.globalAlpha = 1;
    }
    this.drawRipple(g, now);
    this.drawBubbles(g, now, G);
    this.drawCatch(g, now);
  }

  outline(g, ci, V, alpha, width) {
    var rings = this.W.shapes[ci];
    g.save();
    g.globalAlpha = alpha;
    g.strokeStyle = COL.line;
    g.lineWidth = width;
    g.lineJoin = 'round';
    g.lineCap = 'round';
    g.beginPath();
    for (var k = 0; k < rings.length; k++) {
      var pts = rings[k].p, pen = false, n = pts.length / 2;
      for (var a = 0; a <= n; a++) {
        var b = (a % n) * 2, la = pts[b + 1] * D2R, lo = pts[b] * D2R;
        if (Math.abs(pts[b + 1]) >= 89.9) { pen = false; continue; }
        var sl = Math.sin(la), cl = Math.cos(la), so = Math.sin(lo), co = Math.cos(lo);
        var cd = co * V.c0 + so * V.s0, sd = so * V.c0 - co * V.s0;
        var z = V.sp * sl + V.cp * cl * cd;
        if (z <= 0) { pen = false; continue; }
        var X = V.cx + V.R * cl * sd, Y = V.cy - V.R * (V.cp * sl - V.sp * cl * cd);
        if (pen) g.lineTo(X, Y); else g.moveTo(X, Y);
        pen = true;
      }
    }
    g.stroke();
    g.restore();
  }

  drawEvents(g, now, dt, p) {
    var dive = this.dive;
    for (var k = this.events.length - 1; k >= 0; k--) {
      var ev = this.events[k];
      ev.t += dt / 1.8;
      if (ev.t >= 1) { this.events.splice(k, 1); continue; }
      if (ev.caught) continue;
      var s = this.screenOf(ev);
      if (!s || s.z <= 0.1) continue;
      var a = (1 - ev.t) * s.z * (dive && ev.ci !== dive.ci ? 1 - 0.85 * p : 1);
      var col = ev.lucky ? COL.gold : ev.kind === 'born' ? COL.born : COL.died;
      // No rings: a birth is a dot that pops up and fades, a death a dot that shrinks away; a soft
      // glow under each, so it still reads on the busy land.
      var r = ev.kind === 'born' ? 3 * outCubic(Math.min(1, ev.t / 0.16)) * (1 - 0.25 * ev.t) : 3 * (1 - 0.8 * ev.t);
      g.fillStyle = col;
      g.globalAlpha = a * 0.22;
      g.beginPath();
      g.arc(s.x, s.y, r * 2.1, 0, TAU);
      g.fill();
      g.globalAlpha = a;
      g.beginPath();
      g.arc(s.x, s.y, r, 0, TAU);
      g.fill();
      if (ev.lucky) {
        // A golden one twinkles: a little four-point star turning beside it.
        var sp = 6 + 3 * Math.sin(now / 90), ang = now / 300;
        g.globalAlpha = a;
        g.fillStyle = '#ffffff';
        for (var m = 0; m < 4; m++) {
          var aa = ang + m * Math.PI / 2;
          g.beginPath();
          g.arc(s.x + Math.cos(aa) * sp, s.y + Math.sin(aa) * sp, 1.1, 0, TAU);
          g.fill();
        }
      }
    }
    g.globalAlpha = 1;
  }

  drawMarker(g, now) {
    var m = this.marker;
    if (!m) return;
    var s = this.screenOf({ sl: Math.sin(m.lat * D2R), cl: Math.cos(m.lat * D2R), so: Math.sin(m.lon * D2R), co: Math.cos(m.lon * D2R) });
    if (!s || s.z <= 0) return;
    var a = clamp01((now - m.t0) / 300), phase = (now / 1600) % 1;
    g.strokeStyle = COL.born;
    g.lineWidth = 1.5;
    for (var k = 0; k < 2; k++) {
      var pt = (phase + k * 0.5) % 1;
      g.globalAlpha = a * (1 - pt);
      g.beginPath();
      g.arc(s.x, s.y, 5 + pt * 20, 0, TAU);
      g.stroke();
    }
    var pin = this.pin;
    if (!pin) {
      g.globalAlpha = a;
      g.fillStyle = COL.born;
      g.beginPath();
      g.arc(s.x, s.y, 5.5, 0, TAU);
      g.fill();
      g.lineWidth = 2;
      g.strokeStyle = COL.ring;
      g.stroke();
      g.globalAlpha = 1;
      return;
    }
    // The pin drops in with a bounce once we are down on the country.
    var u = clamp01((now - pin.t0) / 520), lift = 46 * (1 - backOut(u));
    var X = s.x, Y = s.y - lift;
    g.globalAlpha = 0.28 * u;
    g.fillStyle = COL.dark;
    g.beginPath();
    g.ellipse(s.x, s.y + 1, 7, 2.6, 0, 0, TAU);
    g.fill();
    g.globalAlpha = Math.min(1, u * 3);
    g.beginPath();
    g.moveTo(X, Y);
    g.bezierCurveTo(X - 3, Y - 7, X - 11, Y - 13, X - 11, Y - 22);
    g.arc(X, Y - 22, 11, Math.PI, 0);
    g.bezierCurveTo(X + 11, Y - 13, X + 3, Y - 7, X, Y);
    g.closePath();
    g.fillStyle = COL.born;
    g.fill();
    g.lineWidth = 2;
    g.lineJoin = 'round';
    g.strokeStyle = COL.line;
    g.stroke();
    g.beginPath();
    g.arc(X, Y - 22, 4.2, 0, TAU);
    g.fillStyle = COL.ring;
    g.fill();
    // The place, in a little bubble over the pin's head, once the pin has landed.
    var lu = clamp01((now - pin.t0 - 380) / 260);
    if (m.label && lu > 0) {
      var G = this.geom(), pop = backOut(lu);
      g.save();
      g.globalAlpha = Math.min(1, lu * 2);
      g.font = '600 14px Fredoka, Rubik, system-ui, sans-serif';
      var w = Math.ceil(g.measureText(m.label).width) + 24, h = 28, tipY = Y - 37;
      var bx = Math.max(8, Math.min(G.w - 8 - w, X - w / 2)), by = tipY - 7 - h;
      g.translate(X, tipY);
      g.scale(pop, pop);
      g.translate(-X, -tipY);
      bubblePath(g, bx, by, w, h, 11, X, tipY);
      g.fillStyle = COL.paper;
      g.fill();
      g.lineWidth = 2;
      g.lineJoin = 'round';
      g.strokeStyle = COL.line;
      g.stroke();
      g.fillStyle = COL.ink;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(m.label, bx + w / 2, by + h / 2 + 0.5);
      g.textAlign = 'start';
      g.restore();
    }
    g.globalAlpha = 1;
  }

  drawRipple(g, now) {
    var rp = this.ripple;
    if (!rp) return;
    var t = (now - rp.t0) / 520;
    if (t >= 1) { this.ripple = null; return; }
    g.globalAlpha = 1 - t;
    g.strokeStyle = rp.land ? COL.pick : '#ffffff';
    g.lineWidth = 2.5 * (1 - t) + 0.5;
    g.beginPath();
    g.arc(rp.x, rp.y, 4 + 26 * (1 - Math.pow(1 - t, 2)), 0, TAU);
    g.stroke();
    g.globalAlpha = 1;
  }

  drawBubbles(g, now, G) {
    for (var k = this.bubbles.length - 1; k >= 0; k--) {
      var b = this.bubbles[k], life = b.icons ? 2.4 : 2.8, u = (now - b.t0) / 1000 / life;
      b.hit = null;
      if (u >= 1) { this.bubbles.splice(k, 1); continue; }
      var s = this.screenOf(b.ev);
      if (!s) continue;
      var a = Math.min(1, (1 - u) * life / 0.45) * clamp01((s.z - 0.08) / 0.2);
      if (this.dive && b.ev.ci !== this.dive.ci) a = 0;
      if (this.sel && !this.sel.out && !this.sel.cardOff) a *= 0.25;
      if (a <= 0) continue;
      var pop = backOut(clamp01((now - b.t0) / 280));
      var img = b.ev.kind === 'born' ? this.icons.born[b.ev.tone] : this.icons.died[0];
      g.save();
      g.globalAlpha = a;
      if (b.icons) {
        // Just the face, rising slowly from the dot; the face is what a tap catches.
        var rise = 8 + 20 * u, sz = 24 * pop;
        if (img.complete) g.drawImage(img, s.x - sz / 2, s.y - rise - sz, sz, sz);
        if (a > 0.35) b.hit = { x: s.x, y: s.y - rise - 12 };
      } else {
        g.font = '600 12px Fredoka, Rubik, system-ui, sans-serif';
        if (!b.w) b.w = Math.ceil(g.measureText(b.text).width) + 40;
        var w = b.w, h = 27, lift = 10 + 6 * u;
        var x = Math.max(8, Math.min(G.w - 8 - w, s.x - w / 2)), y = s.y - lift - h;
        g.translate(s.x, s.y);
        g.scale(pop, pop);
        g.translate(-s.x, -s.y);
        bubblePath(g, x, y, w, h, 11, s.x, s.y - 3);
        g.fillStyle = COL.paper;
        g.fill();
        g.lineWidth = 2;
        g.lineJoin = 'round';
        g.strokeStyle = COL.line;
        g.stroke();
        if (img.complete) g.drawImage(img, x + 5, y + 4, 19, 19);
        g.fillStyle = COL.ink;
        g.textBaseline = 'middle';
        g.fillText(b.text, x + 29, y + h / 2 + 0.5);
        if (a > 0.35) b.hit = { x: x + w / 2, y: y + h / 2, hw: w / 2, hh: h / 2 };
      }
      g.restore();
    }
  }

  // A caught flash bursts, "+1 Name" rises from it, and its coin or gem flies to the wallet.
  drawCatch(g, now) {
    for (var k = this.fx.length - 1; k >= 0; k--) {
      var f = this.fx[k], t = (now - f.t0) / 900;
      if (t >= 1) { this.fx.splice(k, 1); continue; }
      var col = f.lucky ? COL.gold : f.kind === 'born' ? COL.born : COL.died, b = clamp01(t / 0.45);
      g.globalAlpha = 1 - b;
      g.strokeStyle = col;
      g.lineWidth = 3 * (1 - b) + 0.5;
      g.beginPath();
      g.arc(f.x, f.y, 6 + 24 * outCubic(b), 0, TAU);
      g.stroke();
      g.fillStyle = f.lucky ? '#ffffff' : col;
      for (var m = 0; m < 6; m++) {
        var aa = m * Math.PI / 3 + 0.4, rr = 8 + 26 * outCubic(b);
        g.beginPath();
        g.arc(f.x + Math.cos(aa) * rr, f.y + Math.sin(aa) * rr, 2.2 * (1 - b), 0, TAU);
        g.fill();
      }
      g.globalAlpha = t < 0.75 ? 1 : (1 - t) / 0.25;
      g.font = '700 14px Fredoka, Rubik, system-ui, sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.lineJoin = 'round';
      g.lineWidth = 4;
      g.strokeStyle = COL.dark;
      var ty = f.y - 18 - 22 * outCubic(clamp01(t / 0.6));
      g.strokeText(f.text, f.x, ty);
      g.fillStyle = '#ffffff';
      g.fillText(f.text, f.x, ty);
      g.textAlign = 'start';
    }
    for (var j = this.flyers.length - 1; j >= 0; j--) {
      var fl = this.flyers[j], u = (now - fl.t0) / 620;
      if (u < 0) continue;
      if (u >= 1) {
        this.flyers.splice(j, 1);
        var bus = this.props.bus;
        if (bus) bus[fl.reward + 's'] = (bus[fl.reward + 's'] || 0) + 1;
        this.tell('catch', fl.reward);
        continue;
      }
      var e = u * u, mx = (fl.x + fl.to.x) / 2 - 30, my = Math.min(fl.y, fl.to.y) - 50;
      var px = (1 - e) * (1 - e) * fl.x + 2 * (1 - e) * e * mx + e * e * fl.to.x;
      var py = (1 - e) * (1 - e) * fl.y + 2 * (1 - e) * e * my + e * e * fl.to.y;
      var img = this.icons[fl.reward], sz = 26 - 8 * e;
      g.globalAlpha = 1;
      if (img.complete) g.drawImage(img, px - sz / 2, py - sz / 2, sz, sz);
    }
    g.globalAlpha = 1;
  }

  // The country's card rides on the planet, its tail on the country's middle.
  place(now) {
    var el = this.tipEl;
    if (el) {
      var sel = this.sel, a = 0, x = 0, y = 0, tx = TIP_W / 2;
      if (sel && !sel.out && !sel.cardOff && this.phase === 'idle' && this.view) {
        var co = this.W.countries[sel.ci];
        var s = this.screenOf({ sl: Math.sin(co.clat * D2R), cl: Math.cos(co.clat * D2R), so: Math.sin(co.clon * D2R), co: Math.cos(co.clon * D2R) });
        var G = this.geom();
        if (s) {
          a = clamp01((s.z - 0.1) / 0.25) * clamp01((now - sel.t0 - 120) / 220);
          x = Math.max(6, Math.min(G.w - TIP_W - 6, s.x - TIP_W / 2));
          y = Math.max(4, s.y - TIP_H - TIP_TAIL - 4);
          tx = Math.round(s.x - x);
        }
      }
      el.style.opacity = a.toFixed(3);
      el.style.visibility = a > 0.02 ? 'visible' : 'hidden';
      el.style.transform = 'translate(' + x.toFixed(1) + 'px, ' + y.toFixed(1) + 'px) scale(' + (0.92 + 0.08 * a).toFixed(3) + ')';
      el.style.transformOrigin = tx + 'px ' + (TIP_H + TIP_TAIL) + 'px';
      if (this.tipPathEl && tx !== this.tipTx) { this.tipTx = tx; this.tipPathEl.setAttribute('d', tipPath(tx)); }
    }
  }

  // ---- touch ----
  local(e) {
    var r = this.canvas.getBoundingClientRect(), G = this.geom();
    var k = r.width ? G.w / r.width : 1;
    return { x: (e.clientX - r.left) * k, y: (e.clientY - r.top) * k };
  }
  tap(pt, now) {
    var mode = this.mode(), last = this.lastTap;
    this.lastTap = { x: pt.x, y: pt.y, t: now };
    // Flashes are caught only where the wallet is (the hub).
    if (mode === 'hub' && (this.phase === 'idle' || this.phase === 'dived') && this.tryCatch(pt, now)) return;
    // (Two quick taps used to dive in and out, the wheel and a pinch to zoom: gone, 2026-11-05. The
    // only way down to a country is its card's "!" button; back is the host's back button.)
    if (mode !== 'hub' || this.phase !== 'idle') return;
    var ci = this.countryAt(pt), V = this.view;
    var inside = V && Math.hypot(pt.x - V.cx, pt.y - V.cy) < this.geom().R0;
    if (inside) this.ripple = { x: pt.x, y: pt.y, t0: now, land: ci >= 0 };
    if (ci < 0) { this.deselect(now); return; }
    // The same country again brings its card back (it hides while the planet is turned by hand).
    if (this.sel && !this.sel.out && this.sel.ci === ci) {
      if (this.sel.cardOff) { this.sel.cardOff = false; this.sel.t0 = now - 2000; this.turnTo(ci, now); }
      return;
    }
    var X = (pt.x - V.cx) / V.R, Y = -(pt.y - V.cy) / V.R, Z = Math.sqrt(Math.max(0, 1 - X * X - Y * Y));
    var lat = Math.asin(V.cp * Y + V.sp * Z) / D2R, lon = wrap(this.lon + Math.atan2(X, -V.sp * Y + V.cp * Z) / D2R);
    this.select(ci, lat, lon, now);
  }

  renderVals() {
    var self = this;
    if (!this.handlers) {
      var pinchD = function () {
        var ids = Object.keys(self.ptrs);
        if (ids.length < 2) return 0;
        var a = self.ptrs[ids[0]], b = self.ptrs[ids[1]];
        return Math.hypot(a.x - b.x, a.y - b.y);
      };
      this.handlers = {
        setCanvas: function (el) {
          if (el && el !== self.canvas && typeof IntersectionObserver === 'function') {
            if (self.io) self.io.disconnect();
            self.io = new IntersectionObserver(function (list) { self.visible = list[list.length - 1].isIntersecting; });
            self.io.observe(el);
          }
          // No zooming with the wheel (2026-11-05): the listener stays switched off by ZOOM_GESTURES.
          if (el && el !== self.canvas && ZOOM_GESTURES) {
            el.addEventListener('wheel', function (e) {
              if (!self.W || self.mode() !== 'hub') return;
              var pt = self.local(e), V = self.view, G = self.geom();
              var over = self.phase === 'dived' || self.phase === 'zooming' || (V && Math.hypot(pt.x - V.cx, pt.y - V.cy) < G.R0);
              if (!over) return;
              e.preventDefault();
              var now = performance.now();
              if (self.phase !== 'zooming' && !self.beginZoom(pt, now)) return;
              // A wheel notch (100) goes a third of the way; a trackpad pinch comes as ctrl + wheel.
              var dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
              self.zoomBy(-dy * (e.ctrlKey ? 0.022 : 0.0034));
              clearTimeout(self.wheelEnd);
              self.wheelEnd = setTimeout(function () { self.endZoom(performance.now()); }, 140);
            }, { passive: false });
          }
          self.canvas = el;
        },
        setTip: function (el) { self.tipEl = el; self.tipTx = null; },
        setTipPath: function (el) { self.tipPathEl = el; self.tipTx = null; },
        setBack: function (el) { self.backEl = el; },
        down: function (e) {
          if (!self.W) return;
          var pt = self.local(e), now = performance.now();
          self.ptrs[e.pointerId] = pt;
          if (e.currentTarget && e.currentTarget.setPointerCapture) {
            try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) {}
          }
          if (Object.keys(self.ptrs).length === 2) {
            // Two fingers: never a drag or a tap (and no pinch zoom any more, ZOOM_GESTURES).
            self.dragging = false;
            self.tapOK = false;
            var ids = Object.keys(self.ptrs), a = self.ptrs[ids[0]], b = self.ptrs[ids[1]];
            if (ZOOM_GESTURES && self.beginZoom({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, now)) self.pinch = pinchD();
            return;
          }
          self.tapOK = true;
          self.p0 = pt;
          self.tDown = now;
          self.moved = 0;
          // A tap anywhere while the birth spins (or dives in) hurries it along.
          if (self.phase === 'roll' || self.phase === 'landed' || self.phase === 'diving') { self.tapOK = false; self.hurry(now); return; }
          if (self.phase !== 'idle') return;
          // Not a drag yet: the planet keeps turning (and coasting) until the finger really moves, so
          // quick taps on faces never jolt it.
          self.pending = true;
          self.px = pt.x;
          self.py = pt.y;
          self.pt = now;
        },
        move: function (e) {
          if (!self.ptrs[e.pointerId]) return;
          var pt = self.local(e);
          self.ptrs[e.pointerId] = pt;
          if (self.pinch) {
            var d = pinchD();
            if (d > 0 && self.dive) self.zoomBy(Math.log(d / self.pinch) / Math.log(self.dive.Z));
            self.pinch = d || self.pinch;
            return;
          }
          if (self.p0) self.moved = Math.max(self.moved, Math.hypot(pt.x - self.p0.x, pt.y - self.p0.y));
          if (self.pending && !self.dragging) {
            if (self.moved < 7) return;
            // Now it is the player's hand on the planet (the screen may put its hint away).
            self.pending = false;
            self.dragging = true;
            self.vel = 0;
            self.turn = null;
            self.px = pt.x;
            self.py = pt.y;
            self.pt = performance.now();
            self.tell('touch', null);
            return;
          }
          if (!self.dragging) return;
          // Turning the planet by hand puts the country's card away; the country stays lit.
          if (self.moved > 8 && self.sel && !self.sel.out) self.sel.cardOff = true;
          var G = self.geom(), R = G.R0 * (self.zoom || 1);
          var now = performance.now(), dts = Math.max(0.008, (now - self.pt) / 1000);
          var dLon = -(pt.x - self.px) / R / D2R;
          self.lon += dLon;
          self.lat = Math.max(-60, Math.min(60, self.lat + (pt.y - self.py) / R / D2R));
          self.vel = 0.5 * self.vel + 0.5 * dLon / dts;
          self.px = pt.x;
          self.py = pt.y;
          self.pt = now;
        },
        up: function (e) {
          if (!self.ptrs[e.pointerId]) return;
          var pt = self.local(e), now = performance.now();
          delete self.ptrs[e.pointerId];
          if (self.pinch) {
            if (Object.keys(self.ptrs).length < 2) { self.pinch = 0; self.endZoom(now); }
            return;
          }
          var wasDrag = self.dragging;
          self.dragging = false;
          self.pending = false;
          if (self.tapOK && !wasDrag && self.moved < 8 && now - self.tDown < 400) { self.tap(pt, now); return; }
          if (!wasDrag) return;
          if (now - self.pt > 90) self.vel = 0;
          if (self.mode() === 'roll' && Math.abs(self.vel) >= FLICK) self.startRoll(self.vel, now);
        },
        cancel: function (e) {
          delete self.ptrs[e.pointerId];
          self.dragging = false;
          if (self.pinch && Object.keys(self.ptrs).length < 2) { self.pinch = 0; self.endZoom(performance.now()); }
        },
        dive: function () { self.command('dive'); },
        back: function () { self.command('undive'); },
        // A rewarded ad will let the player be born here; for now it only says so.
        bornHere: function () {
          if (!self.dive) return;
          var co = self.W.countries[self.dive.ci];
          self.tell('bornHere', self.info(self.dive.ci, null));
          self.setState({ toast: 'Ads come later: you’d watch one and be born in ' + co.short + '.' });
          clearTimeout(self.toastT);
          self.toastT = setTimeout(function () { self.setState({ toast: '' }); }, 2600);
        }
      };
    }
    var st = this.state || {}, w = this.num('width', 393), h = this.num('height', 852), mode = this.mode();
    var tip = st.tip || { on: false, name: '', size: '16px', born: '', died: '' };
    var G = this.geom(), T = this.target(), R0 = T.s / 2 - T.s * 0.06;
    var page = st.page || { on: false, name: '', size: '38px', chance: '', tiles: [] }, seen = st.seen || { born: 0, died: 0 };
    return {
      w: w,
      h: h,
      label: mode === 'roll' ? 'The planet. Flick it to spin it and be born where it stops.' : 'The planet. Pink flashes are births, violet ones deaths; tap one to catch it. Tap a country to see its numbers.',
      setCanvas: this.handlers.setCanvas,
      setTip: this.handlers.setTip,
      setTipPath: this.handlers.setTipPath,
      setBack: this.handlers.setBack,
      down: this.handlers.down,
      move: this.handlers.move,
      up: this.handlers.up,
      cancel: this.handlers.cancel,
      tip: { on: !!tip.on, name: tip.name, size: tip.size, born: tip.born, died: tip.died, d: tipPath(TIP_W / 2), dive: this.handlers.dive },
      // The country's page: a header (back to the planet, the name) above the country, its numbers
      // and the rewarded "be born here" under it.
      page: {
        on: !!st.dived && !!page.on && mode === 'hub' && !this.pageHost(), name: page.name, size: page.size, chance: page.chance, tiles: page.tiles,
        seen: seen.born || seen.died ? 'While you look: ' + seen.born + ' born · ' + seen.died + ' passed' : 'Births and deaths here come at this country’s own pace.',
        top: Math.max(92, T.cy - R0 - 78), low: T.cy + R0 + 26,
        back: this.handlers.back, bornHere: this.handlers.bornHere, toast: st.toast || '', toastOn: !!st.toast
      },
      back: { on: false, go: this.handlers.back }
    };
  }
}

// The birth luck of a country by the game's id (0..1), or null when the planet has no figures for it.
function luckOf(iso) {
  var W = world(), ci = findCountry(W, iso), s = ci >= 0 ? scalesOf(W, ci) : null;
  return s ? s.luck : null;
}

export { Component as PlanetCore, world as planetWorld, WORLD as WORLD_RATES, luckOf };
