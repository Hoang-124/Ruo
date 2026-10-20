import { test } from 'node:test';
import assert from 'node:assert/strict';

import * as analytics from '../src/services/dashboardAnalytics.js';

test('KPI uses all status groups and excludes retired/lost equipment from operating denominator', () => {
  assert.equal(typeof analytics.summarizeKpi, 'function');
  const result = analytics.summarizeKpi([
    { _id: 'in_use', count: 150, value: 1500 }, { _id: 'in_stock', count: 25, value: 500 },
    { _id: 'broken', count: 20, value: 200 }, { _id: 'repairing', count: 5, value: 50 },
    { _id: 'disposed', count: 50, value: 500 }, { _id: 'lost', count: 10, value: 100 }
  ], { openRepairs: 12, overdueRepairs: 3 }, 120);
  assert.equal(result.totalEquipment, 260);
  assert.equal(result.activeEquipment, 200);
  assert.equal(result.operatingRate, 75);
  assert.equal(result.warehouseValue, 620);
  assert.equal(result.overdueRepairs, 3);
  assert.equal(analytics.summarizeKpi([]).operatingRate, 0);
});

