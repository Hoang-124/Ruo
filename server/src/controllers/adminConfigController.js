import { NotificationTemplate } from '../models/NotificationTemplate.js';
import { AuditLog } from '../models/AuditLog.js';

export const DEFAULT_NOTIFICATION_TEMPLATES = {
  repair_assigned: {
    key: 'repair_assigned',
    name: 'Ca sửa chữa mới (Kỹ thuật viên)',
    category: 'repairs',
    subject: '[RUO UFMS] Phân công ca sửa chữa mới — Phiếu #{{ticketCode}}',
    title: 'Phân công ca sửa chữa thiết bị',
    body: 'Kính gửi {{userName}}, bạn vừa được Ban Quản Lý CSVC phân công thực hiện ca sửa chữa sự cố mới cho thiết bị {{equipmentName}} ({{equipmentCode}}) tại phòng {{roomCode}}. Hạn chót hoàn thành cam kết SLA: {{deadline}}.',
    badge_text: 'CA SỬA CHỮA MỚI',
    badge_color: '#0369A1',
    badge_bg: '#E0F2FE',
    availableVariables: [
      { tag: '{{userName}}', desc: 'Họ tên kỹ thuật viên được phân công xử lý' },
      { tag: '{{equipmentName}}', desc: 'Tên thiết bị xảy ra sự cố (VD: Máy chiếu Sony Laser 4K)' },
      { tag: '{{ticketCode}}', desc: 'Mã số phiếu sửa chữa (VD: TK-2026-089)' },
      { tag: '{{equipmentCode}}', desc: 'Mã số định danh thiết bị (VD: EQ-PRJ-01)' },
      { tag: '{{roomCode}}', desc: 'Mã phòng học / khu vực (VD: P302)' },
      { tag: '{{deadline}}', desc: 'Hạn chót cam kết hoàn thành SLA' },
      { tag: '{{priority}}', desc: 'Mức độ ưu tiên (Khẩn Cấp / Cao / Bình Thường)' }
    ]
  },
  approval_request: {
    key: 'approval_request',
    name: 'Duyệt phiếu (Điều chuyển / Thanh lý)',
    category: 'approvals',
    subject: '[RUO UFMS] Yêu cầu duyệt phiếu {{requestType}} — #{{requestCode}}',
    title: 'Hồ sơ cơ sở vật chất đang chờ phê duyệt',
    body: 'Kính gửi {{userName}}, hệ thống vừa tiếp nhận yêu cầu {{requestType}} mã #{{requestCode}} đối với thiết bị {{equipmentName}}. Nội dung: {{summary}}. Kính đề nghị Quản lý kiểm tra và duyệt hồ sơ kịp thời.',
    badge_text: 'CẦN PHÊ DUYỆT',
    badge_color: '#D97706',
    badge_bg: '#FEF3C7',
    availableVariables: [
      { tag: '{{userName}}', desc: 'Họ tên cán bộ duyệt hoặc người nhận thông báo' },
      { tag: '{{equipmentName}}', desc: 'Tên thiết bị liên quan đến yêu cầu' },
      { tag: '{{requestType}}', desc: 'Loại hồ sơ (Điều chuyển thiết bị / Đề xuất thanh lý)' },
      { tag: '{{requestCode}}', desc: 'Mã số hồ sơ (VD: DC-2026-004)' },
      { tag: '{{requesterName}}', desc: 'Họ tên cán bộ gửi đề xuất' },
      { tag: '{{summary}}', desc: 'Tóm tắt nội dung đề xuất' }
    ]
  },
  deadline_overdue: {
    key: 'deadline_overdue',
    name: 'Cảnh báo deadline & vi phạm SLA',
    category: 'deadlines',
    subject: '[RUO UFMS] 🚨 CẢNH BÁO QUÁ HẠN SLA — Phiếu #{{ticketCode}}',
    title: 'Phiếu sửa chữa đã vượt quá thời hạn cam kết SLA',
    body: 'Kính gửi {{userName}}, ca sửa chữa mã phiếu #{{ticketCode}} đối với thiết bị {{equipmentName}} ({{equipmentCode}}) tại phòng {{roomCode}} đã vượt quá thời hạn hoàn thành quy định. Vui lòng kiểm tra khẩn cấp và cập nhật tiến độ.',
    badge_text: 'QUÁ HẠN SLA',
    badge_color: '#DC2626',
    badge_bg: '#FEE2E2',
    availableVariables: [
      { tag: '{{userName}}', desc: 'Họ tên cán bộ / kỹ thuật viên phụ trách' },
      { tag: '{{equipmentName}}', desc: 'Tên thiết bị đang quá hạn cam kết' },
      { tag: '{{ticketCode}}', desc: 'Mã số phiếu sửa chữa' },
      { tag: '{{equipmentCode}}', desc: 'Mã định danh thiết bị' },
      { tag: '{{roomCode}}', desc: 'Mã phòng học xảy ra sự cố' },
      { tag: '{{hoursOverdue}}', desc: 'Số giờ trễ hạn tính đến hiện tại' }
    ]
  },
  password_reset: {
    key: 'password_reset',
    name: 'Mã OTP khôi phục mật khẩu',
    category: 'auth',
    subject: '[RUO UFMS] Mã xác thực OTP khôi phục mật khẩu tài khoản',
    title: 'Yêu cầu đặt lại mật khẩu tài khoản',
    body: 'Kính gửi {{userName}}, hệ thống nhận được yêu cầu cấp lại mật khẩu truy cập hệ thống CSVC cho địa chỉ email {{email}}. Mã OTP xác thực của bạn là: {{otp}} (Hiệu lực: {{expiryMinutes}} phút).',
    badge_text: 'BẢO MẬT TÀI KHOẢN',
    badge_color: '#1E3A8A',
    badge_bg: '#EFF6FF',
    availableVariables: [
      { tag: '{{userName}}', desc: 'Họ tên hoặc email của chủ tài khoản' },
      { tag: '{{email}}', desc: 'Địa chỉ email tài khoản' },
      { tag: '{{otp}}', desc: 'Mã số OTP ngẫu nhiên 6 chữ số' },
      { tag: '{{expiryMinutes}}', desc: 'Thời gian hiệu lực (phút)' }
    ]
  },
  disposal_proposal: {
    key: 'disposal_proposal',
    name: 'Đề xuất thanh lý tài sản',
    category: 'disposals',
    subject: '[RUO UFMS] Đề xuất thanh lý tài sản {{equipmentCode}} — Cần phê duyệt',
    title: 'Hồ sơ đề xuất thanh lý tài sản cơ sở vật chất',
    body: 'Kính gửi {{userName}}, hệ thống tiếp nhận đề xuất thanh lý thiết bị {{equipmentName}} (Mã: {{equipmentCode}}). Lý do: {{reason}}. Giá trị thu hồi dự kiến: {{recoveryValue}} VNĐ.',
    badge_text: 'ĐỀ XUẤT THANH LÝ',
    badge_color: '#B45309',
    badge_bg: '#FEF3C7',
    availableVariables: [
      { tag: '{{userName}}', desc: 'Họ tên cán bộ đề xuất / người nhận thông báo' },
      { tag: '{{equipmentName}}', desc: 'Tên thiết bị đề xuất thanh lý' },
      { tag: '{{equipmentCode}}', desc: 'Mã số định danh thiết bị' },
      { tag: '{{reason}}', desc: 'Lý do đề xuất thanh lý thiết bị' },
      { tag: '{{recoveryValue}}', desc: 'Giá trị thu hồi dự kiến (VNĐ)' }
    ]
  }
};

