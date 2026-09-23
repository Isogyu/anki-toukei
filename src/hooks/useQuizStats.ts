import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'anki-toukei:quizStats';
const DRILL_KEY = 'anki-toukei:drillStats';

export type MissType = 'knowledge' | 'judgment' | 'calc';

export const MISS_LABELS: Record<MissType, string> = {
  knowledge: '知識不足',
  judgment: '判別ミス',
  calc: '計算ミス',
};

export interface TemplateStat {
  attempts: number;
  correct: number;
  knowledge: number;
  judgment: number;
  calc: number;
}

export interface DrillStat {
  attempts: number;
  correct: number;
  totalMs: number;
}

function load<T>(key: string): Record<string, T> {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return {};
    return parsed as Record<string, T>;
  } catch {
    return {};
  }
}

function emptyStat(): TemplateStat {
  return { attempts: 0, correct: 0, knowledge: 0, judgment: 0, calc: 0 };
}

/** 保存済みの演習成績をそのまま読む（おすすめキュー生成用）。 */
export function loadQuizStats(): Record<string, TemplateStat> {
  return load<TemplateStat>(STORAGE_KEY);
}

/** 演習テンプレートごとの成績と誤答分類を記録する。 */
export function useQuizStats() {
  const [stats, setStats] = useState<Record<string, TemplateStat>>(() =>
    load(STORAGE_KEY),
  );

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
    } catch {
      // 無視
    }
  }, [stats]);

  const record = useCallback(
    (tplId: string, correct: boolean, miss?: MissType) => {
      setStats((prev) => {
        const s = { ...emptyStat(), ...prev[tplId] };
        s.attempts += 1;
        if (correct) s.correct += 1;
        if (miss) s[miss] += 1;
        return { ...prev, [tplId]: s };
      });
    },
    [],
  );

  const recordMiss = useCallback((tplId: string, miss: MissType) => {
    setStats((prev) => {
      const s = { ...emptyStat(), ...prev[tplId] };
      s[miss] += 1;
      return { ...prev, [tplId]: s };
    });
  }, []);

  return { stats, record, recordMiss };
}

/** 判別ドリルのパターンごとの成績（正答率・平均回答時間）を記録する。 */
export function useDrillStats() {
  const [stats, setStats] = useState<Record<string, DrillStat>>(() =>
    load(DRILL_KEY),
  );

  useEffect(() => {
    try {
      localStorage.setItem(DRILL_KEY, JSON.stringify(stats));
    } catch {
      // 無視
    }
  }, [stats]);

  const record = useCallback(
    (patId: string, correct: boolean, elapsedMs: number) => {
      setStats((prev) => {
        const s: DrillStat = prev[patId] ?? {
          attempts: 0,
          correct: 0,
          totalMs: 0,
        };
        return {
          ...prev,
          [patId]: {
            attempts: s.attempts + 1,
            correct: s.correct + (correct ? 1 : 0),
            totalMs: s.totalMs + elapsedMs,
          },
        };
      });
    },
    [],
  );

  return { stats, record };
}
