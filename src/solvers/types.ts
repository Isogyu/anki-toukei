import type { RNG } from '../lib/stats';
import { shuffle } from '../lib/stats';

export interface Choice {
  text: string;
  correct: boolean;
  why?: string; // この誤答を選ぶ典型ミス
}

export interface VerifyPayload {
  kind: string;
  params: Record<string, number | string>;
  expected: number;
}

export interface SolvedQuestion {
  text: string; // 問題文（$...$ で KaTeX インライン可）
  choices: Choice[]; // 4〜5個、correct はちょうど1つ
  steps: string[]; // 解答・普通電卓での手順
  verify?: VerifyPayload; // scipy 検算用の機械可読データ
}

export interface ConceptItem {
  text: string;
  /** 先頭が正解。残りが誤答（why=典型ミス）。 */
  choices: { text: string; why?: string }[];
  steps: string[];
}

export type SolverFn = (rng: RNG, pool?: ConceptItem[]) => SolvedQuestion;

/** 数値の正解 + 典型ミスの誤答から選択肢を組み立ててシャッフルする。
 *  wrongs は {value, why}。重複・正解と一致するものは除外し、
 *  不足分は正解を摂動して補う。 */
export function numChoices(
  rng: RNG,
  correct: number,
  wrongs: { value: number; why: string }[],
  digits = 2,
  unit = '',
): Choice[] {
  const fmt = (v: number) => String(parseFloat(v.toFixed(digits))) + unit;
  const seen = new Set<string>([fmt(correct)]);
  const out: Choice[] = [{ text: fmt(correct), correct: true }];
  for (const w of wrongs) {
    const t = fmt(w.value);
    if (!seen.has(t) && out.length < 5) {
      seen.add(t);
      out.push({ text: t, correct: false, why: w.why });
    }
  }
  // 誤答が足りなければ摂動で補充（3個は欲しい）
  let k = 1;
  while (out.length < 4) {
    const cand = correct * (1 + 0.15 * k) + (correct === 0 ? k * 0.5 : 0);
    const t = fmt(cand);
    if (!seen.has(t)) {
      seen.add(t);
      out.push({ text: t, correct: false, why: '計算ミスによる値' });
    }
    k++;
  }
  return shuffle(rng, out);
}

/** 文字列選択肢の組み立て */
export function textChoices(
  rng: RNG,
  correct: string,
  wrongs: { text: string; why: string }[],
): Choice[] {
  const seen = new Set<string>([correct]);
  const out: Choice[] = [{ text: correct, correct: true }];
  for (const w of wrongs) {
    if (!seen.has(w.text) && out.length < 5) {
      seen.add(w.text);
      out.push({ text: w.text, correct: false, why: w.why });
    }
  }
  return shuffle(rng, out);
}
