// Сборка человека из деталей — перенос алгоритма демо-генератора команды
// (character-art/demo/generator.html, разделы «atlases and layers», «assembly
// rules», «composing a person»). Порядок слоёв, перекраска ключевых цветов,
// заливка щелей под волосами и убором, скрытие волос под куфией и кепкой —
// без изменений. Отличия: состояние живёт в экземпляре Assembler, кэши
// ограничены по размеру, цвета приходят индексами (types.ts).
import type { Appearance, BodyAppearance, Manifest, RGB, Rect } from './types';

const hex = (h: string): RGB => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

/** Цвета генератора, которых нет в манифесте. */
export const SHOECOLS: RGB[] = ['#3B2A20', '#7A5236', '#1E1E22', '#E6E1D8', '#2F4A7A', '#8E3B46'].map(hex);
export const METALS: RGB[] = ['#C9A227', '#B8BCC4', '#C98B6B'].map(hex);
const WOOD = hex('#6B4A33');
const SOLE = hex('#EFE9DF');
const UNDER: RGB = [239, 233, 223];
/** Цвета волос: манифест + два цвета генератора (почти чёрный, рыжий). */
export const hairColours = (M: Manifest): RGB[] => [...M.hairs, hex('#15110F'), hex('#8E3B23')];

/** Низ свёртка младенца на холсте генератора (compose: shift = 756 - низ). */
export const BABY_FLOOR = 756;

const FACE_ORDER = ['age', 'details', 'beards', 'mouths', 'moustaches', 'noses', 'eyes', 'eyesChild', 'brows'] as const;
const COVERING = new Set(['hijab', 'dupatta', 'sikh_turban', 'gele', 'headscarf_wrap', 'grandmother_scarf']);
const ON_HAIR = new Set(['kufi_taqiyah', 'baseball_cap']);

type Layer = { img: ImageData; x: number; y: number; w: number; h: number };
type Colours = { tone: RGB; hair: RGB; pal: readonly RGB[]; hwPal: readonly RGB[]; shoeCol: RGB; accPal: readonly RGB[]; metal: RGB };
type Kind = 'body' | 'head' | 'face' | 'hair' | 'garment' | 'headwear' | 'baby' | 'shoe' | 'acc' | 'cane' | 'facc';

// Перекраска: слои пересэмплированы на холст, поэтому пиксель — смесь не более
// двух ключевых цветов; он раскладывается на лучшую пару и собирается из новых цветов пары.
function mix(r: number, g: number, b: number, keys: readonly RGB[], targets: readonly RGB[]): number {
  let best = 1e18, res = 0;
  for (let p = 0; p < keys.length; p++) for (let q = p; q < keys.length; q++) {
    const A = keys[p]!, B = keys[q]!;
    let t = 1;
    if (p !== q) {
      const dx = A[0] - B[0], dy = A[1] - B[1], dz = A[2] - B[2];
      t = ((r - B[0]) * dx + (g - B[1]) * dy + (b - B[2]) * dz) / (dx * dx + dy * dy + dz * dz);
      t = t < 0 ? 0 : t > 1 ? 1 : t;
    }
    const er = r - (B[0] + t * (A[0] - B[0])), eg = g - (B[1] + t * (A[1] - B[1])), eb = b - (B[2] + t * (A[2] - B[2])), e = er * er + eg * eg + eb * eb;
    if (e < best) {
      best = e;
      const TA = targets[p]!, TB = targets[q]!;
      res = (Math.round(TB[0] + t * (TA[0] - TB[0])) << 16) | (Math.round(TB[1] + t * (TA[1] - TB[1])) << 8) | Math.round(TB[2] + t * (TA[2] - TB[2]));
    }
  }
  return res;
}

function recolor(src: ImageData, keys: readonly RGB[], targets: readonly RGB[]): ImageData {
  const out = new ImageData(new Uint8ClampedArray(src.data), src.width, src.height), d = out.data, cache = new Map<number, number>();
  for (let i = 0; i < d.length; i += 4) {
    if (!d[i + 3]) continue;
    const ck = (d[i]! << 16) | (d[i + 1]! << 8) | d[i + 2]!;
    let v = cache.get(ck);
    if (v === undefined) { v = mix(d[i]!, d[i + 1]!, d[i + 2]!, keys, targets); cache.set(ck, v); }
    d[i] = v >> 16; d[i + 1] = (v >> 8) & 255; d[i + 2] = v & 255;
  }
  return out;
}

const copyLayer = (l: Layer): Layer => ({ ...l, img: new ImageData(new Uint8ClampedArray(l.img.data), l.w, l.h) });

