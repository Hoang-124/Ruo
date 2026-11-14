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
  ALLOCATION: 'allocation',
  TRANSFER: 'transfer',
  REPLACEMENT: 'replacement',
  REPAIR_OUT: 'repair_out',
  REPAIR_RETURN: 'repair_return',
  TO_STOCK: 'to_stock'
};

export const MOVEMENT_STATUSES = {
  AWAITING_APPROVAL: 'awaiting_approval',
  PENDING: 'pending',
  APPROVED: 'approved',
  COMPLETING: 'completing',
  REJECTED: 'rejected',
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
  HC_APPROVED: 'hc_approved',
  BGH_APPROVED: 'bgh_approved',
  PROCUREMENT_PLANNED: 'procurement_planned',
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
  DEADLINE_OVERDUE: 'deadline_overdue',
  ROLE_APPROVAL_REQUEST: 'role_approval_request'
};

export const NOTIFICATION_REFERENCE_TYPES = {
  REPAIR: 'repair',
  EQUIPMENT_MOVEMENT: 'equipment_movement',
  DISPOSAL: 'disposal',
  EQUIPMENT: 'equipment',
  PARTS_REQUEST: 'parts_request',
  USER: 'user'
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

export const TECHNICIAN_SPECIALTIES = {
  GUARD_OPS: 'GUARD_OPS',
  TECH_HVAC_POWER: 'TECH_HVAC_POWER',
  TECH_IT_AV: 'TECH_IT_AV',
  TECH_FURN_MECH: 'TECH_FURN_MECH',
  TECH_GENERAL: 'TECH_GENERAL'
};

export const TECHNICIAN_SPECIALTY_PROFILES = {
  GUARD_OPS: {
    code: 'GUARD_OPS',
    label: 'Tổ Bảo Vệ / Trực Ban Vận Hành',
    shortLabel: 'Bảo vệ / Trực ban (Đèn & Điều hòa)',
    department: 'Tổ Bảo Vệ & Trực Ban Tòa Nhà',
    allowed_categories: ['CAT-HVAC', 'CAT-POWER', 'CAT-FIRE', 'CAT-FURN'],
    allowed_damage_levels: ['minor'],
    is_operational_only: true,
    specialized_tasks: [
      'Bật / tắt điều hòa, chỉnh nhiệt độ phòng học theo ca',
      'Phụ trách bật / tắt đèn chiếu sáng hành lang & phòng học',
      'Đóng / mở cầu dao, aptomat nhánh khi nhảy CB nhẹ',
      'Mở khóa cửa phòng học, kéo rèm, kiểm tra chốt bình PCCC'
    ]
  },
  TECH_HVAC_POWER: {
    code: 'TECH_HVAC_POWER',
    label: 'KTV Điện Lạnh & Hệ Thống Cơ Điện',
    shortLabel: 'Chuyên gia Điện lạnh & Điện nguồn',
    department: 'Tổ Kỹ Thuật Điện - Điện Lạnh',
    allowed_categories: ['CAT-HVAC', 'CAT-POWER', 'CAT-FIRE'],
    allowed_damage_levels: ['minor', 'major', 'critical'],
    is_operational_only: false,
    specialized_tasks: [
      'Sửa điều hòa mất lạnh, chảy nước dàn lạnh, nạp gas, thay tụ/lốc',
      'Sửa tủ điện phân phối, thay bóng đèn LED trần, chấn lưu, ổ cắm',
      'Khắc phục chập điện, quá tải CB và bảo trì hệ thống báo cháy PCCC'
    ]
  },
  TECH_IT_AV: {
    code: 'TECH_IT_AV',
    label: 'KTV CNTT, Hạ Tầng Mạng & Nghe Nhìn',
    shortLabel: 'Chuyên gia Máy chiếu, Âm thanh & CNTT',
    department: 'Tổ Kỹ Thuật CNTT & Nghe Nhìn',
    allowed_categories: ['CAT-DISPLAY', 'CAT-AUDIO', 'CAT-IT', 'CAT-NET', 'CAT-SEC', 'CAT-OFFICE'],
    allowed_damage_levels: ['minor', 'major', 'critical'],
    is_operational_only: false,
    specialized_tasks: [
      'Sửa máy chiếu mờ/hỏng bóng lamp, lỗi cổng HDMI, màn chiếu điện',
      'Sửa loa hội trường, amply, micro không dây trợ giảng',
      'Sửa máy tính PC phòng Lab, Server, Wifi/Switch, Camera CCTV, máy in'
    ]
  },
  TECH_FURN_MECH: {
    code: 'TECH_FURN_MECH',
    label: 'KTV Mộc, Cơ Khí & Nội Thất Phòng Học',
    shortLabel: 'Chuyên gia Nội thất, Bàn ghế & Cơ khí',
    department: 'Tổ Kỹ Thuật Cơ Khí & Nội Thất',
    allowed_categories: ['CAT-FURN', 'CAT-SPEC'],
    allowed_damage_levels: ['minor', 'major', 'critical'],
    is_operational_only: false,
    specialized_tasks: [
      'Sửa chữa bàn ghế sinh viên, ghế xoay giảng viên, bục giảng gỗ',
      'Thay ổ khóa cơ, bản lề cửa, dây kéo rèm cuốn chống nắng',
      'Bảo trì tủ sắt locker, kệ hồ sơ và giường/thiết bị y tế học đường'
    ]
  },
  TECH_GENERAL: {
    code: 'TECH_GENERAL',
    label: 'Kỹ Thuật Viên Đa Năng (Tổ Trưởng Kỹ Thuật)',
    shortLabel: 'Tổ trưởng Kỹ thuật Đa năng',
    department: 'Tổ Kỹ Thuật Bảo Trì',
    allowed_categories: [
      'CAT-DISPLAY', 'CAT-HVAC', 'CAT-AUDIO', 'CAT-IT', 'CAT-NET',
      'CAT-SEC', 'CAT-OFFICE', 'CAT-POWER', 'CAT-FIRE', 'CAT-FURN', 'CAT-SPEC'
    ],
    allowed_damage_levels: ['minor', 'major', 'critical'],
    is_operational_only: false,
    specialized_tasks: [
      'Điều phối kỹ thuật hiện trường & hỗ trợ đa chuyên môn',
      'Xử lý sự cố phức tạp liên ngành và nghiệm thu kỹ thuật'
    ]
  }
};

