import type { RNG } from '../lib/stats';
import {
  zCrit,
  tCrit,
  chi2Crit,
  fCrit,
  normalCdf,
  randInt,
  pick,
  fmt,
  fmtP,
} from '../lib/stats';
import { numChoices, textChoices, type SolvedQuestion } from './types';

const SIDES = [
  { label: '両側', a: 0.025 },
  { label: '片側', a: 0.05 },
] as const;

export function test_mean_z(rng: RNG): SolvedQuestion {
  const side = pick(rng, SIDES);
  const mu0 = randInt(rng, 50, 100);
  const sigma = pick(rng, [8, 10, 12, 15]);
  const n = pick(rng, [25, 36, 64, 100]);
  const se = sigma / Math.sqrt(n);
  const z = pick(rng, [1.2, 1.8, 2.1, 2.4, 2.8]) * (rng() < 0.5 ? -1 : 1);
  const xbar = mu0 + z * se;
  const zabs = Math.abs(z);
  const crit = zCrit(side.a);
  const reject = zabs > crit;
  return {
    text: `母標準偏差 $\\sigma=${sigma}$ 既知の正規母集団。$H_0:\\mu=${mu0}$ に対し、大きさ ${n} の標本平均が ${fmt(xbar, 1)} であった。有意水準5%の${side.label}検定で検定統計量の絶対値と結論の組合せとして正しいものはどれか。`,
    choices: textChoices(
      rng,
      `|z| = ${fmt(zabs, 2)} → ${reject ? 'H0を棄却' : 'H0を棄却できない'}`,
      [
        {
          text: `|z| = ${fmt(zabs, 2)} → ${reject ? 'H0を棄却できない' : 'H0を棄却'}`,
          why: '結論の判断を誤った（臨界値との比較）',
        },
        {
          text: `|z| = ${fmt(Math.abs(xbar - mu0) / sigma, 2)} → ${Math.abs(xbar - mu0) / sigma > crit ? 'H0を棄却' : 'H0を棄却できない'}`,
          why: 'σ/√n でなく σ で割った（√n 忘れ）',
        },
        {
          text: `|z| = ${fmt(Math.abs(xbar - mu0) / (sigma * Math.sqrt(n)), 2)} → ${Math.abs(xbar - mu0) / (sigma * Math.sqrt(n)) > crit ? 'H0を棄却' : 'H0を棄却できない'}`,
          why: 'σ√n で割った（標準誤差の向きが逆）',
        },
      ],
    ),
    steps: [
      `z = (x̄−μ₀)/(σ/√n) = (${fmt(xbar, 1)}−${mu0})/(${sigma}/√${n}) = ${fmt(z, 2)}`,
      `${side.label}5% の臨界値 = ${fmt(crit, 3)}`,
      `|z|=${fmt(zabs, 2)} ${reject ? '>' : '≦'} ${fmt(crit, 3)} → ${reject ? 'H0を棄却（有意差あり）' : 'H0を棄却できない（有意とはいえない）'}`,
      `注意: 「棄却できない」は「H0が正しい」の意味ではない。`,
    ],
    verify: {
      kind: 'z_stat',
      params: { xbar, mu0, sigma, n },
      expected: Math.abs((xbar - mu0) / se),
    },
  };
}

