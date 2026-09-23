import type { RNG } from '../lib/stats';
import { tCrit, fCrit, randInt, pick, fmt, mean } from '../lib/stats';
import { numChoices, textChoices, type SolvedQuestion } from './types';

export function reg_slope(rng: RNG): SolvedQuestion {
  const sxx = randInt(rng, 100, 600);
  const sxyRaw = randInt(rng, -400, 400);
  const sxy = sxyRaw === 0 ? 120 : sxyRaw;
  const b = sxy / sxx;
  const mx = randInt(rng, 20, 60);
  const my = randInt(rng, 30, 90);
  const a = my - b * mx;
  const askIntercept = rng() < 0.4;
  if (askIntercept) {
    return {
      text: `回帰分析で $S_{xx}=${sxx}$、$S_{xy}=${sxy}$、$\\bar{x}=${mx}$、$\\bar{y}=${my}$。回帰直線 $\\hat{y}=a+bx$ の切片 $a$ を求めよ。`,
      choices: numChoices(
        rng,
        a,
        [
          {
            value: my - (sxx / sxy) * mx,
            why: '傾きを Sxx/Sxy（逆）で計算した',
          },
          { value: my + b * mx, why: '引き算でなく足し算した' },
          { value: b, why: '切片でなく傾きを答えた' },
        ],
        2,
      ),
      steps: [
        `傾き b = Sxy/Sxx = ${sxy}/${sxx} = ${fmt(b, 3)}`,
        `切片 a = ȳ − b·x̄ = ${my} − ${fmt(b, 3)}×${mx} = ${fmt(a, 2)}`,
        `回帰直線は必ず (x̄, ȳ) を通る。`,
      ],
      verify: { kind: 'intercept', params: { sxx, sxy, mx, my }, expected: a },
    };
  }
  return {
    text: `回帰分析で $S_{xx}=${sxx}$、$S_{xy}=${sxy}$。回帰直線の傾き $b$ を求めよ。`,
    choices: numChoices(
      rng,
      b,
      [
        { value: sxx / sxy, why: 'Sxy/Sxx の分子分母を逆にした' },
        {
          value: sxy / Math.sqrt(sxx),
          why: '√Sxx で割った（相関係数との混同）',
        },
        { value: sxy * sxx, why: '割り算でなく掛け算した' },
      ],
      3,
    ),
    steps: [
      `傾き b = Sxy ÷ Sxx = ${sxy} ÷ ${sxx} = ${fmt(b, 3)}`,
      `相関係数は Sxy/√(Sxx·Syy) — 傾きとは別物。`,
    ],
    verify: { kind: 'slope', params: { sxx, sxy }, expected: b },
  };
}

export function reg_predict(rng: RNG): SolvedQuestion {
  const b = pick(rng, [0.5, 1, 1.5, 2, 2.5, -1.5]);
  const a = randInt(rng, 5, 40);
  const x = randInt(rng, 10, 60);
  const y = a + b * x;
  return {
    text: `回帰直線 $\\hat{y}=${a}${b < 0 ? '' : '+'}${fmt(b, 1)}x$ が得られた。$x=${x}$ のときの予測値を求めよ。`,
    choices: numChoices(
      rng,
      y,
      [
        { value: a + x, why: '傾きを掛け忘れた' },
        { value: b * x, why: '切片を足し忘れた' },
        { value: a + b + x, why: '全部足してしまった' },
      ],
      1,
    ),
    steps: [
      `ŷ = ${a} + ${fmt(b, 1)}×${x} = ${a} + ${fmt(b * x, 1)} = ${fmt(y, 1)}`,
      `電卓: ${fmt(b, 1)}×${x} + ${a} =`,
    ],
    verify: { kind: 'predict', params: { a, b, x }, expected: y },
  };
}

