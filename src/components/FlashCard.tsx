import { useMemo } from 'react';
import katex from 'katex';
import type { Card } from '../types/Card';
import type { Rating } from '../hooks/useRatings';
import { ReportButton } from './ReportButton';
import styles from './FlashCard.module.css';

interface FlashCardProps {
  card: Card;
  flipped: boolean;
  checked: boolean;
  onFlip: () => void;
  onToggleCheck: () => void;
  onDelete?: () => void;
  rating?: Rating;
  onRate?: (r: Rating) => void;
  reported?: boolean;
  onToggleReport?: (key: string) => void;
}

const RATING_UI: { key: Rating; label: string; className: string }[] = [
  { key: 'known', label: '覚えた', className: styles.rateKnown },
  { key: 'doubt', label: 'あやしい', className: styles.rateDoubt },
  { key: 'unknown', label: '覚えてない', className: styles.rateUnknown },
];

function FlashCard({
  card,
  flipped,
  checked,
  onFlip,
  onToggleCheck,
  onDelete,
  rating,
  onRate,
  reported,
  onToggleReport,
}: FlashCardProps) {
  const formulaHtml = useMemo(() => {
    if (card.formula.trim() === '') return '';
    return katex.renderToString(card.formula, {
      throwOnError: false,
      displayMode: true,
    });
  }, [card.formula]);

  const checkButton = (
    <button
      type="button"
      className={`${styles.checkButton} ${checked ? styles.checked : ''}`}
      aria-label={checked ? 'チェックを外す' : 'チェックを付ける'}
      aria-pressed={checked}
      onClick={(e) => {
        e.stopPropagation();
        onToggleCheck();
      }}
    >
      {checked ? '★' : '☆'}
    </button>
  );

  const reportButton = onToggleReport && (
    <span className={styles.reportWrap}>
      <ReportButton
        itemKey={`card:${card.id}`}
        reported={!!reported}
        onToggle={onToggleReport}
      />
    </span>
  );

  const refLine =
    card.ohm || card.official
      ? `📖 ${card.ohm ? `オーム社 ${card.ohm}` : ''}${
          card.ohm && card.official ? ' / ' : ''
        }${card.official ? `公式 ${card.official}` : ''}`
      : undefined;

  return (
    <div
      className={styles.scene}
      role="button"
      tabIndex={0}
      aria-label="カードを裏返す"
      onClick={onFlip}
      onKeyDown={(e) => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          onFlip();
        }
      }}
    >
      <div className={`${styles.card} ${flipped ? styles.isFlipped : ''}`}>
        <div className={`${styles.face} ${styles.front}`}>
          <span className={styles.categoryTag}>{card.category}</span>
          <div className={styles.corner}>
            {reportButton}
            {checkButton}
          </div>
          <h2 className={styles.title}>{card.title}</h2>
          {rating && (
            <span
              className={`${styles.ratingBadge} ${
                rating === 'known'
                  ? styles.badgeKnown
                  : rating === 'doubt'
                    ? styles.badgeDoubt
                    : styles.badgeUnknown
              }`}
            >
              {rating === 'known'
                ? '覚えた'
                : rating === 'doubt'
                  ? 'あやしい'
                  : '覚えてない'}
            </span>
          )}
          <span className={styles.hint}>タップして解答を表示</span>
        </div>
        <div className={`${styles.face} ${styles.back}`}>
          <span className={styles.categoryTag}>{card.category}</span>
          <div className={styles.corner}>
            {reportButton}
            {checkButton}
          </div>
          <div className={styles.backContent}>
            {card.formula.trim() !== '' && (
              <div className={styles.section}>
                <span className={styles.label}>公式</span>
                <div
                  className={styles.formula}
                  dangerouslySetInnerHTML={{ __html: formulaHtml }}
                />
              </div>
            )}
            <div className={styles.section}>
              <span className={styles.label}>意味</span>
              <p className={styles.meaning}>{card.meaning}</p>
            </div>
            {card.pitfalls && card.pitfalls.length > 0 && (
              <div className={styles.section}>
                <span className={styles.label}>⚠️ ひっかけ</span>
                <ul className={styles.pitfalls}>
                  {card.pitfalls.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              </div>
            )}
            {card.calcTips && (
              <div className={styles.section}>
                <span className={styles.label}>🔢 電卓のコツ</span>
                <p className={styles.meaning}>{card.calcTips}</p>
              </div>
            )}
            <div className={styles.section}>
              <span className={styles.label}>使う場面</span>
              <ul className={styles.usage}>
                {card.usage.map((u) => (
                  <li key={u}>{u}</li>
                ))}
              </ul>
            </div>
            {refLine && <p className={styles.refs}>{refLine}</p>}
            {onRate && (
              <div
                className={styles.rateRow}
                onClick={(e) => e.stopPropagation()}
              >
                {RATING_UI.map((r) => (
                  <button
                    key={r.key}
                    type="button"
                    className={`${styles.rateButton} ${r.className} ${
                      rating === r.key ? styles.rateActive : ''
                    }`}
                    aria-pressed={rating === r.key}
                    onClick={() => onRate(r.key)}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            )}
            {onDelete && (
              <button
                type="button"
                className={styles.deleteButton}
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
              >
                このカードを削除
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default FlashCard;
