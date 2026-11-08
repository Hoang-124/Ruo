#!/usr/bin/env node
/**
 * Ruo Cortex AI evaluation report.
 *   node scripts/aiEval.js                 print metrics for the golden set
 *   node scripts/aiEval.js --json          print the full machine-readable report
 *   node scripts/aiEval.js --write-baseline  refresh test/fixtures/ai-eval-baseline.json
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  parseGoldenSet,
  evaluateGoldenSet,
  findRegressions,
  findTrainingLeaks,
  toBaseline
} from '../src/services/ai/aiEvaluation.js';

const fixture = (name) => fileURLToPath(new URL(`../test/fixtures/${name}`, import.meta.url));
const GOLDEN_PATH = fixture('ai-golden-set.jsonl');
const BASELINE_PATH = fixture('ai-eval-baseline.json');

const args = new Set(process.argv.slice(2));
const cases = parseGoldenSet(readFileSync(GOLDEN_PATH, 'utf8'));
const metrics = evaluateGoldenSet(cases);

if (args.has('--json')) {
  console.log(JSON.stringify(metrics, null, 2));
  process.exit(0);
}

const pct = (value) => (value === null ? 'n/a' : `${(value * 100).toFixed(1)}%`);
console.log(`Ruo Cortex AI evaluation — ${metrics.total} golden cases`);
console.log(`  Hazard recall        ${pct(metrics.hazard_recall)}  (gate: 100%)`);
console.log(`  False-critical rate  ${pct(metrics.false_critical_rate)}  (gate: <= 10%)`);
console.log(`  Severity accuracy    ${pct(metrics.severity_accuracy)}`);
console.log(`  Category accuracy    ${pct(metrics.category_accuracy)}`);
console.log('\n  Confusion (rows = expected, cols = predicted: minor / major / critical)');
for (const [expected, row] of Object.entries(metrics.confusion)) {
  console.log(`    ${expected.padEnd(8)} ${Object.values(row).map((n) => String(n).padStart(4)).join(' ')}`);
}
console.log('\n  Accuracy by tag');
for (const [tag, { total, accuracy }] of Object.entries(metrics.by_tag)) {
  console.log(`    ${tag.padEnd(14)} ${pct(accuracy).padStart(7)}  (${total})`);
}
for (const { id, text } of metrics.missed_hazards) console.log(`  MISSED HAZARD ${id}: ${text}`);
for (const { id, text, hazard_trigger } of metrics.false_criticals) console.log(`  FALSE CRITICAL ${id} [${hazard_trigger}]: ${text}`);
const leaks = findTrainingLeaks(cases);
if (leaks.length) console.log(`  TRAINING LEAKS: ${leaks.join(', ')}`);

if (args.has('--write-baseline')) {
  writeFileSync(BASELINE_PATH, `${JSON.stringify(toBaseline(metrics), null, 2)}\n`);
  console.log(`\nBaseline written to ${BASELINE_PATH}`);
} else {
  let baseline = null;
  try {
    baseline = JSON.parse(readFileSync(BASELINE_PATH, 'utf8'));
  } catch {
    console.log('\nNo baseline yet; run with --write-baseline.');
  }
  const regressions = findRegressions(metrics, baseline);
  for (const line of regressions) console.log(`  REGRESSION ${line}`);
}