export function test_mean_t(rng: RNG): SolvedQuestion {
  const mu0 = randInt(rng, 40, 100);
  const n = pick(rng, [9, 10, 16, 20, 25]);
  const u = randInt(rng, 5, 20);
  const se = u / Math.sqrt(n);
  const t = pick(rng, [1.3, 1.9, 2.3, 2.7, 3.2]) * (rng() < 0.5 ? -1 : 1);
  const xbar = mu0 + t * se;
  const tabs = Math.abs(t);
  const df = n - 1;
  const crit = tCrit(0.025, df);
  const reject = tabs > crit;
  return {
    text: `母分散未知の正規母集団。$H_0:\\mu=${mu0}$ に対し、大きさ ${n} の標本で x̄=${fmt(xbar, 1)}、不偏標準偏差 u=${u}。有意水準5%両側検定での統計量の絶対値と結論は。`,
    choices: textChoices(
      rng,
      `|t| = ${fmt(tabs, 2)} → ${reject ? 'H0を棄却' : 'H0を棄却できない'}`,
      [
        {
          text: `|t| = ${fmt(tabs, 2)} → ${reject ? 'H0を棄却できない' : 'H0を棄却'}`,
          why: '結論の判断を誤った',
        },
        {
          text: `|t| = ${fmt(tabs, 2)}（臨界値は z=1.96 と比較）`,
          why: 'σ未知なのに正規分布の臨界値を使った（t(n−1) を使う）',
        },
        {
          text: `|t| = ${fmt(Math.abs(xbar - mu0) / (u / n), 2)}`,
          why: 'u/√n でなく u/n で割った',
        },
      ],
    ),
    steps: [
      `t = (x̄−μ₀)/(u/√n) = (${fmt(xbar, 1)}−${mu0})/(${u}/√${n}) = ${fmt(t, 2)}`,
      `臨界値 t(0.025, ${df}) = ${fmt(crit, 3)}（自由度は n−1）`,
      `|t|=${fmt(tabs, 2)} ${reject ? '>' : '≦'} ${fmt(crit, 3)} → ${reject ? '棄却' : '棄却できない'}`,
      `電卓: x̄−μ₀ → ×√${n} → ÷${u}`,
    ],
    verify: {
      kind: 't_stat',
      params: { xbar, mu0, u, n },
      expected: Math.abs((xbar - mu0) / se),
    },
  };
}

export function test_prop(rng: RNG): SolvedQuestion {
  const p0 = pick(rng, [0.3, 0.4, 0.5, 0.6]);
  const n = pick(rng, [100, 200, 400]);
  const z = pick(rng, [1.1, 1.7, 2.1, 2.5]) * (rng() < 0.5 ? -1 : 1);
  const se = Math.sqrt((p0 * (1 - p0)) / n);
  const phat = p0 + z * se;
  const x = Math.round(phat * n);
  const ph = x / n;
  const zreal = (ph - p0) / se;
  const zabs = Math.abs(zreal);
  const crit = zCrit(0.025);
  const reject = zabs > crit;
  return {
    text: `$H_0:p=${fmtP(p0)}$ を検定する。${n} 件中 ${x} 件が該当した。有意水準5%両側検定で、統計量の絶対値と結論は。`,
    choices: textChoices(
      rng,
      `|z| = ${fmt(zabs, 2)} → ${reject ? 'H0を棄却' : 'H0を棄却できない'}`,
      [
        {
          text: `|z| = ${fmt(zabs, 2)} → ${reject ? 'H0を棄却できない' : 'H0を棄却'}`,
          why: '結論の判断を誤った',
        },
        {
          text: `|z| = ${fmt(Math.abs(ph - p0) / Math.sqrt((ph * (1 - ph)) / n), 2)}`,
          why: '分母に p₀ でなく p̂ を使った（検定では H0 の p₀ を使う）',
        },
        {
          text: `|z| = ${fmt((Math.abs(x - n * p0) / (n * p0) / se) * 100, 2)}`,
          why: '確率と度数を混ぜて計算した',
        },
      ],
    ),
    steps: [
      `p̂ = ${x}/${n} = ${fmt(ph, 3)}`,
      `z = (p̂−p₀)/√(p₀(1−p₀)/n) = (${fmt(ph, 3)}−${fmtP(p0)})/${fmt(se, 4)} = ${fmt(zreal, 2)}`,
      `臨界値 1.96 と比較 → ${reject ? '棄却' : '棄却できない'}`,
      `ひっかけ: 検定の標準誤差は p₀（帰無仮説の値）で計算する。区間推定では p̂。`,
    ],
    verify: { kind: 'z_prop', params: { ph, p0, n }, expected: zabs },
  };
}

