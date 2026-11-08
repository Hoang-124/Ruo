import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeVietnameseText, analyzeTokensAndNegation } from '../src/services/ai/vietnameseNlp.js';
import { classifyIncidentLocally } from '../src/services/ai/localClassifier.js';

const severityOf = (description) => classifyIncidentLocally({ description }).severity;

describe('Vietnamese shorthand normalization (Unicode word boundaries)', () => {
  test('expands shorthand that starts with "đ" (JS \\b is ASCII-only)', () => {
    assert.equal(normalizeVietnameseText('đh ko mát'), 'điều hòa không mát');
    assert.equal(normalizeVietnameseText('máy chiếu ko lên đc'), 'máy chiếu không lên được');
    assert.equal(normalizeVietnameseText('Đc rồi'), 'được rồi');
  });

  test('unaccented "hong" means "hỏng" unless it negates a following predicate', () => {
    assert.equal(normalizeVietnameseText('may chieu bi hong'), 'may chieu bi hỏng');
    assert.equal(normalizeVietnameseText('dieu hoa hong boc khoi'), 'dieu hoa hỏng boc khoi');
    assert.equal(normalizeVietnameseText('may lanh hong mat'), 'may lanh không mat');
    assert.equal(normalizeVietnameseText('máy lạnh hông mát'), 'máy lạnh không mát');
    assert.equal(normalizeVietnameseText('k len nguon'), 'không len nguon');
  });

  test('does not touch shorthand embedded inside longer words', () => {
    assert.equal(normalizeVietnameseText('khong dccc'), 'khong dccc');
    assert.equal(normalizeVietnameseText('phong học'), 'phong học');
  });
});

describe('Negation scope never swallows a real hazard', () => {
  test('predicate negation stops at "và" / "rồi" so the following hazard stays affirmed', () => {
    assert.match(analyzeTokensAndNegation('điều hòa không mát và bốc khói').affirmedHazardText, /bốc khói/);
    assert.equal(severityOf('điều hòa không mát và bốc khói'), 'critical');
    assert.equal(severityOf('máy tính không lên nguồn và có mùi khét'), 'critical');
    assert.equal(severityOf('máy chiếu không lên hình rồi bốc khói'), 'critical');
    assert.equal(severityOf('dieu hoa hong boc khoi'), 'critical');
  });

  test('existential negation still distributes over a coordinated list', () => {
    assert.notEqual(severityOf('ổ cắm không có khói và lửa'), 'critical');
    assert.notEqual(severityOf('không có mùi khét, chỉ không lên nguồn'), 'critical');
    assert.notEqual(severityOf('bàn bị tróc sơn, không cháy, không có khói hay mùi khét'), 'critical');
    assert.notEqual(severityOf('chưa thấy khói và tia lửa nhưng máy kêu to'), 'critical');
  });

  test('token pass joins two-word negation cues that end in non-ASCII letters', () => {
    const { tokens } = analyzeTokensAndNegation('không có khói');
    assert.ok(tokens.some((t) => t.word === 'không_có' && t.isNegCue));
    assert.ok(tokens.some((t) => t.word === 'khói' && t.negated));
  });
});
