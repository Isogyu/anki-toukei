import type { RNG } from '../lib/stats';
import { chi2Crit, randInt, pick, fmt } from '../lib/stats';
import { numChoices, textChoices, type SolvedQuestion } from './types';

export function chi2_expected(rng: RNG): SolvedQuestion {
  const r1 = randInt(rng, 30, 80);
  const r2 = randInt(rng, 30, 80);
  const c1 = randInt(rng, 30, 80);
  const c2 = randInt(rng, 30, 80);
  const N = r1 + r2 + c1 + c2;
  const e = (r1 * c1) / N;
  return {
    text: `2×2分割表: 行合計 ${r1}・${r2}、列合計 ${c1}・${c2}（N=${N}）。独立性検定で (行1, 列1) セルの期待度数を求めよ。`,
    choices: numChoices(
      rng,
      e,
      [
        { value: (r1 * c1) / (r1 + c1), why: 'N でなく行・列合計の和で割った' },
        { value: (r1 + c1) / N, why: '積でなく和を取った' },
        { value: r1 / 2, why: '単純に半分にした' },
      ],
      2,
    ),
    steps: [
      `期待度数 E_ij = (行合計 × 列合計) ÷ 全体`,
      `= ${r1} × ${c1} ÷ ${N} = ${fmt(e, 2)}`,
      `電卓: ${r1}×${c1} = ÷${N} =`,
    ],
    verify: { kind: 'chi2_e', params: { r1, c1, N }, expected: e },
  };
}

export function chi2_indep(rng: RNG): SolvedQuestion {
  // 2x2
  const a = randInt(rng, 15, 45);
  const b = randInt(rng, 15, 45);
  const c = randInt(rng, 15, 45);
  const d = randInt(rng, 15, 45);
  const N = a + b + c + d;
  const r1 = a + b;
  const r2 = c + d;
  const c1 = a + c;
  const c2 = b + d;
  const ea = (r1 * c1) / N;
  const eb = (r1 * c2) / N;
  const ec = (r2 * c1) / N;
  const ed = (r2 * c2) / N;
  const chi =
    ((a - ea) * (a - ea)) / ea +
    ((b - eb) * (b - eb)) / eb +
    ((c - ec) * (c - ec)) / ec +
    ((d - ed) * (d - ed)) / ed;
  const df = 1;
  const crit = chi2Crit(0.05, df);
  const reject = chi > crit;
  return {
    text: `2×2分割表 [[${a}, ${b}], [${c}, ${d}]] の独立性検定（有意水準5%）。χ² 統計量と結論は。`,
    choices: textChoices(
      rng,
      `χ² = ${fmt(chi, 2)}（df=1）→ ${reject ? 'H0を棄却' : 'H0を棄却できない'}`,
      [
        {
          text: `χ² = ${fmt(chi, 2)}（df=4）`,
          why: '自由度をセル数4にした（(r−1)(c−1)=1 が正しい）',
        },
        {
          text: `χ² = ${fmt(chi, 2)} → ${reject ? 'H0を棄却できない' : 'H0を棄却'}`,
          why: '結論の判断を誤った',
        },
        {
          text: `χ² = ${fmt(
            (a - ea) * (a - ea) +
              (b - eb) * (b - eb) +
              (c - ec) * (c - ec) +
              (d - ed) * (d - ed),
            2,
          )}`,
          why: '(O−E)² の総和だけで E で割らなかった',
        },
      ],
    ),
    steps: [
      `期待度数: ${fmt(ea, 1)}, ${fmt(eb, 1)}, ${fmt(ec, 1)}, ${fmt(ed, 1)}`,
      `χ² = Σ(O−E)²/E = ${fmt(chi, 2)}`,
      `自由度 (2−1)(2−1) = 1、χ²(0.05,1) = ${fmt(crit, 3)}`,
      `→ ${reject ? 'H0を棄却（2変数は独立でない）' : 'H0を棄却できない'}`,
      `電卓手順: 各セルで O−E → x² → ÷E → メモリ加算。`,
    ],
    verify: { kind: 'chi2_indep', params: { a, b, c, d }, expected: chi },
  };
}

export function chi2_gof(rng: RNG): SolvedQuestion {
  const k = pick(rng, [4, 5, 6]);
  const n = k * pick(rng, [10, 20]);
  const base = n / k;
  const obs = Array.from({ length: k }, (_, i) =>
    Math.round(base + (i === 0 ? randInt(rng, -4, 8) : randInt(rng, -3, 3))),
  );
  // 合計が n になるよう最後を調整
  obs[k - 1] = n - obs.slice(0, k - 1).reduce((x, y) => x + y, 0);
  const chi = obs.reduce((a, o) => a + ((o - base) * (o - base)) / base, 0);
  const df = k - 1;
  const crit = chi2Crit(0.05, df);
  const reject = chi > crit;
  return {
    text: `${k} カテゴリの出現度数が $${obs.join(',\\ ')}$（計 ${n}）。「各カテゴリは等確率」の適合度検定（5%）で χ² 統計量と自由度は。`,
    choices: textChoices(rng, `χ² = ${fmt(chi, 2)}、df = ${df}`, [
      {
        text: `χ² = ${fmt(chi, 2)}、df = ${k}`,
        why: '自由度をカテゴリ数 k にした（k−1 が正しい）',
      },
      {
        text: `χ² = ${fmt(
          obs.reduce((x, o) => x + (o - base) * (o - base), 0),
          2,
        )}、df = ${df}`,
        why: '(O−E)² の和だけで E で割らなかった',
      },
      {
        text: `χ² = ${fmt(chi, 2)}、df = ${k - 2}`,
        why: '自由度の引き過ぎ（推定母数がない場合は k−1）',
      },
    ]),
    steps: [
      `期待度数はすべて E = ${n}/${k} = ${fmt(base, 1)}`,
      `χ² = Σ(O−E)²/E = ${fmt(chi, 2)}`,
      `自由度 = k−1 = ${df}（推定した母数があればさらに引く）`,
      `χ²(0.05, ${df}) = ${fmt(crit, 3)} → ${reject ? '棄却' : '棄却できない'}`,
    ],
    verify: {
      kind: 'chi2_gof',
      params: { obs: obs.join(' ') },
      expected: chi,
    },
  };
}
