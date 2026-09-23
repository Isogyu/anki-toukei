import type { RNG } from '../lib/stats';
import { comb, perm, randInt, pick, fmt, fmtP, mean } from '../lib/stats';
import { numChoices, type SolvedQuestion } from './types';

export function comb_calc(rng: RNG): SolvedQuestion {
  const n = randInt(rng, 6, 10);
  const k = randInt(rng, 2, 4);
  const c = comb(n, k);
  const p = perm(n, k);
  return {
    text: `${n} 個の中から ${k} 個を選ぶ組合せの数 $\\binom{${n}}{${k}}$ を求めよ。`,
    choices: numChoices(
      rng,
      c,
      [
        { value: p, why: '順列（並べ方）と混同した' },
        { value: Math.pow(n, k), why: '重複組合せや n^k と混同した' },
        { value: comb(n, n - k - 1 < 0 ? k : k + 1), why: 'k の数え違い' },
      ],
      0,
    ),
    steps: [
      `C(${n},${k}) = ${n}! / (${k}! × ${n - k}!)`,
      `分子: ${Array.from({ length: k }, (_, i) => n - i).join('×')} = ${p}`,
      `分母: ${k}! = ${factorialStr(k)}`,
      `${p} ÷ ${factorialStr(k)} = ${c}`,
    ],
    verify: { kind: 'comb', params: { n, k }, expected: c },
  };
}

function factorialStr(k: number): string {
  let r = 1;
  for (let i = 2; i <= k; i++) r *= i;
  return String(r);
}

export function cond_prob(rng: RNG): SolvedQuestion {
  // 2×2 分割表
  const a = randInt(rng, 10, 30);
  const b = randInt(rng, 10, 30);
  const c = randInt(rng, 10, 30);
  const d = randInt(rng, 10, 30);
  const n = a + b + c + d;
  const ans = a / (a + b);
  return {
    text: `2×2分割表: 行1[${a}, ${b}]、行2[${c}, ${d}]（全 ${n} 人）。行1の人を1人選んだとき、列1に属する条件付き確率を求めよ。`,
    choices: numChoices(
      rng,
      ans,
      [
        { value: a / n, why: '条件付けず全体に対する割合を計算した' },
        { value: a / (a + c), why: '列の合計で割った（条件の取り違い）' },
        { value: (a + b) / n, why: '行の周辺確率を答えた' },
      ],
      3,
    ),
    steps: [
      `条件「行1」で絞る → 母数は ${a + b} 人`,
      `P(列1|行1) = ${a} ÷ ${a + b} = ${fmt(ans, 3)}`,
      `条件付き確率は「条件側の合計」で割る。全員 ${n} で割らない。`,
    ],
    verify: { kind: 'cond', params: { a, b }, expected: ans },
  };
}

export function bayes_ppv(rng: RNG): SolvedQuestion {
  // 感度・特異度 → 陽性的中率
  const prev = pick(rng, [0.01, 0.02, 0.05, 0.1]);
  const sens = pick(rng, [0.8, 0.9, 0.95]);
  const spec = pick(rng, [0.8, 0.9, 0.95]);
  const num = sens * prev;
  const den = num + (1 - spec) * (1 - prev);
  const ppv = num / den;
  return {
    text: `有病率 ${fmtP(prev)} の疾患について、感度 ${fmtP(sens)}・特異度 ${fmtP(spec)} の検査を受け陽性だった。この人が実際に疾患を持つ確率（陽性的中率）を求めよ。`,
    choices: numChoices(
      rng,
      ppv,
      [
        { value: sens, why: '感度そのものを答えた（事前確率を無視）' },
        { value: spec, why: '特異度と混同した' },
        {
          value: num / (num + spec * (1 - prev)),
          why: '偽陽性率 1−特異度 ではなく特異度を掛けた',
        },
      ],
      3,
    ),
    steps: [
      `真陽性の割合 = ${fmtP(sens)} × ${fmtP(prev)} = ${fmt(num, 4)}`,
      `偽陽性の割合 = (1−${fmtP(spec)}) × (1−${fmtP(prev)}) = ${fmt((1 - spec) * (1 - prev), 4)}`,
      `PPV = 真陽性 ÷ (真陽性 + 偽陽性) = ${fmt(num, 4)} ÷ ${fmt(den, 4)} = ${fmt(ppv, 3)}`,
      `電卓: ${fmtP(sens)}×${fmtP(prev)} → メモリ。 ${fmtP(1 - spec)}×${fmt(1 - prev, 2)} → メモリに足す → メモリで割る。`,
    ],
    verify: {
      kind: 'bayes_ppv',
      params: { prev, sens, spec },
      expected: ppv,
    },
  };
}

