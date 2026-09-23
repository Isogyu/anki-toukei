import type { RNG } from '../lib/stats';
import { pick, shuffle } from '../lib/stats';
import type { ConceptItem, SolvedQuestion } from './types';

/** questions.json の pool から1題を選び、先頭を正解としてシャッフルする概念問題ソルバー。 */
export function concept(rng: RNG, pool?: ConceptItem[]): SolvedQuestion {
  if (!pool || pool.length === 0) {
    throw new Error('concept solver requires pool');
  }
  const item = pick(rng, pool);
  const [head, ...rest] = item.choices;
  const choices = shuffle(rng, [
    { text: head.text, correct: true as const, why: head.why },
    ...rest.map((c) => ({ text: c.text, correct: false as const, why: c.why })),
  ]);
  return { text: item.text, choices, steps: item.steps };
}
