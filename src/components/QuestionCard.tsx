import { useState } from 'react';
import type { Choice, SolvedQuestion } from '../solvers/types';
import type { MissType } from '../hooks/useQuizStats';
import { MISS_LABELS } from '../hooks/useQuizStats';
import { Tex } from './Tex';
import { ReportButton } from './ReportButton';
import styles from './QuestionCard.module.css';

interface Props {
  q: SolvedQuestion;
  answered: number | null; // 選んだ選択肢 index（最終ステップ）
  /** correct はステップ式なら「全ステップ正解」かどうか */
  onAnswer: (i: number, correct: boolean) => void;
  onNext: () => void;
  missType?: MissType;
  onMissType?: (t: MissType) => void;
  header?: string;
  refsLine?: string;
  itemKey?: string;
  reported?: boolean;
  onToggleReport?: (key: string) => void;
  nextLabel?: string;
}

function ChoiceList({
  choices,
  picked,
  onPick,
}: {
  choices: Choice[];
  picked: number | null;
  onPick: (i: number) => void;
}) {
  const done = picked !== null;
  return (
    <div className={styles.choices}>
      {choices.map((c, i) => {
        let cls = styles.choice;
        if (done) {
          if (c.correct) cls += ` ${styles.correct}`;
          else if (i === picked) cls += ` ${styles.wrong}`;
          else cls += ` ${styles.dim}`;
        }
        return (
          <button
            key={i}
            type="button"
            className={cls}
            disabled={done}
            onClick={() => onPick(i)}
          >
            <Tex text={c.text} />
          </button>
        );
      })}
    </div>
  );
}

/** 4〜5択の演習問題カード。解答後に手順・誤答理由・参照を表示する。
 *  q.stages があれば「Step 1 → Step 2 → … → 最終ステップ」と順に解かせる。 */
