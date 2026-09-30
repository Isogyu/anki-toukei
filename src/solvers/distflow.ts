/** 確率分布の「判断 → 平均・分散 → 標準化 → 計算」を鍛えるソルバー群。
 *  - dist_moments / std_z / std_prob / xbar_std / binom_norm_calc: 単発の数値問題
 *  - flow_*: ステップ式問題（stages を順に解いてから最終問題に答える）
 *  すべてパラメータは乱数生成、正解はその場で計算し、verify で scipy 照合する。 */
import type { RNG } from '../lib/stats';
import {
  normalCdf,
  poissonPmf,
  factorial,
  tCrit,
  chi2Crit,
  fCrit,
  randInt,
  pick,
  fmt,
  fmtP,
} from '../lib/stats';
import {
  numChoices,
  textChoices,
  type Stage,
  type SolvedQuestion,
  type VerifyPayload,
} from './types';

// ---------------------------------------------------------------------------
// 共通ヘルパー
// ---------------------------------------------------------------------------

/** 小数の表示（末尾の0を落とす） */
function n2(x: number, digits = 2): string {
  return String(parseFloat(x.toFixed(digits)));
}

type Op = 'ge' | 'le' | 'gt' | 'lt';
const OP_CODE: Record<Op, number> = { ge: 0, le: 1, gt: 2, lt: 3 };
const OP_TEX: Record<Op, string> = {
  ge: '\\ge',
  le: '\\le',
  gt: '>',
  lt: '<',
};
const OP_JA: Record<Op, string> = {
  ge: '以上',
  le: '以下',
  gt: 'より多い',
  lt: '未満',
};

/** 連続補正後の境界と、上側確率かどうか */
function ccBoundary(k: number, op: Op): { b: number; upper: boolean } {
  switch (op) {
    case 'ge':
      return { b: k - 0.5, upper: true };
    case 'gt':
      return { b: k + 0.5, upper: true };
    case 'le':
      return { b: k + 0.5, upper: false };
    case 'lt':
      return { b: k - 0.5, upper: false };
  }
}

/** 連続補正の向きを逆にしたときの境界（典型ミス） */
function ccWrong(k: number, op: Op): number {
  const { b } = ccBoundary(k, op);
  return 2 * k - b;
}

function tail(z: number, upper: boolean): number {
  return upper ? 1 - normalCdf(z) : normalCdf(z);
}

const DIST_WHY = {
  binom: '二項分布は「回数 n が決まった独立試行の成功回数」',
  poisson:
    'ポアソン分布は「一定時間・空間で平均 λ 回起こる事象の回数」（n が決まっていない）',
  normal: '正規分布は身長・重さなどの連続量（離散の回数そのものではない）',
  hyper: '超幾何分布は有限個から「戻さずに」取るときの当たり数',
  geom: '幾何分布は「初めて成功するまで」の回数',
  exp: '指数分布は次に起こるまでの「待ち時間」（連続量）',
  t: 't分布は母分散未知で母平均を推測するときの統計量の分布',
  chi2: 'χ²分布は分散（ばらつき）そのものを推測するときの分布',
  F: 'F分布は2つの分散の比を比べるときの分布',
  z: '標準正規分布は母分散既知の平均や、大標本の比率の推測で使う',
} as const;

// ---------------------------------------------------------------------------
// 1. 平均・分散・標準偏差（二項の SD／ポアソン／正規／標本平均）
// ---------------------------------------------------------------------------

export function dist_moments(rng: RNG): SolvedQuestion {
  const kind = pick(rng, [
    'binom_sd',
    'pois_var',
    'pois_sd',
    'norm_sd',
    'norm_var',
    'xbar_var',
    'xbar_sd',
  ] as const);

  if (kind === 'binom_sd') {
    const [n, p] = pick(rng, [
      [100, 0.1],
      [100, 0.2],
      [100, 0.5],
      [400, 0.1],
      [400, 0.2],
      [400, 0.5],
      [225, 0.2],
      [900, 0.1],
    ] as const);
    const v = n * p * (1 - p);
    const sd = Math.sqrt(v);
    return {
      text: `$X \\sim B(${n}, ${fmtP(p)})$ の標準偏差を求めよ。`,
      choices: numChoices(
        rng,
        sd,
        [
          { value: v, why: '分散 np(1−p) のまま答えた（√を取り忘れ）' },
          { value: Math.sqrt(n * p), why: '√(np) — (1−p) を掛け忘れた' },
          { value: n * p, why: '期待値 np を答えた' },
          { value: Math.sqrt(n) * p * (1 - p), why: '√ を n だけに掛けた' },
        ],
        2,
      ),
      steps: [
        `$V(X)=np(1-p)=${n}\\times${fmtP(p)}\\times${fmtP(1 - p)}=${n2(v)}$`,
        `$\\sigma=\\sqrt{np(1-p)}=\\sqrt{${n2(v)}}=${n2(sd)}$`,
        `分散→標準偏差は √ を取る。「分散と標準偏差の混同」は最頻出ミス。`,
      ],
      verify: { kind: 'binom_sd', params: { n, p }, expected: sd },
    };
  }

  if (kind === 'pois_var' || kind === 'pois_sd') {
    const lam = pick(rng, [4, 9, 16, 25, 2.25, 6.25]);
    const ctx = pick(rng, [
      `1時間あたりの問い合わせ件数が平均 ${n2(lam)} 件のポアソン分布に従う。`,
      `1ページあたりの誤植の数が $Po(${n2(lam)})$ に従う。`,
      `1日の故障件数 X が平均 ${n2(lam)} のポアソン分布に従う。`,
    ]);
    if (kind === 'pois_var') {
      return {
        text: `${ctx}件数の分散 $V(X)$ を求めよ。`,
        choices: numChoices(
          rng,
          lam,
          [
            { value: Math.sqrt(lam), why: '標準偏差 √λ を答えた' },
            { value: lam * lam, why: '分散を λ² と覚えていた' },
            {
              value: lam * (1 - 1 / lam),
              why: '二項分布の np(1−p) の形を無理に当てはめた',
            },
          ],
          2,
        ),
        steps: [
          `ポアソン分布は $E(X)=V(X)=\\lambda$。`,
          `よって $V(X)=${n2(lam)}$。`,
          `「平均と分散が等しい」がポアソン分布の目印（二項分布は分散 < 平均）。`,
        ],
        verify: { kind: 'poisson_var', params: { lam }, expected: lam },
      };
    }
    const sd = Math.sqrt(lam);
    return {
      text: `${ctx}件数の標準偏差を求めよ。`,
      choices: numChoices(
        rng,
        sd,
        [
          { value: lam, why: '分散 λ をそのまま答えた（√忘れ）' },
          { value: lam / 2, why: '半分にした（根拠なし）' },
          { value: 1 / sd, why: '1/√λ と逆数にした' },
        ],
        2,
      ),
      steps: [
        `$V(X)=\\lambda=${n2(lam)}$ → 標準偏差は $\\sqrt{\\lambda}=${n2(sd)}$。`,
      ],
      verify: { kind: 'poisson_sd', params: { lam }, expected: sd },
    };
  }

  if (kind === 'norm_sd' || kind === 'norm_var') {
    const mu = pick(rng, [50, 60, 100, 170]);
    const sd = pick(rng, [3, 4, 5, 6, 8, 12]);
    const v = sd * sd;
    // N(μ, σ²) の第2引数は分散。数字で書かれていると σ と誤読しやすい。
    if (kind === 'norm_sd') {
      return {
        text: `$X \\sim N(${mu}, ${v})$ のとき、X の標準偏差を求めよ。`,
        choices: numChoices(
          rng,
          sd,
          [
            { value: v, why: 'N(μ, σ²) の第2引数を標準偏差と読んだ' },
            { value: v / 2, why: '分散を2で割った' },
            { value: sd * 2, why: '2σ と混同した' },
          ],
          2,
        ),
        steps: [
          `$N(\\mu,\\sigma^2)$ の第2引数は**分散** $\\sigma^2=${v}$。`,
          `標準偏差 $\\sigma=\\sqrt{${v}}=${sd}$。`,
          `$N(${mu}, ${sd}^2)$ と書かれていれば σ=${sd} とすぐ読める。表記を確認。`,
        ],
        verify: { kind: 'sqrt', params: { x: v }, expected: sd },
      };
    }
    return {
      text: `平均 ${mu}、標準偏差 ${sd} の正規分布を $N(\\mu, \\sigma^2)$ の形で書くとき、第2引数（分散）の値を求めよ。`,
      choices: numChoices(
        rng,
        v,
        [
          { value: sd, why: '標準偏差をそのまま入れた' },
          { value: 2 * sd, why: '2倍した（二乗と混同）' },
          { value: Math.sqrt(sd), why: '√を取った（逆操作）' },
        ],
        0,
      ),
      steps: [`分散 = 標準偏差² = ${sd}² = ${v}。$N(${mu}, ${v})$ と書く。`],
      verify: { kind: 'square', params: { x: sd }, expected: v },
    };
  }

  // 標本平均
  const mu = pick(rng, [50, 60, 100]);
  const sd = pick(rng, [6, 8, 10, 12, 15, 20]);
  const n = pick(rng, [4, 9, 16, 25, 36, 100]);
  const v = (sd * sd) / n;
  const se = sd / Math.sqrt(n);
  if (kind === 'xbar_var') {
    return {
      text: `母平均 ${mu}、母標準偏差 ${sd} の母集団から大きさ ${n} の無作為標本を取る。標本平均 $\\bar{X}$ の分散 $V(\\bar{X})$ を求めよ。`,
      choices: numChoices(
        rng,
        v,
        [
          { value: se, why: '標準誤差 σ/√n を答えた（分散ではない）' },
          { value: (sd * sd) / Math.sqrt(n), why: 'σ²/√n — n と √n の混同' },
          { value: sd / n, why: 'σ/n — σ と σ² の混同' },
          { value: sd * sd, why: '母分散 σ² のまま（n で割り忘れ）' },
        ],
        2,
      ),
      steps: [
        `$V(\\bar{X})=\\dfrac{\\sigma^2}{n}=\\dfrac{${sd}^2}{${n}}=\\dfrac{${sd * sd}}{${n}}=${n2(v)}$`,
        `標準偏差（標準誤差）なら $\\sigma/\\sqrt{n}=${n2(se)}$。`,
        `分散は「n で割る」、標準偏差は「√n で割る」。`,
      ],
      verify: { kind: 'xbar_var', params: { sd, n }, expected: v },
    };
  }
  return {
    text: `母平均 ${mu}、母標準偏差 ${sd} の母集団から大きさ ${n} の無作為標本を取る。標本平均 $\\bar{X}$ の標準偏差（標準誤差）を求めよ。`,
    choices: numChoices(
      rng,
      se,
      [
        { value: v, why: '分散 σ²/n を答えた（√忘れ）' },
        { value: sd / n, why: 'σ/n — √n でなく n で割った' },
        { value: sd, why: '母標準偏差のまま（n の効果を忘れた）' },
        { value: sd * Math.sqrt(n), why: 'σ√n — 割る向きが逆' },
      ],
      2,
    ),
    steps: [
      `$SD(\\bar{X})=\\dfrac{\\sigma}{\\sqrt{n}}=\\dfrac{${sd}}{\\sqrt{${n}}}=\\dfrac{${sd}}{${n2(Math.sqrt(n))}}=${n2(se)}$`,
      `n が大きいほど標本平均のばらつきは小さくなる（母集団のばらつき σ は変わらない）。`,
    ],
    verify: { kind: 'xbar_se', params: { sd, n }, expected: se },
  };
}

