import type { Category } from './Card';

export type DistributionKey =
  | 'z'
  | 't'
  | 'chi2'
  | 'F'
  | 'binom'
  | 'poisson'
  | 'geom'
  | 'hypergeom'
  | 'exp'
  | 'unif'
  | 'none';

export const DISTRIBUTION_LABELS: Record<DistributionKey, string> = {
  z: '標準正規分布 z',
  t: 't分布',
  chi2: 'χ²分布',
  F: 'F分布',
  binom: '二項分布(正規近似含む)',
  poisson: 'ポアソン分布',
  geom: '幾何分布',
  hypergeom: '超幾何分布',
  exp: '指数分布',
  unif: '一様分布',
  none: '分布を使わない',
};

export const DISTRIBUTION_KEYS = Object.keys(
  DISTRIBUTION_LABELS,
) as DistributionKey[];

export interface Pattern {
  id: string; // "pat-01" 形式
  category: Category;
  trigger: string; // 問題文で見分ける手がかり
  method: string; // 手法名
  distribution: DistributionKey;
  dfShort: string; // 自由度の短い表記 例 "n−1"（判別ドリルの選択肢用）
  dfRule: string; // 自由度ルールの説明
  steps: string[]; // 解法手順（3〜6個）
  variants: string[]; // 短い問題文（3つ以上）
  ohm?: string;
  official?: string;
  refs?: string[];
}
