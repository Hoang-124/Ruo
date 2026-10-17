import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { summarizeRoomEquipment, isOpenRepair } from '../src/services/roomDetail.js';

describe('summarizeRoomEquipment (UC-2.3)', () => {
  test('returns zeroed counters for an empty room', () => {
    const summary = summarizeRoomEquipment([], []);
    assert.equal(summary.equipmentCount, 0);
    assert.equal(summary.needsAttention, 0);
    assert.equal(summary.openRepairs, 0);
    assert.equal(summary.byStatus.in_use, 0);
    assert.equal(summary.byStatus.disposed, 0);
  });

  test('counts equipment per status and flags items needing attention', () => {
    const summary = summarizeRoomEquipment(
      [{ status: 'in_use' }, { status: 'in_use' }, { status: 'broken' }, { status: 'repairing' }, { status: 'lost' }],
      []
    );
    assert.equal(summary.equipmentCount, 5);
    assert.equal(summary.byStatus.in_use, 2);
    assert.equal(summary.byStatus.lost, 1);
    assert.equal(summary.needsAttention, 2);
  });

  test('ignores unknown equipment statuses instead of crashing', () => {
    const summary = summarizeRoomEquipment([{ status: 'mystery' }, { status: 'in_use' }], []);
    assert.equal(summary.equipmentCount, 2);
    assert.equal(summary.byStatus.in_use, 1);
  });

  test('counts only unresolved repair tickets as open', () => {
    const repairs = [
      { status: 'reported' }, { status: 'assigned' }, { status: 'in_progress' },
      { status: 'resolved' }, { status: 'closed' }, { status: 'unrepairable' }
    ];
    assert.equal(summarizeRoomEquipment([], repairs).openRepairs, 3);
    assert.equal(isOpenRepair({ status: 'closed' }), false);
    assert.equal(isOpenRepair(undefined), false);
  });
});