// ---------------------------------------------------------------------------
// 2. 標準化（X→Z、Z→X、何σ離れているか）
// ---------------------------------------------------------------------------

export function std_z(rng: RNG): SolvedQuestion {
  const kind = pick(rng, ['x2z', 'x2z_var', 'z2x', 'sigma_away'] as const);
  const mu = pick(rng, [50, 60, 70, 100, 170]);
  const sd = pick(rng, [4, 5, 8, 10, 15, 20]);

  if (kind === 'z2x') {
    const z = pick(rng, [1, 1.5, 2, -1, -1.5, 1.28, 1.64, 1.96]);
    const x = mu + z * sd;
    return {
      text: `$X \\sim N(${mu}, ${sd}^2)$ で、標準化した値が $Z=${z}$ となる X の値を求めよ。`,
      choices: numChoices(
        rng,
        x,
        [
          { value: mu - z * sd, why: '符号を逆にした（μ − zσ）' },
          { value: mu + z * sd * sd, why: 'σ でなく σ² を掛けた' },
          { value: z * sd, why: '平均 μ を足し忘れた' },
          { value: mu + z, why: 'σ を掛け忘れた' },
        ],
        2,
      ),
      steps: [
        `$Z=\\dfrac{X-\\mu}{\\sigma}$ を X について解くと $X=\\mu+Z\\sigma$。`,
        `$X=${mu}+${z}\\times${sd}=${n2(x)}$`,
      ],
      verify: { kind: 'std_x', params: { mu, sd, z }, expected: x },
    };
  }

  const zTarget = pick(rng, [0.5, 1, 1.5, 2, 2.5, -0.5, -1, -1.5, -2]);
  const x = mu + zTarget * sd;
  const z = (x - mu) / sd;

  if (kind === 'sigma_away') {
    const az = Math.abs(z);
    return {
      text: `ある試験の得点は $N(${mu}, ${sd}^2)$ に従う。${n2(x)} 点は平均から標準偏差の何倍離れているか。`,
      choices: numChoices(
        rng,
        az,
        [
          { value: Math.abs(x - mu) / (sd * sd), why: '分散 σ² で割った' },
          { value: Math.abs(x - mu), why: '差をそのまま答えた（σで割り忘れ）' },
          { value: x / sd, why: '平均を引かずに x/σ とした' },
        ],
        2,
      ),
      steps: [
        `$|z|=\\dfrac{|x-\\mu|}{\\sigma}=\\dfrac{|${n2(x)}-${mu}|}{${sd}}=${n2(az)}$`,
        `「平均から何σ離れているか」＝標準化した値の絶対値。`,
      ],
      verify: { kind: 'std_z_abs', params: { x, mu, sd }, expected: az },
    };
  }

  const varForm = kind === 'x2z_var';
  const dist = varForm ? `N(${mu}, ${sd * sd})` : `N(${mu}, ${sd}^2)`;
  return {
    text: `$X \\sim ${dist}$ のとき、$X=${n2(x)}$ を標準化した値 $Z$ を求めよ。`,
    choices: numChoices(
      rng,
      z,
      [
        {
          value: (x - mu) / (sd * sd),
          why: varForm
            ? 'N(μ, σ²) の第2引数（分散）でそのまま割った'
            : '分散 σ² で割った',
        },
        { value: (mu - x) / sd, why: '引き算の順序が逆（μ − x）' },
        { value: x / sd, why: '平均 μ を引き忘れた' },
        { value: x - mu, why: 'σ で割り忘れた' },
      ],
      2,
    ),
    steps: [
      varForm
        ? `第2引数は分散なので $\\sigma=\\sqrt{${sd * sd}}=${sd}$。`
        : `$\\sigma=${sd}$。`,
      `$Z=\\dfrac{X-\\mu}{\\sigma}=\\dfrac{${n2(x)}-${mu}}{${sd}}=${n2(z)}$`,
      `標準化すると平均0・標準偏差1の $N(0,1)$ になり、1枚の正規分布表で確率が読める。`,
    ],
    verify: { kind: 'std_z', params: { x, mu, sd }, expected: z },
  };
}

// ---------------------------------------------------------------------------
// 3. 標準化して確率（下側・上側・両側）
// ---------------------------------------------------------------------------

