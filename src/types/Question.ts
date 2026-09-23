import type { Category } from './Card';
import type { ConceptItem } from '../solvers/types';

/** 演習テンプレート。solver名に対応する src/solvers の関数が
 *  パラメータをランダム生成して問題文・選択肢・解説を組み立てる。 */
export interface QuestionTemplate {
  id: string; // "q-xxx-01" 形式
  category: Category;
  solver: string; // src/solvers/index.ts の SOLVERS キー
  label: string; // テンプレート名（例: "母平均の区間推定(σ既知)"）
  pool?: ConceptItem[]; // solver === 'concept' のとき必須
  ohm?: string;
  official?: string;
  refs?: string[];
}