/**
 * Standardized placeholder extractor
 */
export const extractPlaceholders = (templateStr = '') => {
  if (!templateStr || typeof templateStr !== 'string') return [];
  const matches = templateStr.match(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g);
  if (!matches) return [];
  return [...new Set(matches.map((m) => m.replace(/[\{\}\s]/g, '')))];
};

/**
 * Replace {{variable}} tags in a template string with actual values.
 * Standardized across camelCase and snake_case aliases (UC-9.4).
 */
export const interpolateTemplate = (templateStr = '', variables = {}) => {
  if (!templateStr || typeof templateStr !== 'string') return '';
  return templateStr.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, rawKey) => {
    // 1. Direct match
    if (variables[rawKey] !== undefined && variables[rawKey] !== null) {
      return String(variables[rawKey]);
    }

    // 2. Transformed camelCase <-> snake_case aliases
    const snakeKey = rawKey.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`).replace(/^_/, '');
    const camelKey = rawKey.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());

    if (variables[snakeKey] !== undefined && variables[snakeKey] !== null) {
      return String(variables[snakeKey]);
    }
    if (variables[camelKey] !== undefined && variables[camelKey] !== null) {
      return String(variables[camelKey]);
    }

    // 3. Normalized semantic aliases for standard placeholders
    if (['userName', 'user_name'].includes(rawKey)) {
      const userVal =
        variables.userName ||
        variables.user_name ||
        variables.technicianName ||
        variables.technician_name ||
        variables.recipientName ||
        variables.recipient_name ||
        variables.requesterName ||
        variables.requester_name ||
        variables.managerName ||
        variables.manager_name ||
        variables.full_name ||
        variables.name;
      if (userVal !== undefined && userVal !== null) return String(userVal);
    }

    if (['equipmentName', 'equipment_name'].includes(rawKey)) {
      const eqVal = variables.equipmentName || variables.equipment_name || variables.equipment;
      if (eqVal !== undefined && eqVal !== null) return String(eqVal);
    }

    if (['equipmentCode', 'equipment_code'].includes(rawKey)) {
      const eqCodeVal = variables.equipmentCode || variables.equipment_code;
      if (eqCodeVal !== undefined && eqCodeVal !== null) return String(eqCodeVal);
    }

    if (['ticketCode', 'ticket_code'].includes(rawKey)) {
      const tVal = variables.ticketCode || variables.ticket_code || variables.requestCode || variables.request_code;
      if (tVal !== undefined && tVal !== null) return String(tVal);
    }

    if (['roomCode', 'room_code'].includes(rawKey)) {
      const rVal = variables.roomCode || variables.room_code;
      if (rVal !== undefined && rVal !== null) return String(rVal);
    }

    return match;
  });
};

// @desc    Get all notification & email templates with customization status
// @route   GET /api/admin/config/templates
export const getNotificationTemplates = async (req, res) => {
  try {
    const customDocs = await NotificationTemplate.find({}).lean();
    const customMap = new Map(customDocs.map((doc) => [doc.key, doc]));

    const templates = Object.values(DEFAULT_NOTIFICATION_TEMPLATES).map((def) => {
      const custom = customMap.get(def.key);
      if (custom) {
        return {
          ...def,
          subject: custom.subject || def.subject,
          title: custom.title || def.title,
          body: custom.body || def.body,
          badge_text: custom.badge_text || def.badge_text,
          badge_color: custom.badge_color || def.badge_color,
          badge_bg: custom.badge_bg || def.badge_bg,
          is_customized: Boolean(custom.is_customized),
          updated_at: custom.updated_at
        };
      }
      return {
        ...def,
        is_customized: false
      };
    });

    res.json({
      success: true,
      total: templates.length,
      templates
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update notification template (Template Editor - UC-9.2/9.3)
// @route   PUT /api/admin/config/templates
export const updateNotificationTemplate = async (req, res) => {
  try {
    const { key, subject, title, body, badge_text, badge_color, badge_bg } = req.body || {};

    if (!key || !DEFAULT_NOTIFICATION_TEMPLATES[key]) {
      return res.status(400).json({
        success: false,
        message: 'Mã mẫu thông báo (template key) không hợp lệ hoặc không được hệ thống hỗ trợ.'
      });
    }

    if (!subject || !title || !body) {
      return res.status(400).json({
        success: false,
        message: 'Tiêu đề email (subject), tiêu đề thông báo (title) và nội dung (body) không được để trống.'
      });
    }

    const defaultMeta = DEFAULT_NOTIFICATION_TEMPLATES[key];

    const updated = await NotificationTemplate.findOneAndUpdate(
      { key },
      {
        key,
        name: defaultMeta.name,
        category: defaultMeta.category,
        subject: subject.trim(),
        title: title.trim(),
        body: body.trim(),
        badge_text: badge_text ? badge_text.trim() : defaultMeta.badge_text,
        badge_color: badge_color || defaultMeta.badge_color,
        badge_bg: badge_bg || defaultMeta.badge_bg,
        is_customized: true
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.json({
      success: true,
      message: `Đã lưu mẫu thông báo "${defaultMeta.name}" thành công.`,
      template: {
        ...defaultMeta,
        subject: updated.subject,
        title: updated.title,
        body: updated.body,
        badge_text: updated.badge_text,
        badge_color: updated.badge_color,
        badge_bg: updated.badge_bg,
        is_customized: true,
        updated_at: updated.updated_at
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Reset notification template to institutional defaults
// @route   POST /api/admin/config/templates/reset
export const resetNotificationTemplate = async (req, res) => {
  try {
    const { key } = req.body || {};

    if (key) {
      await NotificationTemplate.deleteOne({ key });
      const def = DEFAULT_NOTIFICATION_TEMPLATES[key];
      return res.json({
        success: true,
        message: `Đã khôi phục mẫu thông báo "${def?.name || key}" về mặc định của viện.`,
        template: def ? { ...def, is_customized: false } : null
      });
    }

    // Reset all
    await NotificationTemplate.deleteMany({});
    res.json({
      success: true,
      message: 'Đã khôi phục toàn bộ mẫu thông báo về cài đặt mặc định.',
      templates: Object.values(DEFAULT_NOTIFICATION_TEMPLATES).map((d) => ({ ...d, is_customized: false }))
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