export function std_prob(rng: RNG): SolvedQuestion {
  const kind = pick(rng, [
    'lower',
    'upper',
    'lower_neg',
    'inside',
    'outside',
  ] as const);
  const mu = pick(rng, [50, 60, 100, 170]);
  const sd = pick(rng, [4, 6, 8, 10, 12, 20]);
  const zAbs = pick(rng, [0.5, 1, 1.5, 2, 2.5]);
  const d = zAbs * sd;
  const ctx = pick(rng, [
    '成人男性の身長 X',
    'ある製品の重さ X',
    '試験の得点 X',
    '部品の長さ X',
  ]);

  if (kind === 'inside' || kind === 'outside') {
    const inside = 2 * normalCdf(zAbs) - 1;
    const outside = 1 - inside;
    const ans = kind === 'inside' ? inside : outside;
    const text =
      kind === 'inside'
        ? `${ctx}が $N(${mu}, ${sd}^2)$ に従う。$P(${n2(mu - d)} < X < ${n2(mu + d)})$ を求めよ。`
        : `${ctx}が $N(${mu}, ${sd}^2)$ に従う。平均から ${n2(d)} 以上離れる確率 $P(|X-${mu}| \\ge ${n2(d)})$ を求めよ。`;
    const up = 1 - normalCdf(zAbs);
    return {
      text,
      choices: numChoices(
        rng,
        ans,
        [
          {
            value: kind === 'inside' ? outside : inside,
            why: '内側と外側（両側）を取り違えた',
          },
          {
            value: kind === 'inside' ? normalCdf(zAbs) : up,
            why: '片側だけ計算した（2倍／両側の処理を忘れた）',
          },
          {
            value:
              kind === 'inside'
                ? 2 * normalCdf(d / (sd * sd)) - 1
                : 2 * (1 - normalCdf(d / (sd * sd))),
            why: '標準化で σ² で割った',
          },
        ],
        4,
      ),
      steps: [
        `$z=\\dfrac{${n2(d)}}{${sd}}=${n2(zAbs)}$`,
        `上側確率 $P(Z>${n2(zAbs)})=${fmt(up, 4)}$`,
        kind === 'inside'
          ? `対称性より $P(|Z|<${n2(zAbs)})=1-2\\times${fmt(up, 4)}=${fmt(ans, 4)}$`
          : `両側なので $P(|Z|\\ge${n2(zAbs)})=2\\times${fmt(up, 4)}=${fmt(ans, 4)}$`,
        `正規分布は左右対称 → 片側の値を2倍・1から引くで済む。`,
      ],
      verify: {
        kind: 'normal_two',
        params: { z: zAbs, outside: kind === 'outside' ? 1 : 0 },
        expected: ans,
      },
    };
  }

  // 片側
  const z = kind === 'lower_neg' ? -zAbs : zAbs;
  const x = mu + z * sd;
  const upper = kind === 'upper';
  const ans = tail(z, upper);
  const opTex = upper ? '>' : '<';
  return {
    text: `${ctx}が $N(${mu}, ${sd}^2)$ に従う。$P(X ${opTex} ${n2(x)})$ を求めよ。`,
    choices: numChoices(
      rng,
      ans,
      [
        { value: 1 - ans, why: '上側と下側を取り違えた' },
        {
          value: tail((x - mu) / (sd * sd), upper),
          why: '標準化で σ² で割った',
        },
        { value: ans / 2, why: '両側と混同して半分にした' },
        {
          value: tail(-z, upper),
          why: 'z の符号（平均より上か下か）を取り違えた',
        },
      ],
      4,
    ),
    steps: [
      `$z=\\dfrac{${n2(x)}-${mu}}{${sd}}=${n2(z)}$`,
      z < 0
        ? `$P(Z<${n2(z)})=P(Z>${n2(-z)})$（対称性）$=${fmt(ans, 4)}$`
        : upper
          ? `$P(Z>${n2(z)})$ = 上側確率 $=${fmt(ans, 4)}$`
          : `$P(Z<${n2(z)})=1-P(Z>${n2(z)})=1-${fmt(1 - ans, 4)}=${fmt(ans, 4)}$`,
      `図を描いて「求める面積は左か右か」「0.5より大きいか小さいか」を先に確認。`,
    ],
    verify: {
      kind: 'normal_prob',
      params: { z, above: upper ? 1 : 0 },
      expected: ans,
    },
  };
}

// ---------------------------------------------------------------------------
// 4. 標本平均の標準化・n の効果
// ---------------------------------------------------------------------------

export function xbar_std(rng: RNG): SolvedQuestion {
  const kind = pick(rng, ['z', 'ratio', 'n_needed'] as const);

  if (kind === 'ratio') {
    const k = pick(rng, [4, 9, 16, 25, 100]);
    const r = 1 / Math.sqrt(k);
    return {
      text: `標本の大きさ n を ${k} 倍にすると、標本平均 $\\bar{X}$ の標準偏差（標準誤差）は何倍になるか。`,
      choices: numChoices(
        rng,
        r,
        [
          { value: 1 / k, why: '分散と標準偏差の混同（分散なら 1/k 倍）' },
          { value: Math.sqrt(k), why: 'n を増やすとばらつきが増えると考えた' },
          { value: 1, why: '母標準偏差 σ と混同した（σ は n によらない）' },
          { value: 0.5 / Math.sqrt(k) + 0.5, why: '計算ミス' },
        ],
        3,
      ),
      steps: [
        `$SD(\\bar{X})=\\sigma/\\sqrt{n}$ なので n を ${k} 倍 → $\\sqrt{${k}}=${n2(Math.sqrt(k))}$ で割られる。`,
        `よって ${n2(r, 3)} 倍（分散 $\\sigma^2/n$ は 1/${k} 倍）。`,
        `「n が大きいほど標本平均は母平均の近くに集まる（安定する）」の数式的な意味。`,
      ],
      verify: { kind: 'se_ratio', params: { k }, expected: r },
    };
  }

  if (kind === 'n_needed') {
    const f = pick(rng, [2, 3, 4, 5, 10]);
    const need = f * f;
    return {
      text: `標本平均の標準誤差を今の $1/${f}$ にしたい。標本の大きさ n を何倍にすればよいか。`,
      choices: numChoices(
        rng,
        need,
        [
          { value: f, why: '√n を忘れ、n を同じ倍率にした' },
          { value: Math.sqrt(f), why: '√ の向きを逆にした' },
          { value: 2 * f, why: '2倍した（二乗と混同）' },
        ],
        2,
      ),
      steps: [
        `標準誤差は $\\sigma/\\sqrt{n}$。$1/${f}$ にするには $\\sqrt{n}$ を ${f} 倍、つまり n を $${f}^2=${need}$ 倍。`,
        `精度を2倍にするには標本は4倍必要 — 区間推定の必要標本サイズの考え方と同じ。`,
      ],
      verify: { kind: 'square', params: { x: f }, expected: need },
    };
  }

  const mu = pick(rng, [50, 60, 100, 170]);
  const sd = pick(rng, [6, 8, 10, 12, 15, 20]);
  // n=100 だと「σ で割る」誤答が正解のちょうど1/10になり選択肢から落ちるため 81 まで
  const n = pick(rng, [4, 9, 16, 25, 36, 49, 64, 81]);
  const se = sd / Math.sqrt(n);
  const zT = pick(rng, [1, 1.5, 2, 2.5, -1, -2]);
  const xbar = mu + zT * se;
  const z = (xbar - mu) / se;
  return {
    text: `母平均 ${mu}、母標準偏差 ${sd} の母集団から大きさ ${n} の標本を取り、標本平均が $\\bar{x}=${n2(xbar)}$ だった。これを標準化した値 $Z=\\dfrac{\\bar{X}-\\mu}{\\sigma/\\sqrt{n}}$ を求めよ。`,
    choices: numChoices(
      rng,
      z,
      [
        {
          value: (xbar - mu) / sd,
          why: 'σ/√n でなく σ で割った（母集団と標本平均の混同）',
        },
        {
          value: (xbar - mu) / (sd / n),
          why: 'σ/n で割った（n と √n の混同）',
        },
        {
          value: (xbar - mu) / ((sd * sd) / n),
          why: '分散 σ²/n で割った（σ と σ² の混同）',
        },
        { value: (xbar - mu) / (sd * Math.sqrt(n)), why: 'σ√n で割った' },
      ],
      2,
    ),
    steps: [
      `$\\sigma/\\sqrt{n}=${sd}/\\sqrt{${n}}=${n2(se)}$`,
      `$Z=\\dfrac{${n2(xbar)}-${mu}}{${n2(se)}}=${n2(z)}$`,
      `電卓: $(\\bar{x}-\\mu)\\times\\sqrt{n}\\div\\sigma$ の順だと割り算が1回で済む。`,
    ],
    verify: { kind: 'xbar_z', params: { xbar, mu, sd, n }, expected: z },
  };
}

// ---------------------------------------------------------------------------
// 5. 二項分布の正規近似（向き・連続補正・z）
// ---------------------------------------------------------------------------

const BINOM_NICE = [
  [100, 0.1],
  [100, 0.2],
  [100, 0.5],
  [400, 0.1],
  [400, 0.2],
  [400, 0.5],
  [225, 0.2],
  [900, 0.1],
] as const;

