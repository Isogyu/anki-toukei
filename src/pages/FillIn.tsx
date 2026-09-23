import { useCallback, useMemo, useRef, useState } from 'react';
import type { RNG } from '../lib/stats';
import { randInt, pick, shuffle, fmt } from '../lib/stats';
import type { Choice } from '../solvers/types';
import { numChoices } from '../solvers/types';
import { useQuizStats } from '../hooks/useQuizStats';
import { ReportButton } from '../components/ReportButton';
import styles from './FillIn.module.css';

interface Blank {
  key: string;
  label: string;
  value: number;
  digits: number;
  wrongs: { value: number; why: string }[];
}

interface AnovaData {
  kind: 'anova';
  k: number;
  N: number;
  ssB: number;
  ssW: number;
  ssT: number;
  dfB: number;
  dfW: number;
  dfT: number;
  msB: number;
  msW: number;
  F: number;
}

function genAnova(rng: RNG): { data: AnovaData; blanks: Blank[] } {
  const k = pick(rng, [3, 4]);
  const N = k * pick(rng, [6, 8, 10]);
  const dfB = k - 1;
  const dfW = N - k;
  const dfT = N - 1;
  const msW = randInt(rng, 10, 40);
  const ssW = msW * dfW;
  const msB = msW * pick(rng, [2, 3, 5, 7]);
  const ssB = msB * dfB;
  const data: AnovaData = {
    kind: 'anova',
    k,
    N,
    ssB,
    ssW,
    ssT: ssB + ssW,
    dfB,
    dfW,
    dfT,
    msB,
    msW,
    F: msB / msW,
  };
  const cand: Blank[] = [
    {
      key: 'dfB',
      label: '群間の自由度',
      value: dfB,
      digits: 0,
      wrongs: [
        { value: dfW, why: '群内の自由度と混同（群間は k−1）' },
        { value: dfT, why: '全体の自由度と混同' },
        { value: N, why: '標本サイズと混同' },
      ],
    },
    {
      key: 'dfW',
      label: '群内の自由度',
      value: dfW,
      digits: 0,
      wrongs: [
        { value: dfT, why: '全体の自由度 N−1 と混同（群内は N−k）' },
        { value: dfB, why: '群間の自由度を答えた' },
        { value: N - k + 1, why: '数え違い' },
      ],
    },
    {
      key: 'msB',
      label: '群間の平均平方 MS',
      value: msB,
      digits: 1,
      wrongs: [
        { value: ssB / dfW, why: '群内の自由度で割った' },
        { value: ssB, why: 'SSをそのまま答えた（MSはSS÷df）' },
        { value: msW, why: '群内MSと混同した' },
      ],
    },
    {
      key: 'F',
      label: 'F 値',
      value: msB / msW,
      digits: 2,
      wrongs: [
        { value: msW / msB, why: '分母分子を逆にした（F=MS群間÷MS群内）' },
        { value: ssB / ssW, why: 'SSの比を取った（FはMSの比）' },
        { value: ssB / msW, why: 'SSとMSを混ぜて割った' },
      ],
    },
    {
      key: 'ssT',
      label: '全体の変動 SST',
      value: ssB + ssW,
      digits: 1,
      wrongs: [
        { value: Math.abs(ssB - ssW), why: '和でなく差を取った' },
        { value: msB + msW, why: 'MSを足した（SSではない）' },
        { value: ssB, why: '群間SSだけを答えた' },
      ],
    },
  ];
  return { data, blanks: shuffle(rng, cand).slice(0, 3) };
}

interface RegData {
  kind: 'reg';
  n: number;
  sxx: number;
  sxy: number;
  syy: number;
  b: number;
  se: number;
  t: number;
  r2: number;
}

