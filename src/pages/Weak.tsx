import { useMemo } from 'react';
import cardsData from '../data/cards.json';
import questionsData from '../data/questions.json';
import type { Card } from '../types/Card';
import type { QuestionTemplate } from '../types/Question';
import type { Rating } from '../hooks/useRatings';
import { RATING_LABELS, useRatings } from '../hooks/useRatings';
import { useQuizStats } from '../hooks/useQuizStats';
import { MISS_LABELS } from '../hooks/useQuizStats';
import styles from './Weak.module.css';

const cards = cardsData as Card[];
const templates = questionsData as QuestionTemplate[];

interface Props {
  reports: string[];
  onRetryTemplate: (tplId: string) => void;
  onOpenCard: (cardId: number) => void;
  onStartToday: () => void;
}

const RATING_ORDER: Record<Rating, number> = {
  unknown: 0,
  doubt: 1,
  known: 2,
};

export default function Weak({
  reports,
  onRetryTemplate,
  onOpenCard,
  onStartToday,
}: Props) {
  const { ratings } = useRatings();
  const { stats } = useQuizStats();

  const weakCards = useMemo(
    () =>
      cards
        .filter((c) => {
          const r = ratings[c.id];
          return r === 'unknown' || r === 'doubt';
        })
        .sort(
          (a, b) =>
            RATING_ORDER[ratings[a.id] as Rating] -
              RATING_ORDER[ratings[b.id] as Rating] || a.id - b.id,
        ),
    [ratings],
  );

  const wrongTemplates = useMemo(
    () =>
      templates
        .map((t) => {
          const s = stats[t.id];
          const misses = s ? s.attempts - s.correct : 0;
          return { t, s, misses };
        })
        .filter((x) => x.misses > 0)
        .sort((a, b) => b.misses - a.misses),
    [stats],
  );

  const attempted = Object.values(stats).filter((s) => s.attempts > 0);
  const totalAttempts = attempted.reduce((a, s) => a + s.attempts, 0);
  const totalCorrect = attempted.reduce((a, s) => a + s.correct, 0);

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>弱点</h1>
        <p className={styles.sub}>
          {totalAttempts > 0
            ? `演習 正答率 ${Math.round((totalCorrect / totalAttempts) * 100)}%（${totalCorrect}/${totalAttempts}）`
            : 'まだ演習の記録がありません'}
        </p>
      </header>

      <button type="button" className={styles.today} onClick={onStartToday}>
        🎯 今日のおすすめ20問を始める
      </button>

      <section className={styles.section}>
        <h2 className={styles.h2}>
          誤答テンプレート（{wrongTemplates.length}）
        </h2>
        {wrongTemplates.length === 0 && (
          <p className={styles.empty}>
            誤答はまだありません。演習タブで問題を解くと記録されます。
          </p>
        )}
        {wrongTemplates.map(({ t, s, misses }) => (
          <div key={t.id} className={styles.row}>
            <div className={styles.rowMain}>
              <span className={styles.rowTitle}>
                {t.label}
                <span className={styles.cat}> {t.category}</span>
              </span>
              <span className={styles.rowSub}>
                誤答{misses}回 / {s!.attempts}回
                {s!.knowledge + s!.judgment + s!.calc > 0 &&
                  `（${[
                    s!.knowledge > 0 &&
                      `${MISS_LABELS.knowledge}${s!.knowledge}`,
                    s!.judgment > 0 && `${MISS_LABELS.judgment}${s!.judgment}`,
                    s!.calc > 0 && `${MISS_LABELS.calc}${s!.calc}`,
                  ]
                    .filter(Boolean)
                    .join('・')}）`}
              </span>
            </div>
            <button
              type="button"
              className={styles.retry}
              onClick={() => onRetryTemplate(t.id)}
            >
              もう一度
            </button>
          </div>
        ))}
      </section>

      <section className={styles.section}>
        <h2 className={styles.h2}>低評価カード（{weakCards.length}）</h2>
        {weakCards.length === 0 && (
          <p className={styles.empty}>
            「あやしい」「覚えてない」のカードはありません。
          </p>
        )}
        {weakCards.map((c) => (
          <div key={c.id} className={styles.row}>
            <div className={styles.rowMain}>
              <span className={styles.rowTitle}>
                {c.title}
                <span className={styles.cat}> {c.category}</span>
              </span>
              <span
                className={`${styles.badge} ${
                  ratings[c.id] === 'unknown' ? styles.bRed : styles.bAmber
                }`}
              >
                {RATING_LABELS[ratings[c.id] as Rating]}
              </span>
            </div>
            <button
              type="button"
              className={styles.retry}
              onClick={() => onOpenCard(c.id)}
            >
              カードを見る
            </button>
          </div>
        ))}
      </section>

      <section className={styles.section}>
        <h2 className={styles.h2}>🚩 報告一覧（{reports.length}）</h2>
        {reports.length === 0 ? (
          <p className={styles.empty}>報告された項目はありません。</p>
        ) : (
          <ul className={styles.reportList}>
            {reports.map((r) => (
              <li key={r} className={styles.reportItem}>
                {r}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