export function prob_union(rng: RNG): SolvedQuestion {
  const pa = pick(rng, [0.2, 0.3, 0.4, 0.5]);
  const pb = pick(rng, [0.2, 0.3, 0.4, 0.5]);
  const ans = pa + pb - pa * pb;
  return {
    text: `独立な事象 A, B で $P(A)=${fmtP(pa)}$、$P(B)=${fmtP(pb)}$。少なくとも一方が起こる確率 $P(A\\cup B)$ を求めよ。`,
    choices: numChoices(
      rng,
      ans,
      [
        { value: pa + pb, why: '重複部分 P(A∩B) を引き忘れた' },
        { value: pa * pb, why: '積事象 P(A∩B) を答えた' },
        { value: 1 - pa * pb, why: '余事象の取り方を誤った' },
      ],
      3,
    ),
    steps: [
      `加法定理: P(A∪B) = P(A) + P(B) − P(A∩B)`,
      `独立なので P(A∩B) = ${fmtP(pa)} × ${fmtP(pb)} = ${fmt(pa * pb, 2)}`,
      `P(A∪B) = ${fmtP(pa)} + ${fmtP(pb)} − ${fmt(pa * pb, 2)} = ${fmt(ans, 2)}`,
      `別解（余事象）: 1 − (1−${fmtP(pa)})(1−${fmtP(pb)}) = ${fmt(ans, 2)}`,
    ],
    verify: { kind: 'union_indep', params: { pa, pb }, expected: ans },
  };
}

export function expectation_discrete(rng: RNG): SolvedQuestion {
  const vals = [0, 1, 2, 3];
  const ps = [randInt(rng, 1, 4), randInt(rng, 1, 4), randInt(rng, 1, 4), 0];
  const s10 = ps[0] + ps[1] + ps[2];
  ps[3] = 10 - s10 > 0 ? 10 - s10 : 1;
  const total = ps.reduce((a, b) => a + b, 0);
  const probs = ps.map((x) => x / total);
  const ex = vals.reduce((a, v, i) => a + v * probs[i], 0);
  const ex2 = vals.reduce((a, v, i) => a + v * v * probs[i], 0);
  const vx = ex2 - ex * ex;
  const askVar = rng() < 0.5;
  const pStr = probs.map((p) => fmtP(p)).join(',\\ ');
  if (askVar) {
    return {
      text: `$P(X=x)$ が $x=${vals.join(',\\ ')}$ に対し $${pStr}$ の確率変数 X の分散 V(X) を求めよ。`,
      choices: numChoices(
        rng,
        vx,
        [
          { value: ex, why: '期待値を答えた' },
          { value: ex2, why: 'E(X²) をそのまま答えた（E(X)² を引き忘れ）' },
          { value: ex2 - ex, why: 'E(X)² でなく E(X) を引いた' },
        ],
        2,
      ),
      steps: [
        `E(X) = ${fmt(ex, 3)}`,
        `E(X²) = Σx²p = ${fmt(ex2, 3)}`,
        `V(X) = E(X²) − E(X)² = ${fmt(ex2, 3)} − ${fmt(ex * ex, 3)} = ${fmt(vx, 2)}`,
      ],
      verify: { kind: 'var_discrete', params: { probs: pStr }, expected: vx },
    };
  }
  return {
    text: `$P(X=x)$ が $x=${vals.join(',\\ ')}$ に対し $${pStr}$ の確率変数 X の期待値 E(X) を求めよ。`,
    choices: numChoices(
      rng,
      ex,
      [
        { value: ex2, why: 'E(X²) を答えた' },
        { value: mean(vals), why: '確率を掛けずに値だけ平均した' },
        { value: ex + 0.5, why: '計算ミス' },
      ],
      2,
    ),
    steps: [
      `E(X) = Σx·P(X=x) = ${vals.map((v, i) => `${v}×${fmtP(probs[i])}`).join(' + ')} = ${fmt(ex, 2)}`,
    ],
    verify: { kind: 'ev_discrete', params: { probs: pStr }, expected: ex },
  };
}

export function linear_ev(rng: RNG): SolvedQuestion {
  const ex = randInt(rng, 10, 60);
  const vx = randInt(rng, 4, 25);
  const a = pick(rng, [2, 3, 4, 5, -2]);
  const b = randInt(rng, 1, 20);
  const askVar = rng() < 0.6;
  if (askVar) {
    const ans = a * a * vx;
    return {
      text: `$E(X)=${ex}$、$V(X)=${vx}$ のとき、$V(${a}X+${b})$ を求めよ。`,
      choices: numChoices(
        rng,
        ans,
        [
          { value: a * vx + b, why: 'a² ではなく a を掛け、b を足した' },
          { value: a * vx, why: 'a を2乗し忘れた' },
          {
            value: a * a * vx + b,
            why: '定数 b を分散に足した（定数は分散に効かない）',
          },
        ],
        1,
      ),
      steps: [
        `V(aX+b) = a²V(X)（定数 b は分散に影響しない）`,
        `= (${a})² × ${vx} = ${a * a} × ${vx} = ${ans}`,
      ],
      verify: { kind: 'v_linear', params: { a, vx }, expected: ans },
    };
  }
  const ans = a * ex + b;
  return {
    text: `$E(X)=${ex}$、$V(X)=${vx}$ のとき、$E(${a}X+${b})$ を求めよ。`,
    choices: numChoices(
      rng,
      ans,
      [
        { value: a * ex, why: '定数 b を足し忘れた' },
        { value: a * a * ex + b, why: 'a を2乗した（分散の公式と混同）' },
        { value: ex + b, why: 'a を掛け忘れた' },
      ],
      1,
    ),
    steps: [
      `E(aX+b) = aE(X)+b = ${a}×${ex}+${b} = ${ans}`,
      `期待値は定数シフトがそのまま効く。分散には効かない点と対比して覚える。`,
    ],
    verify: { kind: 'e_linear', params: { a, ex, b }, expected: ans },
  };
}