export function binom_norm_calc(rng: RNG): SolvedQuestion {
  const [n, p] = pick(rng, BINOM_NICE);
  const mu = n * p;
  const sd = Math.sqrt(n * p * (1 - p));
  const op = pick(rng, ['ge', 'le', 'gt', 'lt'] as const);
  const t = pick(rng, [0.5, 1, 1.5, 2]) * (op === 'ge' || op === 'gt' ? 1 : -1);
  const k = Math.round(mu + t * sd);
  const { b, upper } = ccBoundary(k, op);
  const zc = (b - mu) / sd;
  const askZ = rng() < 0.4;
  const ctx = pick(rng, [
    `表が出る確率 ${fmtP(p)} のコインを ${n} 回投げたときの表の回数 X`,
    `不良率 ${fmtP(p)} の工程から ${n} 個を独立に検査したときの不良品数 X`,
    `賛成率 ${fmtP(p)} の母集団から ${n} 人を無作為に選んだときの賛成者数 X`,
  ]);

  if (askZ) {
    return {
      text: `${ctx}について、$P(X ${OP_TEX[op]} ${k})$ を連続補正つき正規近似で求めたい。標準化した値 z を求めよ。`,
      choices: numChoices(
        rng,
        zc,
        [
          { value: (k - mu) / sd, why: '連続補正（±0.5）をしなかった' },
          {
            value: (ccWrong(k, op) - mu) / sd,
            why: '連続補正の向き（±）を逆にした',
          },
          {
            value: (b - mu) / (sd * sd),
            why: '分散 np(1−p) で割った（√忘れ）',
          },
          {
            value: (b - mu) / Math.sqrt(mu),
            why: '√(np) で割った（(1−p) 忘れ）',
          },
        ],
        2,
      ),
      steps: [
        `$E(X)=np=${n2(mu)}$、$\\sigma=\\sqrt{np(1-p)}=${n2(sd)}$`,
        `「${k} ${OP_JA[op]}」→ 連続補正で境界は ${n2(b, 1)}`,
        `$z=\\dfrac{${n2(b, 1)}-${n2(mu)}}{${n2(sd)}}=${n2(zc)}$`,
      ],
      verify: {
        kind: 'binom_norm_z',
        params: { n, p, k, op: OP_CODE[op] },
        expected: zc,
      },
    };
  }

  const ans = tail(zc, upper);
  return {
    text: `${ctx}について、$P(X ${OP_TEX[op]} ${k})$ を連続補正つき正規近似で求めよ。`,
    choices: numChoices(
      rng,
      ans,
      [
        { value: tail((k - mu) / sd, upper), why: '連続補正をしなかった' },
        {
          value: tail((ccWrong(k, op) - mu) / sd, upper),
          why: '連続補正の向き（±0.5）を逆にした',
        },
        { value: 1 - ans, why: '上側と下側を取り違えた' },
        {
          value: tail((b - mu) / (sd * sd), upper),
          why: '分散で割った（√忘れ）',
        },
      ],
      4,
    ),
    steps: [
      `$X\\sim B(${n}, ${fmtP(p)})\\approx N(${n2(mu)}, ${n2(sd * sd)})$（$np, n(1-p)$ が十分大きい）`,
      `「${k} ${OP_JA[op]}」→ 連続補正で境界 ${n2(b, 1)}（整数 k を幅1の区間 [k−0.5, k+0.5] とみなす）`,
      `$z=(${n2(b, 1)}-${n2(mu)})/${n2(sd)}=${n2(zc)}$`,
      `${upper ? '上側' : '下側'}確率 $=${fmt(ans, 4)}$`,
    ],
    verify: {
      kind: 'binom_norm_op',
      params: { n, p, k, op: OP_CODE[op] },
      expected: ans,
    },
  };
}

// ---------------------------------------------------------------------------
// 6. ステップ式問題
// ---------------------------------------------------------------------------

function stage(
  prompt: string,
  choices: Stage['choices'],
  explain: string[],
  verify?: VerifyPayload,
): Stage {
  return { prompt, choices, explain, verify };
}

/** 二項分布: 分布 → パラメータ → 平均 → 分散 → 近似分布 → 確率 */
export function flow_binom(rng: RNG): SolvedQuestion {
  const [n, p] = pick(rng, [...BINOM_NICE, [100, 0.05] as const]);
  const mu = n * p;
  const v = n * p * (1 - p);
  const sd = Math.sqrt(v);
  const ctx = pick(rng, [
    {
      stem: `ある製品の不良率は ${n2(p * 100)}% である。${n} 個を独立に検査し、不良品の個数を X とする。`,
      what: '不良品',
      other: '良品',
    },
    {
      stem: `ある種子の発芽しない確率は ${fmtP(p)} である。${n} 粒をまき（各粒は独立）、発芽しなかった粒の数を X とする。`,
      what: '発芽しなかった粒',
      other: '発芽した粒',
    },
    {
      stem: `ある広告のクリック率は ${fmtP(p)} である。${n} 人に独立に表示し、クリックした人数を X とする。`,
      what: 'クリックした人',
      other: 'クリックしなかった人',
    },
  ]);
  const op = pick(rng, ['ge', 'le'] as const);
  const t = pick(rng, [1, 1.5, 2]) * (op === 'ge' ? 1 : -1);
  const k = Math.max(0, Math.round(mu + t * sd));
  const { b, upper } = ccBoundary(k, op);
  const zc = (b - mu) / sd;
  const ans = tail(zc, upper);

  const stages: Stage[] = [
    stage(
      'Step 1: X は何分布に従うか？',
      textChoices(rng, '二項分布', [
        {
          text: 'ポアソン分布',
          why: `試行回数 n=${n} が決まっている。${DIST_WHY.poisson}`,
        },
        {
          text: '正規分布',
          why: `正規分布は近似で使うもの。X 自体は離散の回数。`,
        },
        {
          text: '超幾何分布',
          why: `各回が独立（確率一定）なので二項。${DIST_WHY.hyper}`,
        },
        { text: '幾何分布', why: DIST_WHY.geom },
      ]),
      [
        `「${n} 回（個）の独立な試行」「各回の確率 ${fmtP(p)} が一定」「成功回数を数える」→ 二項分布。`,
      ],
    ),
    stage(
      'Step 2: パラメータは？',
      textChoices(rng, `$B(${n}, ${fmtP(p)})$`, [
        {
          text: `$B(${n}, ${fmtP(1 - p)})$`,
          why: `数えているのは「${ctx.what}」。${ctx.other}の確率を入れた`,
        },
        {
          text: `$B(${n2(mu)}, ${fmtP(p)})$`,
          why: '試行回数の位置に期待値 np を入れた',
        },
        {
          text: `$Po(${n})$`,
          why: 'λ に試行回数 n を入れた（しかも分布が違う）',
        },
      ]),
      [`$X\\sim B(n,p)$ の n は試行回数、p は「数えるもの」が起こる確率。`],
    ),
    stage(
      'Step 3: 平均 $E(X)$ は？',
      numChoices(
        rng,
        mu,
        [
          { value: n * (1 - p), why: 'p と 1−p を逆にした' },
          { value: v, why: '分散 np(1−p) を答えた' },
          { value: sd, why: '標準偏差を答えた' },
        ],
        2,
      ),
      [`$E(X)=np=${n}\\times${fmtP(p)}=${n2(mu)}$`],
      { kind: 'binom_ev', params: { n, p }, expected: mu },
    ),
    stage(
      'Step 4: 分散 $V(X)$ は？',
      numChoices(
        rng,
        v,
        [
          { value: mu, why: '平均 np と同じにした（ポアソン分布と混同）' },
          { value: sd, why: '標準偏差 √(np(1−p)) を答えた' },
          { value: n * p * p, why: '(1−p) でなく p を掛けた' },
        ],
        2,
      ),
      [
        `$V(X)=np(1-p)=${n}\\times${fmtP(p)}\\times${fmtP(1 - p)}=${n2(v)}$`,
        `標準偏差は $\\sqrt{${n2(v)}}=${n2(sd)}$。`,
      ],
      { kind: 'binom_var', params: { n, p }, expected: v },
    ),
    stage(
      'Step 5: 正規近似すると X はおよそどの分布に従うか？',
      textChoices(rng, `$N(${n2(mu)}, ${n2(v)})$`, [
        {
          text: `$N(${n2(mu)}, ${n2(sd)})$`,
          why: 'N(μ, σ²) の第2引数に標準偏差を入れた',
        },
        {
          text: `$N(${n2(mu)}, ${n2(mu)})$`,
          why: '分散を平均と同じにした（ポアソンと混同）',
        },
        { text: `$N(0, 1)$`, why: '標準化した後の分布。X そのものではない' },
      ]),
      [
        `$B(n,p)\\approx N(np,\\ np(1-p))$。第2引数は分散。`,
        `目安: $np=${n2(mu)}$, $n(1-p)=${n2(n - mu)}$ がともに 5 程度以上。`,
      ],
    ),
  ];

  const finalPrompt = `Step 6: 連続補正つき正規近似で $P(X ${OP_TEX[op]} ${k})$ を求めよ。`;
  return {
    stem: ctx.stem,
    stages,
    finalPrompt,
    text: `${ctx.stem}連続補正つき正規近似で $P(X ${OP_TEX[op]} ${k})$ を求めよ。`,
    choices: numChoices(
      rng,
      ans,
      [
        { value: tail((k - mu) / sd, upper), why: '連続補正をしなかった' },
        {
          value: tail((ccWrong(k, op) - mu) / sd, upper),
          why: '連続補正の向きを逆にした',
        },
        { value: tail((b - mu) / v, upper), why: '分散で割った（√忘れ）' },
        { value: 1 - ans, why: '上側と下側を取り違えた' },
      ],
      4,
    ),
    steps: [
      `① 分布: $X\\sim B(${n}, ${fmtP(p)})$`,
      `② $E(X)=np=${n2(mu)}$、$V(X)=np(1-p)=${n2(v)}$、$\\sigma=${n2(sd)}$`,
      `③ 正規近似: $X\\approx N(${n2(mu)}, ${n2(v)})$`,
      `④ 連続補正: 「${k} ${OP_JA[op]}」→ 境界 ${n2(b, 1)}`,
      `⑤ 標準化: $z=(${n2(b, 1)}-${n2(mu)})/${n2(sd)}=${n2(zc)}$ → ${upper ? '上側' : '下側'}確率 ${fmt(ans, 4)}`,
    ],
    verify: {
      kind: 'binom_norm_op',
      params: { n, p, k, op: OP_CODE[op] },
      expected: ans,
    },
  };
}

