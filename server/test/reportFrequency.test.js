import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as reports from '../src/controllers/reportController.js';
import { Repair } from '../src/models/Repair.js';

const response = () => ({ code: 200, status(code) { this.code = code; return this; }, json(data) { this.body = data; } });
test('UC-8.6 rejects invalid years before querying', async () => {
  const res = response();
  await reports.getRepairFrequency({ query: { year: '2026x' } }, res);
  assert.equal(res.code, 400);
});
test('UC-8.6 groups actual incident records with historical room fallback and zero-safe totals', async (t) => {
  t.mock.method(Repair, 'aggregate', async pipeline => {
    assert.equal(pipeline[0].$match.reported_at.$gte.toISOString(), '2025-12-31T17:00:00.000Z');
    assert.ok(JSON.stringify(pipeline).includes('$room_id'));
    return [{ byCategory: [{ _id: 'c1', code: 'MC', name: 'Máy chiếu', failureCount: 4, affectedEquipment: 2 }],
      byRoom: [{ _id: 'r1', code: 'P101', name: 'Phòng học', failureCount: 4, affectedEquipment: 2 }],
      summary: [{ failureCount: 4, affectedEquipment: 2, legacyRoomCount: 1 }] }];
  });
  const res = response();
  await reports.getRepairFrequency({ query: { year: '2026' } }, res);
  assert.equal(res.code, 200);
  assert.equal(res.body.byCategory[0].incidentsPerEquipment, 2);
  assert.equal(res.body.summary.legacyRoomCount, 1);
});
