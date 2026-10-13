import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { summarizeCadRoom } from '../src/services/cadCanvas.js';

const eq = (code, status) => ({ code, name: `TB ${code}`, status });

describe('summarizeCadRoom (UC-2.7)', () => {
  test('counts equipment and broken equipment for the pod card', () => {
    const result = summarizeCadRoom({ status: 'available' }, [
      eq('E1', 'in_use'), eq('E2', 'broken'), eq('E3', 'repairing'), eq('E4', 'in_stock')
    ]);
    assert.equal(result.equipmentCount, 4);
    assert.equal(result.brokenCount, 2);
    assert.equal(result.effectiveStatus, 'maintenance');
  });

  test('keeps the stored status when everything is healthy', () => {
    const result = summarizeCadRoom({ status: 'available' }, [eq('E1', 'in_use')]);
    assert.equal(result.brokenCount, 0);
    assert.equal(result.effectiveStatus, 'available');
  });

  test('ignores disposed and lost equipment', () => {
    const result = summarizeCadRoom({ status: 'available' }, [eq('E1', 'disposed'), eq('E2', 'lost'), eq('E3', 'in_use')]);
    assert.equal(result.equipmentCount, 1);
    assert.deepEqual(result.equipments.map((item) => item.code), ['E3']);
  });

  test('an inactive room stays inactive and a maintenance room stays maintenance', () => {
    assert.equal(summarizeCadRoom({ status: 'inactive' }, [eq('E1', 'broken')]).effectiveStatus, 'inactive');
    assert.equal(summarizeCadRoom({ status: 'maintenance' }, []).effectiveStatus, 'maintenance');
  });

  test('handles an empty room and missing input', () => {
    assert.deepEqual(summarizeCadRoom({ status: 'available' }, []), {
      equipments: [], equipmentCount: 0, brokenCount: 0, effectiveStatus: 'available'
    });
    assert.equal(summarizeCadRoom().effectiveStatus, 'available');
  });
});
