import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  crostonSba,
  buildDailyDemand,
  forecastSparePart,
  buildSparePartForecasts
} from '../src/services/sparePartForecast.js';

const DAY = 86_400_000;
const NOW = new Date('2026-11-08T12:00:00Z');
const daysAgo = (n) => new Date(NOW.getTime() - n * DAY);
const series = (length, demands) => {
  const values = new Array(length).fill(0);
  for (const [index, qty] of Object.entries(demands)) values[Number(index)] = qty;
  return values;
};

describe('Croston SBA intermittent demand rate', () => {
  test('returns 0 when there was never any demand', () => {
    assert.equal(crostonSba(series(30, {})), 0);
  });

  test('converges to size / interval for perfectly regular demand', () => {
    // 2 units every 10 days -> 0.2 units/day, SBA debiased by (1 - alpha/2)
    const regular = Array.from({ length: 180 }, (_, i) => ((i + 1) % 10 === 0 ? 2 : 0));
    assert.ok(Math.abs(crostonSba(regular, 0.1) - 0.2 * 0.95) < 0.01);
  });

  test('is not fooled by a single spike the way a naive mean of non-zero days is', () => {
    const spiky = series(180, { 20: 1, 60: 1, 100: 1, 140: 20 });
    const rate = crostonSba(spiky, 0.1);
    assert.ok(rate > 0 && rate < 24 / 180 * 2, `rate ${rate}`);
  });
});

describe('daily demand aggregation from approved parts requests', () => {
  test('buckets approved quantities per part and day, ignoring out-of-window rows', () => {
    const map = buildDailyDemand([
      { approved_at: daysAgo(1), items: [{ part_id: 'p1', qty: 2 }, { part_id: 'p2', quantity: 1 }] },
      { approved_at: daysAgo(1), items: [{ part_id: { _id: 'p1' }, qty: 3 }] },
      { approved_at: daysAgo(400), items: [{ part_id: 'p1', qty: 9 }] },
      { approved_at: null, items: [{ part_id: 'p1', qty: 9 }] }
    ], { now: NOW, historyDays: 30 });
    assert.equal(map.get('p1').reduce((a, b) => a + b, 0), 5);
    assert.equal(map.get('p1')[29], 5); // yesterday lands in the newest bucket
    assert.equal(map.get('p2')[29], 1);
  });

  test('falls back to "quantity" and ignores invalid quantities', () => {
    const map = buildDailyDemand([
      { approved_at: daysAgo(2), items: [{ part_id: 'p1', quantity: 4 }, { part_id: 'p1', qty: -3 }, { part_id: 'p1', qty: 'x' }] }
    ], { now: NOW, historyDays: 30 });
    assert.equal(map.get('p1').reduce((a, b) => a + b, 0), 4);
  });
});