export function corr_calc(rng: RNG): SolvedQuestion {
  const sxx = randInt(rng, 100, 400);
  const syy = randInt(rng, 100, 400);
  const rr = pick(rng, [0.5, 0.6, 0.7, 0.8, 0.9, -0.6, -0.8]);
  const sxy = rr * Math.sqrt(sxx * syy);
  const sxyR = Math.round(sxy);
  const r = sxyR / Math.sqrt(sxx * syy);
  return {
    text: `$S_{xx}=${sxx}$、$S_{yy}=${syy}$、$S_{xy}=${sxyR}$ のとき、相関係数 $r$ を求めよ。`,
    choices: numChoices(
      rng,
      r,
      [
        { value: sxyR / (sxx * syy), why: '√ を忘れた（分母は √(Sxx·Syy)）' },
        { value: sxyR / sxx, why: '傾き b を計算した' },
        {
          value: Math.sqrt(sxyR / Math.sqrt(sxx * syy)),
          why: '√ の位置を誤った',
        },
      ],
      3,
    ),
    steps: [
      `r = Sxy ÷ √(Sxx·Syy)`,
      `分母: √(${sxx}×${syy}) = √${sxx * syy} = ${fmt(Math.sqrt(sxx * syy), 1)}`,
      `r = ${sxyR} ÷ ${fmt(Math.sqrt(sxx * syy), 1)} = ${fmt(r, 3)}`,
      `電卓: ${sxx}×${syy} = → √ → メモリ → ${sxyR} ÷ メモリ`,
    ],
    verify: { kind: 'corr', params: { sxx, syy, sxy: sxyR }, expected: r },
  };
}

export function r2_calc(rng: RNG): SolvedQuestion {
  const r = pick(rng, [0.6, 0.7, 0.8, 0.9, -0.7]);
  const r2 = r * r;
  const ssr = randInt(rng, 200, 800);
  const sst = ssr / r2;
  const useSS = rng() < 0.5;
  if (useSS) {
    const sstR = Math.round(sst);
    const real = ssr / sstR;
    return {
      text: `回帰分析で回帰変動（回帰平方和）SSR=${ssr}、全変動 SST=${sstR}。決定係数 $R^2$ を求めよ。`,
      choices: numChoices(
        rng,
        real,
        [
          { value: Math.sqrt(real), why: 'R² でなく |r| を答えた' },
          { value: 1 - real, why: '残差の割合を答えた' },
          { value: ssr / (sstR + ssr), why: '分母の組み立てを誤った' },
        ],
        3,
      ),
      steps: [
        `R² = SSR ÷ SST = ${ssr} ÷ ${sstR} = ${fmt(real, 3)}`,
        `残差変動 SSE = SST − SSR = ${fmt(sstR - ssr, 1)}`,
        `単回帰では R² = r²（相関係数の二乗）。`,
      ],
      verify: { kind: 'r2_ss', params: { ssr, sst: sstR }, expected: real },
    };
  }
  return {
    text: `単回帰分析で相関係数 $r=${fmt(r, 1)}$。決定係数 $R^2$ を求めよ。`,
    choices: numChoices(
      rng,
      r2,
      [
        { value: Math.abs(r), why: '二乗せず r の絶対値を答えた' },
        { value: 1 - r2, why: '1−R²（説明されない割合）を答えた' },
        { value: r / 2, why: '半分にした' },
      ],
      2,
    ),
    steps: [
      `単回帰では R² = r² = ${fmt(r, 1)}² = ${fmt(r2, 2)}`,
      `「変動の ${Math.round(r2 * 100)}% が説明される」と読む。`,
    ],
    verify: { kind: 'r2', params: { r }, expected: r2 },
  };
}

