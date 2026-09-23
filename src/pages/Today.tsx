import { useMemo, useRef, useState } from 'react';
import { SOLVERS, type SolvedQuestion } from '../solvers';
import type { SessionItem } from '../lib/recommend';
import type { Rating } from '../hooks/useRatings';
import type { MissType } from '../hooks/useQuizStats';
import { useQuizStats } from '../hooks/useQuizStats';
import { QuestionCard } from '../components/QuestionCard';
import FlashCard from '../components/FlashCard';
import styles from './Today.module.css';

interface Props {
  items: SessionItem[];
  getRating: (id: number) => Rating | undefined;
  rate: (id: number, r: Rating) => void;
  checkedIds: Set<number>;
  onToggleCheck: (id: number) => void;
  isReported: (key: string) => boolean;
  onToggleReport: (key: string) => void;
  onClose: () => void;
}

function refs(tpl: { ohm?: string; official?: string }) {
  if (!tpl.ohm && !tpl.official) return undefined;
  return `📖 ${tpl.ohm ? `オーム社 ${tpl.ohm}` : ''}${
    tpl.ohm && tpl.official ? ' / ' : ''
  }${tpl.official ? `公式 ${tpl.official}` : ''}`;
}

export default function Today({
  items,
  getRating,
  rate,
  checkedIds,
  onToggleCheck,
  isReported,
  onToggleReport,
  onClose,
}: Props) {
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [answered, setAnswered] = useState<number | null>(null);
  const [missType, setMissType] = useState<MissType | undefined>(undefined);
  const [doneQ, setDoneQ] = useState({ n: 0, correct: 0 });
  const rng = useRef(Math.random);
  const { record, recordMiss } = useQuizStats();

  const item = items[idx];
  const q: SolvedQuestion | null = useMemo(
    () =>
      item?.type === 'question'
        ? SOLVERS[item.template.solver](rng.current, item.template.pool)
        : null,
    [item],
  );

  const isLast = idx >= items.length - 1;
  const advance = () => {
    if (isLast) return;
    setIdx((i) => i + 1);
    setFlipped(false);
    setAnswered(null);
    setMissType(undefined);
  };

  if (items.length === 0) {
    return (
      <main className={styles.page}>
        <p className={styles.empty}>出題できる項目がありません。</p>
        <button type="button" className={styles.close} onClick={onClose}>
          戻る
        </button>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <div className={styles.progress}>
        <span>
          今日のおすすめ {idx + 1} / {items.length}
        </span>
        <span className={styles.score}>
          演習 {doneQ.correct}/{doneQ.n}
        </span>
        <button type="button" className={styles.exit} onClick={onClose}>
          終了
        </button>
      </div>

      {item.type === 'card' ? (
        <>
          <FlashCard
            card={item.card}
            flipped={flipped}
            checked={checkedIds.has(item.card.id)}
            onFlip={() => setFlipped((f) => !f)}
            onToggleCheck={() => onToggleCheck(item.card.id)}
            rating={getRating(item.card.id)}
            onRate={(r) => rate(item.card.id, r)}
            reported={isReported(`card:${item.card.id}`)}
            onToggleReport={onToggleReport}
          />
          {flipped && (
            <button type="button" className={styles.next} onClick={advance}>
              {isLast ? '終了する' : '次へ →'}
            </button>
          )}
        </>
      ) : (
        <QuestionCard
          q={q!}
          answered={answered}
          onAnswer={(i) => {
            setAnswered(i);
            const ok = q!.choices[i].correct;
            record(item.template.id, ok);
            setDoneQ((d) => ({
              n: d.n + 1,
              correct: d.correct + (ok ? 1 : 0),
            }));
          }}
          onNext={() => (isLast ? onClose() : advance())}
          missType={missType}
          onMissType={(t) => {
            setMissType(t);
            recordMiss(item.template.id, t);
          }}
          header={`${item.template.category}：${item.template.label}`}
          refsLine={refs(item.template)}
          itemKey={`q:${item.template.id}`}
          reported={isReported(`q:${item.template.id}`)}
          onToggleReport={onToggleReport}
          nextLabel={isLast ? '終了する' : '次へ →'}
        />
      )}
    </main>
  );
}
