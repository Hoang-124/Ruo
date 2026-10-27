import { NotificationTemplate } from '../models/NotificationTemplate.js';

export const DEFAULT_NOTIFICATION_TEMPLATES = {
  repair_assigned: {
    key: 'repair_assigned',
    name: 'Ca sửa chữa mới (Kỹ thuật viên)',
    category: 'repairs',
    subject: '[RUO UFMS] Phân công ca sửa chữa mới — Phiếu #{{ticket_code}}',
    title: 'Phân công ca sửa chữa thiết bị',
    body: 'Bạn vừa được Ban Quản Lý CSVC phân công thực hiện ca sửa chữa sự cố mới cho thiết bị {{equipment_name}} ({{equipment_code}}) tại phòng {{room_code}}. Hạn chót hoàn thành cam kết SLA: {{deadline}}.',
    badge_text: 'CA SỬA CHỮA MỚI',
    badge_color: '#0369A1',
    badge_bg: '#E0F2FE',
    availableVariables: [
      { tag: '{{ticket_code}}', desc: 'Mã số phiếu sửa chữa (VD: TK-2026-089)' },
      { tag: '{{equipment_name}}', desc: 'Tên thiết bị (VD: Máy chiếu Sony)' },
      { tag: '{{equipment_code}}', desc: 'Mã thiết bị (VD: EQ-PRJ-01)' },
      { tag: '{{room_code}}', desc: 'Mã phòng học (VD: P302)' },
      { tag: '{{deadline}}', desc: 'Hạn chót cam kết hoàn thành (VD: 17:00 ngày 21/10)' },
      { tag: '{{priority}}', desc: 'Mức độ ưu tiên (Khẩn Cấp / Cao / Bình Thường)' }
    ]
  },
  approval_request: {
    key: 'approval_request',
    name: 'Duyệt phiếu (Điều chuyển / Thanh lý)',
    category: 'approvals',
    subject: '[RUO UFMS] Yêu cầu duyệt phiếu {{request_type}} — #{{request_code}}',
    title: 'Hồ sơ cơ sở vật chất đang chờ phê duyệt',
    body: 'Hệ thống vừa tiếp nhận yêu cầu {{request_type}} mã #{{request_code}} từ cán bộ {{requester_name}}. Nội dung: {{summary}}. Kính đề nghị Quản lý kiểm tra và duyệt hồ sơ kịp thời.',
    badge_text: 'CẦN PHÊ DUYỆT',
    badge_color: '#D97706',
    badge_bg: '#FEF3C7',
    availableVariables: [
      { tag: '{{request_type}}', desc: 'Loại hồ sơ (Điều chuyển thiết bị / Đề xuất thanh lý)' },
      { tag: '{{request_code}}', desc: 'Mã số hồ sơ (VD: DC-2026-004)' },
      { tag: '{{requester_name}}', desc: 'Họ tên cán bộ gửi đề xuất' },
      { tag: '{{summary}}', desc: 'Tóm tắt nội dung đề xuất' }
    ]
  },
  deadline_overdue: {
    key: 'deadline_overdue',
    name: 'Cảnh báo deadline & vi phạm SLA',
    category: 'deadlines',
    subject: '[RUO UFMS] 🚨 CẢNH BÁO QUÁ HẠN SLA — Phiếu #{{ticket_code}}',
    title: 'Phiếu sửa chữa đã vượt quá thời hạn cam kết SLA',
    body: 'Ca sửa chữa mã phiếu #{{ticket_code}} đối với thiết bị {{equipment_code}} tại phòng {{room_code}} đã vượt quá thời hạn hoàn thành quy định. Vui lòng kiểm tra khẩn cấp và cập nhật tiến độ.',
    badge_text: 'QUÁ HẠN SLA',
    badge_color: '#DC2626',
    badge_bg: '#FEE2E2',
    availableVariables: [
      { tag: '{{ticket_code}}', desc: 'Mã số phiếu sửa chữa' },
      { tag: '{{equipment_code}}', desc: 'Mã thiết bị quá hạn' },
      { tag: '{{room_code}}', desc: 'Mã phòng học xảy ra sự cố' },
      { tag: '{{hours_overdue}}', desc: 'Số giờ trễ hạn tính đến hiện tại' }
    ]
  },
  password_reset: {
    key: 'password_reset',
    name: 'Mã OTP khôi phục mật khẩu',
    category: 'auth',
    subject: '[RUO UFMS] Mã xác thực OTP khôi phục mật khẩu tài khoản',
    title: 'Yêu cầu đặt lại mật khẩu tài khoản',
    body: 'Hệ thống nhận được yêu cầu cấp lại mật khẩu truy cập hệ thống CSVC cho địa chỉ email {{email}}. Mã OTP xác thực của bạn là: {{otp}} (Hiệu lực: 15 phút).',
    badge_text: 'BẢO MẬT TÀI KHOẢN',
    badge_color: '#1E3A8A',
    badge_bg: '#EFF6FF',
    availableVariables: [
      { tag: '{{email}}', desc: 'Địa chỉ email tài khoản' },
      { tag: '{{otp}}', desc: 'Mã số OTP ngẫu nhiên 6 chữ số' },
      { tag: '{{expiry_minutes}}', desc: 'Thời gian hiệu lực (15 phút)' }
    ]
  }
};

/**
 * Replace {{variable}} tags in a template string with actual values
 */
export const interpolateTemplate = (templateStr = '', variables = {}) => {
  return templateStr.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, key) => {
    return variables[key] !== undefined && variables[key] !== null ? String(variables[key]) : match;
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
