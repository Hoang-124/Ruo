import { test } from 'node:test';
import assert from 'node:assert/strict';
import auditRoutes from '../src/routes/auditRoutes.js';
import { AuditLog } from '../src/models/AuditLog.js';

test('audit AI respects revoked audit-read permission for an administrator', async (t) => {
  const verify = t.mock.method(AuditLog, 'verifyIntegrity', async () => ({ isValid: true, totalLogs: 0 }));
  t.mock.method(AuditLog, 'find', () => {
    const result = Promise.resolve([]);
    for (const method of ['sort', 'limit', 'populate']) result[method] = () => result;
    return result;
  });
  const route = auditRoutes.stack.find((layer) => layer.route?.path === '/ai-analyze').route;
  for (const [permissions, expectedStatus] of [[[], 403], [['audit:read'], 200]]) {
    const req = { body: {}, query: {}, ip: '127.0.0.1', user: { role: 'admin' }, userPermissions: permissions, userPermissionsFromDb: true };
    const res = { statusCode: 200, body: null, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
    for (const layer of route.stack) {
      let nextCalled = false;
      await layer.handle(req, res, () => { nextCalled = true; });
      if (!nextCalled) break;
    }
    assert.equal(res.statusCode, expectedStatus);
  }
  assert.equal(verify.mock.callCount(), 1);
});