function genReg(rng: RNG): { data: RegData; blanks: Blank[] } {
  const n = randInt(rng, 8, 15);
  const sxx = randInt(rng, 50, 300);
  const r = pick(rng, [0.7, 0.8, 0.9, -0.7, -0.8]);
  const syy = randInt(rng, 80, 400);
  const sxy = r * Math.sqrt(sxx * syy);
  const sxyR = Math.round(sxy * 10) / 10;
  const b = sxyR / sxx;
  const sse = syy - (sxyR * sxyR) / sxx;
  const se = Math.sqrt(sse / (n - 2) / sxx);
  const t = b / se;
  const r2 = (sxyR * sxyR) / (sxx * syy);
  const data: RegData = { kind: 'reg', n, sxx, sxy: sxyR, syy, b, se, t, r2 };
  const cand: Blank[] = [
    {
      key: 'b',
      label: '傾き b',
      value: b,
      digits: 3,
      wrongs: [
        { value: sxx / sxyR, why: 'Sxy/Sxx の分子分母を逆にした' },
        { value: sxyR / syy, why: 'Syy で割った（分母は Sxx）' },
        { value: r, why: '相関係数と混同した' },
      ],
    },
    {
      key: 'se',
      label: '標準誤差 SE(b)',
      value: se,
      digits: 3,
      wrongs: [
        {
          value: Math.sqrt(sse / (n - 2)),
          why: '√MSE だけで √Sxx で割らなかった',
        },
        { value: sse / (n - 2) / sxx, why: '√ を忘れた（分散のまま）' },
        {
          value: Math.sqrt(sse / n / sxx),
          why: '自由度を n−2 でなく n にした',
        },
      ],
    },
    {
      key: 't',
      label: 't 値',
      value: t,
      digits: 2,
      wrongs: [
        { value: b * se, why: '割るべきところ掛けた（t=b÷SE）' },
        { value: se / b, why: 'SE÷b にした（逆）' },
        { value: b / Math.sqrt(sse / (n - 2)), why: 'SE でなく √MSE で割った' },
      ],
    },
    {
      key: 'r2',
      label: '決定係数 R²',
      value: r2,
      digits: 3,
      wrongs: [
        { value: Math.sqrt(Math.abs(r2)), why: 'R² でなく |r| を答えた' },
        { value: sxyR / sxx, why: '傾き b を答えた' },
        { value: 1 - r2, why: '1−R² を答えた' },
      ],
    },
  ];
  return { data, blanks: shuffle(rng, cand).slice(0, 3) };
}

type Mode = 'anova' | 'reg';
type Puzzle =
  { data: AnovaData; blanks: Blank[] } | { data: RegData; blanks: Blank[] };

interface Props {
  isReported: (key: string) => boolean;
  onToggleReport: (key: string) => void;
}