export function test_var(rng: RNG): SolvedQuestion {
  const n = pick(rng, [10, 16, 20, 25]);
  const s0 = randInt(rng, 5, 15);
  const s02 = s0 * s0;
  const df = n - 1;
  const ratio = pick(rng, [0.5, 0.8, 1.5, 2.2, 3.0]);
  const chi = chi2Crit(0.025, df) * ratio;
  const u2 = (chi * s02) / df;
  const stat = (df * u2) / s02;
  const upper = chi2Crit(0.025, df);
  const lower = chi2Crit(0.975, df);
  const reject = stat > upper || stat < lower;
  return {
    text: `正規母集団で $H_0:\\sigma^2=${s02}$ を検定する。大きさ ${n} の標本で不偏分散 $u^2=${fmt(u2, 1)}$。有意水準5%両側検定で χ² 統計量と結論は。`,
    choices: textChoices(
      rng,
      `χ² = ${fmt(stat, 2)} → ${reject ? 'H0を棄却' : 'H0を棄却できない'}`,
      [
        {
          text: `χ² = ${fmt(stat, 2)} → ${reject ? 'H0を棄却できない' : 'H0を棄却'}`,
          why: '結論の判断を誤った',
        },
        {
          text: `χ² = ${fmt((n * u2) / s02, 2)}`,
          why: '(n−1)u² でなく n·u² を使った',
        },
        {
          text: `χ² = ${fmt(u2 / s02, 2)}`,
          why: '(n−1) を掛け忘れた',
        },
      ],
    ),
    steps: [
      `χ² = (n−1)u²/σ₀² = ${df}×${fmt(u2, 1)}÷${s02} = ${fmt(stat, 2)}`,
      `棄却域: χ² < ${fmt(lower, 3)} または χ² > ${fmt(upper, 3)}（自由度 ${df}）`,
      `→ ${reject ? 'H0を棄却' : 'H0を棄却できない'}`,
      `ひっかけ: 両側検定は表の「上側2.5%点」と「上側97.5%点」の両方を引く。`,
    ],
    verify: { kind: 'chi2_var', params: { df, u2, s02 }, expected: stat },
  };
}

export function test_f(rng: RNG): SolvedQuestion {
  const n1 = pick(rng, [10, 13, 16, 21]);
  const n2 = pick(rng, [10, 13, 16, 21]);
  const ratio = pick(rng, [1.2, 1.8, 2.5, 3.5, 4.5]);
  const u2s = randInt(rng, 5, 20);
  const u1s = u2s * ratio;
  const big = Math.max(u1s, u2s);
  const small = Math.min(u1s, u2s);
  const F = big / small;
  const dfb = (u1s >= u2s ? n1 : n2) - 1;
  const dfs = (u1s >= u2s ? n2 : n1) - 1;
  const crit = fCrit(0.025, dfb, dfs);
  const reject = F > crit;
  return {
    text: `群1（n=${n1}）の不偏分散 ${fmt(u1s, 1)}、群2（n=${n2}）の不偏分散 ${fmt(u2s, 1)}。等分散の両側検定（有意水準5%）で F 統計量と結論は。`,
    choices: textChoices(
      rng,
      `F = ${fmt(F, 2)} → ${reject ? 'H0を棄却' : 'H0を棄却できない'}`,
      [
        {
          text: `F = ${fmt(1 / F, 3)}`,
          why: '小さい分散÷大きい分散にした（慣例は大÷小で F>1 にして上側だけ見る）',
        },
        {
          text: `F = ${fmt(F, 2)} → ${reject ? 'H0を棄却できない' : 'H0を棄却'}`,
          why: '結論の判断を誤った',
        },
        {
          text: `F = ${fmt(Math.sqrt(F), 2)}`,
          why: '標準偏差の比を答えた（分散比でなく）',
        },
      ],
    ),
    steps: [
      `F = 大きい方の不偏分散 ÷ 小さい方 = ${fmt(big, 1)} ÷ ${fmt(small, 1)} = ${fmt(F, 2)}`,
      `自由度 (${dfb}, ${dfs})、F(0.025) = ${fmt(crit, 2)}`,
      `${fmt(F, 2)} ${reject ? '>' : '≦'} ${fmt(crit, 2)} → ${reject ? '棄却（分散に差あり）' : '棄却できない'}`,
      `大÷小にすれば上側臨界値だけで判定できる（両側5%なら上側2.5%点を使用）。`,
    ],
    verify: { kind: 'f_stat', params: { big, small }, expected: F },
  };
}

