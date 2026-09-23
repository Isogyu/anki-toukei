import { useCallback, useEffect, useMemo, useState } from 'react';
import { CATEGORIES, type Card, type Category } from '../types/Card';

const STORAGE_KEY = 'anki-toukei:userCards';

export interface NewCardInput {
  category: Category;
  title: string;
  formula: string;
  meaning: string;
  usage: string[];
}

function isCategory(value: unknown): value is Category {
  return typeof value === 'string' && (CATEGORIES as string[]).includes(value);
}

function isCard(value: unknown): value is Card {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === 'number' &&
    isCategory(v.category) &&
    typeof v.title === 'string' &&
    typeof v.formula === 'string' &&
    typeof v.meaning === 'string' &&
    Array.isArray(v.usage) &&
    v.usage.every((u) => typeof u === 'string')
  );
}

function loadUserCards(): Card[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isCard);
  } catch {
    return [];
  }
}

/**
 * ユーザーが追加したカードを localStorage に保存し、既存カードとマージして使う。
 * idは既存カード + ユーザーカードの最大値+1で採番する。
 */
export function useUserCards(builtinCards: Card[]) {
  const [userCards, setUserCards] = useState<Card[]>(() => loadUserCards());

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(userCards));
    } catch {
      // 保存に失敗しても操作は継続できるため無視する
    }
  }, [userCards]);

  const userCardIds = useMemo(
    () => new Set(userCards.map((c) => c.id)),
    [userCards],
  );

  const addCard = useCallback(
    (input: NewCardInput): Card => {
      const maxId = [...builtinCards, ...userCards].reduce(
        (max, c) => Math.max(max, c.id),
        0,
      );
      const card: Card = {
        id: maxId + 1,
        category: input.category,
        title: input.title,
        formula: input.formula,
        meaning: input.meaning,
        usage: input.usage,
      };
      setUserCards((prev) => [...prev, card]);
      return card;
    },
    [builtinCards, userCards],
  );

  const removeCard = useCallback((id: number) => {
    setUserCards((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const isUserCard = useCallback(
    (id: number) => userCardIds.has(id),
    [userCardIds],
  );

  return { userCards, addCard, removeCard, isUserCard };
}
