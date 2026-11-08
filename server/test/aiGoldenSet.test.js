import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  parseGoldenSet,
  evaluateGoldenSet,
  findRegressions,
  findTrainingLeaks,
  canonicalText
} from '../src/services/ai/aiEvaluation.js';

const fixture = (name) => readFileSync(fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url)), 'utf8');
const cases = parseGoldenSet(fixture('ai-golden-set.jsonl'));
const baseline = JSON.parse(fixture('ai-eval-baseline.json'));
const metrics = evaluateGoldenSet(cases);
const listCases = (items) => items.map(({ id, text }) => `${id}: ${text}`).join('\n');

describe('AI golden set integrity', () => {
  test('is large, balanced and covers the risky linguistic phenomena', () => {
    assert.ok(cases.length >= 120, `only ${cases.length} cases`);
    for (const severity of ['minor', 'major', 'critical']) {
      assert.ok(cases.filter((c) => c.expected_severity === severity).length >= 25, `too few ${severity} cases`);
    }
    const tags = new Set(cases.flatMap((c) => c.tags));
    for (const tag of ['negation', 'no_diacritics', 'shorthand', 'homograph', 'burnout', 'long_text', 'no_equipment']) {
      assert.ok(tags.has(tag), `missing tag ${tag}`);
    }
  });

  test('never overlaps the training corpus (no evaluation leakage)', () => {
    assert.deepEqual(findTrainingLeaks(cases), []);
  });

  test('rejects malformed fixtures with the offending line number', () => {
    assert.throws(() => parseGoldenSet('{"id":"X","text":"a","expected_severity":"urgent","tags":[]}'), /line 1: invalid expected_severity/);
    assert.throws(() => parseGoldenSet('{"id":"A","text":"a","expected_severity":"minor","tags":[]}\n{"id":"A","text":"b","expected_severity":"minor","tags":[]}'), /line 2: duplicate id A/);
    assert.equal(canonicalText('Máy  CHIẾU, bốc khói!'), 'may chieu boc khoi');
  });
});

describe('AI safety gate (blocks merge)', () => {
  test('hazard recall is 100%: every labelled emergency is triaged as critical', () => {
    assert.equal(metrics.hazard_recall, 1, `missed hazards:\n${listCases(metrics.missed_hazards)}`);
  });

  test('false-critical rate stays at or below 10%', () => {
    assert.ok(metrics.false_critical_rate <= 0.1, `false criticals (${metrics.false_critical_rate}):\n${listCases(metrics.false_criticals)}`);
  });

  test('quality metrics never regress below the committed baseline', () => {
    assert.deepEqual(findRegressions(metrics, baseline), []);
  });
});

describe('regression ratchet logic', () => {
  test('flags only drops beyond tolerance, overall and per tag', () => {
    const base = { severity_accuracy: 0.8, category_accuracy: 0.9, by_tag: { negation: { accuracy: 0.7 } } };
    assert.deepEqual(findRegressions({ severity_accuracy: 0.795, category_accuracy: 0.95, by_tag: { negation: { accuracy: 0.7 } } }, base), []);
    assert.deepEqual(
      findRegressions({ severity_accuracy: 0.7, category_accuracy: 0.9, by_tag: { negation: { accuracy: 0.5 } } }, base),
      ['severity_accuracy: 0.7 < baseline 0.8', 'tag negation: 0.5 < baseline 0.7']
    );
  });
});
