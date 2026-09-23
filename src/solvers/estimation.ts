import type { RNG } from '../lib/stats';
import { zCrit, tCrit, chi2Crit, randInt, pick, fmt } from '../lib/stats';
import { numChoices, type SolvedQuestion } from './types';

const CONF = [
  { c: 0.9, a: 0.05 },
  { c: 0.95, a: 0.025 },
  { c: 0.99, a: 0.005 },
];

export function ci_mean_z(rng: RNG): SolvedQuestion {
  const { c, a } = pick(rng, CONF);
  const xbar = randInt(rng, 50, 120);
  const sigma = pick(rng, [8, 10, 12, 15, 20]);
  const n = pick(rng, [25, 36, 49, 64, 100]);
  const se = sigma / Math.sqrt(n);
  const z = zCrit(a);
  const half = z * se;
  return {
    text: `母標準偏差 $\\sigma=${sigma}$ が既知の正規母集団から大きさ ${n} の標本を取り、標本平均 ${xbar} を得た。母平均の ${Math.round(c * 100)}% 信頼区間の下限・上限の幅（半分の幅）を求めよ。`,
    choices: numChoices(
      rng,
      half,
      [
        {
          value: zCrit(0.05) * se,
          why:
            a !== 0.05
              ? '信頼係数に対応する z を間違えた（両側 α/2 で引く）'
              : 'z=1.645（片側）を使った',
        },
        { value: z * sigma, why: 'σ/√n でなく σ を掛けた（√n 忘れ）' },
        { value: zCrit(a / 2) * se, why: 'α をさらに半分にしてしまった' },
        { value: 2 * z * se, why: '全幅を答えた（半幅でなく）' },
      ],
      2,
    ),
    steps: [
      `母平均の信頼区間（σ既知）: x̄ ± z(α/2)·σ/√n`,
      `z(${fmt(a, 3)}) = ${fmt(z, 4)}（両側 ${Math.round(c * 100)}% → 片側 α/2=${fmt(a, 3)}）`,
      `SE = ${sigma}/√${n} = ${fmt(se, 3)}`,
      `半幅 = ${fmt(z, 4)} × ${fmt(se, 3)} = ${fmt(half, 2)}`,
      `区間: [${fmt(xbar - half, 2)}, ${fmt(xbar + half, 2)}]`,
      `電卓: ${sigma} ÷ √${n} → ×${fmt(z, 4)}`,
    ],
    verify: { kind: 'ci_z_half', params: { z, sigma, n }, expected: half },
  };
}

export function ci_mean_t(rng: RNG): SolvedQuestion {
  const { c, a } = pick(rng, CONF);
  const xbar = randInt(rng, 40, 120);
  const u = randInt(rng, 5, 20);
  const n = pick(rng, [9, 10, 16, 20, 25]);
  const se = u / Math.sqrt(n);
  const df = n - 1;
  const t = tCrit(a, df);
  const half = t * se;
  return {
    text: `正規母集団から大きさ ${n} の標本を取り、標本平均 ${xbar}・不偏分散の平方根 $u=${u}$ を得た。母平均の ${Math.round(c * 100)}% 信頼区間の半幅を求めよ。`,
    choices: numChoices(
      rng,
      half,
      [
        {
          value: zCrit(a) * se,
          why: `t ではなく z=${fmt(zCrit(a), 3)} を使った（σ未知なら t分布）`,
        },
        {
          value: tCrit(a, n) * se,
          why: `自由度を n−1=${df} でなく n=${n} とした`,
        },
        { value: t * u, why: 'u/√n でなく u を掛けた（√n 忘れ）' },
        { value: t * (u / n), why: '√n でなく n で割った' },
      ],
      2,
    ),
    steps: [
      `σ未知なので t 分布: x̄ ± t(α/2, n−1)·u/√n`,
      `t(${fmt(a, 3)}, ${df}) = ${fmt(t, 4)}（自由度は n−1=${df}）`,
      `SE = ${u}/√${n} = ${fmt(se, 3)}`,
      `半幅 = ${fmt(t, 4)} × ${fmt(se, 3)} = ${fmt(half, 2)}`,
      `区間: [${fmt(xbar - half, 2)}, ${fmt(xbar + half, 2)}]`,
      `ひっかけ: z=1.96 を使うと半幅 ${fmt(zCrit(a) * se, 2)} と狭くなりすぎる。`,
    ],
    verify: { kind: 'ci_t_half', params: { t, u, n }, expected: half },
  };
}

