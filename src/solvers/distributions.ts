import type { RNG } from '../lib/stats';
import {
  binomPmf,
  poissonPmf,
  geomPmf,
  hypergeomPmf,
  comb,
  factorial,
  normalCdf,
  randInt,
  pick,
  fmt,
  fmtP,
} from '../lib/stats';
import { numChoices, type SolvedQuestion } from './types';

export function binom_prob(rng: RNG): SolvedQuestion {
  const n = pick(rng, [4, 5, 6, 8]);
  const k = randInt(rng, 1, n - 1);
  const p = pick(rng, [0.2, 0.25, 0.3, 0.5, 0.6]);
  const ans = binomPmf(n, k, p);
  const theme = pick(rng, [
    `ある製品の不良率が ${fmtP(p)} のとき、`,
    `正解率 ${fmtP(p)} で勘で答えるテストで、`,
    `的中率 ${fmtP(p)} の予想が、`,
  ]);
  return {
    text: `${theme}${n} 回の独立試行でちょうど ${k} 回起こる確率を求めよ。`,
    choices: numChoices(
      rng,
      ans,
      [
        {
          value: Math.pow(p, k) * Math.pow(1 - p, n - k),
          why: '組合せ係数 C(n,k) を掛け忘れた',
        },
        { value: binomPmf(n, n - k, p), why: 'k と n−k を逆にした' },
        { value: binomPmf(n, k, 1 - p), why: 'p と 1−p を逆にした' },
      ],
      4,
    ),
    steps: [
      `P(X=${k}) = C(${n},${k}) × ${fmtP(p)}^${k} × ${fmtP(1 - p)}^${n - k}`,
      `C(${n},${k}) = ${comb(n, k)}`,
      `電卓: ${fmtP(p)}^${k} → ×${fmtP(1 - p)}^${n - k} → ×${comb(n, k)}`,
      `= ${fmt(ans, 4)}`,
    ],
    verify: { kind: 'binom_pmf', params: { n, k, p }, expected: ans },
  };
}

export function binom_ev(rng: RNG): SolvedQuestion {
  const n = pick(rng, [10, 20, 40, 50, 100]);
  const p = pick(rng, [0.1, 0.2, 0.3, 0.5]);
  const askVar = rng() < 0.5;
  if (askVar) {
    const v = n * p * (1 - p);
    return {
      text: `二項分布 B(${n}, ${fmtP(p)}) の分散を求めよ。`,
      choices: numChoices(
        rng,
        v,
        [
          { value: n * p, why: '期待値 np を答えた' },
          { value: Math.sqrt(v), why: '標準偏差を答えた' },
          { value: n * p * p, why: '(1−p) ではなく p を2回掛けた' },
        ],
        2,
      ),
      steps: [
        `V(X) = np(1−p) = ${n}×${fmtP(p)}×${fmtP(1 - p)} = ${fmt(v, 2)}`,
        `標準偏差なら √${fmt(v, 2)} = ${fmt(Math.sqrt(v), 2)}。`,
      ],
      verify: { kind: 'binom_var', params: { n, p }, expected: v },
    };
  }
  const e = n * p;
  return {
    text: `二項分布 B(${n}, ${fmtP(p)}) の期待値を求めよ。`,
    choices: numChoices(
      rng,
      e,
      [
        { value: n * p * (1 - p), why: '分散 np(1−p) を答えた' },
        { value: n * (1 - p), why: 'p と 1−p を逆にした' },
        { value: p / n, why: '割ってしまった' },
      ],
      2,
    ),
    steps: [`E(X) = np = ${n} × ${fmtP(p)} = ${fmt(e, 1)}`],
    verify: { kind: 'binom_ev', params: { n, p }, expected: e },
  };
}

