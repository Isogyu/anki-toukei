import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'anki-toukei:checked';

function loadCheckedIds(): number[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((v): v is number => typeof v === 'number');
  } catch {
    return [];
  }
}

/**
 * チェックを付けたカードのidを localStorage に保存し、リロード後も見直せるようにする。
 */
export function useCheckedCards() {
  const [checkedIds, setCheckedIds] = useState<Set<number>>(
    () => new Set(loadCheckedIds()),
  );

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...checkedIds]));
    } catch {
      // 保存に失敗しても学習は継続できるため無視する
    }
  }, [checkedIds]);

  const isChecked = useCallback(
    (id: number) => checkedIds.has(id),
    [checkedIds],
  );

  const toggleChecked = useCallback((id: number) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  return { checkedIds, isChecked, toggleChecked };
}
