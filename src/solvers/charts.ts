/** 図表読み取り問題。SVG/HTML の図はすべて乱数データから生成し、
 *  正解も同じデータから計算する。ライブラリ不使用。 */
import type { RNG } from '../lib/stats';
import type { SolvedQuestion } from './types';
import { numChoices, textChoices } from './types';
import { randInt, pick, shuffle, fmt, normalCdf } from '../lib/stats';
import {
  histSVG,
  boxSVG,
  scatterSVG,
  lineSVG,
  cumFreqSVG,
  regTableHTML,
} from '../lib/figs';

/** 相関係数（描画データ検証用） */
function corrOf(pts: [number, number][]): number {
  const n = pts.length;
  const mx = pts.reduce((s, p) => s + p[0], 0) / n;
  const my = pts.reduce((s, p) => s + p[1], 0) / n;
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (const [x, y] of pts) {
    sxy += (x - mx) * (y - my);
    sxx += (x - mx) ** 2;
    syy += (y - my) ** 2;
  }
  return sxy / Math.sqrt(sxx * syy);
}

/** 目標相関に近い散布図データを生成（0〜1 正規化） */
function scatterPts(rng: RNG, target: number): [number, number][] {
  const gen = (): [number, number][] => {
    const raw: [number, number][] = [];
    for (let i = 0; i < 40; i++) {
      const x = rng();
      const noise = rng() * 2 - 1;
      const y = target * x + Math.sqrt(1 - target * target) * noise * 0.55;
      raw.push([x, y]);
    }
    // 線形変換は相関を変えない → min-max で [0.08, 0.95] に収める
    const ys = raw.map((p) => p[1]);
    const lo = Math.min(...ys);
    const hi = Math.max(...ys);
    const span = hi - lo || 1;
    return raw.map((p): [number, number] => [
      0.05 + p[0] * 0.9,
      0.08 + ((p[1] - lo) / span) * 0.87,
    ]);
  };
  for (let try_ = 0; try_ < 40; try_++) {
    const pts = gen();
    if (Math.abs(corrOf(pts) - target) < 0.12) return pts;
  }
  return gen();
}

/** ヒストグラム: 中央値の階級 / 最頻階級 / 平均と中央値の大小 */
export function chart_hist(rng: RNG): SolvedQuestion {
  const w = pick(rng, [5, 10]);
  const nBins = randInt(rng, 5, 6);
  const bounds = Array.from({ length: nBins + 1 }, (_, i) => i * w);
  const mode = pick(rng, ['median', 'mode', 'skew'] as const);
  const cls = (i: number) => `${bounds[i]}〜${bounds[i + 1]}`;

  if (mode === 'skew') {
    // 単調な度数 → 歪み方向が一意に決まる
    const right = rng() < 0.5; // 右裾（平均>中央値）
    const fs = right
      ? [
          randInt(rng, 30, 40),
          randInt(rng, 18, 26),
          randInt(rng, 8, 14),
          randInt(rng, 3, 7),
          randInt(rng, 1, 4),
        ]
      : [
          randInt(rng, 1, 4),
          randInt(rng, 3, 7),
          randInt(rng, 8, 14),
          randInt(rng, 18, 26),
          randInt(rng, 30, 40),
        ];
    return {
      text: `次のヒストグラムについて、平均と中央値の大小関係として最も適切なものを選べ。`,
      figure: histSVG(bounds, fs),
      choices: textChoices(rng, right ? '平均 > 中央値' : '平均 < 中央値', [
        {
          text: right ? '平均 < 中央値' : '平均 > 中央値',
          why: '裾の方向を逆に読んだ',
        },
        {
          text: '平均 ≒ 中央値',
          why: '対称分布と見間違えた（裾が長い側に平均が引っ張られる）',
        },
        {
          text: 'ヒストグラムからは判断できない',
          why: '歪みがあれば大小関係は分かる',
        },
      ]),
      steps: [
        `度数は${right ? '左側に集中し右に裾が長い（右裾・正の歪み）' : '右側に集中し左に裾が長い（左裾・負の歪み）'}`,
        `平均は裾の方向に引っ張られる → 平均 ${right ? '>' : '<'} 中央値`,
      ],
    };
  }

  // median / mode: ランダム度数
  const fs = Array.from({ length: nBins }, () => randInt(rng, 2, 20));
  // mode を一意にする
  if (mode === 'mode') {
    const mi = randInt(rng, 1, nBins - 2);
    fs[mi] = Math.max(...fs) + randInt(rng, 3, 8);
  }
  const N = fs.reduce((a, b) => a + b, 0);
  const cum: number[] = [];
  fs.reduce((a, b, i) => ((cum[i] = a + b), a + b), 0);
  const medCls = cum.findIndex((c) => c >= N / 2);
  const modeCls = fs.indexOf(Math.max(...fs));
  const target = mode === 'median' ? medCls : modeCls;
  const wrongIdx = shuffle(
    rng,
    [...Array(nBins).keys()].filter((i) => i !== target),
  );
  return {
    text: `次のヒストグラム（総度数 N=${N}）について、${
      mode === 'median'
        ? '中央値が含まれる階級'
        : '最頻値が含まれる階級（モード）'
    }を選べ。`,
    figure: histSVG(bounds, fs, target),
    choices: textChoices(
      rng,
      cls(target),
      wrongIdx.slice(0, 3).map((i) => ({
        text: cls(i),
        why:
          mode === 'median'
            ? '累積度数を数えずに隣の階級を選んだ'
            : '棒の高さを読み違えた',
      })),
    ),
    steps:
      mode === 'median'
        ? [
            `累積度数: ${cum.join(' → ')}（N=${N}、N/2=${fmt(N / 2, 1)}）`,
            `N/2 を初めて超える階級が中央値の階級 → ${cls(medCls)}`,
          ]
        : [
            `最も度数の大きい階級がモード → ${cls(modeCls)}（度数 ${fs[modeCls]}）`,
          ],
  };
}

