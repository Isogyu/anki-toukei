import { useCallback, useEffect, useRef, useState } from 'react';
import patternsData from '../data/patterns.json';
import type { Pattern } from '../types/Pattern';
import {
  DISTRIBUTION_KEYS,
  DISTRIBUTION_LABELS,
  type DistributionKey,
} from '../types/Pattern';
import { CATEGORIES, type Category } from '../types/Card';
import { pick, shuffle } from '../lib/stats';
import { useDrillStats } from '../hooks/useQuizStats';
import { ReportButton } from '../components/ReportButton';
import styles from './Drill.module.css';

const patterns = patternsData as Pattern[];
const ALL = 'すべて' as const;
type Filter = Category | typeof ALL;

interface DrillItem {
  pattern: Pattern;
  variant: string;
  methodChoices: string[];
  distChoices: DistributionKey[];
  dfChoices: string[];
}

function makeItem(rng: () => number, pool: Pattern[]): DrillItem {
  const p = pick(rng, pool);
  const others = shuffle(
    rng,
    patterns.filter((x) => x.id !== p.id),
  );
  const methodChoices = shuffle(rng, [
    p.method,
    ...others.slice(0, 3).map((o) => o.method),
  ]);
  const distOthers = shuffle(
    rng,
    DISTRIBUTION_KEYS.filter((d) => d !== p.distribution),
  );
  const distChoices = shuffle(rng, [p.distribution, ...distOthers.slice(0, 3)]);
  const dfPool = shuffle(
    rng,
    Array.from(new Set(patterns.map((x) => x.dfShort))).filter(
      (d) => d !== p.dfShort,
    ),
  );
  const dfChoices = shuffle(rng, [p.dfShort, ...dfPool.slice(0, 3)]);
  return {
    pattern: p,
    variant: pick(rng, p.variants),
    methodChoices,
    distChoices,
    dfChoices,
  };
}

interface Props {
  isReported: (key: string) => boolean;
  onToggleReport: (key: string) => void;
}