export function sum_indep(rng: RNG): SolvedQuestion {
  const v1 = randInt(rng, 4, 20);
  const v2 = randInt(rng, 4, 20);
  const minus = rng() < 0.5;
  const ans = v1 + v2; // 独立なら差でも和
  return {
    text: `独立な確率変数 X, Y で $V(X)=${v1}$、$V(Y)=${v2}$。$V(X${minus ? '-' : '+'}Y)$ を求めよ。`,
    choices: numChoices(
      rng,
      ans,
      [
        {
          value: Math.abs(v1 - v2),
          why: minus
            ? '差だからと分散を引いた（分散は符号で引かない）'
            : '絶対値の差を取った',
        },
        { value: Math.sqrt(v1 + v2), why: '標準偏差と混同した' },
        { value: 2 * (v1 + v2), why: '2倍してしまった' },
      ],
      1,
    ),
    steps: [
      `独立なら V(X±Y) = V(X) + V(Y)（差でも足す！）`,
      `= ${v1} + ${v2} = ${ans}`,
      `共分散がある場合は ±2Cov(X,Y) が付く。`,
    ],
    verify: { kind: 'v_sum_indep', params: { v1, v2 }, expected: ans },
  };
}

export function odds_ratio(rng: RNG): SolvedQuestion {
  const a = randInt(rng, 20, 80);
  const b = randInt(rng, 20, 80);
  const c = randInt(rng, 20, 80);
  const d = randInt(rng, 20, 80);
  const or = (a * d) / (b * c);
  const rr = a / (a + b) / (c / (c + d));
  return {
    text: `ケースコントロール研究: 症例群 ${a + b} 人中 曝露あり ${a} 人、対照群 ${c + d} 人中 曝露あり ${c} 人。オッズ比を求めよ。`,
    choices: numChoices(
      rng,
      or,
      [
        { value: rr, why: 'リスク比（コホート研究の指標）を計算した' },
        { value: (a * c) / (b * d), why: '対角の掛け方を誤った' },
        { value: a / c, why: '曝露者数の比を取っただけ' },
      ],
      2,
    ),
    steps: [
      `症例群のオッズ = ${a}/${b}、対照群のオッズ = ${c}/${d}`,
      `オッズ比 = (${a}×${d}) ÷ (${b}×${c}) = ${fmt(or, 2)}`,
      `電卓: ${a}×${d} = ÷${b} = ÷${c} =`,
    ],
    verify: { kind: 'odds_ratio', params: { a, b, c, d }, expected: or },
  };
}

export function risk_ratio(rng: RNG): SolvedQuestion {
  const a = randInt(rng, 20, 60);
  const b = randInt(rng, 20, 60);
  const c = randInt(rng, 10, 40);
  const d = randInt(rng, 40, 90);
  const rr = a / (a + b) / (c / (c + d));
  const or = (a * d) / (b * c);
  return {
    text: `コホート研究: 曝露群 ${a + b} 人中 発症 ${a} 人、非曝露群 ${c + d} 人中 発症 ${c} 人。リスク比（相対リスク）を求めよ。`,
    choices: numChoices(
      rng,
      rr,
      [
        { value: or, why: 'オッズ比を計算した（ケースコントロールの指標）' },
        { value: a / (a + b) - c / (c + d), why: 'リスク差を計算した' },
        { value: a / c, why: '人数の比を取っただけ' },
      ],
      2,
    ),
    steps: [
      `曝露群のリスク = ${a}/(${a}+${b}) = ${fmt(a / (a + b), 3)}`,
      `非曝露群のリスク = ${c}/(${c}+${d}) = ${fmt(c / (c + d), 3)}`,
      `リスク比 = ${fmt(a / (a + b), 3)} ÷ ${fmt(c / (c + d), 3)} = ${fmt(rr, 2)}`,
    ],
    verify: { kind: 'risk_ratio', params: { a, b, c, d }, expected: rr },
  };
}
