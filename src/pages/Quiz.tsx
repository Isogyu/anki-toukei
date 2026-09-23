import { useState } from 'react';
import Practice from './Practice';
import TableTrain from './TableTrain';
import FillIn from './FillIn';
import Mock from './Mock';
import styles from './Quiz.module.css';

type Mode = 'practice' | 'table' | 'fill' | 'mock';

const MODES: { key: Mode; label: string }[] = [
  { key: 'practice', label: '4〜5択' },
  { key: 'table', label: '数値表' },
  { key: 'fill', label: '穴埋め' },
  { key: 'mock', label: 'ミニ模試' },
];

interface Props {
  /** 弱点ページから指定されたテンプレートID。あればそれを出題する。 */
  focusTplId: string | null;
  onConsumeFocus: () => void;
  isReported: (key: string) => boolean;
  onToggleReport: (key: string) => void;
}

export default function Quiz(props: Props) {
  const [mode, setMode] = useState<Mode>('practice');

  return (
    <main className={styles.page}>
      <div className={styles.modeBar} role="tablist">
        {MODES.map((m) => (
          <button
            key={m.key}
            type="button"
            role="tab"
            aria-selected={mode === m.key}
            className={`${styles.modeBtn} ${mode === m.key ? styles.active : ''}`}
            onClick={() => setMode(m.key)}
          >
            {m.label}
          </button>
        ))}
      </div>
      {mode === 'practice' && <Practice {...props} />}
      {mode === 'table' && (
        <TableTrain
          isReported={props.isReported}
          onToggleReport={props.onToggleReport}
        />
      )}
      {mode === 'fill' && (
        <FillIn
          isReported={props.isReported}
          onToggleReport={props.onToggleReport}
        />
      )}
      {mode === 'mock' && (
        <Mock
          isReported={props.isReported}
          onToggleReport={props.onToggleReport}
        />
      )}
    </main>
  );
}
