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
const TIME_LIMIT = 25 * 60; // 秒
const NQ = 10;

interface MockItem {
  tpl: QuestionTemplate;
  q: SolvedQuestion;
}

/** カテゴリーをまたいで10問選ぶ（できるだけ被らないように）。 */
function buildExam(rng: () => number): MockItem[] {
  const byCat = new Map<Category, QuestionTemplate[]>();
  for (const t of templates) {
    const l = byCat.get(t.category) ?? [];
    l.push(t);
    byCat.set(t.category, l);
  }
  const cats = shuffle(rng, [...byCat.keys()]);
  const picked: QuestionTemplate[] = [];
  // 各カテゴリから1問ずつ → 足りなければランダム補充
  for (const c of cats) {
    if (picked.length >= NQ) break;
    picked.push(pickRandom(rng, byCat.get(c)!));
  }
  const rest = templates.filter((t) => !picked.includes(t));
  while (picked.length < NQ && rest.length > 0) {
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
  const [exam, setExam] = useState<MockItem[] | null>(null);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [remain, setRemain] = useState(TIME_LIMIT);
  const [finished, setFinished] = useState(false);
  const { record } = useQuizStats();

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

  const start = () => {
    setExam(buildExam(rng.current));
    setIdx(0);
    setAnswers(Array(NQ).fill(null));
    setRemain(TIME_LIMIT);
    setFinished(false);
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
    // 成績を記録（未回答は誤答扱いで記録しない）
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
          <h2 className={styles.h2}>ミニ模試</h2>
          <p className={styles.note}>
            全{NQ}問・25分。本番同様、解答中は正誤を表示しません。
            カテゴリー横断で出題します。
          </p>
          <button type="button" className={styles.startBtn} onClick={start}>
            開始する
          </button>
        </div>
      </div>
    );
  }

  if (finished) {
    return (
      <div className={styles.wrap}>
        <div className={styles.resultCard}>
          <p className={styles.score}>
            {score} / {exam.length} 問正解
          </p>
          <p className={styles.note}>
            {remain > 0 ? `残り ${mm}:${ss} で終了` : '時間切れ（25分経過）'}
          </p>
        </div>
        {exam.map((it, i) => {
          const a = answers[i];
          const ok = a !== null && it.q.choices[a].correct;
          return (
            <div key={i} className={styles.reviewCard}>
              <p className={styles.reviewHead}>
                Q{i + 1} [{it.tpl.category}] {it.tpl.label}
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
        <button type="button" className={styles.startBtn} onClick={start}>
          もう一度（新しい10問）
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
      </div>

      <div className={styles.nav}>
        <button
          type="button"
          className={styles.navBtn}
          disabled={idx === 0}
          onClick={() => setIdx((i) => i - 1)}
        >
          ← 前へ
        </button>
        {idx < exam.length - 1 ? (
          <button
            type="button"
            className={styles.navBtn}
            onClick={() => setIdx((i) => i + 1)}
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
      </p>
    </div>
  );
}