/** 箱ひげ図: 範囲 / IQR / 外れ値 / 読み取れることの判定 */
export function chart_box(rng: RNG): SolvedQuestion {
  const nG = pick(rng, [2, 3]);
  const names = ['A', 'B', 'C'].slice(0, nG);
  const groups = names.map((name) => {
    const q1 = randInt(rng, 20, 45);
    const q3 = q1 + randInt(rng, 8, 25);
    const med = q1 + randInt(rng, 2, q3 - q1 - 2);
    const min = Math.max(0, q1 - randInt(rng, 8, 20));
    const max = q3 + randInt(rng, 8, 20);
    const outliers: number[] = [];
    if (rng() < 0.35) outliers.push(max + randInt(rng, 12, 25));
    if (rng() < 0.2) outliers.push(Math.max(0, min - randInt(rng, 10, 18)));
    return { name, min, q1, med, q3, max, outliers };
  });
  const figure = boxSVG(groups);
  const mode = pick(rng, ['range', 'iqr', 'outlier', 'infer'] as const);
  const g = pick(rng, groups);
  const sumLine = `${g.name}: 最小${g.min} Q1=${g.q1} 中央値${g.med} Q3=${g.q3} 最大${g.max}${
    g.outliers.length ? ` 外れ値${g.outliers.join(',')}` : ''
  }`;

  if (mode === 'range' || mode === 'iqr') {
    const isRange = mode === 'range';
    const ans = isRange ? g.max - g.min : g.q3 - g.q1;
    return {
      text: `箱ひげ図について、グループ ${g.name} の${isRange ? '範囲（最大−最小）' : '四分位範囲 IQR（Q3−Q1）'}を求めよ。`,
      figure,
      choices: numChoices(
        rng,
        ans,
        [
          {
            value: isRange ? g.q3 - g.q1 : g.max - g.min,
            why: isRange ? 'IQR と混同した' : '範囲と混同した（IQRではない）',
          },
          { value: g.max - g.q1, why: '最大−Q1 を計算した' },
          { value: g.q3 - g.min, why: 'Q3−最小 を計算した' },
        ],
        0,
      ),
      steps: [
        sumLine,
        isRange
          ? `範囲 = ${g.max} − ${g.min} = ${ans}`
          : `IQR = ${g.q3} − ${g.q1} = ${ans}`,
        `外れ値（○印）はひげの端ではなく別途プロットされる点。`,
      ],
      verify: { kind: 'box_read', params: {}, expected: ans },
    };
  }
  if (mode === 'outlier') {
    const withOut = groups.filter((gr) => gr.outliers.length > 0);
    if (withOut.length === 0) {
      // 外れ値なし問題
      return {
        text: `箱ひげ図について、外れ値（○印）を持つグループはどれか。`,
        figure,
        choices: textChoices(rng, '外れ値を持つグループはない', [
          { text: 'A', why: 'ひげの端を外れ値と読み違えた' },
          { text: 'B', why: '同上' },
          { text: 'すべて', why: '同上' },
        ]),
        steps: [
          '○印の点が外れ値。この図には○印がない → 外れ値なし',
          'ひげの両端（最小・最大）は外れ値ではない。',
        ],
      };
    }
    const correct = withOut.map((gr) => gr.name).join(' と ');
    const noOut =
      groups
        .filter((gr) => gr.outliers.length === 0)
        .map((gr) => gr.name)
        .join(' と ') || 'なし';
    const partial =
      withOut.length > 1
        ? withOut[0].name
        : (groups.find((gr) => gr.outliers.length === 0)?.name ?? 'なし');
    return {
      text: `箱ひげ図について、外れ値（○印）を持つグループをすべて選んだものはどれか。`,
      figure,
      choices: textChoices(
        rng,
        correct,
        [
          { text: noOut, why: '外れ値なしの群を選んだ' },
          { text: partial, why: '一部だけ見て答えた' },
          { text: 'すべてのグループ', why: 'ひげの端を外れ値と混同した' },
          { text: 'なし', why: '○印を見落とした' },
        ].filter((w) => w.text !== correct),
      ),
      steps: [
        `○印 = ひげ（Q1−1.5IQR 〜 Q3+1.5IQR）の外にある点`,
        `○印があるのは ${correct}`,
      ],
    };
  }
  // infer: 読み取れること／読み取れないこと
  const medMax = groups.reduce((a, b) => (b.med > a.med ? b : a));
  const correctSt = `中央値が最も大きいのは ${medMax.name}`;
  const wrongs = [
    {
      text: `平均が最も大きいのは ${medMax.name}`,
      why: '箱ひげ図から平均は読み取れない',
    },
    {
      text: `データ数が最も多いのは ${medMax.name}`,
      why: '箱ひげ図からデータ数は分からない',
    },
    {
      text: `${medMax.name} の分布は左右対称`,
      why: '中央値の位置だけでは対称性は断定できない',
    },
  ];
  return {
    text: `箱ひげ図から確実に読み取れるものを選べ。`,
    figure,
    choices: textChoices(rng, correctSt, wrongs),
    steps: [
      groups.map((gr) => `${gr.name}の中央値=${gr.med}`).join('、'),
      `箱の中の線が中央値 → 最大は ${medMax.name}`,
      '箱ひげ図から読めるのは最小・Q1・中央値・Q3・最大・外れ値のみ。平均・度数・分布の形は分からない。',
    ],
  };
}

