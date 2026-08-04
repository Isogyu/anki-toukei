import { useCallback, useEffect, useMemo, useState } from 'react';
import cardsData from '../data/cards.json';
import { CATEGORIES, type Card, type Category } from '../types/Card';
import FlashCard from '../components/FlashCard';
import CategorySelector, {
  ALL,
  type CategoryFilter,
} from '../components/CategorySelector';
import { useCheckedCards } from '../hooks/useCheckedCards';
import styles from './Home.module.css';

const cards = cardsData as Card[];

function Home() {
  const [filter, setFilter] = useState<CategoryFilter>(ALL);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [checkedOnly, setCheckedOnly] = useState(false);
  const { checkedIds, isChecked, toggleChecked } = useCheckedCards();

  // 実際にカードが存在するカテゴリーのみを定義順で表示
  const availableCategories = useMemo<Category[]>(() => {
    const present = new Set(cards.map((c) => c.category));
    return CATEGORIES.filter((c) => present.has(c));
  }, []);

  const visibleCards = useMemo(() => {
    let list =
      filter === ALL ? cards : cards.filter((c) => c.category === filter);
    if (checkedOnly) list = list.filter((c) => checkedIds.has(c.id));
    return [...list].sort((a, b) => a.id - b.id);
  }, [filter, checkedOnly, checkedIds]);

  const count = visibleCards.length;

  // フィルタやチェック解除で件数が減ったときにindexを範囲内へ収める
  useEffect(() => {
    if (index > count - 1) {
      setIndex(count === 0 ? 0 : count - 1);
      setFlipped(false);
    }
  }, [count, index]);

  const current = visibleCards[Math.min(index, Math.max(count - 1, 0))];

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

  const handleToggleCheckedOnly = useCallback(() => {
    setCheckedOnly((v) => !v);
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
          {count > 0 ? `${Math.min(index + 1, count)} / ${count}` : '0 / 0'}
        </p>
      </header>

      <div className={styles.cardArea}>
        {current ? (
          <FlashCard
            card={current}
            flipped={flipped}
            checked={isChecked(current.id)}
            onFlip={() => setFlipped((f) => !f)}
            onToggleCheck={() => toggleChecked(current.id)}
          />
        ) : (
          <p className={styles.empty}>
            チェックしたカードがありません。カード右上の☆を押すとここで見直せます。
          </p>
        )}
      </div>

      <nav className={styles.controls}>
        <button
          type="button"
          className={styles.navButton}
          onClick={goPrev}
          aria-label="前のカード"
          disabled={count === 0}
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
          disabled={count === 0}
        >
          次へ →
        </button>
      </nav>

      <button
        type="button"
        className={`${styles.checkedOnlyToggle} ${
          checkedOnly ? styles.active : ''
        }`}
        onClick={handleToggleCheckedOnly}
        aria-pressed={checkedOnly}
      >
        {checkedOnly
          ? 'すべてのカードを表示'
          : `チェックしたカードを見直す (${checkedIds.size})`}
      </button>
    </main>
  );
}

export default Home;