export function reg_t_test(rng: RNG): SolvedQuestion {
  const n = pick(rng, [10, 12, 15, 20, 25]);
  const df = n - 2;
  const t = pick(rng, [1.5, 2.0, 2.5, 3.1, 3.8]);
  const seb = pick(rng, [0.2, 0.3, 0.5, 0.8, 1]);
  const b = t * seb;
  const crit = tCrit(0.025, df);
  const reject = t > crit;
  return {
    text: `単回帰（n=${n}）で傾きの推定値 $b=${fmt(b, 2)}$、その標準誤差 $SE(b)=${fmt(seb, 1)}$。「傾きは0」の両側検定（5%）で t 値と結論は。`,
    choices: textChoices(
      rng,
      `t = ${fmt(t, 2)}（df=${df}）→ ${reject ? 'H0を棄却' : 'H0を棄却できない'}`,
      [
        {
          text: `t = ${fmt(t, 2)}（df=${n - 1}）`,
          why: '自由度を n−1 にした（単回帰は n−2 = n−p−1）',
        },
        {
          text: `t = ${fmt(t, 2)} → ${reject ? 'H0を棄却できない' : 'H0を棄却'}`,
          why: '結論の判断を誤った',
        },
        {
          text: `t = ${fmt(b * seb, 3)}`,
          why: 'b/SE でなく b×SE を計算した',
        },
      ],
    ),
    steps: [
      `t = b ÷ SE(b) = ${fmt(b, 2)} ÷ ${fmt(seb, 1)} = ${fmt(t, 2)}`,
      `自由度 = n−p−1 = ${n}−1−1 = ${df}（回帰では説明変数の数+切片を引く）`,
      `t(0.025, ${df}) = ${fmt(crit, 3)} → ${reject ? '棄却（傾きは有意）' : '棄却できない'}`,
    ],
    verify: { kind: 'reg_t', params: { b, seb }, expected: t },
  };
}

export function corr_test(rng: RNG): SolvedQuestion {
  const n = pick(rng, [10, 12, 15, 20, 25, 30]);
  const df = n - 2;
  const t = pick(rng, [1.6, 2.2, 2.8, 3.4]);
  const r = t / Math.sqrt(df + t * t); // t = r√(n−2)/√(1−r²) を逆算
  const rR = Math.round(r * 100) / 100;
  const tReal = (rR * Math.sqrt(df)) / Math.sqrt(1 - rR * rR);
  const crit = tCrit(0.025, df);
  const reject = Math.abs(tReal) > crit;
  return {
    text: `n=${n} のデータで相関係数 $r=${fmt(rR, 2)}$。「母相関は0」の無相関検定（両側5%）で t 値と結論は。`,
    choices: textChoices(
      rng,
      `t = ${fmt(Math.abs(tReal), 2)}（df=${df}）→ ${reject ? 'H0を棄却' : 'H0を棄却できない'}`,
      [
        {
          text: `t = ${fmt(Math.abs(tReal), 2)}（df=${n - 1}）`,
          why: '自由度を n−1 にした（無相関検定は n−2）',
        },
        {
          text: `t = ${fmt(rR * Math.sqrt(n), 2)}`,
          why: 't = r√(n−2)/√(1−r²) でなく r√n を計算した',
        },
        {
          text: `t = ${fmt(rR * Math.sqrt(df), 2)}`,
          why: '分母の √(1−r²) を忘れた',
        },
      ],
    ),
    steps: [
      `t = r·√(n−2) ÷ √(1−r²)`,
      `= ${fmt(rR, 2)}×√${df} ÷ √(1−${fmt(rR * rR, 4)}) = ${fmt(Math.abs(tReal), 2)}`,
      `自由度 n−2 = ${df}、t(0.025) = ${fmt(crit, 3)} → ${reject ? '棄却（相関は有意）' : '棄却できない'}`,
      `電卓: r² → 1−それ → √ → メモリ。r×√(n−2) ÷ メモリ。`,
    ],
    verify: { kind: 'corr_t', params: { r: rR, n }, expected: Math.abs(tReal) },
  };
}

