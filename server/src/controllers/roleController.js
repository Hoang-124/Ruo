import mongoose from 'mongoose';
import { Role } from '../models/Role.js';
import { AuditLog } from '../models/AuditLog.js';
import { USER_ROLES } from '../config/constants.js';

export const DEFAULT_CANONICAL_ROLES = {
  [USER_ROLES.LECTURER]: {
    title: 'Giảng Viên & Cán Bộ Sử Dụng',
    description: 'Tra cứu thiết bị phòng học, báo hỏng sự cố tại chỗ, theo dõi tiến độ và đánh giá nghiệm thu.',
    permissions: [
      'user:profile:read',
      'room:read',
      'equipment:read',
      'incident:create',
      'incident:read_own',
      'repair:rate'
    ]
  },
  [USER_ROLES.TECHNICIAN]: {
    title: 'Kỹ Thuật Viên Vận Hành & Sửa Chữa',
    description: 'Tiếp nhận ca sửa, xin cấp phát linh kiện, xác nhận di chuyển thực địa và quét mã QR kiểm kê.',
    permissions: [
      'user:profile:read',
      'room:read',
      'equipment:read',
      'equipment:qr:scan',
      'movement:confirm',
      'repair:read_assigned',
      'repair:accept',
      'repair:log',
      'repair:report_outcome',
      'parts:request',
      'inventory:scan'
    ]
  },
  [USER_ROLES.FACILITY_MANAGER]: {
    title: 'Cán Bộ Quản Lý Cơ Sở Vật Chất (FM)',
    description: 'Điều phối ca sửa chữa Kanban SLA, cấp phát linh kiện kho, ra lệnh điều chuyển, kiểm kê và lập đề xuất thanh lý R>=60%.',
    permissions: [
      'user:profile:read',
      'room:read',
      'equipment:read',
      'equipment:create',
      'equipment:update',
      'equipment:import',
      'equipment:qr:generate',
      'warranty:read',
      'warranty:update',
      'movement:order',
      'placement:decide',
      'repair:read',
      'repair:assign',
      'repair:close',
      'parts:approve',
      'spare_part:update',
      'inventory:create',
      'inventory:reconcile',
      'disposal:propose',
      'dashboard:read'
    ]
  },
  [USER_ROLES.ADMIN]: {
    title: 'Ban Giám Hiệu & Quản Trị Hệ Thống',
    description: 'Toàn quyền cấu hình người dùng, phê duyệt chức vụ, ma trận phân quyền RBAC, danh mục hệ thống, phê duyệt thanh lý cuối và kiểm toán SHA-256.',
    permissions: [
      'user:profile:read',
      'user:create',
      'user:update',
      'user:lock',
      'user:reset_password',
      'user:approve',
      'role:update',
      'room:read',
      'room:*',
      'category:*',
      'supplier:*',
      'repair_unit:*',
      'equipment:read',
      'disposal:approve',
      'dashboard:read',
      'report:export',
      'audit:read',
      'audit:verify',
      'audit:export',
      'system:health'
    ]
  }
};

// @desc    Get all roles and permissions (UC-12.1: View role permissions)
// @route   GET /api/roles or GET /api/admin/roles
export const getRoles = async (req, res) => {
  try {
    let roles = await Role.find();

    // Auto-seed canonical roles if missing
    if (!roles || roles.length < 4) {
      for (const [rKey, rVal] of Object.entries(DEFAULT_CANONICAL_ROLES)) {
        await Role.findOneAndUpdate(
          { name: rKey },
          {
            $setOnInsert: {
              name: rKey,
              title: rVal.title,
              description: rVal.description,
              permissions: rVal.permissions
            }
          },
          { upsert: true, new: true }
        );
      }
      roles = await Role.find();
    }

    res.json({
      success: true,
      roles
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Configure single role permissions (UC-12.2: Configure role permissions - Admin Only)
// @route   PUT /api/roles/:id
export const updateRolePermissions = async (req, res) => {
  try {
    const { permissions } = req.body;
    if (!Array.isArray(permissions)) {
      return res.status(400).json({ success: false, message: 'Danh sách quyền phải là một mảng chuỗi.' });
    }

    let role = null;
    if (mongoose.Types.ObjectId.isValid(req.params.id)) {
      role = await Role.findById(req.params.id);
    }
    if (!role) {
      role = await Role.findOne({ name: req.params.id });
    }
    if (!role) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy vai trò.' });
    }

    const oldPerms = role.permissions;
    role.permissions = permissions;
    await role.save();

    await AuditLog.logAction({
      user_id: req.user._id,
      user_display: `${req.user.full_name} (${req.user.code})`,
      action: 'UPDATE_ROLE_PERMISSIONS',
      target_table: 'roles',
      entity_id: role._id.toString(),
      ip_address: req.ip || '127.0.0.1',
      old_value: { permissions: oldPerms },
      new_value: { permissions: role.permissions }
    });

    res.json({
      success: true,
      message: `Cập nhật ma trận phân quyền cho vai trò [${role.name}] thành công.`,
      role
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Batch update multiple roles permissions (Admin Only)
// @route   POST /api/roles/batch-update
export const batchUpdateRoles = async (req, res) => {
  try {
    const { roles } = req.body;
    if (!Array.isArray(roles)) {
      return res.status(400).json({ success: false, message: 'Dữ liệu gửi lên phải là mảng danh sách vai trò (roles).' });
    }

    const updatedRoles = [];
    const changeSummary = [];

    for (const item of roles) {
      if (!item.name || !Array.isArray(item.permissions)) continue;
      const role = await Role.findOneAndUpdate(
        { name: item.name },
        { permissions: item.permissions },
        { new: true, upsert: true }
      );
      updatedRoles.push(role);
      changeSummary.push({ name: role.name, permissionsCount: role.permissions.length });
    }

    await AuditLog.logAction({
      user_id: req.user._id,
      user_display: `${req.user.full_name} (${req.user.code})`,
      action: 'BATCH_UPDATE_ROLE_PERMISSIONS',
      target_table: 'roles',
      entity_id: 'batch',
      ip_address: req.ip || '127.0.0.1',
      new_value: { changeSummary }
    });

    res.json({
      success: true,
      message: 'Cập nhật toàn bộ ma trận phân quyền RBAC thành công!',
      roles: updatedRoles
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Reset all roles to canonical SoD default permissions (Admin Only)
// @route   POST /api/roles/reset-defaults
export const resetDefaultRoles = async (req, res) => {
  try {
    const updatedRoles = [];
    for (const [rKey, rVal] of Object.entries(DEFAULT_CANONICAL_ROLES)) {
      const role = await Role.findOneAndUpdate(
        { name: rKey },
        {
          permissions: rVal.permissions,
          title: rVal.title,
          description: rVal.description
        },
        { new: true, upsert: true }
      );
      updatedRoles.push(role);
    }

    await AuditLog.logAction({
      user_id: req.user._id,
      user_display: `${req.user.full_name} (${req.user.code})`,
      action: 'RESET_ROLE_PERMISSIONS_DEFAULT',
      target_table: 'roles',
      entity_id: 'all',
      ip_address: req.ip || '127.0.0.1',
      new_value: { resetAt: new Date() }
    });

    res.json({
      success: true,
      message: 'Đã khôi phục ma trận phân quyền về chuẩn mực gốc SoD thành công!',
      roles: updatedRoles
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
