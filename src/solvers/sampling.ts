import type { RNG } from '../lib/stats';
import { normalCdf, randInt, pick, fmt, fmtP } from '../lib/stats';
import { numChoices, type SolvedQuestion } from './types';

export function sample_mean_prob(rng: RNG): SolvedQuestion {
  const mu = pick(rng, [50, 60, 100, 170]);
  const sd = pick(rng, [10, 15, 20]);
  const n = pick(rng, [4, 9, 16, 25, 36, 100]);
  const se = sd / Math.sqrt(n);
  const z = pick(rng, [1, 1.5, 2, 2.5]);
  const x = mu + z * se;
  const above = rng() < 0.5;
  const ans = above ? 1 - normalCdf(z) : normalCdf(z);
  return {
    text: `母集団が $N(${mu}, ${sd}^2)$ に従うとき、大きさ ${n} の標本平均 $\\bar{X}$ が ${fmt(x, 1)} ${above ? 'を超える' : 'より小さい'}確率を求めよ。`,
    choices: numChoices(
      rng,
      ans,
      [
        {
          value: above ? normalCdf(z) : 1 - normalCdf(z),
          why: '上側・下側を逆にした',
        },
        {
          value: above
            ? 1 - normalCdf((x - mu) / sd)
            : normalCdf((x - mu) / sd),
          why: '標準誤差 σ/√n でなく σ で割った（√n を忘れた）',
        },
        {
          value: above
            ? 1 - normalCdf((x - mu) / (sd * Math.sqrt(n)))
            : normalCdf((x - mu) / (sd * Math.sqrt(n))),
          why: 'σ√n で割った（割る向きが逆）',
        },
      ],
      4,
    ),
    steps: [
      `標本平均の分布: $\\bar{X} \\sim N(\\mu, \\sigma^2/n)$`,
      `標準誤差 = σ/√n = ${sd}/√${n} = ${fmt(se, 2)}`,
      `z = (${fmt(x, 1)} − ${mu}) ÷ ${fmt(se, 2)} = ${fmt(z, 2)}`,
      `正規分布表より ${fmt(ans, 4)}`,
      `ひっかけ: σ で割ると ${fmt((x - mu) / sd, 2)} になって全く違う値になる。`,
    ],
    verify: {
      kind: 'sample_mean_prob',
      params: { z, above: above ? 1 : 0 },
      expected: ans,
    },
  };
}

export function clt_prob(rng: RNG): SolvedQuestion {
  const mu = pick(rng, [20, 30, 50]);
  const sd = pick(rng, [8, 10, 12]);
  const n = pick(rng, [36, 49, 64, 100]);
  const se = sd / Math.sqrt(n);
  const z = pick(rng, [1, 1.5, 2]);
  const x = mu + z * se;
  const ans = 1 - normalCdf(z);
  const pop = pick(rng, ['一様分布', '指数分布', '歪んだ分布']);
  return {
    text: `母平均 ${mu}・母標準偏差 ${sd} の${pop}に従う母集団から大きさ ${n} の標本を取る。標本平均が ${fmt(x, 1)} を超える確率を中心極限定理で近似せよ。`,
    choices: numChoices(
      rng,
      ans,
      [
        {
          value: 1 - normalCdf((x - mu) / sd),
          why: 'σ/√n でなく σ で割った（√n 忘れ）',
        },
        { value: normalCdf(z), why: '上側でなく下側確率を答えた' },
        {
          value: 1 - normalCdf(z / Math.sqrt(n)),
          why: 'z をさらに √n で割った',
        },
      ],
      4,
    ),
    steps: [
      `n が大きいので中心極限定理より $\\bar{X} \\approx N(\\mu, \\sigma^2/n)$`,
      `SE = ${sd}/√${n} = ${fmt(se, 2)}`,
      `z = (${fmt(x, 1)}−${mu})/${fmt(se, 2)} = ${fmt(z, 2)} → 上側確率 ${fmt(ans, 4)}`,
      `母集団の形（${pop}）は関係ない — それが中心極限定理の強み。`,
    ],
    verify: {
      kind: 'sample_mean_prob',
      params: { z, above: 1 },
      expected: ans,
    },
  };
}

export function sample_prop_prob(rng: RNG): SolvedQuestion {
  const p = pick(rng, [0.3, 0.4, 0.5, 0.6]);
  const n = pick(rng, [100, 200, 400]);
  const se = Math.sqrt((p * (1 - p)) / n);
  const z = pick(rng, [1, 1.5, 2]);
  const x = p + z * se;
  const ans = 1 - normalCdf(z);
  return {
    text: `母比率 $p=${fmtP(p)}$ の母集団から大きさ ${n} の標本を取る。標本比率が ${fmt(x, 3)} を超える確率を求めよ。`,
    choices: numChoices(
      rng,
      ans,
      [
        { value: normalCdf(z), why: '上側でなく下側を答えた' },
        {
          value: 1 - normalCdf((x - p) / (p * (1 - p))),
          why: 'p(1−p)/n の √ を忘れた',
        },
        { value: 0.5, why: '計算せず半分と思い込んだ' },
      ],
      4,
    ),
    steps: [
      `標本比率 $\\hat{p} \\approx N(p, p(1-p)/n)$`,
      `SE = √(p(1−p)/n) = √(${fmtP(p)}×${fmtP(1 - p)}/${n}) = ${fmt(se, 4)}`,
      `z = (${fmt(x, 3)}−${fmtP(p)})/${fmt(se, 4)} = ${fmt(z, 2)}`,
      `上側確率 ${fmt(ans, 4)}`,
    ],
    verify: { kind: 'sample_prop', params: { z }, expected: ans },
  };
}

export function df_concept(rng: RNG): SolvedQuestion {
  // 自由度の概念クイズ（計算ではないが標本分布カテゴリ）
  const n = randInt(rng, 10, 30);
  const kind = pick(rng, ['t', 'chi2'] as const);
  if (kind === 't') {
    return {
      text: `大きさ ${n} の標本から不偏分散を使って母平均を推定・検定するとき、用いる t 分布の自由度はいくつか。`,
      choices: numChoices(
        rng,
        n - 1,
        [
          { value: n, why: '標本サイズそのまま（−1 を忘れた）' },
          { value: n - 2, why: '回帰の自由度 n−2 と混同した' },
          { value: 2 * n - 2, why: '2標本プールの自由度と混同した' },
        ],
        0,
      ),
      steps: [
        `1標本の t 分布の自由度は n−1 = ${n - 1}`,
        `平均を1つ推定した分、自由度が1減ると考える。`,
      ],
      verify: { kind: 'df', params: { n, sub: 1 }, expected: n - 1 },
    };
  }
  return {
    text: `大きさ ${n} の正規標本の不偏分散 $u^2$ について、$(n-1)u^2/\\sigma^2$ が従う χ² 分布の自由度はいくつか。`,
    choices: numChoices(
      rng,
      n - 1,
      [
        { value: n, why: '標本サイズそのまま' },
        { value: n - 2, why: '自由度の数え違い' },
        { value: n + 1, why: '数え違い' },
      ],
      0,
    ),
    steps: [`母分散の推定・検定で使う χ² 分布の自由度は n−1 = ${n - 1}`],
    verify: { kind: 'df', params: { n, sub: 1 }, expected: n - 1 },
  };
}
