/**
 * Retrieval quality scoreboard, not a pass/fail test. Needs the app running
 * with CHATBOT_ENABLED=true.
 *
 *   yarn eval:retrieval                          # full suite from queries.json
 *   yarn eval:retrieval "jaime devops" 182848    # one ad-hoc query, top 10
 *
 * Env: EVAL_API, EVAL_QUERIES, EVAL_K
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

type EvalCase = {
  query: string;
  /** Must appear in the top K. Drives recall/MRR. */
  relevant: string[];
  programIds?: number[];
  // queries.json also carries `acceptable` and `note` as prose; unused here.
};

type CourseResult = { code: string; title: string; score: number };

const API = process.env.EVAL_API ?? 'http://localhost:3001';
const K = 10;
const QUERIES_PATH = resolve('test/embedding/eval/queries.json');

async function retrieve(
  query: string,
  programIds?: number[]
): Promise<CourseResult[]> {
  const response = await fetch(`${API}/api/retrieval/query-courses`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      query,
      ...(programIds?.length ? { context: { programIds } } : {})
    }),
    signal: AbortSignal.timeout(60000)
  });

  if (!response.ok) {
    const hint =
      response.status === 404
        ? ' (404 — is CHATBOT_ENABLED=true on the server?)'
        : '';
    throw new Error(`${API} returned ${response.status}${hint}`);
  }

  const body = (await response.json()) as { courses: CourseResult[] };
  return body.courses;
}

/** The metric that matters: the LLM can't recommend what it never received. */
function recallAtK(retrieved: string[], relevant: string[], k: number): number {
  if (relevant.length === 0) return 1;
  const top = new Set(retrieved.slice(0, k));
  return relevant.filter((code) => top.has(code)).length / relevant.length;
}

/** 1/rank of the first relevant hit. Measures ordering, not just presence. */
function reciprocalRank(retrieved: string[], relevant: string[]): number {
  const rank = retrieved.findIndex((code) => relevant.includes(code));
  return rank === -1 ? 0 : 1 / (rank + 1);
}

const mean = (xs: number[]): number =>
  xs.length === 0 ? 0 : xs.reduce((s, x) => s + x, 0) / xs.length;

function printHits(results: CourseResult[], relevant: string[]): void {
  for (const result of results.slice(0, K)) {
    const mark = relevant.includes(result.code) ? '✓' : ' ';
    console.log(
      `   ${mark} [${result.score.toFixed(3)}] ${result.code} – ${result.title.slice(0, 60)}`
    );
  }
}

/** `yarn eval:retrieval "jaime devops" 182848` — inspect one student request. */
async function adHoc(query: string, programIds?: number[]): Promise<void> {
  const results = await retrieve(query, programIds);
  console.log(
    `▸ "${query}"${programIds?.length ? ` [programIds: ${programIds.join(',')}]` : ''}`
  );
  console.log(`   ${results.length} cours retournés au LLM\n`);
  printHits(results, []);
  if (results.length === 0) {
    console.log(
      '   ⚠ Aucun cours — le LLM répondra sans contexte. Vérifier RETRIEVAL_SCORE_THRESHOLD.'
    );
  }
}

type CaseResult = {
  testCase: EvalCase;
  recall: number;
  rr: number;
  missed: string[];
};

async function suite(): Promise<void> {
  const cases: EvalCase[] = JSON.parse(readFileSync(QUERIES_PATH, 'utf8'));

  console.log(`api: ${API}   cases: ${cases.length}   k: ${K}\n`);
  console.log(
    `Recall@${K}: % of the courses you marked "relevant" that came back in the\n` +
    `             top ${K} results. 100% = nothing relevant was missed.`
  );
  console.log(
    'MRR:       how early the first relevant course showed up, averaged.\n' +
    '           1.0 = always rank 1, 0.5 = usually rank 2, 0 = never found.\n'
  );

  const runs: CaseResult[] = [];

  for (const testCase of cases) {
    const results = await retrieve(testCase.query, testCase.programIds);
    const codes = results.map((r) => r.code);

    const recall = recallAtK(codes, testCase.relevant, K);
    const rr = reciprocalRank(codes, testCase.relevant);
    const missed = testCase.relevant.filter((code) => !codes.includes(code));
    runs.push({ testCase, recall, rr, missed });

    console.log(
      `▸ "${testCase.query}"${testCase.programIds?.length ? ` [${testCase.programIds.join(',')}]` : ''}`
    );
    console.log(
      `   recall@${K} ${(recall * 100).toFixed(0)}%   found first relevant course at rank ${rr === 0 ? 'never' : Math.round(1 / rr)}   returned ${results.length}`
    );
    printHits(results, testCase.relevant);
    if (missed.length > 0) {
      console.log(`   ✗ MISSED: ${missed.join(', ')}`);
    }
    console.log('');
  }

  const recalls = runs.map((r) => r.recall);
  const rrs = runs.map((r) => r.rr);
  const failing = runs
    .filter((r) => r.recall < 1)
    .sort((a, b) => a.recall - b.recall);

  console.log('─'.repeat(64));
  console.log(`cases              ${cases.length}  (# queries evaluated)`);
  console.log(
    `Recall@${K}          ${(mean(recalls) * 100).toFixed(0)}%  (% of relevant courses found in the top ${K})`
  );
  console.log(
    `MRR                ${mean(rrs).toFixed(3)}  (avg 1/rank of first relevant hit; 1.0 = rank 1, 0.5 = rank 2)`
  );

  if (failing.length > 0) {
    console.log('─'.repeat(64));
    console.log(
      `Queries with missed courses (${failing.length}/${cases.length}), worst first:`
    );
    for (const { testCase, recall, missed } of failing) {
      console.log(
        `  ${(recall * 100).toFixed(0)}%  "${testCase.query}"  missing: ${missed.join(', ')}`
      );
    }
  }
  console.log('─'.repeat(64));
}

const [query, ...programArgs] = process.argv.slice(2);
const run = query
  ? adHoc(
    query,
    programArgs.map(Number).filter((n) => Number.isInteger(n))
  )
  : suite();

run.catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