export function test_pooled_t(rng: RNG): SolvedQuestion {
  const n1 = pick(rng, [8, 10, 12]);
  const n2 = pick(rng, [8, 10, 12]);
  const u1 = randInt(rng, 6, 15);
  const u2 = randInt(rng, 6, 15);
  const diff = pick(rng, [3, 5, 8, 10]);
  const m1 = randInt(rng, 50, 80);
  const m2 = m1 + diff;
  const df = n1 + n2 - 2;
  const sp2 = ((n1 - 1) * u1 * u1 + (n2 - 1) * u2 * u2) / df;
  const sp = Math.sqrt(sp2);
  const se = sp * Math.sqrt(1 / n1 + 1 / n2);
  const t = Math.abs(diff) / se;
  const crit = tCrit(0.025, df);
  const reject = t > crit;
  return {
    text: `対応のない2標本（等分散と仮定）: 群1 n=${n1}, x̄=${m1}, u=${u1}；群2 n=${n2}, ȳ=${m2}, u=${u2}。母平均の差の両側t検定（5%）で統計量の絶対値と結論は。`,
    choices: textChoices(
      rng,
      `|t| = ${fmt(t, 2)} → ${reject ? 'H0を棄却' : 'H0を棄却できない'}`,
      [
        {
          text: `|t| = ${fmt(t, 2)} → ${reject ? 'H0を棄却できない' : 'H0を棄却'}`,
          why: '結論の判断を誤った',
        },
        {
          text: `|t| = ${fmt(Math.abs(diff) / (sp / Math.sqrt(df)), 2)}`,
          why: 'SE を sp·√(1/n₁+1/n₂) でなく sp/√df とした',
        },
        {
          text: `|t| = ${fmt(Math.abs(diff) / Math.sqrt((u1 * u1 + u2 * u2) / 2), 2)}`,
          why: 'プールせず分散の平均だけで割った（√(1/n₁+1/n₂) 忘れ）',
        },
      ],
    ),
    steps: [
      `プール分散 sp² = ((${n1}-1)·${u1}²+(${n2}-1)·${u2}²)/(${n1}+${n2}-2) = ${fmt(sp2, 2)}`,
      `SE = sp·√(1/${n1}+1/${n2}) = ${fmt(sp, 2)}×${fmt(Math.sqrt(1 / n1 + 1 / n2), 3)} = ${fmt(se, 3)}`,
      `t = |${m1}−${m2}| ÷ ${fmt(se, 3)} = ${fmt(t, 2)}`,
      `自由度 ${df}、t(0.025)=${fmt(crit, 3)} → ${reject ? '棄却' : '棄却できない'}`,
    ],
    verify: {
      kind: 'pooled_t',
      params: { n1, n2, u1, u2, diff: Math.abs(diff) },
      expected: t,
    },
  };
}

export function test_welch(rng: RNG): SolvedQuestion {
  const n1 = pick(rng, [10, 15, 20]);
  const n2 = pick(rng, [10, 15, 20]);
  const u1 = randInt(rng, 5, 10);
  const u2 = u1 * pick(rng, [2, 3]); // 不等分散っぽく
  const diff = pick(rng, [4, 6, 8]);
  const se = Math.sqrt((u1 * u1) / n1 + (u2 * u2) / n2);
  const t = diff / se;
  // Welch–Satterthwaite
  const v1 = (u1 * u1) / n1;
  const v2 = (u2 * u2) / n2;
  const df =
    ((v1 + v2) * (v1 + v2)) / ((v1 * v1) / (n1 - 1) + (v2 * v2) / (n2 - 1));
  return {
    text: `対応がなく等分散ともいえない2標本: 群1 n=${n1}, u₁=${u1}；群2 n=${n2}, u₂=${u2}；平均の差 |x̄−ȳ|=${diff}。Welchの検定で t 統計量を求めよ。`,
    choices: numChoices(
      rng,
      t,
      [
        {
          value:
            diff /
            (Math.sqrt(
              ((n1 - 1) * u1 * u1 + (n2 - 1) * u2 * u2) / (n1 + n2 - 2),
            ) *
              Math.sqrt(1 / n1 + 1 / n2)),
          why: 'プール分散の t を計算した（Welch はプールしない）',
        },
        {
          value: diff / Math.sqrt((u1 * u1 + u2 * u2) / (n1 + n2)),
          why: 'n₁,n₂ の割り方を誤った',
        },
        {
          value: diff / (u1 / Math.sqrt(n1) + u2 / Math.sqrt(n2)),
          why: '標準誤差をそのまま足した（分散は二乗和）',
        },
      ],
      2,
    ),
    steps: [
      `Welch: t = |x̄−ȳ| ÷ √(u₁²/n₁ + u₂²/n₂)`,
      `= ${diff} ÷ √(${u1}²/${n1} + ${u2}²/${n2}) = ${diff} ÷ ${fmt(se, 3)} = ${fmt(t, 2)}`,
      `自由度は Welch–Satterthwaite: ν = (v₁+v₂)² ÷ (v₁²/(n₁−1)+v₂²/(n₂−1)) = ${fmt(df, 1)}`,
      `（v_i = u_i²/n_i。普通電卓でも計算可能だが時間との相談。）`,
    ],
    verify: { kind: 'welch_t', params: { n1, n2, u1, u2, diff }, expected: t },
  };
}

