export const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Minimum-jerk profile: 0 -> 1 with zero velocity and acceleration at both ends. */
export function minJerk(x: number): number {
  const t = clamp(x, 0, 1);
  return t * t * t * (10 - 15 * t + 6 * t * t);
}

export const easeInOut = (x: number) => {
  const t = clamp(x, 0, 1);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};

export type Scale = ((x: number) => number) & { invert: (y: number) => number };

export function linear(d0: number, d1: number, r0: number, r1: number): Scale {
  const k = (r1 - r0) / (d1 - d0);
  const f = ((x: number) => r0 + (x - d0) * k) as Scale;
  f.invert = (y: number) => d0 + (y - r0) / k;
  return f;
}

/** Small deterministic PRNG so every render draws the same "recording". */
export function mulberry32(seed: number) {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const MINUS = '−';

/** 0.0834 -> "+83 ms"; uses a true minus sign. */
export function fmtMs(seconds: number, signed = false): string {
  const ms = Math.round(seconds * 1000);
  if (ms === 0) return '0 ms';
  const sign = ms < 0 ? MINUS : signed ? '+' : '';
  return `${sign}${Math.abs(ms)} ms`;
}

export const fmtTs = (s: number) => (s < 0 ? MINUS : '') + Math.abs(s).toFixed(3);

export function pearson(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  let ma = 0;
  let mb = 0;
  for (let i = 0; i < n; i++) {
    ma += a[i];
    mb += b[i];
  }
  ma /= n;
  mb /= n;
  let num = 0;
  let da = 0;
  let db = 0;
  for (let i = 0; i < n; i++) {
    const x = a[i] - ma;
    const y = b[i] - mb;
    num += x * y;
    da += x * x;
    db += y * y;
  }
  return num / Math.sqrt(da * db || 1);
}
