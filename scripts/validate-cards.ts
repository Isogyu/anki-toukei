import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import katex from 'katex';
import { z } from 'zod';
import { SOLVERS } from '../src/solvers/index';
import { mulberry32 } from '../src/lib/stats';

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

const ALLOWED_REF_HOSTS = [
  'bellcurve.jp',
  'toketarou.com',
  'www.toukei-kentei.jp',
  'toukei-kentei.jp',
];

const RefSchema = z
  .string()
  .url()
  .refine((u) => {
    try {
      return ALLOWED_REF_HOSTS.includes(new URL(u).hostname);
    } catch {
      return false;
    }
  }, 'refs は許可されたドメインの URL のみ使用できます');

const CardSchema = z.object({
  id: z.number().int().positive(),
  category: z.enum(CATEGORIES),
  title: z.string().min(1),
  formula: z.string(),
  meaning: z.string().min(1),
  usage: z.array(z.string().min(1)).min(1).max(3),
  pitfalls: z.array(z.string().min(1)).max(4).optional(),
  calcTips: z.string().optional(),
  ohm: z
    .string()
    .regex(/^\d+(-\d+)?$/)
    .optional(),
  official: z
    .string()
    .regex(/^\d+\.\d+$/)
    .optional(),
  refs: z.array(RefSchema).optional(),
});

const CardsSchema = z.array(CardSchema);

const DISTRIBUTION_KEYS = [
  'z',
  't',
  'chi2',
  'F',
  'binom',
  'poisson',
  'geom',
  'hypergeom',
  'exp',
  'unif',
  'none',
] as const;

const PatternSchema = z.object({
  id: z.string().regex(/^pat-\d+$/),
  category: z.enum(CATEGORIES),
  trigger: z.string().min(1),
  method: z.string().min(1),
  distribution: z.enum(DISTRIBUTION_KEYS),
  dfShort: z.string().min(1),
  dfRule: z.string().min(1),
  steps: z.array(z.string().min(1)).min(2),
  variants: z.array(z.string().min(1)).min(3),
  ohm: z
    .string()
    .regex(/^\d+(-\d+)?$/)
    .optional(),
  official: z
    .string()
    .regex(/^\d+\.\d+$/)
    .optional(),
  refs: z.array(RefSchema).optional(),
});

const ConceptItemSchema = z.object({
  text: z.string().min(1),
  choices: z
    .array(z.object({ text: z.string().min(1), why: z.string().optional() }))
    .min(3),
  steps: z.array(z.string().min(1)).min(1),
});

const QuestionSchema = z.object({
  id: z.string().regex(/^q-[a-z]+-\d+$/),
  category: z.enum(CATEGORIES),
  solver: z.string().min(1),
  label: z.string().min(1),
  ohm: z
    .string()
    .regex(/^\d+(-\d+)?$/)
    .optional(),
  official: z
    .string()
    .regex(/^\d+\.\d+$/)
    .optional(),
  refs: z.array(RefSchema).optional(),
  pool: z.array(ConceptItemSchema).optional(),
});

const QuestionsSchema = z.array(QuestionSchema);
const PatternsSchema = z.array(PatternSchema);

const errors: string[] = [];

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = resolve(__dirname, '../src/data');

function loadJson(name: string): unknown {
  try {
    return JSON.parse(readFileSync(resolve(dataDir, name), 'utf-8'));
  } catch (e) {
    errors.push(`${name} の読み込みに失敗: ${e}`);
    return null;
  }
}

const cardsRaw = loadJson('cards.json');
const patternsRaw = loadJson('patterns.json');
const questionsRaw = loadJson('questions.json');

// ---------- cards.json ----------
const parsed = CardsSchema.safeParse(cardsRaw);
if (!parsed.success) {
  errors.push('cards.json スキーマ検証に失敗しました:');
  for (const issue of parsed.error.issues) {
    errors.push(`  - [${issue.path.join('.')}] ${issue.message}`);
  }
}