export function poisson_prob(rng: RNG): SolvedQuestion {
  const lam = pick(rng, [1, 2, 3, 4]);
  const k = randInt(rng, 0, 3);
  const ans = poissonPmf(lam, k);
  const theme = pick(rng, [
    `1時間に平均 ${lam} 件の来客があるとき、`,
    `1日平均 ${lam} 回起こる故障が、`,
    `1か所あたり平均 ${lam} 個の欠陥が、`,
  ]);
  return {
    text: `${theme}ちょうど ${k} 回（個）起こる確率をポアソン分布で求めよ（$e^{-${lam}}=${fmt(Math.exp(-lam), 4)}$ を使ってよい）。`,
    choices: numChoices(
      rng,
      ans,
      [
        { value: Math.pow(lam, k) / factorial(k), why: 'e^{−λ} を掛け忘れた' },
        { value: poissonPmf(lam, k + 1), why: 'k の数え違い' },
        {
          value: Math.exp(-lam),
          why:
            k === 0
              ? '（正解と同じ形だが）λ^k の項を忘れている'
              : 'k=0 の式 P(X=0)=e^{−λ} を使った',
        },
      ],
      4,
    ),
    steps: [
      `P(X=${k}) = λ^k e^{−λ} / k! = ${lam}^${k} × ${fmt(Math.exp(-lam), 4)} ÷ ${k}!`,
      `${lam}^${k} = ${fmt(Math.pow(lam, k), 2)}、${k}! = ${factorial(k)}`,
      `= ${fmt(ans, 4)}`,
      `電卓: ${lam} の ${k} 乗 → ×${fmt(Math.exp(-lam), 4)} → ÷${factorial(k)}`,
    ],
    verify: { kind: 'poisson_pmf', params: { lam, k }, expected: ans },
  };
}

export function geom_prob(rng: RNG): SolvedQuestion {
  const p = pick(rng, [0.2, 0.25, 0.3, 0.5]);
  const k = randInt(rng, 2, 5);
  const ans = geomPmf(p, k);
  return {
    text: `成功率 ${fmtP(p)} の独立試行を繰り返す。${k} 回目で初めて成功する確率を求めよ。`,
    choices: numChoices(
      rng,
      ans,
      [
        {
          value: Math.pow(1 - p, k) * p,
          why: '失敗回数を k 回にした（成功回を含め過ぎ）',
        },
        { value: Math.pow(1 - p, k - 1), why: '最後の成功 p を掛け忘れた' },
        { value: Math.pow(p, k), why: '全回成功の確率を計算した' },
      ],
      4,
    ),
    steps: [
      `P(X=${k}) = (1−p)^{k−1} × p = ${fmtP(1 - p)}^${k - 1} × ${fmtP(p)}`,
      `= ${fmt(Math.pow(1 - p, k - 1), 4)} × ${fmtP(p)} = ${fmt(ans, 4)}`,
      `前 ${k - 1} 回は全部失敗、${k} 回目だけ成功。`,
    ],
    verify: { kind: 'geom_pmf', params: { p, k }, expected: ans },
  };
}

export function hypergeom_prob(rng: RNG): SolvedQuestion {
  const K = pick(rng, [3, 4, 5]);
  const N = K + randInt(rng, 8, 15);
  const n = pick(rng, [3, 4, 5]);
  const k = randInt(rng, 1, Math.min(K, n));
  const ans = hypergeomPmf(N, K, n, k);
  return {
    text: `当たり ${K} 本・はずれ ${N - K} 本（計 ${N} 本）のくじから、戻さずに ${n} 本引く。当たりがちょうど ${k} 本の確率を求めよ。`,
    choices: numChoices(
      rng,
      ans,
      [
        { value: binomPmf(n, k, K / N), why: '二項分布（復元抽出）を使った' },
        {
          value: hypergeomPmf(N, K, n, Math.min(k + 1, Math.min(K, n))),
          why: 'k の数え違い',
        },
        { value: comb(K, k) / comb(N, n), why: 'はずれ側の組合せを掛け忘れた' },
      ],
      4,
    ),
    steps: [
      `非復元なので超幾何分布。`,
      `P = C(${K},${k}) × C(${N - K},${n - k}) ÷ C(${N},${n})`,
      `= ${comb(K, k)} × ${comb(N - K, n - k)} ÷ ${comb(N, n)} = ${fmt(ans, 4)}`,
      `復元抽出なら二項分布になる点と対比。`,
    ],
    verify: { kind: 'hypergeom', params: { N, K, n, k }, expected: ans },
  };
}