export function anova_oneway(rng: RNG): SolvedQuestion {
  const k = pick(rng, [3, 4]);
  const m = pick(rng, [5, 6, 8, 10]); // 各群サイズ
  const N = k * m;
  const msW = randInt(rng, 10, 40);
  const f0 = pick(rng, [1.5, 2.5, 4, 6, 8]);
  const msB = msW * f0;
  const F = msB / msW;
  const dfB = k - 1;
  const dfW = N - k;
  const crit = fCrit(0.05, dfB, dfW);
  const reject = F > crit;
  return {
    text: `一元配置分散分析: ${k} 群・各 ${m} 個（N=${N}）。群間平均平方 MS(群間)=${fmt(msB, 1)}、群内平均平方 MS(群内)=${fmt(msW, 1)}。F 値・自由度・結論の組合せは（有意水準5%）。`,
    choices: textChoices(
      rng,
      `F = ${fmt(F, 2)}、df(${dfB}, ${dfW}) → ${reject ? 'H0を棄却' : 'H0を棄却できない'}`,
      [
        {
          text: `F = ${fmt(F, 2)}、df(${dfW}, ${dfB})`,
          why: '自由度の順序を逆にした（分子は群間 k−1、分母は群内 N−k）',
        },
        {
          text: `F = ${fmt(1 / F, 3)}、df(${dfB}, ${dfW})`,
          why: '群内÷群間にした（Fは群間÷群内）',
        },
        {
          text: `F = ${fmt(F, 2)}、df(${dfB}, ${N - 1})`,
          why: '分母の自由度を N−1 にした（群内は N−k）',
        },
      ],
    ),
    steps: [
      `F = MS(群間) ÷ MS(群内) = ${fmt(msB, 1)} ÷ ${fmt(msW, 1)} = ${fmt(F, 2)}`,
      `自由度 = (k−1, N−k) = (${dfB}, ${dfW})`,
      `F(0.05; ${dfB}, ${dfW}) = ${fmt(crit, 2)} → ${reject ? '棄却（群間に差あり）' : '棄却できない'}`,
      `MS は SS÷df で計算済み — SS を直接比べるのは誤り。`,
    ],
    verify: { kind: 'anova_f', params: { msB, msW }, expected: F },
  };
}

export function anova_table(rng: RNG): SolvedQuestion {
  const k = pick(rng, [3, 4]);
  const N = k * pick(rng, [6, 8, 10]);
  const dfB = k - 1;
  const dfW = N - k;
  const dfT = N - 1;
  const msW = randInt(rng, 10, 40);
  const ssW = msW * dfW;
  const f0 = pick(rng, [2, 3, 5, 7]);
  const msB = msW * f0;
  const ssB = msB * dfB;
  const ssT = ssB + ssW;
  const F = msB / msW;
  const what = pick(rng, ['dfW', 'msB', 'F', 'ssT'] as const);
  const ans = { dfW, msB, F, ssT }[what];
  const wrongsMap: Record<typeof what, { value: number; why: string }[]> = {
    dfW: [
      { value: N - 1, why: '全体の自由度と混同した（群内は N−k）' },
      { value: k - 1, why: '群間の自由度を答えた' },
      { value: N - k + 1, why: '数え違い' },
    ],
    msB: [
      { value: ssB / dfW, why: '群間dfでなく群内dfで割った' },
      { value: ssB, why: 'SSをそのまま答えた（MSは SS÷df）' },
      { value: msW, why: '群内MSと混同した' },
    ],
    F: [
      { value: 1 / F, why: '分母分子を逆にした' },
      { value: ssB / ssW, why: 'SSの比を取った（MSの比がF）' },
      { value: msB - msW, why: '差を取った' },
    ],
    ssT: [
      { value: Math.abs(ssB - ssW), why: '和でなく差を取った' },
      { value: ssB * ssW, why: '積を取った' },
      { value: msB + msW, why: 'MSを足した（SSではない）' },
    ],
  };
  return {
    text: `一元配置分散分析表（${k}群、N=${N}）: 群間 SS=${fmt(ssB, 1)}・群内 SS=${fmt(ssW, 1)}、群内 MS=${fmt(msW, 1)}。${
      {
        dfW: '群内の自由度',
        msB: '群間の平均平方 MS',
        F: 'F 値',
        ssT: '全体の変動 SST',
      }[what]
    }を求めよ。`,
    choices: numChoices(rng, ans, wrongsMap[what], 2),
    steps: [
      `自由度: 群間 k−1=${dfB}、群内 N−k=${dfW}、全体 N−1=${dfT}`,
      `MS = SS÷df: 群間 ${fmt(ssB, 1)}÷${dfB}=${fmt(msB, 1)}、群内 ${fmt(ssW, 1)}÷${dfW}=${fmt(msW, 1)}`,
      `F = ${fmt(msB, 1)}÷${fmt(msW, 1)} = ${fmt(F, 2)}`,
      `SST = SSB+SSW = ${fmt(ssT, 1)}`,
      `分解の形 SST=SSB+SSW・dfT=dfB+dfW を使えば空欄は全部埋まる。`,
    ],
    verify: {
      kind: 'anova_cell',
      params: {
        ssB,
        ssW,
        dfB,
        dfW,
        which: { dfW: 1, msB: 2, F: 3, ssT: 4 }[what],
      },
      expected: ans,
    },
  };
}

