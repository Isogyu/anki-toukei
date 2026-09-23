import type { RNG } from '../lib/stats';
import {
  mean,
  varianceP,
  varianceU,
  sdP,
  sdU,
  quantile,
  randInt,
  pick,
  fmt,
} from '../lib/stats';
import { numChoices, type SolvedQuestion } from './types';

function sample(rng: RNG, n: number, lo: number, hi: number): number[] {
  return Array.from({ length: n }, () => randInt(rng, lo, hi));
}

export function mean_calc(rng: RNG): SolvedQuestion {
  const n = randInt(rng, 5, 7);
  const xs = sample(rng, n, 12, 48);
  const m = mean(xs);
  const sum = xs.reduce((a, b) => a + b, 0);
  return {
    text: `データ $${xs.join(',\\ ')}$ の平均を求めよ。`,
    choices: numChoices(
      rng,
      m,
      [
        {
          value: sum / (n - 1),
          why: 'n ではなく n−1 で割った（不偏分散と混同）',
        },
        { value: xs[Math.floor(n / 2)], why: '中央値と混同した' },
        { value: m + 2, why: '合計の暗算ミス' },
      ],
      2,
    ),
    steps: [
      `合計を計算: ${xs.join(' + ')} = ${sum}`,
      `データ数で割る: ${sum} ÷ ${n} = ${fmt(m, 2)}`,
      `電卓: ${xs.join('+')} = → ÷${n} =`,
    ],
    verify: { kind: 'mean', params: { xs: xs.join(' ') }, expected: m },
  };
}

export function var_p(rng: RNG): SolvedQuestion {
  const n = randInt(rng, 5, 6);
  const xs = sample(rng, n, 4, 16);
  const m = mean(xs);
  const vp = varianceP(xs);
  const vu = varianceU(xs);
  return {
    text: `データ $${xs.join(',\\ ')}$ の分散 $s^2$（$n$ で割るもの）を求めよ。`,
    choices: numChoices(
      rng,
      vp,
      [
        { value: vu, why: 'n−1 で割った（不偏分散との混同）' },
        { value: Math.sqrt(vp), why: '標準偏差を答えた（√を取ってしまった）' },
        { value: vp * n, why: '偏差平方和を n で割り忘れた' },
      ],
      2,
    ),
    steps: [
      `平均: ${fmt(m, 2)}`,
      `偏差平方和: Σ(x−x̄)² = ${fmt(vp * n, 2)}`,
      `分散 = 偏差平方和 ÷ n = ${fmt(vp * n, 2)} ÷ ${n} = ${fmt(vp, 2)}`,
      `ひっかけ: n−1 で割ると不偏分散 ${fmt(vu, 2)} になる。`,
    ],
    verify: { kind: 'var_p', params: { xs: xs.join(' ') }, expected: vp },
  };
}

export function var_u(rng: RNG): SolvedQuestion {
  const n = randInt(rng, 5, 6);
  const xs = sample(rng, n, 4, 16);
  const vp = varianceP(xs);
  const vu = varianceU(xs);
  return {
    text: `データ $${xs.join(',\\ ')}$ の不偏分散 $u^2$ を求めよ。`,
    choices: numChoices(
      rng,
      vu,
      [
        { value: vp, why: 'n で割った（標本分散との混同）' },
        { value: Math.sqrt(vu), why: '標準偏差を答えた（√を取ってしまった）' },
        { value: vu * (n - 1), why: '偏差平方和を n−1 で割り忘れた' },
      ],
      2,
    ),
    steps: [
      `偏差平方和を求めて n−1 = ${n - 1} で割る。`,
      `不偏分散 u² = ${fmt(vu, 2)}`,
      `母分散の推定・t検定・F検定では n−1 で割る不偏分散を使う。`,
    ],
    verify: { kind: 'var_u', params: { xs: xs.join(' ') }, expected: vu },
  };
}

export function sd_calc(rng: RNG): SolvedQuestion {
  const n = randInt(rng, 5, 6);
  const xs = sample(rng, n, 4, 16);
  const vp = varianceP(xs);
  const s = sdP(xs);
  return {
    text: `データ $${xs.join(',\\ ')}$ の標準偏差 $s$ を求めよ（$n$ で割る分散の平方根）。`,
    choices: numChoices(
      rng,
      s,
      [
        { value: vp, why: '分散をそのまま答えた（√の取り忘れ）' },
        { value: sdU(xs), why: 'n−1 で割る不偏分散の平方根を使った' },
        {
          value: s * Math.sqrt(n),
          why: '√n を掛けてしまった（標準誤差と混同）',
        },
      ],
      2,
    ),
    steps: [
      `分散 s² = ${fmt(vp, 2)}`,
      `標準偏差 s = √${fmt(vp, 2)} = ${fmt(s, 2)}`,
      `電卓: 分散を求めたあと √ キーを1回。`,
    ],
    verify: { kind: 'sd', params: { xs: xs.join(' ') }, expected: s },
  };
}

export function cv_calc(rng: RNG): SolvedQuestion {
  const m = randInt(rng, 40, 120);
  const s = randInt(rng, 4, 20);
  const cv = s / m;
  return {
    text: `平均 ${m}、標準偏差 ${s} のデータの変動係数 CV を求めよ。`,
    choices: numChoices(
      rng,
      cv,
      [
        { value: m / s, why: '分子分母を逆にした' },
        { value: (s * s) / m, why: '標準偏差ではなく分散を使った' },
        { value: s / Math.sqrt(m), why: '√を余計にかけた' },
      ],
      3,
    ),
    steps: [
      `CV = s ÷ x̄ = ${s} ÷ ${m} = ${fmt(cv, 3)}`,
      `単位の異なるデータのばらつき比較に使う（無次元）。`,
    ],
    verify: { kind: 'cv', params: { s, m }, expected: cv },
  };
}