export function normal_prob(rng: RNG): SolvedQuestion {
  const mu = pick(rng, [50, 60, 70, 100]);
  const sd = pick(rng, [5, 10, 15, 20]);
  const z = pick(rng, [0.5, 1, 1.5, 2, 0.64, 1.28, 1.96]);
  const above = rng() < 0.5;
  const x = mu + z * sd;
  const ans = above ? 1 - normalCdf(z) : normalCdf(z);
  return {
    text: `$X \\sim N(${mu}, ${sd}^2)$ のとき、$P(X ${above ? '>' : '<'} ${fmt(x, 0)})$ を求めよ（正規分布表を使う）。`,
    choices: numChoices(
      rng,
      ans,
      [
        {
          value: above ? normalCdf(z) : 1 - normalCdf(z),
          why: '上側と下側を逆にした（表の引き方）',
        },
        { value: 0.5, why: 'z=0 と読み違えた' },
        { value: ans / 2, why: '両側確率と混同して半分にした' },
      ],
      4,
    ),
    steps: [
      `標準化: z = (${fmt(x, 0)} − ${mu}) ÷ ${sd} = ${fmt(z, 2)}`,
      above
        ? `P(Z > ${fmt(z, 2)}) = 上側確率 = ${fmt(ans, 4)}（表で z=${fmt(z, 2)} の上側）`
        : `P(Z < ${fmt(z, 2)}) = ${fmt(ans, 4)}（= 1 − 上側確率 ${fmt(1 - ans, 4)}）`,
      `配布の表が「上側確率」なら左側は 1 から引く。`,
    ],
    verify: {
      kind: 'normal_prob',
      params: { z, above: above ? 1 : 0 },
      expected: ans,
    },
  };
}

export function normal_range(rng: RNG): SolvedQuestion {
  const mu = pick(rng, [50, 60, 100]);
  const sd = pick(rng, [5, 10]);
  const z1 = pick(rng, [-1, -1.5, -0.5]);
  const z2 = pick(rng, [0.5, 1, 1.5, 2]);
  const a = mu + z1 * sd;
  const b = mu + z2 * sd;
  const ans = normalCdf(z2) - normalCdf(z1);
  return {
    text: `$X \\sim N(${mu}, ${sd}^2)$ のとき、$P(${fmt(a, 0)} < X < ${fmt(b, 0)})$ を求めよ。`,
    choices: numChoices(
      rng,
      ans,
      [
        { value: normalCdf(z2 - z1), why: 'z の差をそのまま表に入れた' },
        { value: 1 - ans, why: '外側確率を答えた' },
        { value: normalCdf(z2) + normalCdf(z1), why: '引き算でなく足し算した' },
      ],
      4,
    ),
    steps: [
      `z_1 = (${fmt(a, 0)}−${mu})/${sd} = ${fmt(z1, 2)}、z_2 = (${fmt(b, 0)}−${mu})/${sd} = ${fmt(z2, 2)}`,
      `P = Φ(${fmt(z2, 2)}) − Φ(${fmt(z1, 2)}) = ${fmt(normalCdf(z2), 4)} − ${fmt(normalCdf(z1), 4)}`,
      `= ${fmt(ans, 4)}`,
    ],
    verify: { kind: 'normal_range', params: { z1, z2 }, expected: ans },
  };
}

export function binom_normal(rng: RNG): SolvedQuestion {
  const n = pick(rng, [50, 100, 200, 400]);
  const p = pick(rng, [0.3, 0.4, 0.5]);
  const mu = n * p;
  const sd = Math.sqrt(n * p * (1 - p));
  const k = randInt(
    rng,
    Math.floor(mu - 2 * sd) > 0 ? Math.floor(mu - 2 * sd) : 1,
    Math.floor(mu + 2 * sd),
  );
  // P(X ≥ k): 連続修正 → k−0.5
  const zc = (k - 0.5 - mu) / sd;
  const ans = 1 - normalCdf(zc);
  const zNo = (k - mu) / sd;
  const wrong = 1 - normalCdf(zNo);
  return {
    text: `$X \\sim B(${n}, ${fmtP(p)})$ のとき、$P(X \\ge ${k})$ を正規近似で求めよ（連続修正あり）。`,
    choices: numChoices(
      rng,
      ans,
      [
        { value: wrong, why: '連続修正（−0.5）をしなかった' },
        {
          value: 1 - normalCdf((k + 0.5 - mu) / sd),
          why: '連続修正の符号を逆にした（+0.5）',
        },
        {
          value: 1 - normalCdf((k - mu) / (n * p * (1 - p))),
          why: '標準偏差でなく分散で割った（√忘れ）',
        },
      ],
      4,
    ),
    steps: [
      `μ = np = ${fmt(mu, 1)}、σ = √(np(1−p)) = ${fmt(sd, 2)}`,
      `連続修正: P(X≥${k}) ≈ P(Y ≥ ${k}−0.5)`,
      `z = (${fmt(k - 0.5, 1)} − ${fmt(mu, 1)}) ÷ ${fmt(sd, 2)} = ${fmt(zc, 2)}`,
      `上側確率 = ${fmt(ans, 4)}`,
      `「${k} 回以上」を連続量に直すと境界は ${k}−0.5。`,
    ],
    verify: { kind: 'binom_norm', params: { n, p, k }, expected: ans },
  };
}

