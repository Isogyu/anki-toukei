import { useCallback, useEffect, useRef, useState } from 'react';
import questionsData from '../data/questions.json';
import type { QuestionTemplate } from '../types/Question';
import { CATEGORIES, type Category } from '../types/Card';
import { SOLVERS, type SolvedQuestion } from '../solvers';
import type { MissType } from '../hooks/useQuizStats';
import { useQuizStats } from '../hooks/useQuizStats';
import { pick } from '../lib/stats';
import { QuestionCard } from '../components/QuestionCard';
import styles from './Practice.module.css';

const templates = questionsData as QuestionTemplate[];
const ALL = 'すべて' as const;
type Filter = Category | typeof ALL;

function refsLine(tpl: QuestionTemplate): string | undefined {
  if (!tpl.ohm && !tpl.official) return undefined;
  return `📖 ${tpl.ohm ? `オーム社 ${tpl.ohm}` : ''}${
    tpl.ohm && tpl.official ? ' / ' : ''
  }${tpl.official ? `公式 ${tpl.official}` : ''}`;
}

function gen(tpl: QuestionTemplate, rng: () => number): SolvedQuestion {
  const solver = SOLVERS[tpl.solver];
  if (!solver) throw new Error(`solver 未登録: ${tpl.solver}`);
  return solver(rng, tpl.pool);
}

interface Props {
  /** 弱点ページから指定されたテンプレートID。あればそれを出題する。 */
  focusTplId: string | null;
  onConsumeFocus: () => void;
  isReported: (key: string) => boolean;
  onToggleReport: (key: string) => void;
}

export default function Practice({
  focusTplId,
  onConsumeFocus,
  isReported,
  onToggleReport,
}: Props) {
  const [filter, setFilter] = useState<Filter>(ALL);
  const rng = useRef(Math.random);
  const [tpl, setTpl] = useState<QuestionTemplate>(() =>
    pick(Math.random, templates),
  );
  const [q, setQ] = useState<SolvedQuestion>(() => gen(tpl, rng.current));
  const [answered, setAnswered] = useState<number | null>(null);
  const [missType, setMissType] = useState<MissType | undefined>(undefined);
  const { stats, record, recordMiss } = useQuizStats();

  const next = useCallback(
    (f: Filter = filter, forced?: QuestionTemplate) => {
      const pool =
        f === ALL ? templates : templates.filter((t) => t.category === f);
      const t = forced ?? pick(rng.current, pool);
      setTpl(t);
      setQ(gen(t, rng.current));
      setAnswered(null);
      setMissType(undefined);
    },
    [filter],
  );

  // 弱点ページからの「もう一度」
  useEffect(() => {
    if (!focusTplId) return;
    const t = templates.find((x) => x.id === focusTplId);
    if (t) {
      setFilter(t.category);
      next(t.category, t);
    }
    onConsumeFocus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusTplId]);

  const onAnswer = (i: number) => {
    if (answered !== null) return;
    setAnswered(i);
    record(tpl.id, q.choices[i].correct);
  };

  const onMissType = (t: MissType) => {
    setMissType(t);
    recordMiss(tpl.id, t);
  };

  const tplStat = stats[tpl.id];
  const catTemplates = templates.filter((t) =>
    filter === ALL ? true : t.category === filter,
  );

  return (
    <div className={styles.wrap}>
      <header className={styles.header}>
        <h1 className={styles.title}>4〜5択演習</h1>
        <p className={styles.sub}>
          パラメータは毎回ランダム。誤答は典型ミスから生成。
        </p>
      </header>

      <div className={styles.bar}>
        <select
          className={styles.select}
          value={filter}
          onChange={(e) => {
            const f = e.target.value as Filter;
            setFilter(f);
            next(f);
          }}
        >
          <option value={ALL}>すべて（{templates.length}テンプレート）</option>
          {CATEGORIES.filter((c) =>
            templates.some((t) => t.category === c),
          ).map((c) => (
            <option key={c} value={c}>
              {c}（{templates.filter((t) => t.category === c).length}）
            </option>
          ))}
        </select>
        {tplStat && (
          <p className={styles.stat}>
            このテンプレート: {tplStat.correct}/{tplStat.attempts} 正解
          </p>
        )}
      </div>

      <QuestionCard
        q={q}
        answered={answered}
        onAnswer={onAnswer}
        onNext={() => next()}
        missType={missType}
        onMissType={onMissType}
        header={`${tpl.id}・${tpl.category}：${tpl.label}（全${catTemplates.length}型）`}
        refsLine={refsLine(tpl)}
        itemKey={`q:${tpl.id}`}
        reported={isReported(`q:${tpl.id}`)}
        onToggleReport={onToggleReport}
      />
    </div>
  );
}
