// Типы манифеста генератора персонажей (manifest.json, извлечён из
// character-art/demo/generator.html инструментом tools/people/extract-generator.mjs)
// и описания одного человека для сборки.
import type { AgeBand } from '../../adapters/vm/appearance';

export type RGB = readonly [number, number, number];
/** [x, y, w, h] в атласе. */
export type Rect = readonly [number, number, number, number];
export type LayerInfo = { a: Rect; at: readonly [number, number] };
export type Named = { id: string; name: string };
export type HairStyle = Named & { front: string | null; back: string | null };
export type Garment = Named & { cut: 'FULL' | 'TOP' | 'BOTTOM' };
export type Shoe = Named & { mvp: boolean };
export type Accessory = { kind: string; name: string; front: string; back?: string; cane?: boolean };
export type FaceAcc = Named & { kind: 'glasses' | 'earrings' | string };
export type Geo = { cx: number; R: number; headY: number; crownY: number; slitRegion: Rect; top: number };
export type FaceGroup = 'age' | 'details' | 'beards' | 'mouths' | 'moustaches' | 'noses' | 'eyes' | 'eyesChild' | 'brows';
export type BodyDef = {
  age: string;
  sex: string;
  atlas: string;
  atlasSize: readonly [number, number];
  layers: Record<string, LayerInfo>;
  heads: Named[];
  face: Partial<Record<FaceGroup, Named[]>>;
  styles: HairStyle[];
  headwear: HairStyle[];
  garments: Garment[];
  shoes: Shoe[];
  accessories: Accessory[];
  faceAcc: FaceAcc[];
  geo: Geo;
};
export type BabyDef = Named & LayerInfo;
export type KeyName = 'INK' | 'SKIN' | 'LIGHT' | 'CLOTH1' | 'CLOTH2' | 'TRIM' | 'HAIR' | 'MOUTH' | 'SHOES' | 'METAL';
export type Manifest = {
  canvas: { w: number; h: number };
  keys: Record<KeyName, RGB>;
  tones: RGB[];
  hairs: RGB[];
  /** Палитры ткани: CLOTH1, CLOTH2, TRIM, LIGHT. */
  fabrics: RGB[][];
  bodies: Record<string, BodyDef>;
  babies: BabyDef[];
  babyAtlas: string;
};

/**
 * Один человек для сборки. Цвета — индексы в таблицах генератора (tones,
 * hairColours, fabrics, SHOECOLS, METALS), детали — id манифеста.
 */
export type BabyAppearance = { band: 'baby'; tone: number; baby: string; pal: number };
export type BodyAppearance = {
  band: Exclude<AgeBand, 'baby'>;
  sex: 'f' | 'm';
  body: string;
  tone: number;
  head: string;
  face: Partial<Record<FaceGroup, string>>;
  style: string | null;
  hair: number;
  headwear: string | null;
  hwPal: number;
  outfit: string[];
  pal: number;
  shoe: string | null;
  shoeCol: number;
  acc: string[];
  accPal: number;
  metal: number;
  glasses: string | null;
  earrings: string | null;
};
export type Appearance = BabyAppearance | BodyAppearance;