/** 散布図 4枚と相関係数の対応付け */
export function chart_scatter(rng: RNG): SolvedQuestion {
  const rs = shuffle(rng, [0.9, 0.5, 0, -0.7]);
  const labels = ['A', 'B', 'C', 'D'];
  const plots = rs.map((r, i) => ({
    label: labels[i],
    r,
    pts: scatterPts(rng, r),
  }));
  const targetR = pick(rng, rs);
  const target = plots.find((p) => p.r === targetR)!;
  const desc = (r: number) =>
    r === 0
      ? '無相関（ばらつき一様）'
      : r > 0.7
        ? '強い正の相関'
        : r > 0
          ? '中程度の正の相関'
          : '負の相関';
  return {
    text: `4つの散布図のうち、相関係数が約 ${fmt(targetR, 1)} のものはどれか。`,
    figure: scatterSVG(plots),
    choices: textChoices(
      rng,
      `（${target.label}）`,
      plots
        .filter((p) => p !== target)
        .map((p) => ({
          text: `（${p.label}）`,
          why: `${desc(p.r)}に見える図`,
        })),
    ),
    steps: [
      plots
        .map((p) => `（${p.label}）≈ ${fmt(p.r, 1)}：${desc(p.r)}`)
        .join(' '),
      `r=${fmt(targetR, 1)} → ${desc(targetR)} → （${target.label}）`,
    ],
    verify: {
      kind: 'scatter_r',
      params: { target: targetR },
      expected: targetR,
    },
  };
}

