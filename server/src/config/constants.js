// Domain Constants and Enumerations for Ruo University Equipment Management System (UEMS)
// Conforming to 20 Collections, 5 Actors (Guest, Lecturer, Facility Manager, Technician, Admin) and 68 Use Cases

export const USER_ROLES = {
  LECTURER: 'lecturer',
  TECHNICIAN: 'technician',
  FACILITY_MANAGER: 'facility_manager',
  ADMIN: 'admin'
};

export const USER_STATUSES = {
  ACTIVE: 'active',
  LOCKED: 'locked',
  PENDING_APPROVAL: 'pending_approval'
};

export const ROOM_TYPES = {
  LECTURE: 'lecture',
  LAB: 'lab',
  OFFICE: 'office',
  WAREHOUSE: 'warehouse'
};

export const ROOM_STATUSES = {
  AVAILABLE: 'available',
  MAINTENANCE: 'maintenance',
  INACTIVE: 'inactive'
};

// Room master-data business rules (Module 2: Room & Facility)
// Room code: P + floor (1-5) + 2-digit index (01-08) -> P101 ... P508
export const ROOM_RULES = {
  BUILDING: 'A1',
  MIN_FLOOR: 1,
  MAX_FLOOR: 5,
  MIN_ROOM_INDEX: 1,
  MAX_ROOM_INDEX: 8,
  CODE_PATTERN: /^P([1-5])0([1-8])$/,
  CODE_RANGE_LABEL: 'P101 - P508',
  MIN_CAPACITY: 1,
  MAX_CAPACITY: 500,
  MAX_NAME_LENGTH: 120
};

export const EQUIPMENT_STATUSES = {
  IN_USE: 'in_use',
  IN_STOCK: 'in_stock',
  BROKEN: 'broken',
  REPAIRING: 'repairing',
  PENDING_DISPOSAL: 'pending_disposal',
  DISPOSED: 'disposed',
  LOST: 'lost'
};

export const MOVEMENT_TYPES = {
  TRANSFER: 'transfer',
  REPLACEMENT: 'replacement',
  REPAIR_OUT: 'repair_out',
  REPAIR_RETURN: 'repair_return',
  TO_STOCK: 'to_stock'
};

export const MOVEMENT_STATUSES = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
};

export const REPAIR_SOURCES = {
  LECTURER_REPORT: 'lecturer_report',
  INVENTORY_CHECK: 'inventory_check'
};

export const DAMAGE_LEVELS = {
  MINOR: 'minor',
  MAJOR: 'major',
  CRITICAL: 'critical'
};

export const REPAIR_OUTCOMES = {
  REPAIRED: 'repaired',
  UNREPAIRABLE: 'unrepairable'
};

export const REPAIR_STATUSES = {
  REPORTED: 'reported',
  ASSIGNED: 'assigned',
  IN_PROGRESS: 'in_progress',
  RESOLVED: 'resolved',
  UNREPAIRABLE: 'unrepairable',
  CLOSED: 'closed'
};

export const PARTS_REQUEST_STATUSES = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected'
};

export const INVENTORY_STATUSES = {
  DRAFT: 'draft',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  RECONCILED: 'reconciled'
};

export const INVENTORY_LOG_STATUSES = {
  MATCHED: 'matched',
  MISSING: 'missing',
  DAMAGED: 'damaged',
  WRONG_LOCATION: 'wrong_location'
};

export const DISPOSAL_STATUSES = {
  PROPOSED: 'proposed',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  COMPLETED: 'completed'
};

export const NOTIFICATION_TYPES = {
  INCIDENT_REPORTED: 'incident_reported',
  REPAIR_ASSIGNED: 'repair_assigned',
  REPAIR_RESOLVED: 'repair_resolved',
  REPAIR_UNREPAIRABLE: 'repair_unrepairable',
  REPLACEMENT_NEEDED: 'replacement_needed',
  MOVEMENT_ORDERED: 'movement_ordered',
  PARTS_REQUEST: 'parts_request',
  DISPOSAL_REQUEST: 'disposal_request',
  WARRANTY_EXPIRING: 'warranty_expiring',
  DEADLINE_OVERDUE: 'deadline_overdue'
};

export const NOTIFICATION_REFERENCE_TYPES = {
  REPAIR: 'repair',
  EQUIPMENT_MOVEMENT: 'equipment_movement',
  DISPOSAL: 'disposal',
  EQUIPMENT: 'equipment',
  PARTS_REQUEST: 'parts_request'
};

export const NOTIFICATION_MESSAGES = {
  incident_reported: {
    title: 'Báo cáo sự cố mới',
    message: (code, room) => `Thiết bị ${code} tại ${room} được báo hỏng cần xử lý.`
  },
  repair_assigned: {
    title: 'Nhiệm vụ sửa chữa mới',
    message: (code, deadline) => `Bạn được phân công sửa chữa thiết bị ${code}. Hạn chót: ${deadline}.`
  },
  repair_resolved: {
    title: 'Thiết bị đã sửa xong',
    message: (code) => `Thiết bị ${code} đã được kỹ thuật viên sửa thành công. Vui lòng bố trí vị trí.`
  },
  repair_unrepairable: {
    title: 'Thiết bị không thể sửa chữa',
    message: (code) => `Thiết bị ${code} được xác định hỏng hoàn toàn. Cần lập đề xuất thanh lý.`
  },
  replacement_needed: {
    title: 'Cần thiết bị thay thế',
    message: (room, category) => `Phòng ${room} đang thiếu thiết bị loại ${category}. Hãy xuất kho dự phòng.`
  },
  movement_ordered: {
    title: 'Lệnh điều chuyển thiết bị',
    message: (code, from, to) => `Lệnh điều chuyển thiết bị ${code} từ ${from} đến ${to}.`
  },
  parts_request: {
    title: 'Yêu cầu linh kiện sửa chữa',
    message: (tech, code) => `Kỹ thuật viên ${tech} xin cấp linh kiện cho thiết bị ${code}.`
  },
  disposal_request: {
    title: 'Đề xuất thanh lý tài sản',
    message: (code) => `Yêu cầu phê duyệt thanh lý cho thiết bị ${code}.`
  },
  warranty_expiring: {
    title: 'Bảo hành sắp hết hạn',
    message: (code, date) => `Thiết bị ${code} sẽ hết hạn bảo hành vào ngày ${date}.`
  },
  deadline_overdue: {
    title: 'Nhiệm vụ sửa chữa quá hạn (SLA)',
    message: (code) => `Nhiệm vụ sửa chữa thiết bị ${code} đã vượt quá hạn chót cam kết.`
  }
};

export const BUSINESS_HOURS = {
  START_HOUR: 7,
  START_MINUTE: 30,
  END_HOUR: 17,
  END_MINUTE: 0,
  WORKING_DAYS: [1, 2, 3, 4, 5] // Monday to Friday
};
