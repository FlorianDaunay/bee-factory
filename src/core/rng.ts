/** Small deterministic PRNG (mulberry32). State is a plain number so it can live in saved state. */
export function nextRandom(state: number): [value: number, next: number] {
  let t = (state + 0x6d2b79f5) | 0;
  const next = t;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, next];
}

/** Mutable wrapper used inside a single engine call; write `rng.state` back when done. */
export class Rng {
  constructor(public state: number) {}
  next(): number {
    const [v, s] = nextRandom(this.state);
    this.state = s;
    return v;
  }
  int(maxExclusive: number): number {
    return Math.floor(this.next() * maxExclusive);
  }
  chance(p: number): boolean {
    return this.next() < p;
  }
  pick<T>(items: readonly T[]): T {
    return items[this.int(items.length)];
  }
  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }
}

export const randomSeed = (): number => (Math.random() * 2 ** 31) | 0;