export class Assembler {
  private readonly M: Manifest;
  private readonly atlas: (name: string) => CanvasImageSource | null;
  private readonly FW: number;
  private readonly FH: number;
  private readonly dataCache = new Map<string, Layer | null>();
  private readonly alphaCache = new Map<string, Uint8Array>();
  private readonly recCache = new Map<string, Layer | null>();
  private readonly scratch: HTMLCanvasElement;
  private readonly sg: CanvasRenderingContext2D;

  /** atlas(name) — загруженное изображение атласа тела (имя тела или 'babies'). */
  constructor(M: Manifest, atlas: (name: string) => CanvasImageSource | null) {
    this.M = M;
    this.atlas = atlas;
    this.FW = M.canvas.w;
    this.FH = M.canvas.h;
    this.scratch = document.createElement('canvas');
    const sg = this.scratch.getContext('2d');
    if (!sg) throw new Error('2D canvas недоступен');
    this.sg = sg;
  }

  /** Освободить промежуточные кэши (после пачки сборок). */
  trim(): void {
    this.dataCache.clear();
    this.alphaCache.clear();
    this.recCache.clear();
  }

  private info(body: string, key: string) {
    return body === 'babies' ? this.M.babies.find(b => b.id === key) : this.M.bodies[body]?.layers[key];
  }

  private layerData(body: string, key: string): Layer | null {
    const ck = body + '|' + key;
    const hit = this.dataCache.get(ck);
    if (hit !== undefined) return hit;
    const inf = this.info(body, key);
    const src = this.atlas(body);
    if (!inf || !src) { this.dataCache.set(ck, null); return null; }
    const [ax, ay, w, h] = inf.a;
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d', { willReadFrequently: true });
    if (!g) throw new Error('2D canvas недоступен');
    g.drawImage(src, ax, ay, w, h, 0, 0, w, h);
    const d: Layer = { img: g.getImageData(0, 0, w, h), x: inf.at[0], y: inf.at[1], w, h };
    this.dataCache.set(ck, d);
    return d;
  }

  /** Альфа одного слоя на весь холст. */
  private alphaFull(body: string, key: string): Uint8Array {
    const ck = body + '|' + key;
    const hit = this.alphaCache.get(ck);
    if (hit) return hit;
    const { FW, FH } = this;
    const d = this.layerData(body, key), a = new Uint8Array(FW * FH);
    if (d) for (let y = 0; y < d.h; y++) for (let x = 0; x < d.w; x++) {
      const cx = x + d.x, cy = y + d.y;
      if (cx >= 0 && cy >= 0 && cx < FW && cy < FH) a[cy * FW + cx] = d.img.data[(y * d.w + x) * 4 + 3]!;
    }
    this.alphaCache.set(ck, a);
    return a;
  }

  /** Альфа размещённого (возможно, обрезанного) слоя на весь холст. */
  private alphaOf(l: Layer): Uint8Array {
    const { FW, FH } = this;
    const a = new Uint8Array(FW * FH);
    for (let y = 0; y < l.h; y++) for (let x = 0; x < l.w; x++) {
      const cx = x + l.x, cy = y + l.y;
      if (cx >= 0 && cy >= 0 && cx < FW && cy < FH) a[cy * FW + cx] = l.img.data[(y * l.w + x) * 4 + 3]!;
    }
    return a;
  }

  private maps(kind: Kind, s: Colours): [RGB[], RGB[]] {
    const K = this.M.keys;
    switch (kind) {
      case 'body': return [[K.INK, K.SKIN, K.LIGHT], [K.INK, s.tone, UNDER]];
      case 'head': return [[K.INK, K.SKIN], [K.INK, s.tone]];
      case 'face': return [[K.INK, K.LIGHT, K.MOUTH, K.HAIR, K.SKIN], [K.INK, K.LIGHT, K.MOUTH, s.hair, s.tone]];
      case 'hair': return [[K.INK, K.HAIR, K.SKIN], [K.INK, s.hair, s.tone]];
      case 'garment': return [[K.INK, K.CLOTH1, K.CLOTH2, K.TRIM, K.LIGHT, K.SKIN], [K.INK, ...s.pal, s.pal[0]!]];
      case 'headwear': return [[K.INK, K.CLOTH1, K.CLOTH2, K.TRIM, K.LIGHT, K.SKIN], [K.INK, ...s.hwPal, s.hwPal[2]!]];
      case 'baby': return [[K.INK, K.CLOTH1, K.CLOTH2, K.TRIM, K.LIGHT, K.SKIN, K.MOUTH], [K.INK, ...s.pal, s.tone, K.MOUTH]];
      case 'shoe': return [[K.INK, K.SHOES, K.LIGHT, K.CLOTH1, K.CLOTH2, K.TRIM, K.SKIN], [K.INK, s.shoeCol, SOLE, s.pal[0]!, s.pal[1]!, s.pal[2]!, s.shoeCol]];
      case 'acc': return [[K.INK, K.METAL, K.CLOTH1, K.CLOTH2, K.TRIM, K.LIGHT, K.SKIN], [K.INK, s.metal, ...s.accPal, s.accPal[2]!]];
      case 'cane': return [[K.INK, K.SHOES, K.METAL, K.LIGHT, K.SKIN], [K.INK, WOOD, s.metal, K.LIGHT, WOOD]];
      case 'facc': return [[K.INK, K.METAL, K.LIGHT, K.SKIN, K.CLOTH1], [K.INK, s.metal, K.LIGHT, s.tone, s.metal]];
    }
  }