/** 時系列折れ線: 増加率 / 平均変化率（幾何平均） / 季節変動 */
export function chart_ts(rng: RNG): SolvedQuestion {
  const mode = pick(rng, ['rate', 'geo', 'season'] as const);
  if (mode === 'season') {
    // 24ヶ月・上昇トレンド+夏ピークの季節変動
    const peak = pick(rng, ['夏', '冬']);
    const vals = Array.from({ length: 24 }, (_, i) => {
      const mth = i % 12;
      const seasonal =
        peak === '夏'
          ? mth === 6 || mth === 7
            ? 18
            : mth >= 5 && mth <= 8
              ? 10
              : 0
          : mth === 0 || mth === 1
            ? 18
            : mth === 11 || mth === 2
              ? 10
              : 0;
      return Math.round(50 + i * 1.2 + seasonal + rng() * 4);
    });
    const labels = Array.from({ length: 24 }, (_, i) => `${(i % 12) + 1}`);
    return {
      text: `2年分の月次データの折れ線グラフ。この系列に見られる変動として最も適切なものを選べ。`,
      figure: lineSVG(vals, labels, '売上'),
      choices: textChoices(rng, `季節変動（毎年${peak}にピーク）と上昇傾向`, [
        { text: '不規則変動のみ', why: '規則的な山を見落とした' },
        {
          text: '上昇傾向のみ（季節性なし）',
          why: '毎年同じ時期の山を見落とした',
        },
        {
          text: '循環変動（数年周期）',
          why: '周期が12ヶ月なら季節変動。循環変動はもっと長い',
        },
      ]),
      steps: [
        `毎年同じ月（${peak === '夏' ? '7〜8月' : '12〜1月'}）に山 → 周期12ヶ月 = 季節変動`,
        '全体として右肩上がり → 傾向変動もある',
        '季節変動=1年周期、循環変動=数年周期の波。',
      ],
    };
  }
  // 5年分の年次データ
  const y0 = randInt(rng, 80, 140);
  const gr = pick(rng, [1.05, 1.1, 1.15, 1.2]);
  const vals = Array.from({ length: 5 }, (_, i) =>
    Math.round(y0 * Math.pow(gr, i)),
  );
  const years = Array.from({ length: 5 }, (_, i) => `${2020 + i}`);
  const figure = lineSVG(vals, years, '値');
  if (mode === 'rate') {
    const i = randInt(rng, 0, 3);
    const rate = (vals[i + 1] / vals[i] - 1) * 100;
    return {
      text: `年次データの折れ線グラフ。${2020 + i}年から${2021 + i}年への増加率（%）を求めよ。`,
      figure,
      choices: numChoices(
        rng,
        rate,
        [
          {
            value: ((vals[i + 1] - vals[i]) / vals[i + 1]) * 100,
            why: '分母を当年にした（増加率の分母は前年）',
          },
          {
            value: (vals[i + 1] / vals[0] - 1) * 100,
            why: '初年度を分母にした',
          },
          { value: vals[i + 1] - vals[i], why: '増加量を答えた（率ではない）' },
        ],
        1,
        '%',
      ),
      steps: [
        `グラフの値: ${years.join('→')} = ${vals.join('→')}`,
        `増加率 = (当年−前年)÷前年 = (${vals[i + 1]}−${vals[i]})÷${vals[i]} = ${fmt(rate, 1)}%`,
        `電卓: ${vals[i + 1]} − ${vals[i]} = ÷ ${vals[i]} = ×100 =`,
      ],
      verify: {
        kind: 'ts_rate',
        params: { a: vals[i], b: vals[i + 1] },
        expected: rate,
      },
    };
  }
  // geo: 4年間の平均変化率（幾何平均）= (v4/v0)^(1/4)−1
  const avg = (Math.pow(vals[4] / vals[0], 1 / 4) - 1) * 100;
  return {
    text: `年次データの折れ線グラフ。${years[0]}年〜${years[4]}年の年平均変化率（幾何平均、%）を求めよ。`,
    figure,
    choices: numChoices(
      rng,
      avg,
      [
        {
          value: ((vals[4] / vals[0] - 1) * 100) / 4,
          why: '総変化率を4で割った（算術平均は誤り）',
        },
        {
          value: (vals[4] / vals[0] - 1) * 100,
          why: '4年間の総変化率を答えた',
        },
        { value: avg * 4, why: '期数を掛けてしまった' },
      ],
      1,
      '%',
    ),
    steps: [
      `平均変化率 = (最終/最初)^(1/年数) − 1 = (${vals[4]}/${vals[0]})^{1/4} − 1`,
      `${vals[4]}÷${vals[0]} = ${fmt(vals[4] / vals[0], 3)} → √ を2回 → ${fmt(Math.pow(vals[4] / vals[0], 0.25), 4)}`,
      `= ${fmt(avg, 1)}%（普通電卓は 1/4乗 = √の√）`,
      '算術平均で割るのは誤り。変化率は幾何平均。',
    ],
    verify: {
      kind: 'ts_geo',
      params: { a: vals[0], b: vals[4] },
      expected: avg,
    },
  };
}

