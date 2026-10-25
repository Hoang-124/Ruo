import mongoose from 'mongoose';
import { Role } from '../models/Role.js';
import { AuditLog } from '../models/AuditLog.js';
import { USER_ROLES } from '../config/constants.js';

export const DEFAULT_CANONICAL_ROLES = {
  [USER_ROLES.LECTURER]: {
    title: 'Giảng Viên & Cán Bộ Sử Dụng',
    description: 'Tra cứu thiết bị phòng học, quét mã QR, báo hỏng sự cố tại chỗ, theo dõi tiến độ và đánh giá nghiệm thu.',
    permissions: [
      'user:profile:read',
      'room:read',
      'equipment:read',
      'equipment:qr:scan',
      'incident:create',
      'incident:read_own',
      'repair:rate'
    ]
  },
  [USER_ROLES.TECHNICIAN]: {
    title: 'Kỹ Thuật Viên Vận Hành & Sửa Chữa',
    description: 'Tiếp nhận ca sửa, cập nhật thiết bị, xin cấp phát linh kiện, xác nhận di chuyển thực địa và quét mã QR kiểm kê.',
    permissions: [
      'user:profile:read',
      'room:read',
      'equipment:read',
      'equipment:create',
      'equipment:update',
      'equipment:qr:scan',
      'warranty:read',
      'warranty:update',
      'movement:confirm',
      'incident:create',
      'repair:read_assigned',
      'repair:accept',
      'repair:log',
      'repair:report_outcome',
      'parts:request',
      'inventory:scan',
      'inventory:export',
      'disposal:propose'
    ]
  },
  [USER_ROLES.FACILITY_MANAGER]: {
    title: 'Cán Bộ Quản Lý Cơ Sở Vật Chất (FM)',
    description: 'Điều phối ca sửa chữa Kanban SLA, cấp phát linh kiện kho, ra lệnh điều chuyển, kiểm kê, thẩm định và lập dự trù thanh lý.',
    permissions: [
      'user:profile:read',
      'room:read',
      'equipment:read',
      'equipment:create',
      'equipment:update',
      'equipment:import',
      'equipment:dispose',
      'equipment:qr:generate',
      'equipment:qr:scan',
      'warranty:read',
      'warranty:update',
      'movement:order',
      'placement:decide',
      'incident:create',
      'repair:read',
      'repair:assign',
      'repair:close',
      'parts:approve',
      'spare_part:update',
      'inventory:create',
      'inventory:scan',
      'inventory:reconcile',
      'inventory:export',
      'disposal:propose',
      'dashboard:read',
      'report:export'
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
      'equipment:create',
      'equipment:update',
      'equipment:import',
      'equipment:dispose',
      'equipment:qr:generate',
      'equipment:qr:scan',
      'warranty:read',
      'warranty:update',
      'movement:order',
      'incident:create',
      'inventory:create',
      'inventory:reconcile',
      'inventory:export',
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

const sanitizePermissionsList = (permissions = []) => {
  if (!Array.isArray(permissions)) return [];
  return [
    ...new Set(
      permissions
        .filter((p) => typeof p === 'string' && p.trim().length > 0)
        .map((p) => p.trim())
    )
  ];
};

// @desc    Get all roles and permissions matrix (UC-12.1: View role permissions matrix)
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

    // Filter by role name if specified
    if (req.query?.name) {
      roles = roles.filter(r => r.name.toLowerCase() === String(req.query.name).toLowerCase());
    }

    res.json({
      success: true,
      total: roles.length,
      roles,
      canonicalRolesCount: Object.keys(DEFAULT_CANONICAL_ROLES).length,
      defaultCanonicalRoles: DEFAULT_CANONICAL_ROLES
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Configure single role permissions & live policy toggle (UC-12.2: Configure role permissions - Admin Only)
// @route   PUT /api/roles/:id or PUT /api/admin/roles/:id/permissions
export const updateRolePermissions = async (req, res) => {
  try {
    const { permissions, modulePermissions, action } = req.body;

    let targetPermissions = null;

    if (Array.isArray(permissions)) {
      targetPermissions = permissions;
    } else if (action && Array.isArray(modulePermissions)) {
      // Find current role to apply module delta
      let existingRole = null;
      if (mongoose.Types.ObjectId.isValid(req.params.id)) {
        existingRole = await Role.findById(req.params.id);
      }
      if (!existingRole) {
        existingRole = await Role.findOne({ name: req.params.id });
      }
      const currentList = existingRole?.permissions || DEFAULT_CANONICAL_ROLES[req.params.id]?.permissions || [];
      if (action === 'ENABLE_MODULE') {
        targetPermissions = [...new Set([...currentList, ...modulePermissions])];
      } else if (action === 'DISABLE_MODULE') {
        targetPermissions = currentList.filter(p => !modulePermissions.includes(p));
      } else if (action === 'TOGGLE_MODULE') {
        const hasAll = modulePermissions.every(p => currentList.includes(p));
        targetPermissions = hasAll
          ? currentList.filter(p => !modulePermissions.includes(p))
          : [...new Set([...currentList, ...modulePermissions])];
      }
    }

    if (!Array.isArray(targetPermissions)) {
      return res.status(400).json({
        success: false,
        message: 'Dữ liệu không hợp lệ. Vui lòng cung cấp danh sách quyền (permissions) hoặc modulePermissions kèm action.'
      });
    }

    const sanitizedPermissions = sanitizePermissionsList(targetPermissions);

    let role = null;
    if (mongoose.Types.ObjectId.isValid(req.params.id)) {
      role = await Role.findById(req.params.id);
    }
    if (!role) {
      role = await Role.findOne({ name: req.params.id });
    }
    if (!role && DEFAULT_CANONICAL_ROLES[req.params.id]) {
      const def = DEFAULT_CANONICAL_ROLES[req.params.id];
      role = await Role.create({
        name: req.params.id,
        title: def.title,
        description: def.description,
        permissions: def.permissions
      });
    }
    if (!role) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy vai trò trong hệ thống.' });
    }

    // Admin Self-Lockout Protection: Admin cannot strip role:update from the admin role
    if (
      role.name === USER_ROLES.ADMIN &&
      !sanitizedPermissions.includes('role:update') &&
      !sanitizedPermissions.includes('*')
    ) {
      return res.status(400).json({
        success: false,
        code: 'ADMIN_SELF_LOCKOUT_PREVENTED',
        message: 'Không thể tước quyền Cấu hình Ma trận RBAC (role:update) của Quản trị viên hệ thống (Admin Self-Lockout Protection).'
      });
    }

    const oldPerms = Array.isArray(role.permissions) ? [...role.permissions] : [];
    const addedPermissions = sanitizedPermissions.filter((p) => !oldPerms.includes(p));
    const revokedPermissions = oldPerms.filter((p) => !sanitizedPermissions.includes(p));

    role.permissions = sanitizedPermissions;
    await role.save();

    await AuditLog.logAction({
      user_id: req.user?._id,
      user_display: req.user ? `${req.user.full_name} (${req.user.code})` : 'System Admin',
      action: 'UPDATE_ROLE_PERMISSIONS',
      target_table: 'roles',
      entity_id: role._id.toString(),
      ip_address: req.ip || '127.0.0.1',
      old_value: { permissions: oldPerms },
      new_value: {
        permissions: role.permissions,
        added: addedPermissions,
        revoked: revokedPermissions,
        action: action || 'DIRECT_UPDATE'
      }
    });

    res.json({
      success: true,
      message: `Cập nhật ma trận phân quyền cho vai trò [${role.name}] thành công (+${addedPermissions.length} cấp mới, -${revokedPermissions.length} thu hồi).`,
      role,
      liveEnforced: true,
      policyVersion: Date.now(),
      diff: {
        added: addedPermissions,
        revoked: revokedPermissions
      }
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
      if (!item || !item.name || !Array.isArray(item.permissions)) continue;
      const sanitizedPermissions = sanitizePermissionsList(item.permissions);

      // Protect Admin from accidentally locking out role:update or user:profile:read during batch save
      if (item.name === USER_ROLES.ADMIN) {
        if (!sanitizedPermissions.includes('role:update') && !sanitizedPermissions.includes('*')) {
          sanitizedPermissions.push('role:update');
        }
        if (!sanitizedPermissions.includes('user:profile:read') && !sanitizedPermissions.includes('*')) {
          sanitizedPermissions.push('user:profile:read');
        }
      }

      const defaultMeta = DEFAULT_CANONICAL_ROLES[item.name] || {};
      const role = await Role.findOneAndUpdate(
        { name: item.name },
        {
          $set: { permissions: sanitizedPermissions },
          $setOnInsert: {
            title: defaultMeta.title || item.name,
            description: defaultMeta.description || ''
          }
        },
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
