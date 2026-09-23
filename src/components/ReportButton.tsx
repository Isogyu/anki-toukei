import styles from './ReportButton.module.css';

interface Props {
  itemKey: string; // "card:12" など
  reported: boolean;
  onToggle: (key: string) => void;
}

/** 「🚩おかしい」報告ボタン。押すと報告IDが記録・一覧に出る。 */
export function ReportButton({ itemKey, reported, onToggle }: Props) {
  return (
    <button
      type="button"
      className={`${styles.report} ${reported ? styles.reported : ''}`}
      aria-label={reported ? '報告を取り消す' : 'この項目の誤りを報告'}
      aria-pressed={reported}
      title={reported ? `報告済み: ${itemKey}` : 'おかしいところを報告'}
      onClick={(e) => {
        e.stopPropagation();
        onToggle(itemKey);
      }}
    >
      🚩
    </button>
  );
}