/** 標本平均: 分布 → 平均 → 標準誤差 → 標準化 → 確率 */
export function flow_xbar(rng: RNG): SolvedQuestion {
  const popNormal = rng() < 0.5;
  const mu = pick(rng, [50, 60, 100, 170]);
  const sd = pick(rng, [6, 8, 10, 12, 20]);
  const n = popNormal ? pick(rng, [4, 9, 16, 25]) : pick(rng, [36, 49, 64, 81]);
  const v = (sd * sd) / n;
  const se = sd / Math.sqrt(n);
  const zT = pick(rng, [1, 1.5, 2, -1, -1.5]);
  const xbar = mu + zT * se;
  const z = (xbar - mu) / se;
  const above = rng() < 0.5;
  const ans = tail(z, above);
  const item = pick(rng, [
    '製品の重さ',
    '部品の長さ',
    '1日の作業時間',
    '試験の得点',
  ]);
  const stem = popNormal
    ? `${item}は平均 ${mu}、標準偏差 ${sd} の正規分布に従う。無作為に ${n} 個（人）を取り、標本平均を $\\bar{X}$ とする。`
    : `${item}の分布の形は分からないが、平均 ${mu}、標準偏差 ${sd} であることが分かっている。無作為に ${n} 個（人）を取り、標本平均を $\\bar{X}$ とする。`;
  const ineq = above ? '>' : '<';

  const stages: Stage[] = [
    stage(
      popNormal
        ? 'Step 1: $\\bar{X}$ が従う分布は？'
        : 'Step 1: $\\bar{X}$ が（近似的に）従う分布は？',
      textChoices(rng, `$N(${mu}, ${n2(v)})$`, [
        {
          text: `$N(${mu}, ${sd * sd})$`,
          why: '母集団の分散のまま（n で割り忘れ）',
        },
        {
          text: `$N(${mu}, ${n2(se)})$`,
          why: '第2引数（分散）に標準誤差 σ/√n を入れた',
        },
        {
          text: `$N(${mu}, ${n2((sd * sd) / Math.sqrt(n))})$`,
          why: 'σ²/√n — n と √n の混同',
        },
        {
          text: `$t(${n - 1})$`,
          why: 'σ は既知。t 分布は σ 未知で不偏分散を使うとき',
        },
      ]),
      [
        popNormal
          ? `正規母集団なら $\\bar{X}\\sim N(\\mu, \\sigma^2/n)$（厳密）。`
          : `n=${n} は大きいので中心極限定理により $\\bar{X}\\approx N(\\mu, \\sigma^2/n)$（母集団の形は問わない）。`,
        `$\\sigma^2/n=${sd * sd}/${n}=${n2(v)}$`,
      ],
    ),
    stage(
      'Step 2: $E(\\bar{X})$ は？',
      textChoices(rng, `${mu}`, [
        { text: `${n2(mu / n)}`, why: '平均も n で割った（割るのは分散だけ）' },
        {
          text: `${n2(mu / Math.sqrt(n))}`,
          why: '√n で割った（平均は変わらない）',
        },
        { text: `${mu * n}`, why: '標本合計の期待値 nμ と混同' },
      ]),
      [`$E(\\bar{X})=\\mu=${mu}$。標本平均は母平均のまわりに散らばる。`],
    ),
    stage(
      'Step 3: $\\bar{X}$ の標準偏差（標準誤差）は？',
      numChoices(
        rng,
        se,
        [
          { value: v, why: '分散 σ²/n を答えた（√忘れ）' },
          { value: sd / n, why: 'σ/n — n と √n の混同' },
          { value: sd, why: '母標準偏差のまま' },
        ],
        2,
      ),
      [`$\\sigma/\\sqrt{n}=${sd}/\\sqrt{${n}}=${n2(se)}$`],
      { kind: 'xbar_se', params: { sd, n }, expected: se },
    ),
    stage(
      `Step 4: $\\bar{X}=${n2(xbar)}$ を標準化すると $Z$ は？`,
      numChoices(
        rng,
        z,
        [
          {
            value: (xbar - mu) / sd,
            why: 'σ で割った（標本平均なのに母集団の σ）',
          },
          { value: (xbar - mu) / v, why: '分散 σ²/n で割った' },
          { value: (xbar - mu) / (sd / n), why: 'σ/n で割った' },
        ],
        2,
      ),
      [`$Z=\\dfrac{${n2(xbar)}-${mu}}{${n2(se)}}=${n2(z)}$`],
      { kind: 'xbar_z', params: { xbar, mu, sd, n }, expected: z },
    ),
  ];

  const q = `$P(\\bar{X} ${ineq} ${n2(xbar)})$ を求めよ。`;
  return {
    stem,
    stages,
    finalPrompt: `Step 5: ${q}`,
    text: `${stem}${q}`,
    choices: numChoices(
      rng,
      ans,
      [
        { value: 1 - ans, why: '上側と下側を取り違えた' },
        {
          value: tail((xbar - mu) / sd, above),
          why: 'σ で標準化した（√n 忘れ）',
        },
        { value: ans / 2, why: '両側と混同して半分にした' },
      ],
      4,
    ),
    steps: [
      `① $\\bar{X}${popNormal ? '\\sim' : '\\approx'} N(${mu}, ${n2(v)})$`,
      `② 標準誤差 $\\sigma/\\sqrt{n}=${n2(se)}$`,
      `③ $z=${n2(z)}$ → ${above ? '上側' : '下側'}確率 ${fmt(ans, 4)}`,
      `n が大きいほど標準誤差が小さく、$\\bar{X}$ は μ の近くに集まる。`,
    ],
    verify: {
      kind: 'normal_prob',
      params: { z, above: above ? 1 : 0 },
      expected: ans,
    },
  };
}

