import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { assertTransition } from '../src/domain/stateMachines.js';
import { DISPOSAL_STATUSES, USER_ROLES } from '../src/config/constants.js';
import { calculateDisposalRatio } from '../src/controllers/disposalController.js';
import { DEFAULT_CANONICAL_ROLES } from '../src/controllers/roleController.js';
import { DISPOSAL_WORKFLOW_PERMISSION } from '../src/routes/disposalRoutes.js';

describe('RACI disposal workflow (UC-7.7–7.11)', () => {
  test('uses repair cost divided by original value and applies the 60% threshold exactly', () => {
    assert.equal(calculateDisposalRatio(180, 300), 60);
    assert.equal(calculateDisposalRatio(179.97, 300), 59.99);
    assert.ok(calculateDisposalRatio(179.999, 300) < 60);
    assert.equal(calculateDisposalRatio(250, 0), 0);
  });

  test('allows each stage only for its assigned role', () => {
    assert.equal(
      assertTransition('DISPOSAL', DISPOSAL_STATUSES.PROPOSED, DISPOSAL_STATUSES.HC_APPROVED, USER_ROLES.FACILITY_MANAGER),
      true
    );
    assert.equal(
      assertTransition('DISPOSAL', DISPOSAL_STATUSES.HC_APPROVED, DISPOSAL_STATUSES.BGH_APPROVED, USER_ROLES.ADMIN),
      true
    );
    assert.equal(
      assertTransition('DISPOSAL', DISPOSAL_STATUSES.BGH_APPROVED, DISPOSAL_STATUSES.PROCUREMENT_PLANNED, USER_ROLES.FACILITY_MANAGER),
      true
    );
    assert.equal(
      assertTransition('DISPOSAL', DISPOSAL_STATUSES.PROCUREMENT_PLANNED, DISPOSAL_STATUSES.COMPLETED, USER_ROLES.TECHNICIAN),
      true
    );
  });

  test('grants technicians the permission required to submit disposal proposals', () => {
    assert.equal(DISPOSAL_WORKFLOW_PERMISSION, 'disposal:propose');
    assert.ok(DEFAULT_CANONICAL_ROLES[USER_ROLES.TECHNICIAN].permissions.includes(DISPOSAL_WORKFLOW_PERMISSION));
    assert.ok(DEFAULT_CANONICAL_ROLES[USER_ROLES.FACILITY_MANAGER].permissions.includes(DISPOSAL_WORKFLOW_PERMISSION));
  });

  test('does not allow skipping CSVC, BGH, or procurement steps', () => {
    assert.throws(
      () => assertTransition('DISPOSAL', DISPOSAL_STATUSES.PROPOSED, DISPOSAL_STATUSES.BGH_APPROVED, USER_ROLES.ADMIN),
      { statusCode: 409 }
    );
    assert.throws(
      () => assertTransition('DISPOSAL', DISPOSAL_STATUSES.HC_APPROVED, DISPOSAL_STATUSES.PROCUREMENT_PLANNED, USER_ROLES.FACILITY_MANAGER),
      { statusCode: 409 }
    );
    assert.throws(
      () => assertTransition('DISPOSAL', DISPOSAL_STATUSES.BGH_APPROVED, DISPOSAL_STATUSES.COMPLETED, USER_ROLES.TECHNICIAN),
      { statusCode: 409 }
    );
  });

  test('does not let a role perform another RACI role’s approval step', () => {
    assert.throws(
      () => assertTransition('DISPOSAL', DISPOSAL_STATUSES.PROPOSED, DISPOSAL_STATUSES.HC_APPROVED, USER_ROLES.TECHNICIAN),
      { statusCode: 403 }
    );
    assert.throws(
      () => assertTransition('DISPOSAL', DISPOSAL_STATUSES.HC_APPROVED, DISPOSAL_STATUSES.BGH_APPROVED, USER_ROLES.FACILITY_MANAGER),
      { statusCode: 403 }
    );
    assert.throws(
      () => assertTransition('DISPOSAL', DISPOSAL_STATUSES.PROCUREMENT_PLANNED, DISPOSAL_STATUSES.COMPLETED, USER_ROLES.FACILITY_MANAGER),
      { statusCode: 403 }
    );
  });

  test('only allows rejection during the CSVC and BGH review stages', () => {
    assert.equal(
      assertTransition('DISPOSAL', DISPOSAL_STATUSES.PROPOSED, DISPOSAL_STATUSES.REJECTED, USER_ROLES.FACILITY_MANAGER),
      true
    );
    assert.equal(
      assertTransition('DISPOSAL', DISPOSAL_STATUSES.HC_APPROVED, DISPOSAL_STATUSES.REJECTED, USER_ROLES.ADMIN),
      true
    );
    assert.throws(
      () => assertTransition('DISPOSAL', DISPOSAL_STATUSES.PROCUREMENT_PLANNED, DISPOSAL_STATUSES.REJECTED, USER_ROLES.ADMIN),
      { statusCode: 409 }
    );
  });
});
