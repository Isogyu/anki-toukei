import { useCallback, useEffect, useMemo, useState } from 'react';
import cardsData from '../data/cards.json';
import { CATEGORIES, type Card, type Category } from '../types/Card';
import FlashCard from '../components/FlashCard';
import CategorySelector, {
  ALL,
  type CategoryFilter,
} from '../components/CategorySelector';
import styles from './Home.module.css';

const cards = cardsData as Card[];

function Home() {
  const [filter, setFilter] = useState<CategoryFilter>(ALL);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  // 実際にカードが存在するカテゴリーのみを定義順で表示
  const availableCategories = useMemo<Category[]>(() => {
    const present = new Set(cards.map((c) => c.category));
    return CATEGORIES.filter((c) => present.has(c));
  }, []);

  const visibleCards = useMemo(() => {
    const list =
      filter === ALL ? cards : cards.filter((c) => c.category === filter);
    return [...list].sort((a, b) => a.id - b.id);
  }, [filter]);

  const count = visibleCards.length;
  const current = visibleCards[index];

  const goPrev = useCallback(() => {
    if (count === 0) return;
    setFlipped(false);
    setIndex((i) => (i - 1 + count) % count);
  }, [count]);

  const goNext = useCallback(() => {
    if (count === 0) return;
    setFlipped(false);
    setIndex((i) => (i + 1) % count);
  }, [count]);

  const handleFilterChange = useCallback((value: CategoryFilter) => {
    setFilter(value);
    setIndex(0);
    setFlipped(false);
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goPrev();
      else if (e.key === 'ArrowRight') goNext();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [goPrev, goNext]);

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.appTitle}>統計検定2級 暗記カード</h1>
        <p className={styles.counter}>
          {count > 0 ? `${index + 1} / ${count}` : '0 / 0'}
        </p>
      </header>

      <div className={styles.cardArea}>
        {current && (
          <FlashCard
            card={current}
            flipped={flipped}
            onFlip={() => setFlipped((f) => !f)}
          />
        )}
      </div>

      <nav className={styles.controls}>
        <button
          type="button"
          className={styles.navButton}
          onClick={goPrev}
          aria-label="前のカード"
        >
          ← 前へ
        </button>
        <CategorySelector
          categories={availableCategories}
          value={filter}
          onChange={handleFilterChange}
        />
        <button
          type="button"
          className={styles.navButton}
          onClick={goNext}
          aria-label="次のカード"
        >
          次へ →
        </button>
      </nav>
    </main>
  );
}

export default Home;
