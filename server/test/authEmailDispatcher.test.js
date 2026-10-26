import { test, describe } from 'node:test';
import assert from 'node:assert';
import { forgotPassword } from '../src/controllers/authController.js';
import { User, PasswordReset } from '../src/models/User.js';
import { AuditLog } from '../src/models/AuditLog.js';

describe('UC-9.3 Auth OTP Email Dispatcher Integration', () => {
  test('forgotPassword triggers automated email dispatcher with audit log', async () => {
    const origFindOne = User.findOne;
    const origCountDocuments = PasswordReset.countDocuments;
    const origUpdateMany = PasswordReset.updateMany;
    const origCreate = PasswordReset.create;
    const origLogAction = AuditLog.logAction;

    let auditLogged = null;

    try {
      User.findOne = async () => ({
        _id: 'user_otp_123',
        email: 'giangvien@ruo.edu.vn',
        full_name: 'Giảng Viên Test'
      });

      PasswordReset.countDocuments = async () => 0;
      PasswordReset.updateMany = async () => ({ modifiedCount: 1 });
      PasswordReset.create = async () => ({ _id: 'pr_123' });

      AuditLog.logAction = async (payload) => {
        auditLogged = payload;
        return { success: true };
      };

      const req = {
        body: { email: 'giangvien@ruo.edu.vn' },
        ip: '10.0.0.1'
      };

      let jsonRes = null;
      const res = {
        json: (d) => { jsonRes = d; }
      };

      await forgotPassword(req, res);

      assert.strictEqual(jsonRes.success, true);
      assert.ok(jsonRes.message.includes('Mã xác thực OTP'));
      assert.ok(auditLogged, 'Audit log must record the email dispatch');
      assert.strictEqual(auditLogged.action, 'EMAIL_DISPATCH');
      assert.strictEqual(auditLogged.entity_id, 'giangvien@ruo.edu.vn');
      assert.strictEqual(auditLogged.new_value.category, 'AUTH_OTP');
    } finally {
      User.findOne = origFindOne;
      PasswordReset.countDocuments = origCountDocuments;
      PasswordReset.updateMany = origUpdateMany;
      PasswordReset.create = origCreate;
      AuditLog.logAction = origLogAction;
    }
  });
});