/** 回帰ソフト出力表の読み取り・穴埋め */
export function chart_reg_out(rng: RNG): SolvedQuestion {
  const n = randInt(rng, 15, 40);
  const vars = shuffle(rng, ['x1', 'x2']);
  // t 値は 5% 有意性が明確に分かれるものだけ使う
  const tPool = [0.4, 0.7, 1.2, 1.5, 3.0, 3.8, 4.6];
  const mkRow = () => {
    const t = pick(rng, tPool) * pick(rng, [1, -1]);
    const se = randInt(rng, 5, 40) / 100;
    const coef = Math.round(t * se * 100) / 100 || pick(rng, [0.3, -0.5, 1.2]);
    const tt = coef / se;
    const p = 2 * (1 - normalCdf(Math.abs(tt)));
    return { coef, se, t: tt, p };
  };
  const intercept = {
    coef: randInt(rng, 5, 30),
    se: randInt(rng, 2, 8),
    t: 0,
    p: 0,
  };
  intercept.t = intercept.coef / intercept.se;
  intercept.p = 2 * (1 - normalCdf(Math.abs(intercept.t)));
  const r1 = mkRow();
  const r2 = mkRow();
  const r2v = randInt(rng, 55, 92) / 100;
  const adj = 1 - ((1 - r2v) * (n - 1)) / (n - 3);
  const sig = (p: number) => p < 0.05;
  const sigNames = [r1, r2]
    .map((r, i) => ({ r, name: vars[i] }))
    .filter((x) => sig(x.r.p))
    .map((x) => x.name)
    .sort();
  const sigText = sigNames.length
    ? sigNames.join(' と ')
    : 'どちらも有意でない';

  const mode = pick(rng, ['coef', 't', 'sig', 'blank'] as const);
  const f4 = (v: number) => fmt(v, 4);
  const cell = (v: number, d = 2) => fmt(v, d);
  const showBlank = mode === 'blank' ? pick(rng, [1, 2]) : 0;
  const rows = [
    {
      name: '(定数)',
      coef: cell(intercept.coef),
      se: cell(intercept.se),
      t: cell(intercept.t),
      p: f4(intercept.p),
    },
    {
      name: vars[0],
      coef: showBlank === 1 ? '?' : cell(r1.coef),
      se: cell(r1.se),
      t: cell(r1.t),
      p: f4(r1.p),
    },
    {
      name: vars[1],
      coef: showBlank === 2 ? '?' : cell(r2.coef),
      se: cell(r2.se),
      t: cell(r2.t),
      p: f4(r2.p),
    },
  ];
  const figure = regTableHTML(rows, f4(r2v), f4(adj), n);
  const alphaNote = '有意水準5%';

  if (mode === 'sig') {
    return {
      text: `重回帰の推定結果（n=${n}）。${alphaNote}で有意と判定される説明変数はどれか。`,
      figure,
      choices: textChoices(
        rng,
        sigText,
        [
          {
            text: vars.join(' と '),
            why: '係数の大きさで判断した（p値を見る）',
          },
          {
            text: 'どちらも有意でない',
            why: 'p値の読み違い',
          },
          { text: '(定数)', why: '定数項は説明変数ではない' },
        ].filter((w) => w.text !== sigText),
      ),
      steps: [
        `${vars[0]}: p=${f4(r1.p)} → ${sig(r1.p) ? '有意' : '有意でない'}`,
        `${vars[1]}: p=${f4(r2.p)} → ${sig(r2.p) ? '有意' : '有意でない'}`,
        `p < 0.05 なら有意 → ${sigText}`,
      ],
      verify: {
        kind: 'reg_out',
        params: { t1: r1.t, t2: r2.t, df: n - 3 },
        expected: sigNames.length,
      },
    };
  }
  if (mode === 't') {
    const which = pick(rng, [0, 1]);
    const r = which === 0 ? r1 : r2;
    return {
      text: `重回帰の推定結果。変数 ${vars[which]} の t 値を求めよ（表の値を使う）。`,
      figure,
      choices: numChoices(
        rng,
        r.t,
        [
          { value: r.coef / (r.se * r.se), why: 'SE²で割った' },
          { value: r.se / r.coef, why: 'SE÷係数 と逆に割った' },
          { value: r.coef * r.se, why: '掛けてしまった' },
        ],
        2,
      ),
      steps: [
        `t値 = 係数 ÷ 標準誤差 = ${cell(r.coef)} ÷ ${cell(r.se)} = ${fmt(r.t, 2)}`,
        `電卓: ${cell(r.coef)} ÷ ${cell(r.se)} =`,
      ],
      verify: {
        kind: 'reg_t',
        params: { b: r.coef, seb: r.se },
        expected: r.t,
      },
    };
  }
  if (mode === 'blank') {
    const r = showBlank === 1 ? r1 : r2;
    const v = vars[showBlank - 1];
    return {
      text: `重回帰の推定結果で ${v} の係数が「?」になっている。? に入る値を求めよ。`,
      figure,
      choices: numChoices(
        rng,
        r.coef,
        [
          { value: (r.se * r.se) / r.t, why: '逆算の式を誤った' },
          { value: r.se / r.t, why: 'SE÷t とした（係数=t×SE）' },
          { value: r.t / r.se, why: 't÷SE とした' },
        ],
        2,
      ),
      steps: [
        `t値 = 係数 ÷ 標準誤差 → 係数 = t値 × 標準誤差`,
        `= ${fmt(r.t, 2)} × ${cell(r.se)} = ${fmt(r.coef, 2)}`,
        `電卓: ${fmt(r.t, 2)} × ${cell(r.se)} =`,
      ],
      verify: {
        kind: 'reg_out_blank',
        params: { t: r.t, se: r.se },
        expected: r.coef,
      },
    };
  }
  // coef: 係数の読み取り or R²/調整済みR²
  const askAdj = rng() < 0.5;
  if (askAdj) {
    return {
      text: `重回帰の推定結果。調整済み決定係数 adj.R² を求めよ（n=${n}、説明変数は2個）。`,
      figure,
      choices: numChoices(
        rng,
        adj,
        [
          { value: r2v, why: '通常のR²を答えた' },
          {
            value: 1 - ((1 - r2v) * (n - 1)) / (n - 1),
            why: '自由度調整を忘れた',
          },
          { value: r2v * r2v, why: 'R²を2乗した' },
        ],
        4,
      ),
      steps: [
        `adj.R² = 1 − (1−R²)×(n−1)/(n−k−1) (k=説明変数2個)`,
        `= 1 − ${fmt(1 - r2v, 2)}×${n - 1}/${n - 3} = ${fmt(adj, 4)}`,
        `電卓: 1 − ${f4(r2v)} = × ${n - 1} = ÷ ${n - 3} = → 1 − 結果`,
      ],
      verify: {
        kind: 'adj_r2',
        params: { r2: r2v, n, k: 2 },
        expected: adj,
      },
    };
  }
  const which = pick(rng, [0, 1]);
  const r = which === 0 ? r1 : r2;
  return {
    text: `重回帰の推定結果。変数 ${vars[which]} の偏回帰係数はいくつか。`,
    figure,
    choices: numChoices(
      rng,
      r.coef,
      [
        { value: r.se, why: '標準誤差の列を読んだ' },
        { value: r.t, why: 't値の列を読んだ' },
        { value: intercept.coef, why: '定数項を読んだ' },
      ],
      2,
    ),
    steps: [
      `「係数」列の ${vars[which]} の行を読む → ${cell(r.coef)}`,
      '列の見出し（係数・標準誤差・t値・p値）を取り違えない。',
    ],
    verify: { kind: 'reg_read', params: {}, expected: r.coef },
  };
}

