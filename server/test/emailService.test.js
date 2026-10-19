import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert';
import {
  buildInstitutionalEmailHtml,
  sendEmail,
  sendNewRepairAssignedEmail,
  sendApprovalRequestEmail,
  sendDeadlineWarningEmail,
  getEmailQueue,
  clearEmailQueue
} from '../src/services/emailService.js';

describe('emailService (UC-9.1 - Transactional Email Engine)', () => {
  beforeEach(() => {
    clearEmailQueue();
  });

  test('buildInstitutionalEmailHtml generates structured, valid HTML with branding and details', () => {
    const html = buildInstitutionalEmailHtml({
      title: 'Kiểm tra hệ thống email',
      recipientName: 'Kỹ sư Hoàng',
      badge: { text: 'THỬ NGHIỆM', color: '#10B981', bg: '#D1FAE5' },
      details: [
        { label: 'Phòng', value: 'P302' },
        { label: 'Thiết bị', value: 'TB-PROJ-01' }
      ],
      alertNotice: {
        title: 'Cảnh báo khẩn',
        message: 'Cần kiểm tra trước 12h'
      }
    });

    assert.ok(html.includes('RUO UFMS'), 'Phải chứa tên hệ thống RUO UFMS');
    assert.ok(html.includes('THỬ NGHIỆM'), 'Phải chứa badge');
    assert.ok(html.includes('Kỹ sư Hoàng'), 'Phải chứa tên người nhận');
    assert.ok(html.includes('P302'), 'Phải chứa thông tin phòng');
    assert.ok(html.includes('Cảnh báo khẩn'), 'Phải chứa thông báo khẩn');
  });

  test('sendEmail enqueues payload safely when SMTP is offline or mocked', async () => {
    const result = await sendEmail({
      to: 'technician@ruo.edu.vn',
      subject: 'Thông báo ca trực mới',
      html: '<p>Nội dung kiểm tra</p>'
    });

    assert.strictEqual(result.success, true);
    assert.ok(result.queueId, 'Phải có queueId');

    const history = getEmailQueue();
    assert.strictEqual(history.length, 1);
    assert.strictEqual(history[0].to, 'technician@ruo.edu.vn');
    assert.strictEqual(history[0].subject, 'Thông báo ca trực mới');
  });

  test('sendEmail rejects invalid or empty recipient email gracefully', async () => {
    const result = await sendEmail({
      to: '',
      subject: 'Test missing email'
    });

    assert.strictEqual(result.success, false);
    assert.ok(result.message.includes('không hợp lệ'));
  });

  test('sendNewRepairAssignedEmail creates institutional assignment notification email', async () => {
    const result = await sendNewRepairAssignedEmail({
      to: 'ktv.uyen@ruo.edu.vn',
      technicianName: 'Lê Uyên',
      ticketCode: 'TK-2026-089',
      equipmentCode: 'EQ-MIC-04',
      equipmentName: 'Micro Không Dây Shure',
      roomCode: 'P204',
      priority: 'Khẩn Cấp',
      deadline: '17:00 ngày 21/10/2026',
      description: 'Micro bị rè tiếng khi giảng viên dạy học'
    });

    assert.strictEqual(result.success, true);
    const history = getEmailQueue();
    assert.strictEqual(history.length, 1);
    assert.strictEqual(history[0].to, 'ktv.uyen@ruo.edu.vn');
    assert.ok(history[0].subject.includes('TK-2026-089'));
    assert.strictEqual(history[0].category, 'REPAIR_ASSIGNED');
  });

  test('sendApprovalRequestEmail creates approval workflow notification email', async () => {
    const result = await sendApprovalRequestEmail({
      to: 'manager@ruo.edu.vn',
      managerName: 'Quản lý Nguyễn',
      requestType: 'Điều chuyển thiết bị',
      requestCode: 'DC-2026-004',
      requesterName: 'Nguyễn Văn B',
      summary: 'Chuyển máy chiếu từ kho vào phòng P301'
    });

    assert.strictEqual(result.success, true);
    const history = getEmailQueue();
    assert.strictEqual(history.length, 1);
    assert.strictEqual(history[0].category, 'APPROVAL_REQUEST');
    assert.ok(history[0].subject.includes('DC-2026-004'));
  });

  test('sendDeadlineWarningEmail sends deadline alerts and overdue warnings correctly', async () => {
    // 1. Warning before overdue
    const warningRes = await sendDeadlineWarningEmail({
      to: 'ktv@ruo.edu.vn',
      recipientName: 'KTV Nam',
      ticketCode: 'TK-2026-010',
      equipmentCode: 'EQ-AC-02',
      roomCode: 'P102',
      hoursRemaining: 2,
      isOverdue: false
    });
    assert.strictEqual(warningRes.success, true);

    // 2. Overdue SLA breach
    const overdueRes = await sendDeadlineWarningEmail({
      to: 'manager@ruo.edu.vn',
      recipientName: 'Manager Lan',
      ticketCode: 'TK-2026-010',
      equipmentCode: 'EQ-AC-02',
      roomCode: 'P102',
      isOverdue: true
    });
    assert.strictEqual(overdueRes.success, true);

    const history = getEmailQueue();
    assert.strictEqual(history.length, 2);
    assert.strictEqual(history[0].category, 'DEADLINE_OVERDUE');
    assert.strictEqual(history[1].category, 'DEADLINE_WARNING');
  });
});
