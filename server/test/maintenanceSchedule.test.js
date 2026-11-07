import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getPlanSchedule } from '../src/controllers/maintenanceController.js';

for (const [label, frequency, start, now, current, next, due] of [
  ['monthly before anniversary', 'monthly', '2026-01-20', '2026-02-05', '2026-01-20', '2026-02-20', true],
  ['monthly exact anniversary', 'monthly', '2026-01-20', '2026-02-20', '2026-02-20', '2026-03-20', true],
  ['quarterly before anniversary', 'quarterly', '2026-01-20', '2026-04-05', '2026-01-20', '2026-04-20', true],
  ['future start', 'monthly', '2026-03-20', '2026-02-05', '2026-03-20', '2026-03-20', false],
  ['year rollover', 'monthly', '2025-11-20', '2026-01-05', '2025-12-20', '2026-01-20', true],
  ['end of February clamp', 'monthly', '2026-01-31', '2026-02-28', '2026-02-28', '2026-03-31', true],
  ['leap year before anniversary', 'monthly', '2024-01-31', '2024-02-28', '2024-01-31', '2024-02-29', true],
]) {
  test(label, () => {
    const schedule = getPlanSchedule({ start_date: start, frequency }, new Date(now));
    assert.deepEqual(schedule, {
      current_cycle_start: new Date(current).toISOString(),
      next_due_at: new Date(next).toISOString(),
      current_cycle_is_due: due
    });
  });
}