export default function FillIn({ isReported, onToggleReport }: Props) {
  const rng = useRef(Math.random);
  const [mode, setMode] = useState<Mode>('anova');
  const [puzzle, setPuzzle] = useState<Puzzle>(() => genAnova(rng.current));
  const [blankIdx, setBlankIdx] = useState(0);
  const [choices, setChoices] = useState<Choice[]>(() =>
    numChoices(
      rng.current,
      puzzle.blanks[0].value,
      puzzle.blanks[0].wrongs,
      puzzle.blanks[0].digits,
    ),
  );
  const [answered, setAnswered] = useState<number | null>(null);
  const [results, setResults] = useState<boolean[]>([]);
  const [done, setDone] = useState(false);
  const { record } = useQuizStats();

  const statId = `fill-${mode}`;

  const start = useCallback((m: Mode) => {
    const p = m === 'anova' ? genAnova(rng.current) : genReg(rng.current);
    setPuzzle(p);
    setBlankIdx(0);
    setChoices(
      numChoices(
        rng.current,
        p.blanks[0].value,
        p.blanks[0].wrongs,
        p.blanks[0].digits,
      ),
    );
    setAnswered(null);
    setResults([]);
    setDone(false);
  }, []);

  const blank = puzzle.blanks[blankIdx];
  const blankKeys = useMemo(
    () => new Set(puzzle.blanks.map((b) => b.key)),
    [puzzle],
  );

  const onAnswer = (i: number) => {
    if (answered !== null) return;
    setAnswered(i);
    const ok = choices[i].correct;
    record(statId, ok);
    setResults((r) => [...r, ok]);
  };

  const onNext = () => {
    if (blankIdx >= puzzle.blanks.length - 1) {
      setDone(true);
      return;
    }
    const ni = blankIdx + 1;
    setBlankIdx(ni);
    const b = puzzle.blanks[ni];
    setChoices(numChoices(rng.current, b.value, b.wrongs, b.digits));
    setAnswered(null);
  };

  const cell = (key: string, shown: string) => {
    if (!blankKeys.has(key)) return <td>{shown}</td>;
    if (done) {
      const bi = puzzle.blanks.findIndex((b) => b.key === key);
      return (
        <td className={results[bi] ? styles.cellOk : styles.cellNg}>{shown}</td>
      );
    }
    return <td className={key === blank.key ? styles.target : ''}>【？】</td>;
  };

  const isAnova = puzzle.data.kind === 'anova';
  const d = puzzle.data;

  return (
    <div className={styles.wrap}>
      <div className={styles.modeBar}>
        <button
          type="button"
          className={`${styles.modeBtn} ${mode === 'anova' ? styles.active : ''}`}
          onClick={() => {
            setMode('anova');
            start('anova');
          }}
        >
          分散分析表
        </button>
        <button
          type="button"
          className={`${styles.modeBtn} ${mode === 'reg' ? styles.active : ''}`}
          onClick={() => {
            setMode('reg');
            start('reg');
          }}
        >
          回帰出力
        </button>
        <ReportButton
          itemKey={statId}
          reported={isReported(statId)}
          onToggle={onToggleReport}
        />
      </div>

      <div className={styles.tableCard}>
        {isAnova ? (
          <>
            <p className={styles.caption}>
              一元配置分散分析表（{(d as AnovaData).k}群・N=
              {(d as AnovaData).N}）
            </p>
            <table className={styles.tbl}>
              <thead>
                <tr>
                  <th>変動</th>
                  <th>平方和</th>
                  <th>自由度</th>
                  <th>平均平方</th>
                  <th>F</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>群間</td>
                  <td>{fmt((d as AnovaData).ssB, 1)}</td>
                  {cell('dfB', fmt((d as AnovaData).dfB, 0))}
                  {cell('msB', fmt((d as AnovaData).msB, 1))}
                  {cell('F', fmt((d as AnovaData).F, 2))}
                </tr>
                <tr>
                  <td>群内</td>
                  <td>{fmt((d as AnovaData).ssW, 1)}</td>
                  {cell('dfW', fmt((d as AnovaData).dfW, 0))}
                  <td>{fmt((d as AnovaData).msW, 1)}</td>
                  <td>—</td>
                </tr>
                <tr>
                  <td>全体</td>
                  {cell('ssT', fmt((d as AnovaData).ssT, 1))}
                  <td>{fmt((d as AnovaData).dfT, 0)}</td>
                  <td>—</td>
                  <td>—</td>
                </tr>
              </tbody>
            </table>
          </>
        ) : (
          <>
            <p className={styles.caption}>
              単回帰の出力（n={(d as RegData).n}、Sxx=
              {(d as RegData).sxx}、Sxy=
              {fmt((d as RegData).sxy, 1)}、Syy=
              {(d as RegData).syy}）
            </p>
            <table className={styles.tbl}>
              <thead>
                <tr>
                  <th>項目</th>
                  <th>値</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>傾き b</td>
                  {cell('b', fmt((d as RegData).b, 3))}
                </tr>
                <tr>
                  <td>標準誤差 SE(b)</td>
                  {cell('se', fmt((d as RegData).se, 3))}
                </tr>
                <tr>
                  <td>t 値</td>
                  {cell('t', fmt((d as RegData).t, 2))}
                </tr>
                <tr>
                  <td>決定係数 R²</td>
                  {cell('r2', fmt((d as RegData).r2, 3))}
                </tr>
              </tbody>
            </table>
          </>
        )}
      </div>

      {!done ? (
        <div className={styles.qbox}>
          <p className={styles.qlabel}>
            空欄 {blankIdx + 1}/{puzzle.blanks.length}: 「{blank.label}」は？
          </p>
          <div className={styles.choices}>
            {choices.map((c, i) => {
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
            <>
              {!choices[answered].correct && choices[answered].why && (
                <p className={styles.why}>
                  誤答の理由: {choices[answered].why}
                </p>
              )}
              <button type="button" className={styles.next} onClick={onNext}>
                {blankIdx >= puzzle.blanks.length - 1
                  ? '結果を見る'
                  : '次の空欄 →'}
              </button>
            </>
          )}
        </div>
      ) : (
        <div className={styles.qbox}>
          <p className={styles.summary}>
            {results.filter(Boolean).length}/{results.length} 正解
          </p>
          <div className={styles.steps}>
            {isAnova ? (
              <>
                <p className={styles.step}>
                  分解: SST = SSB + SSW、dfT = dfB + dfW = (k−1)+(N−k)
                </p>
                <p className={styles.step}>MS = SS÷df、F = MS(群間)÷MS(群内)</p>
              </>
            ) : (
              <>
                <p className={styles.step}>
                  傾き b = Sxy÷Sxx、R² = Sxy²÷(Sxx·Syy)
                </p>
                <p className={styles.step}>
                  SE(b) = √(MSE÷Sxx)、MSE = (Syy−Sxy²÷Sxx)÷(n−2)、t = b÷SE
                </p>
              </>
            )}
          </div>
          <button
            type="button"
            className={styles.next}
            onClick={() => start(mode)}
          >
            もう一度（新しい数値）→
          </button>
        </div>
      )}
    </div>
  );
}
