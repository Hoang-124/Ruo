// Domain Constants and Enumerations for Ruo University Equipment Management System (UEMS)

export const USER_ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  STAFF: 'staff'
};

export const USER_STATUSES = {
  ACTIVE: 'active',
  LOCKED: 'locked',
  INACTIVE: 'inactive'
};

export const ROOM_TYPES = {
  THEORY: 'theory',
  LAB: 'lab',
  HALL: 'hall',
  SMART: 'smart',
  MEETING: 'meeting',
  STORAGE: 'storage',
  LECTURE: 'lecture',
  OFFICE: 'office',
  PRACTICE: 'practice'
};

export const ROOM_STATUSES = {
  AVAILABLE: 'available',
  OCCUPIED: 'occupied',
  MAINTENANCE: 'maintenance',
  INACTIVE: 'inactive',
  LOCKED: 'locked'
};

export const EQUIPMENT_CONDITIONS = {
  BRAND_NEW: 'brand_new',
  GOOD: 'good',
  FAIR: 'fair',
  DAMAGED: 'damaged',
  DISPOSED: 'disposed'
};

export const EQUIPMENT_STATUSES = {
  ACTIVE: 'active',
  REPAIRING: 'repairing',
  TRANSFERRING: 'transferring',
  PENDING_DISPOSAL: 'pending_disposal',
  DISPOSED: 'disposed',
  LOST: 'lost'
};

export const TRANSFER_STATUSES = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  COMPLETED: 'completed'
};

export const REPAIR_PRIORITIES = {
  CRITICAL: 'critical', // 8 hours SLA
  MAJOR: 'major',       // 24 hours SLA
  MINOR: 'minor'        // 48 hours SLA
};

export const REPAIR_STATUSES = {
  REPORTED: 'reported',
  ASSIGNED: 'assigned',
  IN_PROGRESS: 'in_progress',
  RESOLVED: 'resolved',
  CLOSED: 'closed'
};

export const SLA_STATES = {
  ON_TRACK: 'on_track',
  AT_RISK: 'at_risk',
  OVERDUE: 'overdue'
};

export const MAINTENANCE_FREQUENCIES = {
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
  QUARTERLY: 'quarterly',
  YEARLY: 'yearly'
};

export const INVENTORY_STATUSES = {
  DRAFT: 'draft',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
};

// RACI 5-Step Asset Disposal Flow:
// 1. Proposed by Staff (R)
// 2. HC Approved by Manager (A)
// 3. BGH Approved by Admin (A)
// 4. Procurement replacement by Manager (C)
// 5. New Receipt by Staff (I)
export const DISPOSAL_STATUSES = {
  PROPOSED: 'proposed',
  HC_APPROVED: 'hc_approved',
  BGH_APPROVED: 'bgh_approved',
  PROCURING: 'procuring',
  RECEIVED: 'received',
  REJECTED: 'rejected'
};

export const BUSINESS_HOURS = {
  START_HOUR: 7,
  START_MINUTE: 30,
  END_HOUR: 17,
  END_MINUTE: 0,
  WORKING_DAYS: [1, 2, 3, 4, 5] // Monday to Friday
};

// Economic threshold for disposal review (R = Repair Cost / Remaining Value >= 60%)
export const DISPOSAL_R_RATIO_THRESHOLD = 60;