export function ci_prop(rng: RNG): SolvedQuestion {
  const { c, a } = pick(rng, CONF);
  const n = pick(rng, [100, 200, 400, 500]);
  const x = Math.round(n * pick(rng, [0.2, 0.3, 0.4, 0.55, 0.6]));
  const phat = x / n;
  const se = Math.sqrt((phat * (1 - phat)) / n);
  const z = zCrit(a);
  const half = z * se;
  return {
    text: `${n} 人を調査したら ${x} 人が賛成だった。母比率の ${Math.round(c * 100)}% 信頼区間の半幅を求めよ。`,
    choices: numChoices(
      rng,
      half,
      [
        {
          value: (z * Math.sqrt(phat * (1 - phat) * n)) / n,
          why: '√n の処理を誤った（√(p(1−p)n)/n）',
        },
        { value: (z * (phat * (1 - phat))) / n, why: '√ を忘れた' },
        { value: z * Math.sqrt(phat * (1 - phat)), why: 'n で割り忘れた' },
        { value: phat, why: '標本比率そのものを答えた' },
      ],
      3,
    ),
    steps: [
      `p̂ = ${x}/${n} = ${fmt(phat, 3)}`,
      `SE = √(p̂(1−p̂)/n) = √(${fmt(phat, 3)}×${fmt(1 - phat, 3)}÷${n}) = ${fmt(se, 4)}`,
      `半幅 = ${fmt(z, 4)} × ${fmt(se, 4)} = ${fmt(half, 4)}`,
      `区間: [${fmt(phat - half, 3)}, ${fmt(phat + half, 3)}]`,
      `電卓: p̂×(1−p̂) ÷n → √ → ×${fmt(z, 4)}`,
    ],
    verify: { kind: 'ci_prop_half', params: { z, phat, n }, expected: half },
  };
}

export function ci_var(rng: RNG): SolvedQuestion {
  const n = pick(rng, [10, 16, 20, 25, 26]);
  const u2 = randInt(rng, 10, 60);
  const df = n - 1;
  const lo = (df * u2) / chi2Crit(0.025, df);
  const hi = (df * u2) / chi2Crit(0.975, df);
  const askLower = rng() < 0.5;
  const ans = askLower ? lo : hi;
  return {
    text: `正規母集団から大きさ ${n} の標本を取り、不偏分散 $u^2=${u2}$ を得た。母分散の 95% 信頼区間の${askLower ? '下限' : '上限'}を求めよ（χ²表を使う）。`,
    choices: numChoices(
      rng,
      ans,
      [
        {
          value: askLower ? hi : lo,
          why: '上限と下限を逆にした（χ² の大きい値が分母だと小さい値になる）',
        },
        {
          value:
            (n * u2) / (askLower ? chi2Crit(0.025, df) : chi2Crit(0.975, df)),
          why: '分子を (n−1)u² でなく n·u² にした',
        },
        {
          value: u2,
          why: '点推定値をそのまま答えた',
        },
      ],
      2,
    ),
    steps: [
      `母分散の信頼区間: [(n−1)u²/χ²(0.025), (n−1)u²/χ²(0.975)]`,
      `分子 (n−1)u² = ${df}×${u2} = ${df * u2}`,
      `χ²(0.025, ${df}) = ${fmt(chi2Crit(0.025, df), 3)}、χ²(0.975, ${df}) = ${fmt(chi2Crit(0.975, df), 3)}`,
      `下限 = ${df * u2} ÷ ${fmt(chi2Crit(0.025, df), 3)} = ${fmt(lo, 2)}`,
      `上限 = ${df * u2} ÷ ${fmt(chi2Crit(0.975, df), 3)} = ${fmt(hi, 2)}`,
      `ひっかけ: 大きいχ²値が「下限」の分母に来る（割る数が大きい→商は小さい）。`,
    ],
    verify: {
      kind: 'ci_var',
      params: {
        df,
        u2,
        c025: chi2Crit(0.025, df),
        c975: chi2Crit(0.975, df),
        lower: askLower ? 1 : 0,
      },
      expected: ans,
    },
  };
}

export function sample_size(rng: RNG): SolvedQuestion {
  const sigma = pick(rng, [10, 15, 20, 25]);
  const e = pick(rng, [1, 2, 2.5, 5]);
  const { a } = pick(rng, [{ a: 0.025 }, { a: 0.05 }]);
  const z = zCrit(a);
  const n = (z * sigma) / e;
  const nSq = n * n;
  const ceil = Math.ceil(nSq);
  return {
    text: `母標準偏差 ${sigma} の母集団で、母平均の ${a === 0.025 ? 95 : 90}% 信頼区間の半幅を ${e} 以下にしたい。必要な標本サイズ n の最小値（切り上げ）を求めよ。`,
    choices: numChoices(
      rng,
      ceil,
      [
        { value: Math.ceil(n), why: '二乗を忘れた（zσ/E をそのまま）' },
        {
          value: Math.ceil((z * sigma * sigma) / e),
          why: 'σ² を掛けてしまった',
        },
        { value: Math.floor(nSq), why: '切り上げず切り捨てた' },
      ],
      0,
    ),
    steps: [
      `半幅 E = z·σ/√n → n = (zσ/E)²`,
      `z(${fmt(a, 3)}) = ${fmt(z, 4)}`,
      `n = (${fmt(z, 4)}×${sigma}÷${e})² = ${fmt(n, 3)}² = ${fmt(nSq, 1)}`,
      `切り上げて n = ${ceil}（標本数は常に切り上げ）`,
    ],
    verify: { kind: 'sample_size', params: { z, sigma, e }, expected: ceil },
  };
}
