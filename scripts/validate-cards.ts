import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import katex from 'katex';
import { z } from 'zod';

const CATEGORIES = [
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
] as const;

type Category = (typeof CATEGORIES)[number];

// 3章の最低枚数表
const MIN_COUNTS: Record<Category, number> = {
  記述統計: 13,
  確率: 5,
  確率分布: 21,
  標本分布: 7,
  推定: 6,
  仮説検定: 10,
  回帰分析: 7,
  相関: 2,
  実験計画: 6,
  データ収集: 8,
  時系列: 6,
  カイ二乗検定: 3,
  用語: 1,
};

const CardSchema = z.object({
  id: z.number().int().positive(),
  category: z.enum(CATEGORIES),
  title: z.string().min(1),
  formula: z.string(),
  meaning: z.string().min(1),
  usage: z.array(z.string().min(1)).min(1).max(3),
});

const CardsSchema = z.array(CardSchema);

const errors: string[] = [];

const __dirname = dirname(fileURLToPath(import.meta.url));
const cardsPath = resolve(__dirname, '../src/data/cards.json');
const raw = JSON.parse(readFileSync(cardsPath, 'utf-8'));

// 1. zod スキーマ適合
const parsed = CardsSchema.safeParse(raw);
if (!parsed.success) {
  errors.push('スキーマ検証に失敗しました:');
  for (const issue of parsed.error.issues) {
    errors.push(`  - [${issue.path.join('.')}] ${issue.message}`);
  }
}

if (parsed.success) {
  const cards = parsed.data;

  // 2. id が 1〜N で連番かつ重複なし
  const ids = cards.map((c) => c.id).sort((a, b) => a - b);
  const seen = new Set<number>();
  for (const id of ids) {
    if (seen.has(id)) errors.push(`idが重複しています: ${id}`);
    seen.add(id);
  }
  for (let i = 0; i < ids.length; i++) {
    if (ids[i] !== i + 1) {
      errors.push(
        `idが1〜Nの連番ではありません: 期待=${i + 1}, 実際=${ids[i]}`,
      );
      break;
    }
  }

  // 3. 同一 category 内で title の重複がない
  const titleMap = new Map<string, Set<string>>();
  for (const c of cards) {
    if (!titleMap.has(c.category)) titleMap.set(c.category, new Set());
    const set = titleMap.get(c.category)!;
    if (set.has(c.title)) {
      errors.push(`category「${c.category}」内でtitleが重複: ${c.title}`);
    }
    set.add(c.title);
  }

  // 4. category ごとの最低枚数を満たす
  const counts = new Map<Category, number>();
  for (const c of cards) {
    counts.set(c.category, (counts.get(c.category) ?? 0) + 1);
  }
  for (const cat of CATEGORIES) {
    const n = counts.get(cat) ?? 0;
    if (n < MIN_COUNTS[cat]) {
      errors.push(
        `category「${cat}」の枚数が不足: ${n} < 最低${MIN_COUNTS[cat]}`,
      );
    }
  }

  // 5. formula(空文字を除く)が KaTeX でレンダリング可能
  for (const c of cards) {
    if (c.formula.trim() === '') continue;
    try {
      katex.renderToString(c.formula, {
        throwOnError: true,
        displayMode: true,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(
        `id=${c.id}「${c.title}」のformulaがKaTeXでレンダリング不可: ${msg}`,
      );
    }
  }
}

if (errors.length > 0) {
  console.error('カードデータ検証: 失敗');
  for (const e of errors) console.error(e);
  process.exit(1);
}

const total = Array.isArray(raw) ? raw.length : 0;
console.log(`カードデータ検証: PASS (${total}枚)`);