/** ポアソン分布: 分布 → λ（単位換算） → 平均・分散 → 確率 */
export function flow_poisson(rng: RNG): SolvedQuestion {
  const [r, t, unit, span] = pick(rng, [
    [2, 1, '1時間', '1時間'],
    [4, 0.5, '1時間', '30分間'],
    [6, 0.5, '1時間', '30分間'],
    [1, 2, '1日', '2日間'],
    [1.5, 2, '1日', '2日間'],
    [3, 1, '1日', '1日'],
    [0.5, 4, '1週間', '4週間'],
  ] as const);
  const lam = r * t;
  const ctx = pick(rng, [
    ['コールセンターへの問い合わせ', '件'],
    ['ある交差点での事故', '件'],
    ['サーバーの障害', '回'],
    ['店への来客', '人'],
  ] as const);
  const stem = `${ctx[0]}は${unit}あたり平均 ${n2(r)} ${ctx[1]}、互いに独立にランダムに起こる。${span}の${ctx[0]}の${ctx[1] === '人' ? '人数' : '件数'}を X とする。`;
  const kind = pick(rng, ['eq', 'eq', 'le1'] as const);
  const k = kind === 'eq' ? randInt(rng, 0, 3) : 1;
  const e = Math.exp(-lam);
  const ans =
    kind === 'eq'
      ? poissonPmf(lam, k)
      : poissonPmf(lam, 0) + poissonPmf(lam, 1);
  const eTex = `e^{-${n2(lam)}}=${fmt(e, 4)}`;

  const lamWrongs = [
    {
      text: `$Po(${n2(r)})$`,
      why: `単位の換算を忘れた（${unit}あたりのまま）`,
    },
    {
      text: `$Po(${n2(r / t)})$`,
      why: '時間で割ってしまった（掛けるのが正しい）',
    },
    { text: `$Po(${n2(1 / r)})$`, why: '平均間隔 1/λ（指数分布の平均）と混同' },
    { text: `$B(${n2(lam)}, 0.5)$`, why: '二項分布の形にした' },
  ];
  const stages: Stage[] = [
    stage(
      'Step 1: X は何分布に従うか？',
      textChoices(rng, 'ポアソン分布', [
        {
          text: '二項分布',
          why: `試行回数 n が決まっていない。${DIST_WHY.binom}`,
        },
        { text: '指数分布', why: DIST_WHY.exp },
        {
          text: '正規分布',
          why: '平均が小さい離散の回数。正規は連続量や大きな回数の近似',
        },
        { text: '幾何分布', why: DIST_WHY.geom },
      ]),
      [
        `「一定時間あたり平均○回」「独立にランダムに起こる」回数 → ポアソン分布。`,
      ],
    ),
    stage(
      `Step 2: ${span}の件数 X のパラメータは？`,
      textChoices(rng, `$Po(${n2(lam)})$`, lamWrongs),
      [
        `λ は「その区間での平均回数」。${unit}あたり ${n2(r)} → ${span}なら $\\lambda=${n2(r)}\\times${n2(t)}=${n2(lam)}$。`,
      ],
    ),
    stage(
      'Step 3: $E(X)$ と $V(X)$ の組は？',
      textChoices(rng, `$E=${n2(lam)},\\ V=${n2(lam)}$`, [
        {
          text: `$E=${n2(lam)},\\ V=${n2(Math.sqrt(lam))}$`,
          why: '分散に標準偏差 √λ を入れた',
        },
        {
          text: `$E=${n2(lam)},\\ V=${n2(lam * lam)}$`,
          why: '分散を λ² とした',
        },
        {
          text: `$E=${n2(1 / lam)},\\ V=${n2(1 / (lam * lam))}$`,
          why: '指数分布の平均・分散（1/λ, 1/λ²）と混同',
        },
      ]),
      [
        `ポアソン分布は $E(X)=V(X)=\\lambda=${n2(lam)}$。標準偏差は $\\sqrt{\\lambda}=${n2(Math.sqrt(lam))}$。`,
      ],
      { kind: 'poisson_var', params: { lam }, expected: lam },
    ),
  ];

  const q =
    kind === 'eq'
      ? `ちょうど ${k} ${ctx[1]}となる確率 $P(X=${k})$ を求めよ（$${eTex}$ を用いてよい）。`
      : `${ctx[1]}数が1以下となる確率 $P(X\\le 1)$ を求めよ（$${eTex}$ を用いてよい）。`;
  return {
    stem,
    stages,
    finalPrompt: `Step 4: ${q}`,
    text: `${stem}${q}`,
    choices: numChoices(
      rng,
      ans,
      kind === 'eq'
        ? [
            {
              value: poissonPmf(r, k),
              why: '単位の換算を忘れた（λ をそのまま）',
            },
            {
              value: Math.pow(lam, k) / factorial(k),
              why: 'e^{−λ} を掛け忘れた',
            },
            { value: poissonPmf(lam, k + 1), why: 'k の数え違い' },
            {
              value: k === 0 ? 1 - e : e,
              why: k === 0 ? '余事象と混同した' : 'k=0 の式 e^{−λ} を使った',
            },
          ]
        : [
            {
              value: poissonPmf(lam, 1),
              why: 'P(X=1) だけを計算した（X=0 を足し忘れ）',
            },
            { value: 1 - ans, why: '余事象 P(X≥2) を答えた' },
            {
              value: poissonPmf(r, 0) + poissonPmf(r, 1),
              why: '単位の換算を忘れた（λ をそのまま）',
            },
          ],
      4,
    ),
    steps: [
      `① $X\\sim Po(${n2(lam)})$（${unit}あたり ${n2(r)} × ${n2(t)}）`,
      kind === 'eq'
        ? `② $P(X=${k})=\\dfrac{\\lambda^{${k}}e^{-\\lambda}}{${k}!}=\\dfrac{${n2(Math.pow(lam, k), 4)}\\times${fmt(e, 4)}}{${factorial(k)}}=${fmt(ans, 4)}$`
        : `② $P(X\\le1)=e^{-\\lambda}(1+\\lambda)=${fmt(e, 4)}\\times${n2(1 + lam)}=${fmt(ans, 4)}$`,
      `ポアソンでは「区間の長さに比例して λ も変わる」点に注意。`,
    ],
    verify:
      kind === 'eq'
        ? { kind: 'poisson_pmf', params: { lam, k }, expected: ans }
        : { kind: 'poisson_cdf', params: { lam, k: 1 }, expected: ans },
  };
}

/** 二項分布 → ポアソン近似: 厳密な分布 → 近似の選択 → λ → 確率 */
export function flow_binom_poisson(rng: RNG): SolvedQuestion {
  const [n, p] = pick(rng, [
    [1000, 0.002],
    [500, 0.004],
    [2000, 0.001],
    [1000, 0.003],
    [500, 0.002],
    [400, 0.005],
  ] as const);
  const lam = n * p;
  const e = Math.exp(-lam);
  const stem = pick(rng, [
    `ある薬の副作用の発生率は ${n2(p * 100)}% である。${n} 人が独立に服用したとき、副作用が出た人数を X とする。`,
    `ある部品の不良率は ${fmtP(p)} である。${n} 個を独立に検査したとき、不良品の個数を X とする。`,
    `あるくじの当たる確率は ${fmtP(p)} である。${n} 本を独立に引いたとき、当たりの本数を X とする。`,
  ]);
  const kind = pick(rng, ['zero', 'le1', 'eq2'] as const);
  const ans =
    kind === 'zero' ? e : kind === 'le1' ? e * (1 + lam) : poissonPmf(lam, 2);
  const target =
    kind === 'zero' ? '$P(X=0)$' : kind === 'le1' ? '$P(X\\le 1)$' : '$P(X=2)$';

  const stages: Stage[] = [
    stage(
      'Step 1: X の厳密な分布は？',
      textChoices(rng, `$B(${n}, ${fmtP(p)})$`, [
        { text: `$Po(${n})$`, why: 'λ に n を入れた（そもそも厳密には二項）' },
        {
          text: `$N(${n2(lam)}, ${n2(lam)})$`,
          why: '近似分布であり厳密ではない',
        },
        {
          text: `$B(${n2(lam)}, ${fmtP(p)})$`,
          why: '試行回数に期待値 np を入れた',
        },
      ]),
      [`n 回の独立試行・確率 p 一定・成功回数 → 厳密には二項分布。`],
    ),
    stage(
      'Step 2: この確率を計算するのに適した近似は？',
      textChoices(rng, 'ポアソン分布で近似', [
        {
          text: '正規分布で近似',
          why: `np=${n2(lam)} と小さく分布が偏る。正規近似の目安（np≥5 程度）を満たさない`,
        },
        {
          text: '超幾何分布で近似',
          why: '超幾何は非復元抽出の厳密分布。近似ではない',
        },
        { text: '一様分布で近似', why: '確率が一定ではない' },
      ]),
      [
        `n が大きく p が小さい（np が数程度）→ ポアソン分布 $Po(np)$ で近似できる。`,
      ],
    ),
    stage(
      'Step 3: 近似に使う λ は？',
      numChoices(
        rng,
        lam,
        [
          {
            value: n * p * (1 - p),
            why: '二項の分散 np(1−p) を使った（ほぼ同じだが定義は np）',
          },
          { value: Math.sqrt(lam), why: '√(np) を使った' },
          { value: lam * 2, why: '計算ミス' },
        ],
        3,
      ),
      [`$\\lambda=np=${n}\\times${fmtP(p)}=${n2(lam)}$（平均を合わせる）。`],
      { kind: 'binom_ev', params: { n, p }, expected: lam },
    ),
  ];
  const q = `ポアソン近似で ${target} を求めよ（$e^{-${n2(lam)}}=${fmt(e, 4)}$ を用いてよい）。`;
  return {
    stem,
    stages,
    finalPrompt: `Step 4: ${q}`,
    text: `${stem}${q}`,
    choices: numChoices(
      rng,
      ans,
      kind === 'zero'
        ? [
            { value: 1 - e, why: '余事象 P(X≥1) を答えた' },
            { value: lam * e, why: 'P(X=1) を計算した' },
            { value: e * (1 + lam), why: 'P(X≤1) まで足した' },
          ]
        : kind === 'le1'
          ? [
              { value: lam * e, why: 'P(X=1) だけ（X=0 を足し忘れ）' },
              { value: 1 - ans, why: '余事象を答えた' },
              {
                value: e * (1 + lam + (lam * lam) / 2),
                why: 'P(X≤2) まで足した',
              },
            ]
          : [
              { value: lam * lam * e, why: '2! で割り忘れた' },
              { value: (lam * lam) / 2, why: 'e^{−λ} を掛け忘れた' },
              { value: lam * e, why: 'P(X=1) を計算した' },
            ],
      4,
    ),
    steps: [
      `① 厳密には $B(${n}, ${fmtP(p)})$、n 大・p 小 → $Po(${n2(lam)})$ で近似`,
      kind === 'zero'
        ? `② $P(X=0)=e^{-\\lambda}=${fmt(e, 4)}$`
        : kind === 'le1'
          ? `② $P(X\\le1)=e^{-\\lambda}(1+\\lambda)=${fmt(e, 4)}\\times${n2(1 + lam)}=${fmt(ans, 4)}$`
          : `② $P(X=2)=\\dfrac{\\lambda^2e^{-\\lambda}}{2!}=\\dfrac{${n2(lam * lam)}\\times${fmt(e, 4)}}{2}=${fmt(ans, 4)}$`,
      `二項分布の平均 np と分散 np(1−p) は p が小さいとほぼ等しい → 「平均=分散」のポアソンに近づく。`,
    ],
    verify:
      kind === 'zero'
        ? { kind: 'poisson_pmf', params: { lam, k: 0 }, expected: ans }
        : kind === 'le1'
          ? { kind: 'poisson_cdf', params: { lam, k: 1 }, expected: ans }
          : { kind: 'poisson_pmf', params: { lam, k: 2 }, expected: ans },
  };
}

