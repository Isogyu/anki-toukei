import { useState } from 'react';
import katex from 'katex';
import { CATEGORIES, type Category } from '../types/Card';
import type { NewCardInput } from '../hooks/useUserCards';
import styles from './AddCardForm.module.css';

interface AddCardFormProps {
  onAdd: (input: NewCardInput) => void;
  onClose: () => void;
}

function parseUsage(raw: string): string[] {
  return raw
    .split(/[,、\n]/)
    .map((s) => s.trim())
    .filter((s) => s !== '');
}

function AddCardForm({ onAdd, onClose }: AddCardFormProps) {
  const [category, setCategory] = useState<Category>(CATEGORIES[0]);
  const [title, setTitle] = useState('');
  const [formula, setFormula] = useState('');
  const [meaning, setMeaning] = useState('');
  const [usage, setUsage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedTitle = title.trim();
    const trimmedMeaning = meaning.trim();
    const usageList = parseUsage(usage);

    if (trimmedTitle === '') {
      setError('見出しを入力してください。');
      return;
    }
    if (trimmedMeaning === '') {
      setError('意味を入力してください。');
      return;
    }
    if (usageList.length < 1 || usageList.length > 3) {
      setError('使う場面は1〜3個で入力してください（カンマ区切り）。');
      return;
    }

    const trimmedFormula = formula.trim();
    if (trimmedFormula !== '') {
      try {
        katex.renderToString(trimmedFormula, { throwOnError: true });
      } catch {
        setError('公式のLaTeX構文が正しくありません。');
        return;
      }
    }

    onAdd({
      category,
      title: trimmedTitle,
      formula: trimmedFormula,
      meaning: trimmedMeaning,
      usage: usageList,
    });
  };

  return (
    <div className={styles.overlay} role="presentation" onClick={onClose}>
      <form
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <h2 className={styles.heading}>カードを追加</h2>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>カテゴリー</span>
          <select
            className={styles.input}
            value={category}
            onChange={(e) => setCategory(e.target.value as Category)}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>見出し</span>
          <input
            className={styles.input}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="例: 標本平均"
          />
        </label>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>公式（LaTeX・任意）</span>
          <input
            className={styles.input}
            type="text"
            value={formula}
            onChange={(e) => setFormula(e.target.value)}
            placeholder="例: \bar{x} = \dfrac{1}{n}\sum x_i"
          />
        </label>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>意味</span>
          <textarea
            className={styles.input}
            value={meaning}
            onChange={(e) => setMeaning(e.target.value)}
            rows={2}
            placeholder="1〜2文で入力"
          />
        </label>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>
            使う場面（カンマ区切り・1〜3個）
          </span>
          <input
            className={styles.input}
            type="text"
            value={usage}
            onChange={(e) => setUsage(e.target.value)}
            placeholder="例: 推定, 検定"
          />
        </label>

        {error !== '' && <p className={styles.error}>{error}</p>}

        <div className={styles.actions}>
          <button type="button" className={styles.cancel} onClick={onClose}>
            キャンセル
          </button>
          <button type="submit" className={styles.submit}>
            追加する
          </button>
        </div>
      </form>
    </div>
  );
}

export default AddCardForm;
