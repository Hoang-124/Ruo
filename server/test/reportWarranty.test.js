import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as analytics from '../src/services/reportAnalytics.js';

test('UC-8.7 warranty window includes today and the whole final day in Vietnam time', () => {
  const window = analytics.parseWarrantyQuery({ days: '30' }, new Date('2026-10-27T16:59:00Z'));
  assert.equal(window.valid, true);
  assert.equal(window.start.toISOString(), '2026-10-26T17:00:00.000Z');
  assert.equal(window.end.toISOString(), '2026-11-26T17:00:00.000Z');
  assert.equal(analytics.warrantyDaysRemaining('2026-10-27T00:00:00Z', window.start), 0);
  assert.equal(analytics.warrantyDaysRemaining('2026-11-26T16:59:59Z', window.start), 30);
});
test('report pagination and warranty days reject malformed or unbounded queries', () => {
  for (const days of ['-1', '366', '2.5', ['30'], { $gt: 0 }, '']) assert.equal(analytics.parseWarrantyQuery({ days }).valid, false);
  for (const query of [{ page: '0' }, { limit: '101' }, { page: ['1'] }, { limit: '-1' }, { page: '9007199254740991' }]) {
    assert.equal(analytics.parseReportPagination(query).valid, false);
  }
  assert.equal(analytics.parseWarrantyQuery({ days: '0' }).valid, true);
});