export function exp_prob(rng: RNG): SolvedQuestion {
  const lam = pick(rng, [0.5, 1, 2, 0.1, 0.2]);
  const t = randInt(rng, 1, 5);
  const ans = Math.exp(-lam * t);
  return {
    text: `平均到着間隔が $1/\\lambda$（$\\lambda=${fmtP(lam)}$）の指数分布で、待ち時間が ${t} を超える確率 $P(X>${t})$ を求めよ。`,
    choices: numChoices(
      rng,
      ans,
      [
        { value: 1 - ans, why: '累積確率 P(X≤t) を答えた' },
        {
          value: lam * Math.exp(-lam * t),
          why: '確率密度 f(t) を答えた（密度≠確率）',
        },
        { value: Math.exp(-lam), why: 't を掛け忘れた' },
      ],
      4,
    ),
    steps: [
      `指数分布の生存関数: P(X>t) = e^{−λt}`,
      `= e^{−${fmtP(lam)}×${t}} = e^{−${fmt(lam * t, 2)}} = ${fmt(ans, 4)}`,
      `電卓: ${fmt(lam * t, 2)} → e^x の前に符号を負に。`,
    ],
    verify: { kind: 'exp_sf', params: { lam, t }, expected: ans },
  };
}

export function unif_prob(rng: RNG): SolvedQuestion {
  const a = randInt(rng, 0, 10);
  const b = a + pick(rng, [4, 6, 8, 10, 12]);
  const c = randInt(rng, a, b - 2);
  const d = randInt(rng, c + 1, b);
  const ans = (d - c) / (b - a);
  const askVar = rng() < 0.3;
  if (askVar) {
    const v = ((b - a) * (b - a)) / 12;
    return {
      text: `区間 $[${a}, ${b}]$ の一様分布の分散を求めよ。`,
      choices: numChoices(
        rng,
        v,
        [
          { value: (b - a) / 12, why: '二乗を忘れた' },
          { value: ((b - a) * (b - a)) / 2, why: '12 でなく 2 で割った' },
          { value: (b - a) / 2, why: '期待値や範囲の半分と混同した' },
        ],
        2,
      ),
      steps: [
        `V(X) = (b−a)²/12 = ${b - a}² ÷ 12 = ${fmt(v, 2)}`,
        `E(X) = (a+b)/2 = ${fmt((a + b) / 2, 1)}。`,
      ],
      verify: { kind: 'unif_var', params: { a, b }, expected: v },
    };
  }
  return {
    text: `区間 $[${a}, ${b}]$ の一様分布で、$P(${c} < X < ${d})$ を求めよ。`,
    choices: numChoices(
      rng,
      ans,
      [
        { value: (d - c) / b, why: '分母を全長 b−a でなく b にした' },
        { value: 1 / (b - a), why: '確率密度をそのまま答えた' },
        { value: (d - c) / (b - a) + 0.1, why: '計算ミス' },
      ],
      3,
    ),
    steps: [
      `一様分布の確率は「長さの比」。`,
      `P = (${d}−${c}) ÷ (${b}−${a}) = ${d - c}/${b - a} = ${fmt(ans, 3)}`,
    ],
    verify: { kind: 'unif_prob', params: { c, d, a, b }, expected: ans },
  };
}
