import tablesData from '../data/tables.json';

// ---------- 乱数（シード付き。検算用に再現可能にする） ----------
export type RNG = () => number;

export function mulberry32(seed: number): RNG {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randInt(rng: RNG, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

export function pick<T>(rng: RNG, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

export function shuffle<T>(rng: RNG, arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---------- 組合せ ----------
export function comb(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  k = Math.min(k, n - k);
  let r = 1;
  for (let i = 0; i < k; i++) r = (r * (n - i)) / (i + 1);
  return r;
}

export function perm(n: number, k: number): number {
  let r = 1;
  for (let i = 0; i < k; i++) r *= n - i;
  return r;
}

// ---------- 離散分布の確率 ----------
export function binomPmf(n: number, k: number, p: number): number {
  return comb(n, k) * Math.pow(p, k) * Math.pow(1 - p, n - k);
}

export function poissonPmf(lambda: number, k: number): number {
  return (Math.pow(lambda, k) * Math.exp(-lambda)) / factorial(k);
}

export function geomPmf(p: number, k: number): number {
  return Math.pow(1 - p, k - 1) * p;
}

export function hypergeomPmf(
  N: number,
  K: number,
  n: number,
  k: number,
): number {
  return (comb(K, k) * comb(N - K, n - k)) / comb(N, n);
}

export function factorial(n: number): number {
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}

// ---------- 正規分布 ----------
/** Abramowitz & Stegun 7.1.26 による erf 近似（|誤差| < 1.5e-7） */
export function erf(x: number): number {
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * ax);
  const y =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) *
      t +
      0.254829592) *
      t *
      Math.exp(-ax * ax);
  return sign * y;
}

export function normalCdf(z: number): number {
  return 0.5 * (1 + erf(z / Math.SQRT2));
}

/** 上側確率 α に対応する z 値（Beasley-Springer-Moro 近似） */
export function normalInv(p: number): number {
  // p は下側確率 (0,1)
  if (p <= 0 || p >= 1) throw new Error('p must be in (0,1)');
  const a = [
    -3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2,
    1.38357751867269e2, -3.066479806614716e1, 2.506628277459239,
  ];
  const b = [
    -5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2,
    6.680131188771972e1, -1.328068155288572e1,
  ];
  const c = [
    -7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838,
    -2.549732539343734, 4.374664141464968, 2.938163982698783,
  ];
  const d = [
    7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996,
    3.754408661907416,
  ];
  const plow = 0.02425;
  const phigh = 1 - plow;
  let q: number;
  if (p < plow) {
    q = Math.sqrt(-2 * Math.log(p));
    return (
      (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
    );
  } else if (p > phigh) {
    q = Math.sqrt(-2 * Math.log(1 - p));
    return (
      -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
    );
  }
  q = p - 0.5;
  const r = q * q;
  return (
    ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) *
      q) /
    (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1)
  );
}

// ---------- 数値表 ----------
interface Tables {
  zcrit: Record<string, number>;
  zcdf: Record<string, number>;
  zupper: Record<string, number>;
  t: {
    alphas: number[];
    df: number[];
    values: Record<string, Record<string, number>>;
  };
  chi2: {
    alphas: number[];
    df: number[];
    values: Record<string, Record<string, number>>;
  };
  f: {
    alphas: number[];
    df1: number[];
    df2: number[];
    values: Record<string, Record<string, Record<string, number>>>;
  };
}

const tables = tablesData as unknown as Tables;

/** 標準正規の上側臨界値 z_α（α=0.10,0.05,0.025,0.02,0.01,0.005） */
export function zCrit(alpha: number): number {
  const v = tables.zcrit[fmtAlpha(alpha)];
  if (v === undefined) return normalInv(1 - alpha);
  return v;
}

export function tCrit(alpha: number, df: number): number {
  const key = fmtAlpha(alpha);
  const row = tables.t.values[String(df)];
  if (row && row[key] !== undefined) return row[key];
  // 表にない自由度は補間（近い2点で線形）
  return interpCrit(tables.t.df, (d) => tables.t.values[String(d)]?.[key], df);
}

