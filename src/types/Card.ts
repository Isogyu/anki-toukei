export type Category =
  | '記述統計'
  | '確率'
  | '確率分布'
  | '標本分布'
  | '推定'
  | '仮説検定'
  | '回帰分析'
  | '相関'
  | '実験計画'
  | 'データ収集'
  | '時系列'
  | 'カイ二乗検定'
  | '用語';

export interface Card {
  id: number; // 1始まりの連番。重複禁止。
  category: Category;
  title: string; // カードの見出し（1テーマのみ。例："標本平均"）
  formula: string; // LaTeX文字列。公式が存在しない用語カードは空文字 "" を許可。
  meaning: string; // 意味（1〜2文、40字以内目安）
  usage: string[]; // 使う場面のタグ（1〜3個、名詞句）
}

export const CATEGORIES: Category[] = [
  '記述統計',
  '確率',
  '確率分布',
  '標本分布',
  '推定',
  '仮説検定',
  '回帰分析',
  '相関',
  '実験計画',
  'データ収集',
  '時系列',
  'カイ二乗検定',
  '用語',
];