export function zscore_calc(rng: RNG): SolvedQuestion {
  const mu = randInt(rng, 50, 80);
  const sd = pick(rng, [5, 8, 10, 12, 15]);
  const x = mu + pick(rng, [-2, -1, 1, 2]) * sd + randInt(rng, -4, 4);
  const z = (x - mu) / sd;
  const t = 50 + 10 * z;
  return {
    text: `平均 ${mu}、標準偏差 ${sd} の分布で、値 ${x} の標準化得点 $z$ と偏差値 $T=50+10z$ を求めよ。`,
    choices: numChoices(
      rng,
      t,
      [
        { value: z, why: '偏差値ではなく標準化得点 z を答えた' },
        { value: 50 - 10 * z, why: 'z の符号を逆にした' },
        { value: 50 + z, why: '10倍を忘れた' },
      ],
      1,
    ),
    steps: [
      `z = (x − μ) ÷ σ = (${x} − ${mu}) ÷ ${sd} = ${fmt(z, 2)}`,
      `偏差値 T = 50 + 10 × ${fmt(z, 2)} = ${fmt(t, 1)}`,
      `電卓: ${x} − ${mu} = ÷ ${sd} = ×10 = +50 =`,
    ],
    verify: { kind: 'zscore', params: { x, mu, sd }, expected: t },
  };
}

export function quartiles(rng: RNG): SolvedQuestion {
  const n = pick(rng, [9, 11, 13]);
  const xs = sample(rng, n, 10, 60).sort((a, b) => a - b);
  const q1 = quantile(xs, 0.25);
  const q3 = quantile(xs, 0.75);
  const iqr = q3 - q1;
  const med = quantile(xs, 0.5);
  return {
    text: `小さい順に並べたデータ $${xs.join(',\\ ')}$ の四分位範囲 IQR を求めよ。`,
    choices: numChoices(
      rng,
      iqr,
      [
        { value: med, why: '中央値を答えた' },
        { value: xs[n - 1] - xs[0], why: '範囲（最大−最小）と混同した' },
        { value: q3 - med, why: 'Q3−Q2 を計算した' },
      ],
      2,
    ),
    steps: [
      `Q1 = ${fmt(q1, 2)}, Q2（中央値） = ${fmt(med, 2)}, Q3 = ${fmt(q3, 2)}`,
      `IQR = Q3 − Q1 = ${fmt(q3, 2)} − ${fmt(q1, 2)} = ${fmt(iqr, 2)}`,
    ],
    verify: {
      kind: 'iqr',
      params: { xs: xs.join(' ') },
      expected: iqr,
    },
  };
}

export function outlier_iqr(rng: RNG): SolvedQuestion {
  const q1 = randInt(rng, 20, 40);
  const q3 = q1 + randInt(rng, 8, 20);
  const iqr = q3 - q1;
  const lo = q1 - 1.5 * iqr;
  const hi = q3 + 1.5 * iqr;
  const x = Math.ceil(hi) + randInt(rng, 1, 8);
  return {
    text: `あるデータで $Q_1=${q1}$、$Q_3=${q3}$ であった。値 ${x} は外れ値（$Q_3+1.5\\,\\mathrm{IQR}$ 超）とみなされるか。上側の境界値を求めよ。`,
    choices: numChoices(
      rng,
      hi,
      [
        { value: q3 + iqr, why: '係数を1.5ではなく1.0にした' },
        {
          value: q3 + 3 * iqr,
          why: '係数を3にした（極端な外れ値の基準と混同）',
        },
        { value: x, why: '観測値そのものを境界と勘違いした' },
      ],
      1,
    ),
    steps: [
      `IQR = ${q3} − ${q1} = ${iqr}`,
      `上側境界 = Q3 + 1.5×IQR = ${q3} + ${fmt(1.5 * iqr, 1)} = ${fmt(hi, 1)}`,
      `${x} > ${fmt(hi, 1)} なので外れ値（ひげの外）として扱う。`,
      `下側は Q1 − 1.5×IQR = ${fmt(lo, 1)}。`,
    ],
    verify: { kind: 'iqr_bound', params: { q1, q3 }, expected: hi },
  };
}

export function freq_mean(rng: RNG): SolvedQuestion {
  const vals = [0, 1, 2, 3, 4, 5];
  const fs = vals.map(() => randInt(rng, 1, 6));
  const n = fs.reduce((a, b) => a + b, 0);
  const m = vals.reduce((a, v, i) => a + v * fs[i], 0) / n;
  const mode = vals[fs.indexOf(Math.max(...fs))];
  return {
    text: `度数分布表：値 $${vals.join(',\\ ')}$、度数 $${fs.join(',\\ ')}$。平均を求めよ。`,
    choices: numChoices(
      rng,
      m,
      [
        { value: mode, why: '最頻値を答えた' },
        { value: mean(vals), why: '度数を掛けずに値だけ平均した' },
        { value: m + 0.5, why: '度数×値の合計の計算ミス' },
      ],
      2,
    ),
    steps: [
      `Σ(値×度数) = ${vals.map((v, i) => `${v}×${fs[i]}`).join(' + ')} = ${vals.reduce((a, v, i) => a + v * fs[i], 0)}`,
      `度数の合計 N = ${n}`,
      `平均 = ${vals.reduce((a, v, i) => a + v * fs[i], 0)} ÷ ${n} = ${fmt(m, 2)}`,
    ],
    verify: {
      kind: 'freq_mean',
      params: { xs: vals.join(' '), fs: fs.join(' ') },
      expected: m,
    },
  };
}
