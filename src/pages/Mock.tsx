import { useEffect, useMemo, useRef, useState } from 'react';
import questionsData from '../data/questions.json';
import type { QuestionTemplate } from '../types/Question';
import type { Category } from '../types/Card';
import { SOLVERS, type SolvedQuestion } from '../solvers';
import { shuffle } from '../lib/stats';
import { useQuizStats } from '../hooks/useQuizStats';
import { Tex } from '../components/Tex';
import { ReportButton } from '../components/ReportButton';
import styles from './Mock.module.css';

const templates = questionsData as QuestionTemplate[];

const MODES = {
  mini: { label: 'ミニ模試', n: 10, time: 25 * 60, desc: '全10問・25分' },
  full: {
    label: '本番モード',
    n: 35,
    time: 90 * 60,
    desc: '全35問・90分（CBT本番相当）',
  },
} as const;
type ModeKey = keyof typeof MODES;

interface MockItem {
  tpl: QuestionTemplate;
  q: SolvedQuestion;
}

/** カテゴリーをまたいで n 問選ぶ（各カテゴリ1問ずつ→残りランダム）。 */
function buildExam(rng: () => number, n: number): MockItem[] {
  const byCat = new Map<Category, QuestionTemplate[]>();
  for (const t of templates) {
    const l = byCat.get(t.category) ?? [];
    l.push(t);
    byCat.set(t.category, l);
  }
  const cats = shuffle(rng, [...byCat.keys()]);
  const picked: QuestionTemplate[] = [];
  for (const c of cats) {
    if (picked.length >= n) break;
    picked.push(pickRandom(rng, byCat.get(c)!));
  }
  const rest = templates.filter((t) => !picked.includes(t));
  while (picked.length < n && rest.length > 0) {
    const i = Math.floor(rng() * rest.length);
    picked.push(rest[i]);
    rest.splice(i, 1);
  }
  return shuffle(rng, picked).map((tpl) => ({
    tpl,
    q: SOLVERS[tpl.solver](rng, tpl.pool),
  }));
}

function pickRandom<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

interface Props {
  isReported: (key: string) => boolean;
  onToggleReport: (key: string) => void;
}

