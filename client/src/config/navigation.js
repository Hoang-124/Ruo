import { Icons } from '../components/common/SvgIcons';

/**
 * 4 Canonical Roles in Ruo University Equipment Management System (UEMS)
 * Conforming strictly to DB_MODULES_EXPLAINED.md and Actor_UseCase.drawio
 */
export const USER_ROLES = {
  ADMIN: 'admin',
  FACILITY_MANAGER: 'facility_manager',
  TECHNICIAN: 'technician',
  LECTURER: 'lecturer'
};

export const ROLE_METADATA = {
  [USER_ROLES.ADMIN]: {
    label: 'Ban Giám Hiệu / Quản Trị Viên (Admin)',
    shortLabel: 'Admin',
    color: '#EF4444',
    bg: 'rgba(239, 68, 68, 0.12)',
    badgeClass: 'badge-admin',
    defaultTab: 'dashboard',
    description: 'Quản trị người dùng, phân quyền ma trận RBAC, danh mục hệ thống, phê duyệt thanh lý cuối, báo cáo kiểm toán SHA-256'
  },
  [USER_ROLES.FACILITY_MANAGER]: {
    label: 'Cán Bộ Quản Lý Cơ Sở Vật Chất (FM)',
    shortLabel: 'Quản Lý CSVC',
    color: '#F59E0B',
    bg: 'rgba(245, 158, 11, 0.12)',
    badgeClass: 'badge-manager',
    defaultTab: 'dashboard',
    description: 'Giao việc sửa chữa, chọn đồ dự phòng từ kho, duyệt linh kiện, ra lệnh điều chuyển, kiểm kê và đề xuất thanh lý'
  },
  [USER_ROLES.TECHNICIAN]: {
    label: 'Kỹ Thuật Viên Vận Hành & Sửa Chữa',
    shortLabel: 'Kỹ Thuật Viên',
    color: '#0EA5E9',
    bg: 'rgba(14, 165, 233, 0.12)',
    badgeClass: 'badge-technician',
    defaultTab: 'dashboard',
    description: 'Tiếp nhận việc, thực hiện sửa chữa, xin linh kiện, thay thế thiết bị dự phòng, xác nhận di chuyển và quét QR thực địa'
  },
  [USER_ROLES.LECTURER]: {
    label: 'Giảng Viên & Cán Bộ Sử Dụng',
    shortLabel: 'Giảng Viên',
    color: '#10B981',
    bg: 'rgba(16, 185, 129, 0.12)',
    badgeClass: 'badge-lecturer',
    defaultTab: 'dashboard',
    description: 'Tra cứu thiết bị phòng học, báo hỏng sự cố, theo dõi tiến độ và đánh giá chất lượng sửa chữa'
  }
};

/**
 * All Navigation Items across all Modules
 */
