import styles from './TabBar.module.css';

export type Tab = 'cards' | 'drill' | 'quiz' | 'weak';

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'cards', label: 'カード', icon: '🗂' },
  { key: 'drill', label: '判別', icon: '⚡' },
  { key: 'quiz', label: '演習', icon: '✏️' },
  { key: 'weak', label: '弱点', icon: '🎯' },
];

interface Props {
  tab: Tab;
  onChange: (tab: Tab) => void;
}

/** 画面下部固定のタブバー。親指で押せる高さ。 */
export function TabBar({ tab, onChange }: Props) {
  return (
    <nav className={styles.tabbar} aria-label="メインタブ">
      {TABS.map((t) => (
        <button
          key={t.key}
          type="button"
          className={`${styles.tab} ${tab === t.key ? styles.active : ''}`}
          onClick={() => onChange(t.key)}
          aria-current={tab === t.key ? 'page' : undefined}
        >
          <span className={styles.icon} aria-hidden>
            {t.icon}
          </span>
          <span className={styles.label}>{t.label}</span>
        </button>
      ))}
    </nav>
  );
}