/** 累積相対度数グラフ → 四分位数 */
export function chart_cumfreq(rng: RNG): SolvedQuestion {
  const w = pick(rng, [5, 10]);
  const nBins = randInt(rng, 6, 8);
  const bounds = Array.from({ length: nBins + 1 }, (_, i) => i * w);
  // 0.25/0.5/0.75 がちょうど境界に来る累積度数列を作る
  const idx = shuffle(
    rng,
    Array.from({ length: nBins - 1 }, (_, i) => i + 1),
  )
    .slice(0, 3)
    .sort((a, b) => a - b);
  const cum = new Array<number>(nBins + 1).fill(0);
  cum[nBins] = 1;
  const marks: Record<number, number> = {
    [idx[0]]: 0.25,
    [idx[1]]: 0.5,
    [idx[2]]: 0.75,
  };
  for (let i = 1; i < nBins; i++) {
    if (marks[i] !== undefined) {
      cum[i] = marks[i];
    } else {
      // 前後の節の間で適当に増分
      const prev = cum[i - 1];
      const nextMark = [0.25, 0.5, 0.75, 1].find((m) => m > prev)!;
      cum[i] = Math.min(
        nextMark - 0.02,
        Math.round((prev + (nextMark - prev) * rng()) * 100) / 100,
      );
      if (cum[i] <= prev) cum[i] = Math.round((prev + 0.05) * 100) / 100;
    }
  }
  const which = pick(rng, [0.25, 0.5, 0.75]);
  const qName = {
    '0.25': '第1四分位数 Q1',
    '0.5': '第2四分位数（中央値）',
    '0.75': '第3四分位数 Q3',
  }[String(which)];
  const bi = cum.findIndex((c) => Math.abs(c - which) < 1e-9);
  const ans = bounds[bi];
  return {
    text: `累積相対度数グラフから ${qName} を読み取れ。`,
    figure: cumFreqSVG(bounds, cum),
    choices: numChoices(
      rng,
      ans,
      [
        { value: bounds[Math.max(0, bi - 1)], why: '1つ左の境界を読んだ' },
        { value: bounds[Math.min(nBins, bi + 1)], why: '1つ右の境界を読んだ' },
        { value: ans + w / 2, why: '階級値（中央）を読んだ' },
      ].filter((x) => x.value !== ans),
      0,
    ),
    steps: [
      `縦軸 ${which * 100}% の水平線とグラフの交点 → x 座標を読む`,
      `${which * 100}% に達するのは x=${ans}（累積度数がちょうど ${which}）`,
      '累積相対度数 25%/50%/75% が Q1/Q2/Q3。',
    ],
    verify: { kind: 'quartile_read', params: {}, expected: ans },
  };
}
