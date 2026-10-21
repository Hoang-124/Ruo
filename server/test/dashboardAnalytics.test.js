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

test('cost query validates year/period and uses Vietnam calendar boundaries', () => {
  assert.equal(typeof analytics.parseCostQuery, 'function');
  const q = analytics.parseCostQuery({ year: '2026', period: 'quarter' });
  assert.equal(q.valid, true);
  assert.equal(q.start.toISOString(), '2025-12-31T17:00:00.000Z');
  assert.equal(q.end.toISOString(), '2026-12-31T17:00:00.000Z');
  for (const query of [{ year: '2026x' }, { year: ['2026'] }, { year: 1999 }, { period: 'week' }]) {
    assert.equal(analytics.parseCostQuery(query).valid, false);
  }
});

test('cost series fills missing months and aggregates quarters without double counting', () => {
  assert.equal(typeof analytics.buildCostSeries, 'function');
  const repairs = [{ _id: 1, cost: 100 }, { _id: 3, cost: 50 }, { _id: 12, cost: 70 }];
  const parts = [{ _id: 1, cost: 30 }, { _id: 4, cost: 20 }];
  const monthly = analytics.buildCostSeries(2026, 'month', repairs, parts);
  assert.equal(monthly.length, 12);
  assert.equal(monthly[0].totalCost, 130);
  assert.equal(monthly[1].totalCost, 0);
  const quarterly = analytics.buildCostSeries(2026, 'quarter', repairs, parts);
  assert.equal(quarterly.length, 4);
  assert.deepEqual(quarterly.map(row => row.totalCost), [180, 20, 0, 70]);
});

test('health uses age and actual failure count; unknown dates and zero failures stay explicit', () => {
  assert.equal(typeof analytics.calculateEquipmentHealth, 'function');
  const now = new Date('2026-10-20T00:00:00Z');
  const item = { code: 'E1', purchase_date: '2026-07-22T00:00:00Z', failureCount: 3 };
  const health = analytics.calculateEquipmentHealth(item, now);
  assert.equal(health.ageDays, 90);
  assert.equal(health.mtbfDays, 30);
  assert.equal(health.healthScore, 50);
  assert.equal(analytics.calculateEquipmentHealth({ ...item, failureCount: 0 }, now).mtbfDays, null);
  assert.equal(analytics.calculateEquipmentHealth({ ...item, failureCount: 0 }, now).healthScore, 100);
  assert.equal(analytics.calculateEquipmentHealth({ purchase_date: 'bad', failureCount: 1 }, now).healthScore, null);
  assert.equal(analytics.calculateEquipmentHealth({ purchase_date: '2027-01-01', failureCount: 1 }, now).healthScore, null);
});