export function reg_anova(rng: RNG): SolvedQuestion {
  // 単回帰の分散分析表: 回帰変動(df=1) / 残差変動(df=n-2) / 全変動(df=n-1)
  const n = randInt(rng, 8, 20);
  const r = pick(rng, [0.5, 0.6, 0.7, 0.8, 0.9]);
  const sst = randInt(rng, 200, 900);
  const ssr = Math.round(sst * r * r);
  const sse = sst - ssr;
  const msr = ssr / 1;
  const mse = sse / (n - 2);
  const f = msr / mse;
  const mode = pick(rng, ['f', 'sse', 'msr'] as const);
  const ans = mode === 'f' ? f : mode === 'sse' ? sse : msr;
  const blank = { f: 'F 値', sse: '残差変動 S_E', msr: '回帰の平均平方 V_R' }[
    mode
  ];
  return {
    text: `単回帰（説明変数1個、n=${n}）の分散分析で、全変動 S_T=${sst}、回帰変動 S_R=${ssr} と分かった。表中の ${blank} を求めよ。`,
    choices: numChoices(
      rng,
      ans,
      [
        mode !== 'sse'
          ? { value: sse, why: 'S_E を求める問題ではない' }
          : { value: ssr, why: '回帰変動 S_R を答えた（S_E = S_T−S_R）' },
        mode !== 'f'
          ? { value: f, why: 'F 値を求める問題ではない' }
          : { value: mse, why: '分母の残差の平均平方を答えた' },
        { value: ssr / n, why: '自由度を n とした（回帰の df=1）' },
      ],
      mode === 'f' ? 2 : 1,
    ),
    steps: [
      `自由度: 回帰 1、残差 ${n - 2}、全体 ${n - 1}`,
      `S_E = S_T − S_R = ${sst} − ${ssr} = ${sse}`,
      `V_R = S_R/1 = ${msr}、V_E = S_E/${n - 2} = ${fmt(mse, 1)}`,
      `F = V_R/V_E = ${msr} ÷ ${fmt(mse, 1)} = ${fmt(f, 2)}`,
      `電卓: ${sse} ÷ ${n - 2} = → メモリ → ${msr} ÷ メモリ`,
    ],
    verify: {
      kind: 'reg_anova',
      params: { n, sst, ssr, mode },
      expected: ans,
    },
  };
}