  private recolored(body: string, key: string, kind: Kind, colours: Colours): Layer | null {
    const [keys, targets] = this.maps(kind, colours);
    const ck = body + '|' + key + '|' + targets.map(c => c.join(',')).join(';');
    const hit = this.recCache.get(ck);
    if (hit !== undefined) return hit;
    const d = this.layerData(body, key);
    const r = d ? { img: recolor(d.img, keys, targets), x: d.x, y: d.y, w: d.w, h: d.h } : null;
    if (this.recCache.size > 400) this.recCache.clear();
    this.recCache.set(ck, r);
    return r;
  }

  private blit(g: CanvasRenderingContext2D, l: Layer | null | false | undefined): void {
    if (!l) return;
    this.scratch.width = l.w;
    this.scratch.height = l.h;
    this.sg.putImageData(l.img, 0, 0);
    g.drawImage(this.scratch, l.x, l.y);
  }

  // Части головы, которые убор отрезает от лица (кончик уха за хиджабом, подбородок под узлом), скрываются.
  private hidePokes(head: Layer, frontA: Uint8Array): Layer {
    const { FW, FH } = this;
    const w = head.w, h = head.h, d = head.img.data, vis = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const cx = x + head.x, cy = y + head.y;
      if (d[(y * w + x) * 4 + 3]! > 128 && !(cx >= 0 && cy >= 0 && cx < FW && cy < FH && frontA[cy * FW + cx]! >= 64)) vis[y * w + x] = 1;
    }
    const lab = new Int32Array(w * h).fill(-1), sizes: number[] = [];
    for (let s = 0; s < w * h; s++) {
      if (!vis[s] || lab[s]! >= 0) continue;
      let n = 0;
      const st = [s];
      lab[s] = sizes.length;
      while (st.length) {
        const i = st.pop()!;
        n++;
        const x = i % w;
        for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, i - w, i + w]) if (j >= 0 && j < w * h && vis[j] && lab[j]! < 0) { lab[j] = sizes.length; st.push(j); }
      }
      sizes.push(n);
    }
    if (sizes.length < 2) return head;
    const main = sizes.indexOf(Math.max(...sizes)), out = copyLayer(head);
    for (let i = 0; i < w * h; i++) if (vis[i] && lab[i] !== main) out.img.data[i * 4 + 3] = 0;
    return out;
  }

  // Под кепкой или куфией волосы выше нижнего края убора скрываются.
  private clipUnder(hair: Layer, capA: Uint8Array): Layer {
    const { FW, FH } = this;
    const bottom = new Int32Array(FW).fill(-1);
    for (let x = 0; x < FW; x++) for (let y = FH - 1; y >= 0 && bottom[x]! < 0; y--) if (capA[y * FW + x]! > 96) bottom[x] = y;
    const cols: number[] = [];
    for (let x = 0; x < FW; x++) if (bottom[x]! >= 0) cols.push(x);
    if (!cols.length) return hair;
    const out = copyLayer(hair), d = out.img.data;
    for (let x = 0; x < hair.w; x++) {
      const cx = x + hair.x;
      let edge: number;
      if (cx >= 0 && cx < FW && bottom[cx]! >= 0) edge = bottom[cx]!;
      else {
        let near = cols[0]!;
        for (const c of cols) if (Math.abs(c - cx) < Math.abs(near - cx)) near = c;
        edge = bottom[near]!;
      }
      for (let y = 0; y < hair.h && y + hair.y < edge; y++) d[(y * hair.w + x) * 4 + 3] = 0;
    }
    return out;
  }

  // Тонкие замкнутые прозрачные щели рядом с данными слоями (ничего не остаётся после эрозии 2 px) получают цвет.
  private fillSlits(img: ImageData, slitRegion: Rect, solidA: Uint8Array, nearAs: Uint8Array[], colour: RGB): void {
    const { FW, FH } = this;
    const [x0, y0, x1, y1] = slitRegion, GW = x1 - x0, GH = Math.min(FH, y1) - y0, d = img.data;
    if (GW <= 0 || GH <= 0) return;
    const open = (x: number, y: number) => d[((y0 + y) * FW + x0 + x) * 4 + 3]! < 64;
    const seen = new Uint8Array(GW * GH), st: number[] = [];
    for (let x = 0; x < GW; x++) st.push(x, (GH - 1) * GW + x);
    for (let y = 0; y < GH; y++) st.push(y * GW, y * GW + GW - 1);
    while (st.length) {
      const i = st.pop()!;
      if (seen[i]) continue;
      const x = i % GW, y = (i / GW) | 0;
      if (!open(x, y)) continue;
      seen[i] = 1;
      if (x > 0) st.push(i - 1);
      if (x < GW - 1) st.push(i + 1);
      if (y > 0) st.push(i - GW);
      if (y < GH - 1) st.push(i + GW);
    }
    const cand = new Uint8Array(GW * GH), lab = new Uint8Array(GW * GH);
    for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) if (!seen[y * GW + x] && open(x, y) && !solidA[(y0 + y) * FW + x0 + x]) cand[y * GW + x] = 1;
    const inC = (x: number, y: number) => x >= 0 && y >= 0 && x < GW && y < GH && !!cand[y * GW + x];
    const near = (o: number) => nearAs.some(a => a[o]! > 96);
    for (let s = 0; s < GW * GH; s++) {
      if (!cand[s] || lab[s]) continue;
      const m: number[] = [], q = [s];
      lab[s] = 1;
      while (q.length) {
        const i = q.pop()!;
        m.push(i);
        const x = i % GW, y = (i / GW) | 0;
        for (const j of [x > 0 ? i - 1 : -1, x < GW - 1 ? i + 1 : -1, y > 0 ? i - GW : -1, y < GH - 1 ? i + GW : -1]) if (j >= 0 && cand[j] && !lab[j]) { lab[j] = 1; q.push(j); }
      }
      const wide = m.some(i => {
        const x = i % GW, y = (i / GW) | 0;
        for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (!inC(x + dx, y + dy)) return false;
        return true;
      });
      if (wide) continue;
      const touches = m.some(i => {
        const x = x0 + (i % GW), y = y0 + ((i / GW) | 0);
        for (const [dx, dy] of [[-2, 0], [2, 0], [0, -2], [0, 2]] as const) {
          const xx = x + dx, yy = y + dy;
          if (xx >= 0 && yy >= 0 && xx < FW && yy < FH && near(yy * FW + xx)) return true;
        }
        return false;
      });
      if (!touches) continue;
      for (const i of m) {
        const o = ((y0 + ((i / GW) | 0)) * FW + x0 + (i % GW)) * 4;
        d[o] = colour[0]; d[o + 1] = colour[1]; d[o + 2] = colour[2]; d[o + 3] = 255;
      }
    }
  }

  private colours(s: Appearance): Colours {
    const M = this.M;
    const at = <X>(list: readonly X[], i: number): X => list[Math.max(0, Math.min(list.length - 1, i))]!;
    const tone = at(M.tones, s.tone);
    const pal = at(M.fabrics, s.pal);
    if (s.band === 'baby') return { tone, hair: at(hairColours(M), 0), pal, hwPal: at(M.fabrics, 0), shoeCol: at(SHOECOLS, 0), accPal: pal, metal: at(METALS, 0) };
    return {
      tone, pal,
      hair: at(hairColours(M), s.hair),
      hwPal: at(M.fabrics, s.hwPal),
      shoeCol: at(SHOECOLS, s.shoeCol),
      accPal: at(M.fabrics, s.accPal),
      metal: at(METALS, s.metal),
    };
  }

  /** Собрать человека на холсте генератора (canvas.w × canvas.h, ноги на нижнем крае). */
  compose(s: Appearance): HTMLCanvasElement {
    const { FW, FH } = this;
    const c = document.createElement('canvas');
    c.width = FW; c.height = FH;
    const g = c.getContext('2d', { willReadFrequently: true });
    if (!g) throw new Error('2D canvas недоступен');
    g.clearRect(0, 0, FW, FH);
    const col = this.colours(s);
    if (s.band === 'baby') {
      const b = this.recolored('babies', s.baby, 'baby', col);
      if (!b) throw new Error(`Нет младенца ${s.baby}`);
      const shift = BABY_FLOOR - (b.y + b.h);
      this.blit(g, { ...b, y: b.y + shift });
      return c;
    }
    this.body(g, s, col);
    return c;
  }

  private body(g: CanvasRenderingContext2D, s: BodyAppearance, col: Colours): void {
    const B = s.body, bd = this.M.bodies[B];
    if (!bd) throw new Error(`Нет тела ${B}`);
    if (!this.atlas(B)) throw new Error(`Атлас ${B} не загружен`);
    const st = bd.styles.find(x => x.id === s.style);
    const hw = s.headwear ? bd.headwear.find(x => x.id === s.headwear) ?? null : null;
    const showHair = !!st && !(hw && COVERING.has(hw.id));
    const hwFront = hw && hw.front ? this.recolored(B, 'headwear:' + hw.front, 'headwear', col) : null;
    const hwBack = hw && hw.back ? this.recolored(B, 'headwear:' + hw.back, 'headwear', col) : null;
    let hairFront = showHair && st?.front ? this.recolored(B, 'hair:' + st.front, 'hair', col) : null;
    const hairBack = showHair && st?.back ? this.recolored(B, 'hair:' + st.back, 'hair', col) : null;
    if (hairFront && hw && ON_HAIR.has(hw.id)) hairFront = this.clipUnder(hairFront, this.alphaFull(B, 'headwear:' + hw.front));
    const accs = s.acc.map(k => bd.accessories.find(x => x.kind === k)).filter((x): x is NonNullable<typeof x> => !!x);
    for (const x of accs) if (x.back) this.blit(g, this.recolored(B, x.back, 'acc', col));
    this.blit(g, hwBack);
    this.blit(g, hairBack);
    this.blit(g, this.recolored(B, 'body', 'body', col));
    if (s.shoe) this.blit(g, this.recolored(B, s.shoe, 'shoe', col));
    const gs = s.outfit
      .map(id => bd.garments.find(x => x.id === id))
      .filter((x): x is NonNullable<typeof x> => !!x)
      .sort((p, q) => (p.cut === 'BOTTOM' ? -1 : 1) - (q.cut === 'BOTTOM' ? -1 : 1));
    for (const it of gs) this.blit(g, this.recolored(B, it.id, 'garment', col));
    for (const x of accs) this.blit(g, this.recolored(B, x.front, x.cane ? 'cane' : 'acc', col));
    this.blit(g, this.recolored(B, 'hands', 'body', col));
    let head = this.recolored(B, s.head, 'head', col);
    if (head && hw) head = this.hidePokes(head, this.alphaFull(B, 'headwear:' + hw.front));
    this.blit(g, head);
    for (const grp of FACE_ORDER) {
      const id = s.face[grp];
      if (id) this.blit(g, this.recolored(B, 'face:' + id, 'face', col));
    }
    if (s.earrings) this.blit(g, this.recolored(B, s.earrings, 'facc', col));
    this.blit(g, hairFront);
    if (s.glasses) this.blit(g, this.recolored(B, s.glasses, 'facc', col));
    this.blit(g, hwFront);
    const { FW, FH } = this;
    const img = g.getImageData(0, 0, FW, FH), solid = this.alphaFull(B, 'solid');
    if (hairFront || hairBack) this.fillSlits(img, bd.geo.slitRegion, solid, [hairFront, hairBack].filter((x): x is Layer => !!x).map(l => this.alphaOf(l)), col.hair);
    if (hw) {
      const near = [this.alphaFull(B, 'headwear:' + hw.front), ...(hw.back ? [this.alphaFull(B, 'headwear:' + hw.back)] : [])];
      this.fillSlits(img, bd.geo.slitRegion, solid, near, col.hwPal[0]!);
    }
    g.putImageData(img, 0, 0);
  }
}

/**
 * Кадр «голова и плечи» на холсте генератора (bustOf генератора, но квадратный):
 * для тела — по центру головы geo.cx/headY и радиусу R, для младенца — по свёртку.
 */
export function bustRect(M: Manifest, s: Appearance): Rect {
  if (s.band === 'baby') {
    const b = M.babies.find(x => x.id === s.baby) ?? M.babies[0];
    if (!b) return [0, 0, M.canvas.w, M.canvas.h];
    const bh = b.a[3], w = bh * 1.2, cx = b.at[0] + b.a[2] / 2;
    return [cx - w / 2, BABY_FLOOR - bh * 1.1, w, w];
  }
  const geo = M.bodies[s.body]?.geo;
  if (!geo) return [0, 0, M.canvas.w, M.canvas.h];
  const w = 3.7 * geo.R;
  return [geo.cx - w / 2, geo.headY - 1.65 * geo.R, w, w];
}