export const ALL_NAV_ITEMS = {
  // Common / Unified Spatial CAD & Classroom Floor Plan (Merged)
  dashboard: {
    id: 'dashboard',
    label: 'Sơ Đồ Phòng Học',
    short: 'Sơ Đồ Phòng',
    icon: Icons.Dashboard,
    roles: [USER_ROLES.ADMIN, USER_ROLES.FACILITY_MANAGER, USER_ROLES.TECHNICIAN, USER_ROLES.LECTURER]
  },

  transfer_history: {
    id: 'transfer_history',
    label: 'Lịch Sử Điều Chuyển',
    short: 'Lịch Sử Điều Chuyển',
    icon: Icons.ArrowRight,
    roles: [USER_ROLES.ADMIN, USER_ROLES.FACILITY_MANAGER, USER_ROLES.TECHNICIAN, USER_ROLES.LECTURER]
  },
  rooms: {
    id: 'rooms',
    label: 'Danh Mục Phòng Học',
    short: 'Phòng Học',
    icon: Icons.Room,
    roles: [USER_ROLES.ADMIN, USER_ROLES.FACILITY_MANAGER, USER_ROLES.TECHNICIAN, USER_ROLES.LECTURER]
  },

  // Lecturer Module
  report_issue: {
    id: 'report_issue',
    label: 'Báo Hỏng Thiết Bị',
    short: 'Báo Hỏng',
    icon: Icons.AlertTriangle,
    roles: [USER_ROLES.LECTURER]
  },
  my_tickets: {
    id: 'my_tickets',
    label: 'Phiếu Báo Hỏng Của Tôi',
    short: 'Phiếu Báo Hỏng',
    icon: Icons.ClipboardCheck,
    roles: [USER_ROLES.LECTURER]
  },

  // Technician Module
  assigned_tasks: {
    id: 'assigned_tasks',
    label: 'Nhiệm Vụ Sửa Chữa',
    short: 'Việc Của Tôi',
    icon: Icons.Wrench,
    roles: [USER_ROLES.TECHNICIAN]
  },
  spare_parts: {
    id: 'spare_parts',
    label: 'Kho Linh Kiện & Yêu Cầu',
    short: 'Linh Kiện',
    icon: Icons.Package,
    permission: 'parts:request',
    altPermission: 'parts:approve',
    roles: [USER_ROLES.TECHNICIAN, USER_ROLES.FACILITY_MANAGER]
  },
  movement_tasks: {
    id: 'movement_tasks',
    label: 'Lệnh Di Chuyển & Thay Thế',
    short: 'Lệnh Di Chuyển',
    icon: Icons.ArrowRight,
    permission: 'movement:confirm',
    roles: [USER_ROLES.TECHNICIAN]
  },
  qr_scanner: {
    id: 'qr_scanner',
    label: 'Quét Mã QR Thực Địa',
    short: 'Quét QR',
    icon: Icons.QrCode,
    permission: 'equipment:qr:scan',
    roles: [USER_ROLES.ADMIN, USER_ROLES.FACILITY_MANAGER, USER_ROLES.TECHNICIAN, USER_ROLES.LECTURER]
  },

  // Facility Manager Module
  tickets_kanban: {
    id: 'tickets_kanban',
    label: 'Phiếu Sửa Chữa (Kanban)',
    short: 'Sửa Chữa',
    icon: Icons.Wrench,
    permission: 'repair:assign',
    roles: [USER_ROLES.FACILITY_MANAGER]
  },
  maintenance: {
    id: 'maintenance',
    label: 'Bảo Dưỡng Định Kỳ',
    short: 'Bảo Dưỡng',
    icon: Icons.Calendar,
    roles: [USER_ROLES.FACILITY_MANAGER, USER_ROLES.TECHNICIAN]
  },
  warehouse: {
    id: 'warehouse',
    label: 'Kho Dự Phòng & Định Mức',
    short: 'Kho Dự Phòng',
    icon: Icons.Layers,
    permission: 'placement:decide',
    roles: [USER_ROLES.FACILITY_MANAGER]
  },
  movements: {
    id: 'movements',
    label: 'Điều Chuyển Thiết Bị',
    short: 'Điều Chuyển',
    icon: Icons.RefreshCw,
    permission: 'equipment:read',
    roles: [USER_ROLES.FACILITY_MANAGER, USER_ROLES.ADMIN]
  },
  equipments: {
    id: 'equipments',
    label: 'Kho Thiết Bị Trường',
    short: 'Thiết Bị',
    icon: Icons.Equipment,
    permission: 'equipment:read',
    roles: [USER_ROLES.ADMIN, USER_ROLES.FACILITY_MANAGER, USER_ROLES.TECHNICIAN, USER_ROLES.LECTURER]
  },
  inventory: {
    id: 'inventory',
    label: 'Kiểm Kê CSVC',
    short: 'Kiểm Kê',
    icon: Icons.CheckCircle,
    permission: 'inventory:scan',
    altPermission: 'inventory:create',
    roles: [USER_ROLES.FACILITY_MANAGER, USER_ROLES.TECHNICIAN, USER_ROLES.ADMIN]
  },
  disposal_propose: {
    id: 'disposal_propose',
    label: 'Đề Xuất Thanh Lý',
    short: 'Đề Xuất Thanh Lý',
    icon: Icons.Sliders,
    permission: 'disposal:propose',
    roles: [USER_ROLES.FACILITY_MANAGER, USER_ROLES.TECHNICIAN]
  },

  // Admin Module (conforming to Admin screenshot and master prompt)
  users: {
    id: 'users',
    label: 'Quản Lý Người Dùng',
    short: 'Người Dùng',
    icon: Icons.Users,
    permission: 'user:update',
    roles: [USER_ROLES.ADMIN]
  },
  rbac: {
    id: 'rbac',
    label: 'Phân Quyền Vai Trò (RBAC)',
    short: 'Phân Quyền',
    icon: Icons.Shield,
    permission: 'role:update',
    roles: [USER_ROLES.ADMIN]
  },
  master_data: {
    id: 'master_data',
    label: 'Danh Mục Hệ Thống',
    short: 'Danh Mục',
    icon: Icons.Settings,
    permission: 'category:*',
    roles: [USER_ROLES.ADMIN]
  },
  disposal_approval: {
    id: 'disposal_approval',
    label: 'Phê Duyệt Thanh Lý (BGH)',
    short: 'Duyệt Thanh Lý',
    icon: Icons.CheckCircle,
    permission: 'disposal:approve',
    roles: [USER_ROLES.ADMIN]
  },
  audit_log: {
    id: 'audit_log',
    label: 'Sổ Cái Kiểm Toán SHA-256',
    short: 'Audit Log',
    icon: Icons.Audit,
    permission: 'audit:read',
    roles: [USER_ROLES.ADMIN]
  }
};

/**
 * Returns navigation tabs specifically permitted for a given role (and optional live permission checker)
 */
export function getNavItemsForRole(role, hasPermission) {
  const normalizedRole = String(role || '').toLowerCase();
  return Object.values(ALL_NAV_ITEMS).filter((item) =>
    isTabAllowedForRole(normalizedRole, item.id, hasPermission)
  );
}

/**
 * Returns the default landing tab when an actor logs in
 */
export function getDefaultTabForRole(role) {
  const normalizedRole = String(role || '').toLowerCase();
  return ROLE_METADATA[normalizedRole]?.defaultTab || 'dashboard';
}

/**
 * Validates if a role is allowed to view a specific tab
 */
export function isTabAllowedForRole(role, tabId, hasPermission) {
  if (!tabId) return false;
  const normalizedRole = String(role || '').toLowerCase();
  const navItem = ALL_NAV_ITEMS[tabId];
  if (!navItem) return false;
  if (typeof hasPermission === 'function' && (navItem.permission || navItem.altPermission)) {
    if (navItem.permission && hasPermission(navItem.permission)) return true;
    if (navItem.altPermission && hasPermission(navItem.altPermission)) return true;
  }
  return navItem.roles.includes(normalizedRole);
}
