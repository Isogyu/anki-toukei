import type { Category } from '../types/Card';
import styles from './CategorySelector.module.css';

export const ALL = 'すべて' as const;
export type CategoryFilter = typeof ALL | Category;

interface CategorySelectorProps {
  categories: Category[];
  value: CategoryFilter;
  onChange: (value: CategoryFilter) => void;
}

function CategorySelector({
  categories,
  value,
  onChange,
}: CategorySelectorProps) {
  return (
    <select
      className={styles.select}
      value={value}
      aria-label="カテゴリー選択"
      onChange={(e) => onChange(e.target.value as CategoryFilter)}
    >
      <option value={ALL}>{ALL}</option>
      {categories.map((c) => (
        <option key={c} value={c}>
          {c}
        </option>
      ))}
    </select>
  );
}

export default CategorySelector;
