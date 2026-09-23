import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'anki-toukei:ratings';

export type Rating = 'known' | 'doubt' | 'unknown';

export const RATING_LABELS: Record<Rating, string> = {
  known: '覚えた',
  doubt: 'あやしい',
  unknown: '覚えてない',
};

function load(): Record<number, Rating> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return {};
    const out: Record<number, Rating> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (v === 'known' || v === 'doubt' || v === 'unknown') {
        out[Number(k)] = v;
      }
    }
    return out;
  } catch {
    return {};
  }
}

/** 保存済みの評価をそのまま読む（おすすめキュー生成用）。 */
export function loadRatings(): Record<number, Rating> {
  return load();
}

/** カードの3段階評価を localStorage に保存する簡易SRS。 */
export function useRatings() {
  const [ratings, setRatings] = useState<Record<number, Rating>>(load);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(ratings));
    } catch {
      // 保存失敗は無視
    }
  }, [ratings]);

  const rate = useCallback((id: number, r: Rating) => {
    setRatings((prev) => ({ ...prev, [id]: r }));
  }, []);

  const getRating = useCallback(
    (id: number): Rating | undefined => ratings[id],
    [ratings],
  );

  return { ratings, rate, getRating };
}

/** 弱点優先の重み付け: unknown > doubt > 未評価 > known */
export function ratingWeight(r: Rating | undefined): number {
  switch (r) {
    case 'unknown':
      return 5;
    case 'doubt':
      return 3;
    case undefined:
      return 1.5;
    case 'known':
      return 0.4;
  }
}