export function ma_calc(rng: RNG): SolvedQuestion {
  const mode = pick(rng, ['centered', 'centered', 'even', 'back'] as const);
  const n = randInt(rng, 9, 12);
  const ys = Array.from(
    { length: n },
    (_, i) => 20 + i * randInt(rng, 1, 4) + randInt(rng, 0, 5),
  );

  if (mode === 'centered') {
    // 奇数項の中心化移動平均（デフォルト）: t 期を中心に前後 h 期
    const k = pick(rng, [3, 5]);
    const h = (k - 1) / 2;
    const t = randInt(rng, h, n - 1 - h);
    const window = ys.slice(t - h, t + h + 1);
    const m = mean(window);
    return {
      text: `時系列データ $${ys.join(',\\ ')}$。${k} 項移動平均（中心化）の t=${t + 1} 期の値を求めよ。`,
      choices: numChoices(
        rng,
        m,
        [
          {
            value: mean(ys.slice(t - k + 1, t + 1)),
            why: '後方移動平均（直近k期）を計算した — 中心化は t を窓の中心にする',
          },
          {
            value: mean(ys.slice(t - h + 1, t + h + 2)),
            why: '窓を1期ずらした（t が中心になる）',
          },
          { value: mean(ys), why: '全期間の平均を取った' },
        ],
        2,
      ),
      steps: [
        `中心化移動平均: t=${t + 1} 期を中心に前後 ${h} 期ずつの窓`,
        `窓 = 期${t + 1 - h}〜${t + 1 + h} = ${window.join(', ')}`,
        `MA = (${window.join(' + ')}) ÷ ${k} = ${fmt(m, 2)}`,
        `電卓: ${window.join('+')} = ÷${k} =`,
        `後方移動平均（直近k期の平均）とは窓の位置が違う点に注意 — 問題文に「直近」とあれば後方。`,
      ],
      verify: { kind: 'ma', params: { xs: window.join(' ') }, expected: m },
    };
  }

  if (mode === 'even') {
    // 偶数項（4項）の中心化移動平均: 隣接する4項MAの平均
    const t = randInt(rng, 2, n - 3);
    const w1 = ys.slice(t - 2, t + 2); // 期 t-1〜t+2 の4項
    const w2 = ys.slice(t - 1, t + 3); // 期 t〜t+3 の4項
    const m1 = mean(w1);
    const m2 = mean(w2);
    const m = (m1 + m2) / 2;
    return {
      text: `時系列データ $${ys.join(',\\ ')}$。4 項移動平均（中心化）の t=${t + 1} 期と t=${t + 2} 期の間の値を求めよ。`,
      choices: numChoices(
        rng,
        m,
        [
          { value: m1, why: '4項移動平均1つだけを答えた（中心化は2段階）' },
          {
            value: mean(ys.slice(t - 3, t + 1)),
            why: '後方移動平均を計算した（中心化ではない）',
          },
          { value: mean(ys.slice(t - 1, t + 3)), why: '窓を1つだけ読んだ' },
        ],
        2,
      ),
      steps: [
        `偶数項は窓の中心が期の間に来る → 2段階の中心化`,
        `MA₁ = (${w1.join(' + ')}) ÷ 4 = ${fmt(m1, 2)}`,
        `MA₂ = (${w2.join(' + ')}) ÷ 4 = ${fmt(m2, 2)}`,
        `中心化MA = (MA₁ + MA₂) ÷ 2 = ${fmt(m, 2)}`,
        `奇数項なら1段階で中心に来る。偶数項は必ず2段階。`,
      ],
      verify: {
        kind: 'ma_c4',
        params: { xs: [...w1, ...w2].join(' ') },
        expected: m,
      },
    };
  }

  // 後方移動平均（問題文に明記）
  const k = pick(rng, [3, 4, 5]);
  const t = randInt(rng, k - 1, n - 1);
  const window = ys.slice(t - k + 1, t + 1);
  const m = mean(window);
  const h = Math.floor(k / 2);
  const cw = ys.slice(Math.max(0, t - h), Math.min(n, t + h + 1));
  return {
    text: `時系列データ $${ys.join(',\\ ')}$。直近 ${k} 期の平均（後方移動平均）として t=${t + 1} 期の値を求めよ。`,
    choices: numChoices(
      rng,
      m,
      [
        {
          value: cw.length === k ? mean(cw) : m * 1.1,
          why: '中心化移動平均を計算した（「直近」なら後方）',
        },
        { value: mean(ys), why: '全期間の平均を取った' },
        { value: window[k - 1], why: '最新値そのものを答えた' },
      ],
      2,
    ),
    steps: [
      `「直近k期」= 後方移動平均: t=${t + 1} 期を窓の右端にする`,
      `窓 = 期${t - k + 2}〜${t + 1} = ${window.join(', ')}`,
      `MA = (${window.join(' + ')}) ÷ ${k} = ${fmt(m, 2)}`,
      `電卓: ${window.join('+')} = ÷${k} =`,
      `「t期の移動平均」とだけ書かれていたら中心化（tを窓の中心）が標準。`,
    ],
    verify: { kind: 'ma', params: { xs: window.join(' ') }, expected: m },
  };
}