if (parsed.success) {
  const cards = parsed.data;

  // id が 1〜N で連番かつ重複なし
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

  // 同一 category 内で title の重複がない
  const titleMap = new Map<string, Set<string>>();
  for (const c of cards) {
    if (!titleMap.has(c.category)) titleMap.set(c.category, new Set());
    const set = titleMap.get(c.category)!;
    if (set.has(c.title)) {
      errors.push(`category「${c.category}」内でtitleが重複: ${c.title}`);
    }
    set.add(c.title);
  }

  // category ごとの最低枚数を満たす
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

  // formula(空文字を除く)が KaTeX でレンダリング可能
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

// ---------- patterns.json ----------
const parsedP = PatternsSchema.safeParse(patternsRaw);
if (!parsedP.success) {
  errors.push('patterns.json スキーマ検証に失敗しました:');
  for (const issue of parsedP.error.issues) {
    errors.push(`  - [${issue.path.join('.')}] ${issue.message}`);
  }
} else {
  const pats = parsedP.data;
  const ids = new Set<string>();
  for (const p of pats) {
    if (ids.has(p.id)) errors.push(`patterns.json: id重複 ${p.id}`);
    ids.add(p.id);
  }
  if (pats.length < 30) {
    errors.push(`patterns.json: パターン数不足 (${pats.length} < 30)`);
  }
}

// ---------- questions.json ----------
const parsedQ = QuestionsSchema.safeParse(questionsRaw);
if (!parsedQ.success) {
  errors.push('questions.json スキーマ検証に失敗しました:');
  for (const issue of parsedQ.error.issues) {
    errors.push(`  - [${issue.path.join('.')}] ${issue.message}`);
  }
} else {
  const qs = parsedQ.data;
  const ids = new Set<string>();
  const perCat = new Map<string, number>();
  for (const q of qs) {
    if (ids.has(q.id)) errors.push(`questions.json: id重複 ${q.id}`);
    ids.add(q.id);
    perCat.set(q.category, (perCat.get(q.category) ?? 0) + 1);

    if (!(q.solver in SOLVERS)) {
      errors.push(`${q.id}: solver "${q.solver}" が SOLVERS に未登録`);
      continue;
    }
    if (q.solver === 'concept' && (!q.pool || q.pool.length === 0)) {
      errors.push(`${q.id}: concept solver には pool が必須`);
      continue;
    }
    if (q.solver !== 'concept' && q.pool) {
      errors.push(`${q.id}: concept 以外の solver に pool は付けられない`);
    }

    // 実際に生成して構造を検証（複数シード）
    for (let seed = 1; seed <= 5; seed++) {
      try {
        const rng = mulberry32(seed * 1000 + q.id.length);
        const gen = SOLVERS[q.solver](rng, q.pool);
        if (!gen.text) errors.push(`${q.id}: text が空`);
        const n = gen.choices.length;
        if (n < 4 || n > 5) {
          errors.push(
            `${q.id}: 選択肢が ${n} 個（4〜5個であること）seed=${seed}`,
          );
        }
        const texts = gen.choices.map((c) => c.text);
        if (new Set(texts).size !== texts.length) {
          errors.push(
            `${q.id}: 選択肢のテキストが重複 seed=${seed} ${JSON.stringify(texts)}`,
          );
        }
        const nCorrect = gen.choices.filter((c) => c.correct).length;
        if (nCorrect !== 1) {
          errors.push(`${q.id}: 正解が ${nCorrect} 個 seed=${seed}`);
        }
        if (gen.steps.length === 0) errors.push(`${q.id}: steps が空`);
      } catch (e) {
        errors.push(`${q.id}: solver 実行で例外 seed=${seed}: ${e}`);
      }
    }
  }
  for (const cat of CATEGORIES) {
    const n = perCat.get(cat) ?? 0;
    if (n < 5) {
      errors.push(`questions.json: 「${cat}」のテンプレート不足 (${n} < 5)`);
    }
  }
}

if (errors.length > 0) {
  console.error('データ検証: 失敗');
  for (const e of errors) console.error(e);
  process.exit(1);
}

const total = Array.isArray(cardsRaw) ? cardsRaw.length : 0;
const np = Array.isArray(patternsRaw) ? patternsRaw.length : 0;
const nq = Array.isArray(questionsRaw) ? questionsRaw.length : 0;
console.log(
  `データ検証: PASS (カード${total}枚 / パターン${np}件 / 問題テンプレート${nq}件)`,
);