export function test_paired(rng: RNG): SolvedQuestion {
  const n = pick(rng, [8, 10, 12]);
  const md = pick(rng, [2, 3, 4, 5]);
  const sdD = randInt(rng, 3, 8);
  const se = sdD / Math.sqrt(n);
  const t = md / se;
  const df = n - 1;
  const crit = tCrit(0.025, df);
  const reject = t > crit;
  return {
    text: `対応のあるデータ（例: 前後の測定）で差の平均が ${md}、差の不偏標準偏差が ${sdD}（n=${n}）。「差がない」の両側t検定（5%）で統計量と結論は。`,
    choices: textChoices(
      rng,
      `t = ${fmt(t, 2)} → ${reject ? 'H0を棄却' : 'H0を棄却できない'}`,
      [
        {
          text: `t = ${fmt(t, 2)} → ${reject ? 'H0を棄却できない' : 'H0を棄却'}`,
          why: '結論の判断を誤った',
        },
        {
          text: `t = ${fmt(md / sdD, 2)}`,
          why: '差の標準偏差でそのまま割った（√n 忘れ）',
        },
        {
          text: `（対応なしの）プール t を使う`,
          why: '対応ありを対応なしの2標本として扱った（差の1標本tが正解）',
        },
      ],
    ),
    steps: [
      `対応あり → 差 d_i = x_i − y_i の1標本 t 検定に帰着`,
      `t = d̄ ÷ (s_d/√n) = ${md} ÷ (${sdD}/√${n}) = ${fmt(t, 2)}`,
      `自由度 n−1 = ${df}、t(0.025) = ${fmt(crit, 3)} → ${reject ? '棄却' : '棄却できない'}`,
      `自由度は「対の数−1」。2標本の n₁+n₂−2 ではない。`,
    ],
    verify: { kind: 'paired_t', params: { md, sdD, n }, expected: t },
  };
}

export function test_two_prop(rng: RNG): SolvedQuestion {
  const n1 = pick(rng, [100, 150, 200]);
  const n2 = pick(rng, [100, 150, 200]);
  const p1 = pick(rng, [0.4, 0.5, 0.55]);
  const dp = pick(rng, [0.08, 0.1, 0.15]);
  const p2 = p1 - dp;
  const x1 = Math.round(p1 * n1);
  const x2 = Math.round(p2 * n2);
  const ph1 = x1 / n1;
  const ph2 = x2 / n2;
  const pp = (x1 + x2) / (n1 + n2);
  const se = Math.sqrt(pp * (1 - pp) * (1 / n1 + 1 / n2));
  const z = Math.abs(ph1 - ph2) / se;
  const crit = zCrit(0.025);
  const reject = z > crit;
  return {
    text: `比率の差の検定: 群1 ${n1}人中${x1}人、群2 ${n2}人中${x2}人が該当。「2群の比率に差がない」の両側検定（5%）で統計量の絶対値と結論は。`,
    choices: textChoices(
      rng,
      `|z| = ${fmt(z, 2)} → ${reject ? 'H0を棄却' : 'H0を棄却できない'}`,
      [
        {
          text: `|z| = ${fmt(z, 2)} → ${reject ? 'H0を棄却できない' : 'H0を棄却'}`,
          why: '結論の判断を誤った',
        },
        {
          text: `|z| = ${fmt(Math.abs(ph1 - ph2) / Math.sqrt((ph1 * (1 - ph1)) / n1 + (ph2 * (1 - ph2)) / n2), 2)}`,
          why: 'プール比率でなく各群の p̂ を使った（検定ではプール比率を使う）',
        },
        {
          text: `|z| = ${fmt(Math.abs(ph1 - ph2) / Math.sqrt((pp * (1 - pp)) / (n1 + n2)), 2)}`,
          why: '(1/n₁+1/n₂) の項を落とした',
        },
      ],
    ),
    steps: [
      `プール比率 p̄ = (x₁+x₂)/(n₁+n₂) = ${x1 + x2}/${n1 + n2} = ${fmt(pp, 3)}`,
      `SE = √(p̄(1−p̄)(1/n₁+1/n₂)) = ${fmt(se, 4)}`,
      `z = |${fmt(ph1, 3)}−${fmt(ph2, 3)}| ÷ ${fmt(se, 4)} = ${fmt(z, 2)}`,
      `臨界値 1.96 → ${reject ? '棄却' : '棄却できない'}`,
      `検定はプール比率、区間推定は各群の分散 — 使い分け注意。`,
    ],
    verify: { kind: 'two_prop_z', params: { ph1, ph2, n1, n2 }, expected: z },
  };
}

