import { test, describe } from 'node:test';
import assert from 'node:assert';
import { verifyAuditChain } from '../src/controllers/auditController.js';
import { AuditLog } from '../src/models/AuditLog.js';

describe('UC-9.4 Audit Verify Chain API Integration (GET /api/audit/verify-chain)', () => {
  test('verifyAuditChain returns valid integrity response with block count', async () => {
    const origVerifyIntegrity = AuditLog.verifyIntegrity;

    try {
      AuditLog.verifyIntegrity = async () => ({
        isValid: true,
        valid: true,
        totalLogs: 42,
        total_checked: 42,
        message: 'Toàn bộ chuỗi kiểm toán SHA-256 hoàn toàn nguyên vẹn, không có dấu hiệu chỉnh sửa.'
      });

      const req = {};
      let jsonRes = null;
      let statusCode = 200;
      const res = {
        status: (s) => {
          statusCode = s;
          return { json: (d) => { jsonRes = d; } };
        },
        json: (d) => { jsonRes = d; }
      };

      await verifyAuditChain(req, res);

      assert.strictEqual(statusCode, 200);
      assert.strictEqual(jsonRes.success, true);
      assert.ok(jsonRes.verification);
      assert.strictEqual(jsonRes.verification.isValid, true);
      assert.strictEqual(jsonRes.verification.totalLogs, 42);
      assert.ok(jsonRes.verification.message.includes('nguyên vẹn'));
    } finally {
      AuditLog.verifyIntegrity = origVerifyIntegrity;
    }
  });

  test('verifyAuditChain handles empty or freshly initialized audit collection gracefully', async () => {
    const origVerifyIntegrity = AuditLog.verifyIntegrity;

    try {
      AuditLog.verifyIntegrity = async () => ({
        isValid: true,
        totalLogs: 0,
        message: 'Nhật ký kiểm toán chưa có bản ghi nào.'
      });

      let jsonRes = null;
      const res = { json: (d) => { jsonRes = d; } };

      await verifyAuditChain({}, res);

      assert.strictEqual(jsonRes.success, true);
      assert.strictEqual(jsonRes.verification.isValid, true);
      assert.strictEqual(jsonRes.verification.totalLogs, 0);
    } finally {
      AuditLog.verifyIntegrity = origVerifyIntegrity;
    }
  });
});
