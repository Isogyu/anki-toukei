/** 全テンプレートのソルバーを複数シードで実行し、
 *  verify ペイロードを scripts/.verify_dump.json に書き出す。
 *  scripts/verify_solvers.py が scipy で照合する。 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import questionsData from '../src/data/questions.json';
import type { QuestionTemplate } from '../src/types/Question';
import { SOLVERS } from '../src/solvers';
import { mulberry32 } from '../src/lib/stats';
import type { VerifyPayload } from '../src/solvers/types';

const templates = questionsData as QuestionTemplate[];
const RUNS = 8;

const out: {
  tpl: string;
  solver: string;
  run: number;
  verify?: VerifyPayload;
  choices: string[];
  steps: string[];
}[] = [];
let noVerify = 0;

for (const tpl of templates) {
  const solver = SOLVERS[tpl.solver];
  if (!solver) {
    console.error(`solver 未登録: ${tpl.solver} (${tpl.id})`);
    process.exit(1);
  }
  for (let i = 0; i < RUNS; i++) {
    const q = solver(mulberry32(1000 + i * 97), tpl.pool);
    out.push({
      tpl: tpl.id,
      solver: tpl.solver,
      run: i,
      verify: q.verify,
      choices: q.choices.map((c) => c.text),
      steps: q.steps,
    });
    if (!q.verify) noVerify++;
  }
}

const here = dirname(fileURLToPath(import.meta.url));
writeFileSync(join(here, '.verify_dump.json'), JSON.stringify(out, null, 1));
console.log(
  `verify ダンプ: ${out.length}件（${templates.length}テンプレート × ${RUNS}回、verify無し ${noVerify}件）`,
);