export function QuestionCard({
  q,
  answered,
  onAnswer,
  onNext,
  missType,
  onMissType,
  header,
  refsLine,
  itemKey,
  reported,
  onToggleReport,
  nextLabel = '次の問題 →',
}: Props) {
  const stages = q.stages ?? [];
  const staged = stages.length > 0;
  // ステップの選択状態。問題が変わったらリセットする。
  const [forQ, setForQ] = useState(q);
  const [picks, setPicks] = useState<number[]>([]);
  const [cur, setCur] = useState(0);
  if (forQ !== q) {
    setForQ(q);
    setPicks([]);
    setCur(0);
  }

  const stageOk = stages.map(
    (s, j) => picks[j] !== undefined && s.choices[picks[j]].correct,
  );
  const allStagesOk = stageOk.every(Boolean);
  const inFinal = !staged || cur >= stages.length;

  const isAnswered = answered !== null;
  const finalOk = isAnswered && q.choices[answered].correct;
  const wasCorrect = finalOk && allStagesOk;
  const firstMiss = stageOk.findIndex((ok) => !ok);

  const total = stages.length + 1;

  return (
    <div className={styles.card}>
      {header && (
        <div className={styles.headerRow}>
          <span className={styles.header}>{header}</span>
          {itemKey && onToggleReport && (
            <ReportButton
              itemKey={itemKey}
              reported={!!reported}
              onToggle={onToggleReport}
            />
          )}
        </div>
      )}
      <p className={styles.text}>
        <Tex text={staged ? (q.stem ?? q.text) : q.text} />
      </p>
      {q.figure && (
        <div
          className={styles.figure}
          dangerouslySetInnerHTML={{ __html: q.figure }}
        />
      )}

      {staged && (
        <>
          <div className={styles.stageBar} aria-label="ステップの進み具合">
            {Array.from({ length: total }, (_, j) => {
              let cls = styles.stageDot;
              if (j < stages.length && picks[j] !== undefined)
                cls += stageOk[j] ? ` ${styles.dotOk}` : ` ${styles.dotNg}`;
              else if (j === stages.length && isAnswered)
                cls += finalOk ? ` ${styles.dotOk}` : ` ${styles.dotNg}`;
              if (j === Math.min(cur, stages.length))
                cls += ` ${styles.dotCur}`;
              return (
                <span key={j} className={cls}>
                  {j + 1}
                </span>
              );
            })}
          </div>

          {/* 解き終えたステップの要約 */}
          {stages.slice(0, cur).map((s, j) => (
            <div key={j} className={styles.stageDone}>
              <span className={stageOk[j] ? styles.okMark : styles.ngMark}>
                {stageOk[j] ? '⭕' : '❌'}
              </span>
              <span className={styles.stageDoneText}>
                <Tex text={s.prompt} /> →{' '}
                <b>
                  <Tex text={s.choices.find((c) => c.correct)!.text} />
                </b>
              </span>
            </div>
          ))}

          {/* 現在のステップ */}
          {!inFinal && (
            <div className={styles.stageBox}>
              <p className={styles.stagePrompt}>
                <Tex text={stages[cur].prompt} />
              </p>
              <ChoiceList
                choices={stages[cur].choices}
                picked={picks[cur] ?? null}
                onPick={(i) =>
                  setPicks((p) => {
                    const n = [...p];
                    n[cur] = i;
                    return n;
                  })
                }
              />
              {picks[cur] !== undefined && (
                <div className={styles.result}>
                  <p className={stageOk[cur] ? styles.ok : styles.ng}>
                    {stageOk[cur] ? '⭕ 正解' : '❌ 不正解'}
                  </p>
                  {!stageOk[cur] && stages[cur].choices[picks[cur]].why && (
                    <p className={styles.why}>
                      選んだ誤答の理由: {stages[cur].choices[picks[cur]].why}
                    </p>
                  )}
                  <div className={styles.steps}>
                    {stages[cur].explain.map((s, i) => (
                      <p key={i} className={styles.step}>
                        <Tex text={s} />
                      </p>
                    ))}
                  </div>
                  <button
                    type="button"
                    className={styles.next}
                    onClick={() => setCur((c) => c + 1)}
                  >
                    次のステップへ →
                  </button>
                </div>
              )}
            </div>
          )}

          {inFinal && q.finalPrompt && (
            <p className={styles.stagePrompt}>
              <Tex text={q.finalPrompt} />
            </p>
          )}
        </>
      )}

      {inFinal && (
        <ChoiceList
          choices={q.choices}
          picked={answered}
          onPick={(i) => {
            if (isAnswered) return;
            onAnswer(i, q.choices[i].correct && allStagesOk);
          }}
        />
      )}

      {isAnswered && (
        <div className={styles.result}>
          <p className={wasCorrect ? styles.ok : styles.ng}>
            {wasCorrect
              ? staged
                ? '⭕ 全ステップ正解'
                : '⭕ 正解'
              : staged && firstMiss >= 0
                ? `❌ Step ${firstMiss + 1} でつまずき（${
                    stageOk.filter(Boolean).length + (finalOk ? 1 : 0)
                  }/${total} 正解）`
                : '❌ 不正解'}
          </p>
          {!finalOk && q.choices[answered].why && (
            <p className={styles.why}>
              選んだ誤答の理由: {q.choices[answered].why}
            </p>
          )}
          <div className={styles.steps}>
            {q.steps.map((s, i) => (
              <p key={i} className={styles.step}>
                <Tex text={s} />
              </p>
            ))}
          </div>
          {refsLine && <p className={styles.refs}>{refsLine}</p>}
          {!wasCorrect && onMissType && (
            <div className={styles.missRow}>
              <span className={styles.missLabel}>誤答の分類:</span>
              {(Object.keys(MISS_LABELS) as MissType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  className={`${styles.missButton} ${
                    missType === t ? styles.missActive : ''
                  }`}
                  onClick={() => onMissType(t)}
                >
                  {MISS_LABELS[t]}
                </button>
              ))}
            </div>
          )}
          <button type="button" className={styles.next} onClick={onNext}>
            {nextLabel}
          </button>
        </div>
      )}
    </div>
  );
}
