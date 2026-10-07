import { Role } from '../models/Role.js';
import { AuditLog } from '../models/AuditLog.js';

// @desc    Get all roles and permissions (UC: View role permissions)
// @route   GET /api/roles
export const getRoles = async (req, res) => {
  try {
    const roles = await Role.find();
    res.json({
      success: true,
      roles
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Configure role permissions (UC: Configure role permissions - Admin Only)
// @route   PUT /api/roles/:id
export const updateRolePermissions = async (req, res) => {
  try {
    const { permissions } = req.body;
    if (!Array.isArray(permissions)) {
      return res.status(400).json({ success: false, message: 'Danh sách quyền phải là một mảng chuỗi.' });
    }

    const role = await Role.findById(req.params.id);
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
