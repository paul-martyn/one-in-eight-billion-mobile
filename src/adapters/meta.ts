// Мобильная мета-экономика: энергия на новую жизнь, доллары, кристаллы.
// Это новый слой мобильной версии, а не механика оригинала: core о нём
// ничего не знает, и он не влияет на ход жизни. Параметры — в одном месте.
import type { StorageLike } from '../core/env.ts';
import type { LifeReward } from './vm/rewards.ts';

export const META_RULES = {
  /** Энергии на старте и максимум. */
  maxEnergy: 5,
  /** Цена одной новой жизни. */
  lifeCost: 1,
  /**
   * +1 энергии за этот интервал, пока энергии меньше максимума.
   * ВРЕМЕННОЕ значение — ждёт решения продукта (в макете хаба только пример «+1 in 18:24»).
   */
  refillMs: 30 * 60 * 1000,
} as const;

export type MetaState = { v: 1; energy: number; refillFrom: number | null; dollars: number; gems: number; lives: number; pending: LifeReward | null; claimed: string[]; unseenLives: number };
export type MetaView = { energy: number; max: number; nextRefillAt: number | null; dollars: number; gems: number; canStartLife: boolean; lifeCost: number; pendingReward: LifeReward | null; unseenLives: number };

const KEY = 'mobile.meta.v1';
const fresh = (): MetaState => ({ v: 1, energy: META_RULES.maxEnergy, refillFrom: null, dollars: 0, gems: 0, lives: 0, pending: null, claimed: [], unseenLives: 0 });

export class MetaEconomy {
  private state: MetaState;
  private readonly storage: StorageLike;
  constructor(storage: StorageLike) {
    this.storage = storage;
    let s: MetaState | null = null;
    try { s = JSON.parse(storage.getItem(KEY) ?? 'null'); } catch { s = null; }
    this.state = s && s.v === 1 ? { ...fresh(), ...s } : fresh();
  }

  /** Начислить восстановление энергии по прошедшему времени. */
  settle(now: number): void {
    const s = this.state;
    if (s.energy >= META_RULES.maxEnergy) { s.refillFrom = null; return; }
    if (s.refillFrom == null) { s.refillFrom = now; this.save(); return; }
    const gained = Math.floor((now - s.refillFrom) / META_RULES.refillMs);
    if (gained <= 0) return;
    s.energy = Math.min(META_RULES.maxEnergy, s.energy + gained);
    s.refillFrom = s.energy >= META_RULES.maxEnergy ? null : s.refillFrom + gained * META_RULES.refillMs;
    this.save();
  }

  view(now: number): MetaView {
    this.settle(now);
    const s = this.state;
    return {
      energy: s.energy, max: META_RULES.maxEnergy, lifeCost: META_RULES.lifeCost,
      nextRefillAt: s.refillFrom == null ? null : s.refillFrom + META_RULES.refillMs,
      dollars: s.dollars, gems: s.gems, canStartLife: s.energy >= META_RULES.lifeCost,
      pendingReward: s.pending, unseenLives: s.unseenLives,
    };
  }

  /** Списать энергию за новую жизнь. false — энергии не хватает. */
  spendLife(now: number): boolean {
    this.settle(now);
    const s = this.state;
    if (s.energy < META_RULES.lifeCost) return false;
    s.energy -= META_RULES.lifeCost;
    s.lives += 1;
    if (s.refillFrom == null && s.energy < META_RULES.maxEnergy) s.refillFrom = now;
    this.save();
    return true;
  }

  /** Вернуть энергию, если жизнь не удалось начать. */
  refundLife(): void {
    this.state.energy = Math.min(META_RULES.maxEnergy, this.state.energy + META_RULES.lifeCost);
    this.state.lives = Math.max(0, this.state.lives - 1);
    this.save();
  }

  /** Награда за завершённую жизнь ждёт получения (одна на жизнь, переживает перезагрузку). */
  setPendingReward(r: LifeReward): void {
    const s = this.state;
    if (s.claimed.includes(r.lifeId) || s.pending?.lifeId === r.lifeId) return;
    s.pending = r;
    this.save();
  }

  /** Claim: доллары и кристаллы зачисляются, жизнь отмечается новой во вкладке Lives. */
  claim(): LifeReward | null {
    const s = this.state;
    const r = s.pending;
    if (!r) return null;
    s.dollars += r.dollars;
    s.gems += r.gems;
    s.claimed = [...s.claimed.slice(-199), r.lifeId];
    s.pending = null;
    s.unseenLives += 1;
    this.save();
    return r;
  }

  /** Вкладка Lives открыта — бейдж новых жизней снимается. */
  seeLives(): void {
    if (!this.state.unseenLives) return;
    this.state.unseenLives = 0;
    this.save();
  }

  private save(): void {
    try { this.storage.setItem(KEY, JSON.stringify(this.state)); } catch { /* приватный режим: работает в памяти */ }
  }
}
