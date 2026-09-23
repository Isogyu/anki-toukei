import { useCallback, useRef, useState } from 'react';
import type { RNG } from '../lib/stats';
import {
  randInt,
  pick,
  shuffle,
  fmt,
  zCdfTable,
  zUpperTable,
  zCrit,
  tCrit,
  chi2Crit,
  fCrit,
} from '../lib/stats';
import type { Choice } from '../solvers/types';
import { useQuizStats } from '../hooks/useQuizStats';
import { ReportButton } from '../components/ReportButton';
import styles from './TableTrain.module.css';

interface TQ {
  id: string;
  text: string;
  choices: Choice[];
  steps: string[];
}

function nz(v: number | undefined, fallback: number): number {
  return v === undefined ? fallback : v;
}

/** 数値表の引き方問題を生成する。値はすべて tables.json（scipy生成）。 */
function genTableQ(rng: RNG): TQ {
  const kind = pick(rng, [
    'z_cdf',
    'z_upper',
    'z_crit',
    't_crit',
    'chi2_crit',
    'f_crit',
    'read_col',
  ] as const);

  if (kind === 'z_cdf' || kind === 'z_upper') {
    const z = randInt(rng, 5, 250) / 100;
    const cdf = nz(zCdfTable(z), 0.5);
    const upper = nz(zUpperTable(z), 0.5);
    const isCdf = kind === 'z_cdf';
    const ans = isCdf ? cdf : upper;
    const f4 = (v: number) => fmt(v, 4);
    const near1 = nz(
      isCdf ? zCdfTable(z + 0.01) : zUpperTable(z + 0.01),
      ans + 0.004,
    );
    const near2 = nz(
      isCdf ? zCdfTable(z - 0.1) : zUpperTable(z - 0.1),
      ans - 0.04,
    );
    const seen = new Set([f4(ans)]);
    const wrongs: Choice[] = [];
    for (const [v, why] of [
      [isCdf ? upper : cdf, '裏側（上側↔下側）の表を引いた'] as const,
      [near1, 'z の下2桁を1つずらして読んだ'] as const,
      [near2, 'z の小数第1位を1つずらして読んだ'] as const,
    ]) {
      const t = f4(v);
      if (!seen.has(t)) {
        seen.add(t);
        wrongs.push({ text: t, correct: false, why });
      }
    }
    return {
      id: `tbl-${kind}`,
      text: isCdf
        ? `標準正規分布表（累積確率 Φ(z)）で $P(Z < ${fmt(z, 2)})$ を求めよ。`
        : `標準正規分布表（上側確率 Q(z)）で $P(Z \\ge ${fmt(z, 2)})$ を求めよ。`,
      choices: shuffle(rng, [
        { text: f4(ans), correct: true },
        ...wrongs.slice(0, 3),
      ]),
      steps: [
        `表の「z=${fmt(z, 2)}」の行/列を探す（整数+小数第1位で行、小数第2位で列）`,
        isCdf ? `Φ(${fmt(z, 2)}) = ${f4(ans)}` : `Q(${fmt(z, 2)}) = ${f4(ans)}`,
        '配布された表が上側確率なら、下側は 1 から引く。',
      ],
    };
  }

  if (kind === 'z_crit') {
    const a = pick(rng, [0.1, 0.05, 0.025, 0.01]);
    const ans = zCrit(a);
    const wrongs = [
      {
        v: zCrit(a === 0.05 ? 0.025 : 0.05),
        why: 'αの列を間違えた（片側/両側の対応に注意）',
      },
      { v: tCrit(a, 10), why: 't分布表を引いた（zは正規分布の臨界値）' },
      { v: ans + 0.5, why: '読み違い' },
    ];
    const seen = new Set([fmt(ans, 3)]);
    const wc: Choice[] = [];
    for (const w of wrongs) {
      const t = fmt(w.v, 3);
      if (!seen.has(t)) {
        seen.add(t);
        wc.push({ text: t, correct: false, why: w.why });
      }
    }
    return {
      id: 'tbl-zcrit',
      text: `標準正規分布の上側確率 α=${a} に対応する臨界値 $z_\\alpha$ を表から読め。`,
      choices: shuffle(rng, [
        { text: fmt(ans, 3), correct: true },
        ...wc.slice(0, 3),
      ]),
      steps: [
        `「上側確率 ${a}」のセルを探す → z = ${fmt(ans, 3)}`,
        '両側検定5%なら片側 2.5% → z = 1.96 という対応が頻出。',
      ],
    };
  }

  if (kind === 't_crit') {
    const df = pick(rng, [5, 8, 10, 12, 15, 20, 24, 30]);
    const a = pick(rng, [0.1, 0.05, 0.025, 0.01, 0.005]);
    const ans = tCrit(a, df);
    const otherDf = pick(
      rng,
      [df - 2, df + 2, df + 5].filter((d) => d > 0 && d !== df),
    );
    const wrongs = [
      {
        v: tCrit(a, otherDf),
        why: `自由度を ${otherDf} で読んだ（df=${df} が正しい）`,
      },
      { v: zCrit(a), why: '正規分布の臨界値を使った（σ未知は t）' },
      {
        v: tCrit(a === 0.05 ? 0.025 : 0.05, df),
        why: '上側確率の列を間違えた',
      },
    ];
    const seen = new Set([fmt(ans, 3)]);
    const wc: Choice[] = [];
    for (const w of wrongs) {
      const t = fmt(w.v, 3);
      if (!seen.has(t)) {
        seen.add(t);
        wc.push({ text: t, correct: false, why: w.why });
      }
    }
    return {
      id: 'tbl-t',
      text: `t分布表で、自由度 ${df}・上側確率 ${a} の臨界値 $t_{${a}}(${df})$ を求めよ。`,
      choices: shuffle(rng, [
        { text: fmt(ans, 3), correct: true },
        ...wc.slice(0, 3),
      ]),
      steps: [
        `行「自由度 ${df}」× 列「上側確率 ${a}」の交点を読む → ${fmt(ans, 3)}`,
        'df→∞ で z に近づく。df の行を間違えると数値がずれる。',
      ],
    };
  }

  if (kind === 'chi2_crit') {
    const df = pick(rng, [1, 2, 3, 4, 5, 6, 8, 10]);
    const a = pick(rng, [0.1, 0.05, 0.025, 0.01]);
    const ans = chi2Crit(a, df);
    const otherA = pick(
      rng,
      [0.975, 0.95].filter((x) => x !== a),
    );
    const wrongs = [
      {
        v: chi2Crit(a, df + 1),
        why: `自由度を ${df + 1} で読んだ（${df} が正しい）`,
      },
      {
        v: chi2Crit(otherA, df),
        why: '下側（有意でない側）の列を読んだ',
      },
      { v: ans / 2, why: '別の表と混同した' },
    ];
    const seen = new Set([fmt(ans, 3)]);
    const wc: Choice[] = [];
    for (const w of wrongs) {
      const t = fmt(w.v, 3);
      if (!seen.has(t)) {
        seen.add(t);
        wc.push({ text: t, correct: false, why: w.why });
      }
    }
    return {
      id: 'tbl-chi2',
      text: `χ²分布表で、自由度 ${df}・上側確率 ${a} の臨界値を求めよ。`,
      choices: shuffle(rng, [
        { text: fmt(ans, 3), correct: true },
        ...wc.slice(0, 3),
      ]),
      steps: [
        `行「自由度 ${df}」× 列「上側確率 ${a}」→ ${fmt(ans, 3)}`,
        '両側検定（母分散の区間推定など）では α/2 と 1−α/2 の両方を引く。',
      ],
    };
  }

  if (kind === 'f_crit') {
    const df1 = pick(rng, [1, 2, 3, 4, 5, 6, 8]);
    const df2 = pick(rng, [8, 10, 12, 15, 20, 24, 30]);
    const a = pick(rng, [0.1, 0.05, 0.025, 0.01]);
    const ans = fCrit(a, df1, df2);
    const wrongs = [
      {
        v: fCrit(a, df2 <= 10 ? df2 : 10, df1),
        why: '自由度の順序を逆にした（分子→分母の順）',
      },
      {
        v: fCrit(a === 0.05 ? 0.025 : 0.05, df1, df2),
        why: '上側確率の表を間違えた',
      },
      { v: 1 / ans, why: '逆数を取った（Fの読み違い典型）' },
    ];
    const seen = new Set([fmt(ans, 3)]);
    const wc: Choice[] = [];
    for (const w of wrongs) {
      const t = fmt(w.v, 3);
      if (!seen.has(t)) {
        seen.add(t);
        wc.push({ text: t, correct: false, why: w.why });
      }
    }
    return {
      id: 'tbl-f',
      text: `F分布表で、上側確率 ${a}・自由度（${df1}, ${df2}）の臨界値 $F_{${a}}(${df1}, ${df2})$ を求めよ。`,
      choices: shuffle(rng, [
        { text: fmt(ans, 3), correct: true },
        ...wc.slice(0, 3),
      ]),
      steps: [
        `F表は「分子の自由度 df₁=${df1}」の列 ×「分母の自由度 df₂=${df2}」の行`,
        `F(${a}; ${df1}, ${df2}) = ${fmt(ans, 3)}`,
        '分子・分母を逆に読むと全く違う値になる — F検定で最も多い表のミス。',
      ],
    };
  }

  // read_col: 表の引き方（列の選び方）の概念問題
  const df = pick(rng, [5, 10, 15, 20]);
  const variant = pick(rng, ['two5', 'two1', 'ci95'] as const);
  const map = {
    two5: {
      text: `母平均の両側検定（有意水準5%、σ未知・n=${df + 1}）で t分布表を引くとき、見るべき「上側確率」の列は。`,
      ans: '0.025',
      why: '両側5% → 片側は 5%÷2 = 2.5%',
      wrong: [
        ['0.05', '片側のときの列（両側は半分）'],
        ['0.10', '片側10%と両側5%を混同'],
        ['0.005', '両側1%の列'],
      ] as [string, string][],
    },
    two1: {
      text: `両側検定・有意水準1%で t分布表を引くとき、見るべき「上側確率」の列は。`,
      ans: '0.005',
      why: '両側1% → 片側は 0.5%',
      wrong: [
        ['0.01', '片側のときの列'],
        ['0.05', '5%検定と混同'],
        ['0.025', '両側5%の列'],
      ] as [string, string][],
    },
    ci95: {
      text: `95%信頼区間（σ未知）を求めるとき、t分布表で見るべき「上側確率」の列は。`,
      ans: '0.025',
      why: '両側95% → 片側の外側は 2.5%',
      wrong: [
        ['0.05', '片側95%信頼の列（両側は2.5%ずつ）'],
        ['0.95', '信頼係数そのものを引いた'],
        ['0.005', '99%信頼区間の列'],
      ] as [string, string][],
    },
  }[variant];
  return {
    id: `tbl-${variant}`,
    text: map.text,
    choices: shuffle(rng, [
      { text: map.ans, correct: true },
      ...map.wrong.map(([t, why]): Choice => ({
        text: t,
        correct: false,
        why,
      })),
    ]),
    steps: [
      map.why,
      `ルール: 両側α検定/信頼係数1−α なら「上側確率 α/2」の列を引く。`,
    ],
  };
}