export default function Drill({ isReported, onToggleReport }: Props) {
  const [filter, setFilter] = useState<Filter>(ALL);
  const rng = useRef(Math.random);
  const [item, setItem] = useState<DrillItem>(() =>
    makeItem(rng.current, patterns),
  );
  const [sel, setSel] = useState<{
    method?: string;
    dist?: DistributionKey;
    df?: string;
  }>({});
  const [answered, setAnswered] = useState(false);
  const [session, setSession] = useState({ n: 0, correct: 0, totalMs: 0 });
  const startedAt = useRef(Date.now());
  const { stats, record } = useDrillStats();

  const next = useCallback(
    (f: Filter = filter) => {
      const pl =
        f === ALL ? patterns : patterns.filter((p) => p.category === f);
      setItem(makeItem(rng.current, pl));
      setSel({});
      setAnswered(false);
      startedAt.current = Date.now();
    },
    [filter],
  );

  const allSelected =
    sel.method !== undefined && sel.dist !== undefined && sel.df !== undefined;

  const submit = () => {
    if (!allSelected || answered) return;
    const ok =
      sel.method === item.pattern.method &&
      sel.dist === item.pattern.distribution &&
      sel.df === item.pattern.dfShort;
    const ms = Date.now() - startedAt.current;
    setAnswered(true);
    record(item.pattern.id, ok, ms);
    setSession((s) => ({
      n: s.n + 1,
      correct: s.correct + (ok ? 1 : 0),
      totalMs: s.totalMs + ms,
    }));
  };

  const [, force] = useState(0);
  useEffect(() => {
    if (answered) return;
    const t = setInterval(() => force((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, [answered]);

  const pstat = stats[item.pattern.id];
  const acc =
    session.n > 0 ? Math.round((session.correct / session.n) * 100) : null;
  const avgSec =
    session.n > 0 ? (session.totalMs / session.n / 1000).toFixed(1) : null;

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>解法パターン判別ドリル</h1>
        <p className={styles.sub}>
          問題文を読み「手法・分布・自由度」を即答しよう
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
          <option value={ALL}>すべて（{patterns.length}パターン）</option>
          {CATEGORIES.filter((c) => patterns.some((p) => p.category === c)).map(
            (c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ),
          )}
        </select>
        <div className={styles.meta}>
          <span className={styles.timer}>
            ⏱ {Math.floor((Date.now() - startedAt.current) / 1000)}秒
          </span>
          {acc !== null && (
            <span className={styles.stat}>
              正答率 {acc}%（{session.correct}/{session.n}）・平均{avgSec}秒
            </span>
          )}
        </div>
      </div>

      <div className={styles.problem}>
        <div className={styles.problemHead}>
          <span className={styles.patId}>
            {item.pattern.id}・{item.pattern.category}
          </span>
          <ReportButton
            itemKey={`pat:${item.pattern.id}`}
            reported={isReported(`pat:${item.pattern.id}`)}
            onToggle={onToggleReport}
          />
        </div>
        <p className={styles.variant}>{item.variant}</p>
      </div>

      <fieldset className={styles.group}>
        <legend className={styles.legend}>手法</legend>
        {item.methodChoices.map((m) => (
          <button
            key={m}
            type="button"
            className={`${styles.opt} ${
              sel.method === m ? styles.selected : ''
            } ${
              answered
                ? m === item.pattern.method
                  ? styles.good
                  : sel.method === m
                    ? styles.bad
                    : ''
                : ''
            }`}
            disabled={answered}
            onClick={() => setSel((s) => ({ ...s, method: m }))}
          >
            {m}
          </button>
        ))}
      </fieldset>

      <fieldset className={styles.group}>
        <legend className={styles.legend}>使う分布</legend>
        {item.distChoices.map((d) => (
          <button
            key={d}
            type="button"
            className={`${styles.opt} ${
              sel.dist === d ? styles.selected : ''
            } ${
              answered
                ? d === item.pattern.distribution
                  ? styles.good
                  : sel.dist === d
                    ? styles.bad
                    : ''
                : ''
            }`}
            disabled={answered}
            onClick={() => setSel((s) => ({ ...s, dist: d }))}
          >
            {DISTRIBUTION_LABELS[d]}
          </button>
        ))}
      </fieldset>

      <fieldset className={styles.group}>
        <legend className={styles.legend}>自由度</legend>
        {item.dfChoices.map((d) => (
          <button
            key={d}
            type="button"
            className={`${styles.opt} ${sel.df === d ? styles.selected : ''} ${
              answered
                ? d === item.pattern.dfShort
                  ? styles.good
                  : sel.df === d
                    ? styles.bad
                    : ''
                : ''
            }`}
            disabled={answered}
            onClick={() => setSel((s) => ({ ...s, df: d }))}
          >
            {d}
          </button>
        ))}
      </fieldset>

      {!answered ? (
        <button
          type="button"
          className={styles.submit}
          disabled={!allSelected}
          onClick={submit}
        >
          回答する
        </button>
      ) : (
        <div className={styles.feedback}>
          <p
            className={
              sel.method === item.pattern.method &&
              sel.dist === item.pattern.distribution &&
              sel.df === item.pattern.dfShort
                ? styles.ok
                : styles.ng
            }
          >
            {sel.method === item.pattern.method &&
            sel.dist === item.pattern.distribution &&
            sel.df === item.pattern.dfShort
              ? '⭕ 全問正解'
              : '❌ 不正解あり（緑が正解）'}
          </p>
          <p className={styles.rule}>
            手がかり: {item.pattern.trigger} → {item.pattern.method}（
            {DISTRIBUTION_LABELS[item.pattern.distribution]}・
            {item.pattern.dfShort}）
          </p>
          <div className={styles.steps}>
            {item.pattern.steps.map((s, i) => (
              <p key={i} className={styles.step}>
                {i + 1}. {s}
              </p>
            ))}
          </div>
          {(item.pattern.ohm || item.pattern.official) && (
            <p className={styles.refs}>
              📖 {item.pattern.ohm && `オーム社 ${item.pattern.ohm}`}
              {item.pattern.ohm && item.pattern.official && ' / '}
              {item.pattern.official && `公式 ${item.pattern.official}`}
            </p>
          )}
          {pstat && (
            <p className={styles.pstat}>
              このパターン: {pstat.correct}/{pstat.attempts} 正解・平均
              {(pstat.totalMs / pstat.attempts / 1000).toFixed(1)}秒
            </p>
          )}
          <button
            type="button"
            className={styles.submit}
            onClick={() => next()}
          >
            次の問題 →
          </button>
        </div>
      )}
    </main>
  );
}
