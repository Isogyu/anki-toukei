/** 確率分布ソルバー（src/solvers/distflow.ts）とステップ式問題のテスト。
 *  - 多数シードで構造（選択肢数・正解1つ・重複なし・誤答理由）を検査
 *  - 数値問題は「正解として表示される選択肢」が verify.expected と一致するか
 *  - 連続補正の境界・標準化などの意味的な性質
 *  - questions.json のステップ式テンプレートが既存画面向けに単体問題として成立するか */
import questionsData from '../src/data/questions.json';
import patternsData from '../src/data/patterns.json';
import cardsData from '../src/data/cards.json';
import type { QuestionTemplate } from '../src/types/Question';
import type { Card } from '../src/types/Card';
import { SOLVERS } from '../src/solvers';
import type {
  Choice,
  SolvedQuestion,
  VerifyPayload,
} from '../src/solvers/types';
import { mulberry32, normalCdf } from '../src/lib/stats';

const NEW_SOLVERS = [
  'dist_moments',
  'std_z',
  'std_prob',
  'xbar_std',
  'binom_norm_calc',
  'flow_binom',
  'flow_xbar',
  'flow_poisson',
  'flow_binom_poisson',
  'flow_normal',
  'flow_infer',
];
const SEEDS = 300;

let passed = 0;
const failures: string[] = [];
function check(cond: boolean, msg: string) {
  if (cond) passed++;
  else failures.push(msg);
}

function checkChoices(tag: string, ch: Choice[], min: number) {
  const t = ch.map((c) => c.text);
  check(ch.length >= min && ch.length <= 5, `${tag}: 選択肢数 ${ch.length}`);
  check(
    new Set(t).size === t.length,
    `${tag}: 選択肢重複 ${JSON.stringify(t)}`,
  );
  check(ch.filter((c) => c.correct).length === 1, `${tag}: 正解が1つでない`);
  check(
    ch.every((c) => c.correct || (c.why && c.why.length > 0)),
    `${tag}: 誤答に理由がない`,
  );
  check(!t.some((x) => /NaN|Infinity|undefined/.test(x)), `${tag}: 不正な値`);
}

/** 正解選択肢が数値なら、verify.expected を表示桁で丸めた値と一致するか */
function checkCorrectMatchesVerify(
  tag: string,
  ch: Choice[],
  v?: VerifyPayload,
) {
  if (!v) return;
  const c = ch.find((x) => x.correct)!;
  if (!/^-?\d+(\.\d+)?$/.test(c.text)) return; // 数式・文章の選択肢は対象外
  const shown = parseFloat(c.text);
  const dec = (c.text.split('.')[1] ?? '').length;
  const tol = 0.5 * Math.pow(10, -Math.max(dec, 0)) + 1e-9;
  check(
    Math.abs(shown - v.expected) <= tol,
    `${tag}: 正解表示 ${c.text} と verify.expected ${v.expected} が不一致`,
  );
}

// ---- 1. 全新規ソルバーの構造・正解整合 ----
for (const name of NEW_SOLVERS) {
  const solver = SOLVERS[name];
  check(!!solver, `${name}: SOLVERS に未登録`);
  if (!solver) continue;
  for (let s = 1; s <= SEEDS; s++) {
    const tag = `${name}#${s}`;
    let q: SolvedQuestion;
    try {
      q = solver(mulberry32(s * 7919 + 13));
    } catch (e) {
      failures.push(`${tag}: 例外 ${e}`);
      continue;
    }
    checkChoices(tag, q.choices, 4);
    checkCorrectMatchesVerify(tag, q.choices, q.verify);
    check(!!q.verify, `${tag}: 最終問題に verify がない（scipy 照合対象外）`);
    check(q.steps.length > 0, `${tag}: 解説が空`);
    if (name.startsWith('flow_')) {
      check(!!q.stages && q.stages.length >= 2, `${tag}: ステップが2つ未満`);
      check(!!q.stem && !!q.finalPrompt, `${tag}: stem/finalPrompt なし`);
      check(
        q.text.startsWith(q.stem ?? '\u0000'),
        `${tag}: text が stem から始まらない`,
      );
      check(
        q.stages?.[0]?.prompt.startsWith('Step 1') ?? false,
        `${tag}: 最初のステップが Step 1 でない`,
      );
      check(
        (q.finalPrompt ?? '').startsWith(`Step ${(q.stages?.length ?? 0) + 1}`),
        `${tag}: 最終ステップ番号がずれている`,
      );
      (q.stages ?? []).forEach((st, j) => {
        checkChoices(`${tag}.step${j + 1}`, st.choices, 3);
        checkCorrectMatchesVerify(`${tag}.step${j + 1}`, st.choices, st.verify);
      });
    }
  }
}

// ---- 2. 意味的な性質 ----
// 2-1 連続補正: binom_norm_calc の z / 確率を独立に再計算
for (let s = 1; s <= SEEDS; s++) {
  const q = SOLVERS.binom_norm_calc(mulberry32(s * 31 + 7));
  const v = q.verify!;
  const { n, p, k, op } = v.params as Record<string, number>;
  const b = [k - 0.5, k + 0.5, k + 0.5, k - 0.5][op];
  const upper = op === 0 || op === 2;
  const z = (b - n * p) / Math.sqrt(n * p * (1 - p));
  const expected =
    v.kind === 'binom_norm_z' ? z : upper ? 1 - normalCdf(z) : normalCdf(z);
  check(
    Math.abs(expected - v.expected) < 1e-9,
    `binom_norm_calc#${s}: 連続補正の境界が不正 op=${op} k=${k}`,
  );
  // 「連続補正なし」の誤答が必ず含まれるか（典型ミスの網羅）
  check(
    q.choices.some((c) => (c.why ?? '').includes('連続補正')),
    `binom_norm_calc#${s}: 連続補正ミスの誤答がない`,
  );
}