describe('single part forecast', () => {
  const steady = Array.from({ length: 180 }, (_, i) => (i % 5 === 0 ? 1 : 0)); // ~0.2/day

  test('flags critical when stock runs out before a re-order can arrive', () => {
    const f = forecastSparePart({ part: { _id: 'p', stock: 1, min_stock: 5 }, series: steady, pendingQty: 0, leadTimeDays: 7 });
    assert.equal(f.status, 'critical');
    assert.ok(f.days_until_stockout <= 7);
    assert.ok(f.suggested_order_qty > 0);
    assert.equal(f.confidence, 'high');
  });

  test('pending requests are committed demand and reduce available stock', () => {
    const base = { part: { _id: 'p', stock: 10, min_stock: 2 }, series: steady, leadTimeDays: 7 };
    const free = forecastSparePart({ ...base, pendingQty: 0 });
    const committed = forecastSparePart({ ...base, pendingQty: 8 });
    assert.equal(committed.available, 2);
    assert.ok(committed.days_until_stockout < free.days_until_stockout);
  });

  test('healthy stock needs no order', () => {
    const f = forecastSparePart({ part: { _id: 'p', stock: 200, min_stock: 5 }, series: steady, pendingQty: 0, leadTimeDays: 7 });
    assert.equal(f.status, 'ok');
    assert.equal(f.suggested_order_qty, 0);
  });

  test('no history: no fabricated forecast, no min_stock suggestion', () => {
    const f = forecastSparePart({ part: { _id: 'p', stock: 8, min_stock: 5 }, series: new Array(180).fill(0), pendingQty: 0, leadTimeDays: 7 });
    assert.equal(f.status, 'no_demand');
    assert.equal(f.daily_demand, 0);
    assert.equal(f.days_until_stockout, null);
    assert.equal(f.suggested_min_stock, null);
    assert.equal(f.confidence, 'low');
  });

  test('out of stock always wins', () => {
    const f = forecastSparePart({ part: { _id: 'p', stock: 0, min_stock: 5 }, series: new Array(180).fill(0), pendingQty: 0, leadTimeDays: 7 });
    assert.equal(f.status, 'out_of_stock');
  });

  test('without history it falls back to the manual min_stock policy instead of ordering nothing', () => {
    const empty = forecastSparePart({ part: { _id: 'p', stock: 0, min_stock: 5 }, series: new Array(180).fill(0), pendingQty: 0, leadTimeDays: 7 });
    assert.equal(empty.suggested_order_qty, 5);
    assert.equal(empty.basis.policy, 'min_stock_fallback');

    const low = forecastSparePart({ part: { _id: 'p', stock: 2, min_stock: 5 }, series: new Array(180).fill(0), pendingQty: 0, leadTimeDays: 7 });
    assert.equal(low.status, 'reorder');
    assert.equal(low.suggested_order_qty, 3);

    const steadyPolicy = forecastSparePart({ part: { _id: 'p', stock: 2, min_stock: 5 }, series: [1, 0, 1, 0, 1, 0, 1], pendingQty: 0, leadTimeDays: 7 });
    assert.equal(steadyPolicy.basis.policy, 'croston_sba');
  });

  test('longer lead time raises the reorder point', () => {
    const short = forecastSparePart({ part: { _id: 'p', stock: 50 }, series: steady, pendingQty: 0, leadTimeDays: 3 });
    const long = forecastSparePart({ part: { _id: 'p', stock: 50 }, series: steady, pendingQty: 0, leadTimeDays: 30 });
    assert.ok(long.reorder_point > short.reorder_point);
  });
});

describe('catalogue forecast', () => {
  test('ranks most urgent first and summarises statuses', () => {
    const result = buildSparePartForecasts({
      now: NOW,
      parts: [
        { _id: 'ok', code: 'SP-OK', name: 'Dư', stock: 500, min_stock: 2 },
        { _id: 'empty', code: 'SP-EMPTY', name: 'Hết', stock: 0, min_stock: 2 },
        { _id: 'low', code: 'SP-LOW', name: 'Sắp hết', stock: 1, min_stock: 2, supplier_id: { lead_time_days: 14 } }
      ],
      approvedRequests: Array.from({ length: 30 }, (_, i) => ({
        approved_at: daysAgo(i * 5 + 1),
        items: [{ part_id: 'low', qty: 1 }, { part_id: 'ok', qty: 1 }]
      })),
      pendingRequests: [{ items: [{ part_id: 'ok', qty: 4 }] }]
    });
    assert.deepEqual(result.forecasts.map((f) => f.code), ['SP-EMPTY', 'SP-LOW', 'SP-OK']);
    assert.equal(result.forecasts[1].basis.lead_time_days, 14);
    assert.equal(result.forecasts[1].basis.lead_time_source, 'supplier');
    assert.equal(result.forecasts[2].pending_qty, 4);
    assert.deepEqual(result.summary, { out_of_stock: 1, critical: 1, reorder: 0, ok: 1, no_demand: 0 });
  });
});
