import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { AuditLog, GENESIS_HASH, buildHashPayload } from '../src/models/AuditLog.js';
import { exportAuditLogs } from '../src/controllers/auditController.js';

const makeChainedRecords = () => {
  const t1 = new Date('2026-10-28T08:00:00.000Z');
  const b1 = {
    seq: 1,
    previous_hash: GENESIS_HASH,
    hashed_at: t1,
    user_id: '67b000000000000000000001',
    user_display: 'Admin (AD001)',
    action: 'EQUIPMENT_CREATE',
    target_table: 'equipments',
    entity_id: 'EQ-001',
    old_value: null,
    new_value: { code: 'EQ-001', status: 'in_use' }
  };
  b1.hash_sha256 = crypto.createHash('sha256').update(buildHashPayload(b1)).digest('hex');

  const t2 = new Date('2026-10-28T08:05:00.000Z');
  const b2 = {
    seq: 2,
    previous_hash: b1.hash_sha256,
    hashed_at: t2,
    user_id: '67b000000000000000000002',
    user_display: 'Quản lý (QL001)',
    action: 'DISPOSAL_HC_APPROVE',
    target_table: 'disposals',
    entity_id: 'DISP-001',
    old_value: { status: 'proposed' },
    new_value: { status: 'hc_approved' }
  };
  b2.hash_sha256 = crypto.createHash('sha256').update(buildHashPayload(b2)).digest('hex');

  return [b1, b2];
};

describe('UC-13.1 & UC-13.2 Cryptographic SHA-256 Hash Chain Validator', () => {
  test('verifies an intact Genesis-to-tip SHA-256 chain as valid', async (t) => {
    const origFind = AuditLog.find;
    t.after(() => { AuditLog.find = origFind; });

    const records = makeChainedRecords();
    AuditLog.find = () => ({ sort: async () => records });

    const result = await AuditLog.verifyIntegrity();
    assert.equal(result.isValid, true);
    assert.equal(result.totalLogs, 2);
  });

  test('detects payload tampering via HASH_MISMATCH', async (t) => {
    const origFind = AuditLog.find;
    t.after(() => { AuditLog.find = origFind; });

    const records = makeChainedRecords();
    records[1].new_value = { status: 'bgh_approved_forged' };
    AuditLog.find = () => ({ sort: async () => records });

    const result = await AuditLog.verifyIntegrity();
    assert.equal(result.isValid, false);
    assert.equal(result.brokenAt, 2);
    assert.equal(result.reason, 'HASH_MISMATCH');
  });

  test('detects broken previous_hash link via LINK_BROKEN', async (t) => {
    const origFind = AuditLog.find;
    t.after(() => { AuditLog.find = origFind; });

    const records = makeChainedRecords();
    records[1].previous_hash = 'f'.repeat(64);
    AuditLog.find = () => ({ sort: async () => records });

    const result = await AuditLog.verifyIntegrity();
    assert.equal(result.isValid, false);
    assert.equal(result.brokenAt, 2);
    assert.equal(result.reason, 'LINK_BROKEN');
  });

  test('detects deleted block via SEQ_GAP', async (t) => {
    const origFind = AuditLog.find;
    t.after(() => { AuditLog.find = origFind; });

    const records = makeChainedRecords();
    records[1].seq = 3;
    AuditLog.find = () => ({ sort: async () => records });

    const result = await AuditLog.verifyIntegrity();
    assert.equal(result.isValid, false);
    assert.equal(result.brokenAt, 3);
    assert.equal(result.reason, 'SEQ_GAP');
  });

  test('exports UTF-8 BOM CSV with SHA-256 column on authenticated request', async (t) => {
    const origFind = AuditLog.find;
    t.after(() => { AuditLog.find = origFind; });

    const records = makeChainedRecords().map((r) => ({ ...r, created_at: r.hashed_at }));
    AuditLog.find = () => ({
      sort: () => ({
        limit: () => ({
          populate: async () => records
        })
      })
    });

    const headers = {};
    let body = '';
    const res = {
      setHeader: (k, v) => { headers[k] = v; },
      send: (payload) => { body = payload; },
      status: () => ({ json: () => {} })
    };

    await exportAuditLogs({}, res);
    assert.match(headers['Content-Type'], /text\/csv/);
    assert.match(headers['Content-Disposition'], /attachment; filename="ruo_audit_log_/);
    assert.equal(body.startsWith('\uFEFFKhối #'), true);
    assert.equal(body.includes(records[0].hash_sha256), true);
  });
});