export default function Mock({ isReported, onToggleReport }: Props) {
  const rng = useRef(Math.random);
  const [mode, setMode] = useState<ModeKey>('mini');
  const [exam, setExam] = useState<MockItem[] | null>(null);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [flags, setFlags] = useState<boolean[]>([]);
  const [times, setTimes] = useState<number[]>([]); // 各問に費やした秒
  const [remain, setRemain] = useState(MODES.mini.time);
  const [finished, setFinished] = useState(false);
  const qStart = useRef(0); // 現在の問題を開いた時刻
  const { record } = useQuizStats();

  const conf = MODES[mode];

  // 残り時間カウントダウン
  useEffect(() => {
    if (!exam || finished) return;
    const t = setInterval(() => {
      setRemain((r) => {
        if (r <= 1) {
          setFinished(true);
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [exam, finished]);

  /** 現在の問題に費やした時間を確定してから fn を実行 */
  const flushTime = () => {
    const spent = Math.round((Date.now() - qStart.current) / 1000);
    setTimes((prev) => {
      const n = [...prev];
      n[idx] = (n[idx] ?? 0) + spent;
      return n;
    });
  };
  const goTo = (i: number) => {
    flushTime();
    setIdx(i);
    qStart.current = Date.now();
  };

  const start = (m: ModeKey) => {
    const c = MODES[m];
    setMode(m);
    setExam(buildExam(rng.current, c.n));
    setIdx(0);
    setAnswers(Array(c.n).fill(null));
    setFlags(Array(c.n).fill(false));
    setTimes(Array(c.n).fill(0));
    setRemain(c.time);
    setFinished(false);
    qStart.current = Date.now();
  };

  const score = useMemo(() => {
    if (!exam) return 0;
    return exam.reduce(
      (a, it, i) =>
        a + (answers[i] !== null && it.q.choices[answers[i]!].correct ? 1 : 0),
      0,
    );
  }, [exam, answers]);

  const finish = () => {
    if (!exam) return;
    flushTime();
    exam.forEach((it, i) => {
      const a = answers[i];
      if (a !== null) record(it.tpl.id, it.q.choices[a].correct);
    });
    setFinished(true);
  };

  const mm = Math.floor(remain / 60);
  const ss = String(remain % 60).padStart(2, '0');
  const urgent = remain < 300;

  if (!exam) {
    return (
      <div className={styles.wrap}>
        <div className={styles.intro}>
          <h2 className={styles.h2}>模試</h2>
          <p className={styles.note}>
            本番同様、解答中は正誤を表示しません。
            見直しフラグで後から戻れます。カテゴリー横断で出題します。
          </p>
          {(['mini', 'full'] as ModeKey[]).map((m) => (
            <button
              key={m}
              type="button"
              className={styles.startBtn}
              onClick={() => start(m)}
            >
              {MODES[m].label}（{MODES[m].desc}）
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (finished) {
    // 分野別正答率
    const catStat = new Map<Category, { ok: number; total: number }>();
    exam.forEach((it, i) => {
      const s = catStat.get(it.tpl.category) ?? { ok: 0, total: 0 };
      s.total++;
      if (answers[i] !== null && it.q.choices[answers[i]!].correct) s.ok++;
      catStat.set(it.tpl.category, s);
    });
    const answered = answers.filter((a) => a !== null).length;
    return (
      <div className={styles.wrap}>
        <div className={styles.resultCard}>
          <p className={styles.score}>
            {score} / {exam.length} 問正解
          </p>
          <p className={styles.note}>
            {conf.label}・回答済み {answered}問・
            {remain > 0 ? `残り ${mm}:${ss} で終了` : '時間切れ'}
            {mode === 'full' &&
              ` / 得点率 ${Math.round((score / exam.length) * 100)}%（60%が合格目安）`}
          </p>
        </div>
        <div className={styles.resultCard}>
          <h3 className={styles.h3}>分野別の正答率</h3>
          <table className={styles.catTable}>
            <tbody>
              {[...catStat.entries()]
                .sort((a, b) => a[1].ok / a[1].total - b[1].ok / b[1].total)
                .map(([cat, s]) => (
                  <tr key={cat}>
                    <td className={styles.catName}>{cat}</td>
                    <td className={styles.catBar}>
                      <span
                        className={styles.catFill}
                        style={{ width: `${(s.ok / s.total) * 100}%` }}
                      />
                    </td>
                    <td className={styles.catNum}>
                      {s.ok}/{s.total}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        <div className={styles.resultCard}>
          <h3 className={styles.h3}>1問あたりの所要時間</h3>
          <div className={styles.timeList}>
            {exam.map((_, i) => (
              <span key={i} className={styles.timeChip}>
                Q{i + 1}: {Math.floor((times[i] ?? 0) / 60)}分
                {String((times[i] ?? 0) % 60).padStart(2, '0')}秒
                {flags[i] ? ' 🚩' : ''}
              </span>
            ))}
          </div>
        </div>
        {exam.map((it, i) => {
          const a = answers[i];
          const ok = a !== null && it.q.choices[a].correct;
          return (
            <div key={i} className={styles.reviewCard}>
              <p className={styles.reviewHead}>
                Q{i + 1} [{it.tpl.category}] {it.tpl.label}
                {flags[i] && <span title="見直しフラグ"> 🚩</span>}
                <span className={styles.reviewMeta}>
                  <ReportButton
                    itemKey={`q:${it.tpl.id}`}
                    reported={isReported(`q:${it.tpl.id}`)}
                    onToggle={onToggleReport}
                  />
                  <span className={ok ? styles.markOk : styles.markNg}>
                    {ok ? '⭕' : a === null ? '— 未回答' : '❌'}
                  </span>
                </span>
              </p>
              <p className={styles.reviewText}>
                <Tex text={it.q.text} />
              </p>
              {it.q.figure && (
                <div
                  className={styles.reviewFigure}
                  dangerouslySetInnerHTML={{ __html: it.q.figure }}
                />
              )}
              <p className={styles.reviewAns}>
                正解: <Tex text={it.q.choices.find((c) => c.correct)!.text} />
                {a !== null &&
                  !ok &&
                  ` / あなたの回答: ${it.q.choices[a].text}`}
              </p>
              {!ok && (
                <div className={styles.reviewSteps}>
                  {it.q.steps.map((s, j) => (
                    <p key={j} className={styles.step}>
                      <Tex text={s} />
                    </p>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        <button
          type="button"
          className={styles.startBtn}
          onClick={() => start(mode)}
        >
          もう一度（新しい{conf.n}問）
        </button>
      </div>
    );
  }

  const item = exam[idx];
  const sel = answers[idx];

  return (
    <div className={styles.wrap}>
      <div className={styles.hud}>
        <span className={styles.progressText}>
          {idx + 1} / {exam.length}
        </span>
        <span className={`${styles.timer} ${urgent ? styles.urgent : ''}`}>
          ⏱ {mm}:{ss}
        </span>
        <button type="button" className={styles.giveUp} onClick={finish}>
          終了して採点
        </button>
      </div>

      <div className={styles.qcard}>
        <p className={styles.qhead}>
          [{item.tpl.category}] {item.tpl.label}
        </p>
        <p className={styles.qtext}>
          <Tex text={item.q.text} />
        </p>
        {item.q.figure && (
          <div
            className={styles.reviewFigure}
            dangerouslySetInnerHTML={{ __html: item.q.figure }}
          />
        )}
        <div className={styles.choices}>
          {item.q.choices.map((c, i) => (
            <button
              key={i}
              type="button"
              className={`${styles.choice} ${sel === i ? styles.selected : ''}`}
              onClick={() =>
                setAnswers((prev) => {
                  const n = [...prev];
                  n[idx] = i;
                  return n;
                })
              }
            >
              <Tex text={c.text} />
            </button>
          ))}
        </div>
        <button
          type="button"
          className={`${styles.flagBtn} ${flags[idx] ? styles.flagged : ''}`}
          onClick={() =>
            setFlags((prev) => {
              const n = [...prev];
              n[idx] = !n[idx];
              return n;
            })
          }
        >
          {flags[idx] ? '🚩 見直す（解除）' : '🚩 あとで見直す'}
        </button>
      </div>

      <div className={styles.nav}>
        <button
          type="button"
          className={styles.navBtn}
          disabled={idx === 0}
          onClick={() => goTo(idx - 1)}
        >
          ← 前へ
        </button>
        {idx < exam.length - 1 ? (
          <button
            type="button"
            className={styles.navBtn}
            onClick={() => goTo(idx + 1)}
          >
            次へ →
          </button>
        ) : (
          <button
            type="button"
            className={`${styles.navBtn} ${styles.finishBtn}`}
            onClick={finish}
          >
            採点する
          </button>
        )}
      </div>
      <p className={styles.answered}>
        回答済み {answers.filter((a) => a !== null).length} / {exam.length}
        {flags.some(Boolean) && ` ・ 🚩${flags.filter(Boolean).length}`}
      </p>
      {mode === 'full' && (
        <div className={styles.qIndex}>
          {exam.map((_, i) => (
            <button
              key={i}
              type="button"
              className={`${styles.qNum} ${
                i === idx ? styles.qNumCur : ''
              } ${answers[i] !== null ? styles.qNumDone : ''}`}
              onClick={() => goTo(i)}
            >
              {i + 1}
              {flags[i] ? '🚩' : ''}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
