import { useMemo } from 'react';
import katex from 'katex';
import type { Card } from '../types/Card';
import styles from './FlashCard.module.css';

interface FlashCardProps {
  card: Card;
  flipped: boolean;
  onFlip: () => void;
}

function FlashCard({ card, flipped, onFlip }: FlashCardProps) {
  const formulaHtml = useMemo(() => {
    if (card.formula.trim() === '') return '';
    return katex.renderToString(card.formula, {
      throwOnError: false,
      displayMode: true,
    });
  }, [card.formula]);

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
          <h2 className={styles.title}>{card.title}</h2>
          <span className={styles.hint}>タップして解答を表示</span>
        </div>
        <div className={`${styles.face} ${styles.back}`}>
          <span className={styles.categoryTag}>{card.category}</span>
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
            <div className={styles.section}>
              <span className={styles.label}>使う場面</span>
              <ul className={styles.usage}>
                {card.usage.map((u) => (
                  <li key={u}>{u}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FlashCard;
