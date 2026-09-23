import type { Card } from '../types/Card';
import type { QuestionTemplate } from '../types/Question';
import type { Rating } from '../hooks/useRatings';
import { ratingWeight } from '../hooks/useRatings';
import type { TemplateStat } from '../hooks/useQuizStats';

export type SessionItem =
  | { type: 'card'; card: Card }
  | { type: 'question'; template: QuestionTemplate };

/** 誤答問題と低評価カードを混ぜた「今日のおすすめ」キューを作る。 */
export function buildTodayQueue(
  cards: Card[],
  templates: QuestionTemplate[],
  ratings: Record<number, Rating>,
  stats: Record<string, TemplateStat>,
  total = 20,
): SessionItem[] {
  // 誤答が残っているテンプレート（誤答が多い順）
  const wrong = templates
    .map((t) => {
      const s = stats[t.id];
      const misses = s ? s.attempts - s.correct : 0;
      return { t, misses };
    })
    .filter((x) => x.misses > 0)
    .sort((a, b) => b.misses - a.misses)
    .map((x) => x.t);

  // 低評価・未評価カード（重い順）
  const weakCards = [...cards]
    .map((c) => ({ c, w: ratingWeight(ratings[c.id]) }))
    .sort((a, b) => b.w - a.w || a.c.id - b.c.id)
    .map((x) => x.c);

  const items: SessionItem[] = [];
  const nQ = Math.min(10, wrong.length);
  const nC = Math.min(10, weakCards.length);

  // 交互に混ぜる
  let qi = 0;
  let ci = 0;
  while (qi < nQ || ci < nC) {
    if (qi < nQ) items.push({ type: 'question', template: wrong[qi++] });
    if (ci < nC) items.push({ type: 'card', card: weakCards[ci++] });
  }

  // 20件に満たなければ残りの弱いカード→未出題テンプレートで補充
  const usedT = new Set(wrong.slice(0, nQ).map((t) => t.id));
  const usedC = new Set(weakCards.slice(0, nC).map((c) => c.id));
  for (const c of weakCards.slice(nC)) {
    if (items.length >= total) break;
    if (!usedC.has(c.id)) items.push({ type: 'card', card: c });
  }
  for (const t of templates) {
    if (items.length >= total) break;
    if (!usedT.has(t.id)) items.push({ type: 'question', template: t });
  }

  return items.slice(0, total);
}
