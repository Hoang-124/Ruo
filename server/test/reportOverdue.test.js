import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as analytics from '../src/services/reportAnalytics.js';

test('UC-8.8 overdue query includes only open repairs with a real past deadline', () => {
  const now = new Date('2026-10-27T10:00:00Z');
  const result = analytics.parseOverdueQuery({ severity: 'critical', page: '2', limit: '10' }, now);
  assert.equal(result.valid, true);
  assert.deepEqual(result.filter.status.$in, ['reported', 'assigned', 'in_progress']);
  assert.equal(result.filter.deadline.$lt, now);
  assert.equal(result.filter.deadline.$ne, null);
  assert.equal(result.filter.damage_level, 'critical');
  assert.equal(result.skip, 10);
  for (const severity of ['bad', ['minor'], { $ne: null }]) assert.equal(analytics.parseOverdueQuery({ severity }, now).valid, false);
});
