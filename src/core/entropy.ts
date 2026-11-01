// Поток случайности для Math.random внутри core.
//
// Оригинальная игра в браузере берёт случайность из Math.random. Здесь
// Math.random ядра — генератор с тем же алгоритмом, что у seedRng оригинала
// (game.en.js:55668), но с открытым 32-битным состоянием: его можно сохранить
// рядом с сохранением жизни и после перезагрузки продолжить тот же поток.
// Распределение (равномерное на [0, 1)) не меняется.
export class CoreEntropy {
  private state: number;
  /** Сколько чисел выдано; нужно для «забора» RNG при чтении представления. */
  draws = 0;
  constructor(state: number) { this.state = state | 0; }

  /** Начальное состояние из строки — тот же хеш, что в seedRng оригинала. */
  static fromSeed(seed: string): CoreEntropy {
    let t = 1779033703 ^ seed.length;
    for (let o = 0; o < seed.length; o++) {
      t = Math.imul(t ^ seed.charCodeAt(o), 3432918353);
      t = (t << 13) | (t >>> 19);
    }
    return new CoreEntropy(t >>> 0);
  }

  next = (): number => {
    this.draws++;
    const a = (this.state = (this.state + 1831565813) | 0);
    let o = Math.imul(a ^ (a >>> 15), 1 | a);
    o = (o + Math.imul(o ^ (o >>> 7), 61 | o)) ^ o;
    return ((o ^ (o >>> 14)) >>> 0) / 4294967296;
  };

  getState(): number { return this.state; }
  setState(state: number): void { this.state = state | 0; }
}