export function power_calc(rng: RNG): SolvedQuestion {
  const mu0 = pick(rng, [50, 100]);
  const sigma = pick(rng, [10, 15]);
  const n = pick(rng, [25, 36]);
  const se = sigma / Math.sqrt(n);
  const z = zCrit(0.05); // 片側検定
  const delta = pick(rng, [1, 1.5, 2]); // (μ1−μ0)/se
  const critX = mu0 + z * se;
  const mu1 = mu0 + delta * se;
  const power = 1 - normalCdf((critX - mu1) / se);
  return {
    text: `$H_0:\\mu=${mu0}$ vs $H_1:\\mu>${mu0}$ の片側検定（α=5%、σ=${sigma} 既知、n=${n}）。真の平均が ${fmt(mu1, 1)} のときの検出力を求めよ。`,
    choices: numChoices(
      rng,
      power,
      [
        {
          value: normalCdf((critX - mu1) / se),
          why: '検出力でなく第2種の誤り β を答えた',
        },
        { value: 1 - normalCdf(z), why: '有意水準 α を答えた' },
        { value: 0.95, why: '有意水準から類推した' },
      ],
      3,
    ),
    steps: [
      `棄却境界: x̄ > μ₀ + z(0.05)·σ/√n = ${mu0} + ${fmt(z, 3)}×${fmt(se, 2)} = ${fmt(critX, 2)}`,
      `真に μ=${fmt(mu1, 1)} のとき x̄〜N(${fmt(mu1, 1)}, ${fmt(se, 2)}²)`,
      `検出力 = P(x̄ > ${fmt(critX, 2)} | μ₁) = 1−Φ((${fmt(critX, 2)}−${fmt(mu1, 1)})/${fmt(se, 2)})`,
      `= 1−Φ(${fmt((critX - mu1) / se, 2)}) = ${fmt(power, 3)}`,
      `検出力 = 1 − β。`,
    ],
    verify: { kind: 'power', params: { z, delta }, expected: power },
  };
}

export function test_conclusion(rng: RNG): SolvedQuestion {
  const stat = pick(rng, [1.5, 1.8, 2.1, 2.5]);
  const crit = pick(rng, [1.96, 2.58]);
  const reject = stat > crit;
  const correct = reject
    ? '帰無仮説を棄却する（有意差がある）'
    : '帰無仮説を棄却できない（有意とはいえない）';
  return {
    text: `検定統計量の値が ${fmt(stat, 2)}、臨界値が ${fmt(crit, 2)} であった。適切な結論の述べ方はどれか。`,
    choices: textChoices(rng, correct, [
      {
        text: reject
          ? '帰無仮説を棄却できない'
          : '帰無仮説を採択する（帰無仮説は正しい）',
        why: reject
          ? '結論を逆にした'
          : '「棄却できない」≠「採択」。証拠不足で判断保留であり H0 が正しい証明ではない',
      },
      {
        text: '対立仮説を棄却する',
        why: '検定で判断するのは帰無仮説の棄却可否のみ',
      },
      {
        text: `p値は ${fmt(stat, 2)} なので有意`,
        why: '検定統計量とp値を混同した',
      },
    ]),
    steps: [
      `|統計量| ${fmt(stat, 2)} ${reject ? '>' : '≦'} 臨界値 ${fmt(crit, 2)}`,
      reject
        ? '→ 帰無仮説を棄却し「有意差あり」と結論'
        : '→ 帰無仮説を棄却できない。「H0を採択」とは書かない（無罪≠無実の証明）。',
    ],
  };
}