/** 正規分布: 分布 → 標準化 → 確率 */
export function flow_normal(rng: RNG): SolvedQuestion {
  const [item, mu, sd] = pick(rng, [
    ['成人男性の身長(cm)', 170, 6],
    ['ある製品の内容量(g)', 500, 4],
    ['ある試験の得点', 60, 10],
    ['新生児の体重(g)', 3000, 400],
    ['部品の長さ(mm)', 100, 2],
  ] as const);
  const zAbs = pick(rng, [0.5, 1, 1.5, 2]);
  const kind = pick(rng, ['upper', 'lower', 'inside'] as const);
  const sign = kind === 'lower' ? -1 : 1;
  const x = mu + sign * zAbs * sd;
  const z = (x - mu) / sd;
  const stem = `${item}は平均 ${mu}、標準偏差 ${sd} の正規分布に従うとする。`;
  const up = 1 - normalCdf(zAbs);
  const ans = kind === 'upper' ? up : kind === 'lower' ? up : 1 - 2 * up;

  const stages: Stage[] = [
    stage(
      'Step 1: X の分布を記号で書くと？',
      textChoices(rng, `$N(${mu}, ${sd}^2)$`, [
        {
          text: `$N(${mu}, ${sd})$`,
          why: '第2引数は分散。標準偏差をそのまま書いた',
        },
        { text: `$N(0, 1)$`, why: '標準化した後の分布' },
        {
          text: `$t(${sd})$`,
          why: '母集団そのものの分布は正規。t は統計量の分布',
        },
        { text: `$B(${mu}, ${sd})$`, why: '身長・重さは連続量。二項は回数' },
      ]),
      [`$X\\sim N(\\mu, \\sigma^2)=N(${mu}, ${sd}^2)$。${DIST_WHY.normal}`],
    ),
    stage(
      `Step 2: $X=${n2(x)}$ を標準化すると？`,
      numChoices(
        rng,
        z,
        [
          { value: (x - mu) / (sd * sd), why: '分散で割った' },
          { value: -z, why: '引き算の順序が逆' },
          { value: x - mu, why: 'σ で割り忘れた' },
        ],
        2,
      ),
      [`$Z=(${n2(x)}-${mu})/${sd}=${n2(z)}$`],
      { kind: 'std_z', params: { x, mu, sd }, expected: z },
    ),
  ];
  const q =
    kind === 'upper'
      ? `X が ${n2(x)} を超える確率を求めよ。`
      : kind === 'lower'
        ? `X が ${n2(x)} 未満となる確率を求めよ。`
        : `X が ${n2(mu - zAbs * sd)} から ${n2(x)} の間に入る確率を求めよ。`;
  return {
    stem,
    stages,
    finalPrompt: `Step 3: ${q}`,
    text: `${stem}${q}`,
    choices: numChoices(
      rng,
      ans,
      [
        { value: 1 - ans, why: '求める側と反対側の面積を答えた' },
        {
          value: kind === 'inside' ? 1 - up : 2 * up,
          why: kind === 'inside' ? '片側だけ引いた' : '両側にしてしまった',
        },
        { value: kind === 'inside' ? up : up / 2, why: '面積の読み違い' },
      ],
      4,
    ),
    steps: [
      `① $X\\sim N(${mu}, ${sd}^2)$ → ② $z=${n2(z)}$`,
      kind === 'inside'
        ? `③ $P(|Z|<${n2(zAbs)})=1-2\\times${fmt(up, 4)}=${fmt(ans, 4)}$`
        : kind === 'lower'
          ? `③ $P(Z<${n2(z)})=P(Z>${n2(zAbs)})=${fmt(ans, 4)}$（対称性）`
          : `③ $P(Z>${n2(z)})=${fmt(ans, 4)}$（上側確率）`,
    ],
    verify:
      kind === 'inside'
        ? { kind: 'normal_two', params: { z: zAbs, outside: 0 }, expected: ans }
        : {
            kind: 'normal_prob',
            params: { z, above: kind === 'upper' ? 1 : 0 },
            expected: ans,
          },
  };
}