interface Props {
  isReported: (key: string) => boolean;
  onToggleReport: (key: string) => void;
}

export default function TableTrain({ isReported, onToggleReport }: Props) {
  const rng = useRef(Math.random);
  const [q, setQ] = useState<TQ>(() => genTableQ(rng.current));
  const [answered, setAnswered] = useState<number | null>(null);
  const [session, setSession] = useState({ n: 0, correct: 0 });
  const { record } = useQuizStats();

  const next = useCallback(() => {
    setQ(genTableQ(rng.current));
    setAnswered(null);
  }, []);

  const onAnswer = (i: number) => {
    if (answered !== null) return;
    setAnswered(i);
    const ok = q.choices[i].correct;
    record(q.id, ok);
    setSession((s) => ({ n: s.n + 1, correct: s.correct + (ok ? 1 : 0) }));
  };

  const acc =
    session.n > 0 ? Math.round((session.correct / session.n) * 100) : null;

  return (
    <div className={styles.wrap}>
      <p className={styles.note}>
        会場配布の数値表（正規・t・χ²・F）を使った表の引き方練習
        {acc !== null && ` — 正答率 ${acc}%（${session.correct}/${session.n}）`}
      </p>
      <div className={styles.card}>
        <div className={styles.head}>
          <span className={styles.tag}>{q.id}</span>
          <ReportButton
            itemKey={q.id}
            reported={isReported(q.id)}
            onToggle={onToggleReport}
          />
        </div>
        <p className={styles.text}>{q.text}</p>
        <div className={styles.choices}>
          {q.choices.map((c, i) => {
            let cls = styles.choice;
            if (answered !== null) {
              if (c.correct) cls += ` ${styles.correct}`;
              else if (i === answered) cls += ` ${styles.wrong}`;
              else cls += ` ${styles.dim}`;
            }
            return (
              <button
                key={i}
                type="button"
                className={cls}
                disabled={answered !== null}
                onClick={() => onAnswer(i)}
              >
                {c.text}
              </button>
            );
          })}
        </div>
        {answered !== null && (
          <div className={styles.result}>
            <p className={q.choices[answered].correct ? styles.ok : styles.ng}>
              {q.choices[answered].correct ? '⭕ 正解' : '❌ 不正解'}
            </p>
            {!q.choices[answered].correct && q.choices[answered].why && (
              <p className={styles.why}>
                選んだ誤答の理由: {q.choices[answered].why}
              </p>
            )}
            {q.steps.map((s, i) => (
              <p key={i} className={styles.step}>
                {s}
              </p>
            ))}
            <button type="button" className={styles.next} onClick={next}>
              次の問題 →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