// 2-2 std_prob の両側: outside + inside = 1
for (let s = 1; s <= SEEDS; s++) {
  const q = SOLVERS.std_prob(mulberry32(s * 101 + 3));
  if (q.verify?.kind !== 'normal_two') continue;
  const z = q.verify.params.z as number;
  const up = 1 - normalCdf(z);
  const want = q.verify.params.outside ? 2 * up : 1 - 2 * up;
  check(
    Math.abs(want - q.verify.expected) < 1e-9,
    `std_prob#${s}: 両側確率が不正`,
  );
}

// 2-3 flow_binom: Step3=np, Step4=np(1-p) がパラメータと整合
for (let s = 1; s <= SEEDS; s++) {
  const q = SOLVERS.flow_binom(mulberry32(s * 17 + 5));
  const [, , s3, s4] = q.stages!;
  const { n, p } = s3.verify!.params as Record<string, number>;
  check(
    Math.abs(s3.verify!.expected - n * p) < 1e-9,
    `flow_binom#${s}: E(X)≠np`,
  );
  check(
    Math.abs(s4.verify!.expected - n * p * (1 - p)) < 1e-9,
    `flow_binom#${s}: V(X)≠np(1−p)`,
  );
  // 分散と標準偏差の混同を誤答に含む
  check(
    s4.choices.some((c) => !c.correct && (c.why ?? '').includes('標準偏差')),
    `flow_binom#${s}: 分散ステップに「標準偏差との混同」誤答がない`,
  );
}

// 2-4 xbar_std: σ で割る誤答（母集団と標本の混同）を含む
for (let s = 1; s <= SEEDS; s++) {
  const q = SOLVERS.xbar_std(mulberry32(s * 57 + 1));
  if (q.verify?.kind !== 'xbar_z') continue;
  check(
    q.choices.some((c) => (c.why ?? '').includes('σ で割った')),
    `xbar_std#${s}: σ で割る典型ミスがない`,
  );
}

// 2-5 flow_xbar: Step4（標準化）に σ で割る誤答を含む
for (let s = 1; s <= SEEDS; s++) {
  const q = SOLVERS.flow_xbar(mulberry32(s * 71 + 9));
  check(
    q.stages![3].choices.some((c) => (c.why ?? '').includes('σ で割った')),
    `flow_xbar#${s}: 標準化ステップに σ で割る典型ミスがない`,
  );
}

// ---- 3. データ（questions.json / patterns.json / cards.json） ----
const templates = questionsData as QuestionTemplate[];
const flowTpls = templates.filter((t) => t.solver.startsWith('flow_'));
check(
  flowTpls.length >= 5,
  `ステップ式テンプレートが少ない (${flowTpls.length})`,
);
for (const name of NEW_SOLVERS) {
  check(
    templates.some((t) => t.solver === name),
    `${name}: questions.json にテンプレートがない`,
  );
}
// 確率分布・標本分布の概念プールは全誤答に理由がある
for (const t of templates) {
  if (t.solver !== 'concept') continue;
  if (!/^q-(dist-(2\d)|samp-(09|1\d))$/.test(t.id)) continue;
  for (const it of t.pool ?? []) {
    check(
      it.choices.slice(1).every((c) => !!c.why),
      `${t.id}: 「${it.text.slice(0, 20)}…」の誤答に理由がない`,
    );
    check(
      it.choices.length >= 4 && it.choices.length <= 5,
      `${t.id}: 選択肢数 ${it.choices.length}`,
    );
  }
}
const distIdentify = templates
  .filter((t) => ['q-dist-20', 'q-dist-21', 'q-samp-10'].includes(t.id))
  .reduce((a, t) => a + (t.pool?.length ?? 0), 0);
check(distIdentify >= 20, `分布判別問題が20問未満 (${distIdentify})`);

const pats = patternsData as { id: string; variants: string[] }[];
for (const id of ['pat-38', 'pat-39', 'pat-40']) {
  check(
    pats.some((p) => p.id === id),
    `${id} がない`,
  );
}

const cards = cardsData as Card[];
const summary = cards.filter((c) => c.symbol);
check(summary.length >= 20, `記号つきカードが少ない (${summary.length})`);
for (const c of cards.filter((x) => x.focus)) {
  check(
    c.focus === 'memorize' || c.focus === 'understand',
    `card ${c.id}: focus 不正`,
  );
}
check(
  cards.some((c) => c.focus === 'memorize') &&
    cards.some((c) => c.focus === 'understand'),
  '暗記優先・理解優先の両方のカードがあること',
);

// ---- 結果 ----
if (failures.length > 0) {
  console.error(
    `distflow テスト: FAIL (${failures.length}件 / PASS ${passed}件)`,
  );
  for (const f of failures.slice(0, 50)) console.error('  ' + f);
  process.exit(1);
}
console.log(`distflow テスト: PASS (${passed}件)`);