/** 推測統計の分布（t・χ²・F）: 分布 → 自由度 → 統計量 → 棄却限界 */
export function flow_infer(rng: RNG): SolvedQuestion {
  const kind = pick(rng, ['t', 'chi2', 'F'] as const);

  if (kind === 't') {
    const n = pick(rng, [9, 10, 12, 16, 20, 25]);
    const df = n - 1;
    const stem = `ある工程の製品重量は正規分布に従うが、母分散は分からない。${n} 個を無作為に取り、標本平均 $\\bar{X}$ と不偏分散 $U^2$ を計算して、母平均が $\\mu_0$ かどうかを有意水準5%の両側検定で調べる。`;
    const crit = tCrit(0.025, df);
    const stages: Stage[] = [
      stage(
        'Step 1: 検定統計量が従う分布は？',
        textChoices(rng, 't分布', [
          {
            text: '標準正規分布',
            why: '母分散が未知なので z ではなく t（t と標準正規の混同）',
          },
          { text: 'χ²分布', why: DIST_WHY.chi2 },
          { text: 'F分布', why: DIST_WHY.F },
        ]),
        [`母分散未知 → 不偏分散 $U^2$ で代用 → t分布。${DIST_WHY.t}`],
      ),
      stage(
        'Step 2: 自由度は？',
        numChoices(
          rng,
          df,
          [
            { value: n, why: '標本サイズそのまま（−1 を忘れた）' },
            { value: n - 2, why: '回帰・相関の自由度 n−2 と混同' },
            { value: 2 * n - 2, why: '2標本の自由度と混同' },
          ],
          0,
        ),
        [`1標本の t 検定の自由度は $n-1=${df}$。`],
        { kind: 'df', params: { n, sub: 1 }, expected: df },
      ),
      stage(
        'Step 3: 検定統計量は？',
        textChoices(rng, '$T=\\dfrac{\\bar{X}-\\mu_0}{U/\\sqrt{n}}$', [
          { text: '$T=\\dfrac{\\bar{X}-\\mu_0}{U/n}$', why: 'n と √n の混同' },
          {
            text: '$T=\\dfrac{\\bar{X}-\\mu_0}{\\sigma/\\sqrt{n}}$',
            why: 'σ は未知なので使えない',
          },
          {
            text: '$\\dfrac{(n-1)U^2}{\\sigma_0^2}$',
            why: '母分散の検定（χ²）の統計量',
          },
        ]),
        [`標準化の σ を U に置き換えた形。$T\\sim t(n-1)$。`],
      ),
    ];
    const q = `両側5%の棄却限界 $t_{0.025}(${df})$ の値は？`;
    return {
      stem,
      stages,
      finalPrompt: `Step 4: ${q}`,
      text: `${stem}${q}`,
      choices: numChoices(
        rng,
        crit,
        [
          { value: 1.96, why: 't と標準正規の混同（z の 1.96）' },
          { value: tCrit(0.05, df), why: '片側5%の値（両側なら α/2=0.025）' },
          { value: tCrit(0.025, n), why: `自由度を n=${n} にした` },
        ],
        3,
      ),
      steps: [
        `t分布表の自由度 ${df}、上側確率 0.025 の値 = ${fmt(crit, 3)}`,
        `|T| > ${fmt(crit, 3)} なら棄却。n が大きいほど 1.96 に近づく（t は z より裾が重い）。`,
      ],
      verify: { kind: 't_crit', params: { a: 0.025, df }, expected: crit },
    };
  }

  if (kind === 'chi2') {
    const n = pick(rng, [8, 10, 11, 13, 16, 21]);
    const df = n - 1;
    const stem = `ある機械で作る部品の長さは正規分布に従う。ばらつきが規格の母分散 $\\sigma_0^2$ と異なるかを調べるため、${n} 個の不偏分散 $U^2$ を求め、有意水準5%の両側検定を行う。`;
    const crit = chi2Crit(0.025, df);
    const stages: Stage[] = [
      stage(
        'Step 1: 検定統計量が従う分布は？',
        textChoices(rng, 'χ²分布', [
          { text: 't分布', why: `調べたいのは平均ではなく分散。${DIST_WHY.t}` },
          {
            text: 'F分布',
            why: 'F は2つの分散の比較。今回は1つの分散と規格値の比較',
          },
          { text: '標準正規分布', why: '分散の検定に z は使わない' },
        ]),
        [
          `母分散（ばらつき）の推定・検定 → χ²分布。χ² は二乗和なので0以上の値しかとらない。`,
        ],
      ),
      stage(
        'Step 2: 自由度は？',
        numChoices(
          rng,
          df,
          [
            { value: n, why: '標本サイズそのまま（−1 を忘れた）' },
            { value: n - 2, why: '自由度の数え違い' },
            { value: n + 1, why: '数え違い' },
          ],
          0,
        ),
        [`$(n-1)U^2/\\sigma_0^2\\sim\\chi^2(n-1)$ なので自由度 ${df}。`],
        { kind: 'df', params: { n, sub: 1 }, expected: df },
      ),
      stage(
        'Step 3: 検定統計量は？',
        textChoices(rng, '$\\dfrac{(n-1)U^2}{\\sigma_0^2}$', [
          { text: '$\\dfrac{U^2}{\\sigma_0^2}$', why: '(n−1) を掛け忘れた' },
          { text: '$\\dfrac{(n-1)\\sigma_0^2}{U^2}$', why: '分子と分母が逆' },
          {
            text: '$\\dfrac{\\bar{X}-\\mu_0}{U/\\sqrt{n}}$',
            why: '平均の t 検定の統計量',
          },
        ]),
        [`不偏分散を母分散で割り、自由度 (n−1) を掛ける。`],
      ),
    ];
    const q = `両側5%の上側の棄却限界 $\\chi^2_{0.025}(${df})$ の値は？`;
    return {
      stem,
      stages,
      finalPrompt: `Step 4: ${q}`,
      text: `${stem}${q}`,
      choices: numChoices(
        rng,
        crit,
        [
          {
            value: chi2Crit(0.05, df),
            why: '片側5%の値を引いた（両側は 0.025）',
          },
          {
            value: chi2Crit(0.975, df),
            why: '下側の棄却限界（0.975）を引いた',
          },
          { value: chi2Crit(0.025, n), why: `自由度を n=${n} にした` },
        ],
        2,
      ),
      steps: [
        `χ²分布表の自由度 ${df}、上側確率 0.025 の値 = ${fmt(crit, 2)}`,
        `χ²分布は左右非対称なので、両側検定では上側 0.025 と下側（上側 0.975）の2つの値を別々に引く。`,
      ],
      verify: { kind: 'chi2_crit', params: { a: 0.025, df }, expected: crit },
    };
  }

  const n1 = pick(rng, [5, 6, 7, 8, 9, 10, 11]);
  const n2v = pick(rng, [10, 12, 13, 16, 21]);
  const df1 = n1 - 1;
  const df2 = n2v - 1;
  const stem = `2つの工場 A, B の製品の重さ（それぞれ正規分布）のばらつきが等しいかを調べる。A から ${n1} 個、B から ${n2v} 個を取り、不偏分散は A の方が大きかった（$U_A^2 > U_B^2$）。有意水準5%の両側検定を行う。`;
  const crit = fCrit(0.025, df1, df2);
  const stages: Stage[] = [
    stage(
      'Step 1: 検定統計量が従う分布は？',
      textChoices(rng, 'F分布', [
        { text: 'χ²分布', why: 'χ² は1つの分散の検定。2つの分散の比は F' },
        { text: 't分布', why: '平均の差の検定と混同' },
        { text: '標準正規分布', why: '分散の比較に z は使わない' },
      ]),
      [
        `2つの母分散の比較（等分散の検定）→ 分散比 → F分布。F は χ²/自由度 の比。`,
      ],
    ),
    stage(
      'Step 2: 自由度の組は？',
      textChoices(rng, `$(${df1},\\ ${df2})$`, [
        {
          text: `$(${n1},\\ ${n2v})$`,
          why: '標本サイズそのまま（各 −1 を忘れた）',
        },
        { text: `$(${df2},\\ ${df1})$`, why: '分子と分母の自由度の順序が逆' },
        { text: `$${n1 + n2v - 2}$`, why: 'プールした t 検定の自由度と混同' },
      ]),
      [
        `$F=U_A^2/U_B^2\\sim F(n_A-1,\\ n_B-1)=F(${df1}, ${df2})$（分子の自由度が先）。`,
      ],
    ),
    stage(
      'Step 3: 検定統計量は？',
      textChoices(rng, '$F=\\dfrac{U_A^2}{U_B^2}$', [
        {
          text: '$F=\\dfrac{U_A}{U_B}$',
          why: '標準偏差の比にした（分散の比が正しい）',
        },
        { text: '$F=U_A^2-U_B^2$', why: '差ではなく比をとる' },
        {
          text: '$F=\\dfrac{U_B^2}{U_A^2}$',
          why: '大きい方を分子にすると上側の表だけで判定できる',
        },
      ]),
      [
        `大きい方の不偏分散を分子にすると F ≥ 1 になり、上側の棄却限界だけと比べればよい。`,
      ],
    ),
  ];
  const q = `棄却限界 $F_{0.025}(${df1}, ${df2})$ の値は？`;
  return {
    stem,
    stages,
    finalPrompt: `Step 4: ${q}`,
    text: `${stem}${q}`,
    choices: numChoices(
      rng,
      crit,
      [
        { value: fCrit(0.05, df1, df2), why: '片側5%の値（両側は 0.025）' },
        { value: fCrit(0.025, df2, df1), why: '自由度の順序を逆にした' },
        { value: fCrit(0.025, n1, n2v), why: '自由度を n のままにした' },
      ],
      2,
    ),
    steps: [
      `F分布表（上側 0.025）の分子自由度 ${df1}、分母自由度 ${df2} の値 = ${fmt(crit, 2)}`,
      `F > ${fmt(crit, 2)} なら「等分散」を棄却。`,
    ],
    verify: { kind: 'f_crit', params: { a: 0.025, df1, df2 }, expected: crit },
  };
}
