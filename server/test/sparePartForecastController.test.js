import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getSparePartForecast } from '../src/controllers/sparePartController.js';
import { SparePart } from '../src/models/SparePart.js';
import { PartsRequest } from '../src/models/PartsRequest.js';

const query = (value) => {
  const result = Promise.resolve(value);
  for (const method of ['populate', 'select', 'sort', 'limit', 'lean']) result[method] = () => result;
  return result;
};
const response = () => ({ statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } });

test('forecast endpoint combines catalogue, approved history and pending requests', async (t) => {
  const recent = new Date(Date.now() - 3 * 86_400_000);
  t.mock.method(SparePart, 'find', () => query([
    { _id: 'lamp', code: 'SP-LAMP', name: 'Bóng đèn máy chiếu', stock: 1, min_stock: 2, unit: 'Bóng' }
  ]));
  const filters = [];
  t.mock.method(PartsRequest, 'find', (filter) => {
    filters.push(filter);
    if (filter.status === 'approved') {
      return query(Array.from({ length: 10 }, (_, i) => ({
        approved_at: new Date(recent.getTime() - i * 7 * 86_400_000),
        items: [{ part_id: 'lamp', qty: 1 }]
      })));
    }
    return query([{ items: [{ part_id: 'lamp', qty: 1 }] }]);
  });

  const res = response();
  await getSparePartForecast({ query: { history_days: '120' } }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.parameters.history_days, 120);
  assert.ok(filters.some((f) => f.status === 'approved' && f.approved_at?.$gte instanceof Date));
  assert.ok(filters.some((f) => f.status === 'pending'));
  const [lamp] = res.body.forecasts;
  assert.equal(lamp.code, 'SP-LAMP');
  assert.equal(lamp.pending_qty, 1);
  assert.equal(lamp.available, 0);
  assert.ok(['critical', 'reorder'].includes(lamp.status));
  assert.ok(lamp.suggested_order_qty > 0);
});

test('forecast endpoint rejects an out-of-range history window', async () => {
  for (const history_days of ['5', '9999', 'abc']) {
    const res = response();
    await getSparePartForecast({ query: { history_days } }, res);
    assert.equal(res.statusCode, 400);
  }
});

test('forecast endpoint surfaces database failures instead of an empty forecast', async (t) => {
  t.mock.method(SparePart, 'find', () => { throw new Error('db down'); });
  t.mock.method(PartsRequest, 'find', () => query([]));
  const res = response();
  await getSparePartForecast({ query: {} }, res);
  assert.equal(res.statusCode, 500);
  assert.equal(res.body.success, false);
});