export function chi2Crit(alpha: number, df: number): number {
  const key = fmtAlpha(alpha);
  const row = tables.chi2.values[String(df)];
  if (row && row[key] !== undefined) return row[key];
  return interpCrit(
    tables.chi2.df,
    (d) => tables.chi2.values[String(d)]?.[key],
    df,
  );
}

export function fCrit(alpha: number, df1: number, df2: number): number {
  const key = fmtAlpha(alpha);
  const byD1 = tables.f.values[key];
  if (byD1) {
    const exact1 = byD1[String(df1)];
    if (exact1) {
      const v = exact1[String(df2)];
      if (v !== undefined) return v;
      return interpCrit(tables.f.df2, (d) => exact1[String(d)], df2);
    }
    // df1 が表にない場合は近い列で補間
    return interpCrit(
      tables.f.df1,
      (d1) => {
        const col = byD1[String(d1)];
        if (!col) return undefined;
        const v = col[String(df2)];
        if (v !== undefined) return v;
        return interpCrit(tables.f.df2, (d2) => col[String(d2)], df2);
      },
      df1,
    );
  }
  throw new Error(`F table: alpha ${alpha} not found`);
}

function interpCrit(
  xs: number[],
  get: (x: number) => number | undefined,
  x: number,
): number {
  const sorted = [...xs].sort((a, b) => a - b);
  let lo = sorted[0];
  let hi = sorted[sorted.length - 1];
  for (const v of sorted) {
    if (v <= x) lo = v;
    if (v >= x) {
      hi = v;
      break;
    }
  }
  const glo = get(lo);
  const ghi = get(hi);
  if (glo === undefined && ghi === undefined)
    throw new Error('table interpolation failed');
  if (glo === undefined) return ghi!;
  if (ghi === undefined) return glo;
  if (hi === lo) return glo;
  return glo + ((ghi - glo) * (x - lo)) / (hi - lo);
}

function fmtAlpha(a: number): string {
  return `${Number(a.toFixed(4))}`;
}

/** 配布表スタイル: Φ(z) を 0.01 刻み表から引く */
export function zCdfTable(z: number): number | undefined {
  return tables.zcdf[z.toFixed(2)];
}

export function zUpperTable(z: number): number | undefined {
  return tables.zupper[z.toFixed(2)];
}

export function zGridValues(): string[] {
  return Object.keys(tables.zcdf);
}

// ---------- 記述統計 ----------
export function mean(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

export function varianceP(xs: number[]): number {
  const m = mean(xs);
  return xs.reduce((a, x) => a + (x - m) * (x - m), 0) / xs.length;
}

export function varianceU(xs: number[]): number {
  const m = mean(xs);
  return xs.reduce((a, x) => a + (x - m) * (x - m), 0) / (xs.length - 1);
}

export function sdP(xs: number[]): number {
  return Math.sqrt(varianceP(xs));
}

export function sdU(xs: number[]): number {
  return Math.sqrt(varianceU(xs));
}

export function quantile(sortedXs: number[], q: number): number {
  // 統計検定で一般的な「順位位置」方式: pos = q*(n-1), 線形補間
  const pos = q * (sortedXs.length - 1);
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  if (lo === hi) return sortedXs[lo];
  return sortedXs[lo] + (sortedXs[hi] - sortedXs[lo]) * (pos - lo);
}

// ---------- 表示用 ----------
export function fmt(x: number, digits = 2): string {
  return x.toFixed(digits);
}

/** 指数を避けて小数で表す（選択肢の重複チェック用） */
export function fmtNum(x: number, digits = 4): string {
  if (Math.abs(x - Math.round(x)) < 1e-9) return String(Math.round(x));
  return String(Number(x.toFixed(digits)));
}

/** 確率を小数3桁で表示 */
export function fmtP(x: number): string {
  return x.toFixed(4).replace(/0+$/, '').replace(/\.$/, '.0');
}
