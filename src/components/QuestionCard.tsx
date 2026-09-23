import type { SolvedQuestion } from '../solvers/types';
import type { MissType } from '../hooks/useQuizStats';
import { MISS_LABELS } from '../hooks/useQuizStats';
import { Tex } from './Tex';
import { ReportButton } from './ReportButton';
import styles from './QuestionCard.module.css';

interface Props {
  q: SolvedQuestion;
  answered: number | null; // 選んだ選択肢 index
  onAnswer: (i: number) => void;
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

/** 4〜5択の演習問題カード。解答後に手順・誤答理由・参照を表示する。 */
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
  const isAnswered = answered !== null;
  const wasCorrect = isAnswered && q.choices[answered].correct;

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
        <Tex text={q.text} />
      </p>
      <div className={styles.choices}>
        {q.choices.map((c, i) => {
          let cls = styles.choice;
          if (isAnswered) {
            if (c.correct) cls += ` ${styles.correct}`;
            else if (i === answered) cls += ` ${styles.wrong}`;
            else cls += ` ${styles.dim}`;
          }
          return (
            <button
              key={i}
              type="button"
              className={cls}
              disabled={isAnswered}
              onClick={() => onAnswer(i)}
            >
              <Tex text={c.text} />
            </button>
          );
        })}
      </div>
      {isAnswered && (
        <div className={styles.result}>
          <p className={wasCorrect ? styles.ok : styles.ng}>
            {wasCorrect ? '⭕ 正解' : '❌ 不正解'}
          </p>
          {!wasCorrect && answered !== null && q.choices[answered].why && (
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
