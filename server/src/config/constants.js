// Domain Constants and Enumerations for Ruo University Facility Management System

export const USER_ROLES = {
  ADMIN: 'admin',
  LECTURER: 'lecturer',
  MAINTENANCE_STAFF: 'maintenance_staff',
  MAINTENANCE: 'maintenance_staff',
  FACILITY_STAFF: 'maintenance_staff'
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
  STORAGE: 'storage'
};

export const ROOM_STATUSES = {
  AVAILABLE: 'available',
  OCCUPIED: 'occupied',
  MAINTENANCE: 'maintenance',
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
  AVAILABLE: 'available',
  IN_USE: 'in_use',
  UNDER_MAINTENANCE: 'under_maintenance',
  UNDER_REPAIR: 'under_repair',
  PENDING_DISPOSAL: 'pending_disposal',
  DISPOSED: 'disposed'
};

export const TRANSFER_STATUSES = {
  PENDING: 'pending',
  APPROVED: 'approved',
  COMPLETED: 'completed',
  REJECTED: 'rejected'
};

export const REPAIR_PRIORITIES = {
  CRITICAL: 'critical', // 4 hours
  HIGH: 'high',         // 8 hours
  MEDIUM: 'medium',     // 24 hours
  LOW: 'low'            // 48 hours
};

export const TICKET_PRIORITIES = REPAIR_PRIORITIES;

export const REPAIR_STATUSES = {
  PENDING: 'pending',
  OPEN: 'open',
  ASSIGNED: 'assigned',
  IN_PROGRESS: 'in_progress',
  PENDING_PARTS: 'pending_parts',
  RESOLVED: 'resolved',
  CLOSED: 'closed',
  CANCELLED: 'cancelled'
};

export const TICKET_STATUSES = REPAIR_STATUSES;

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

export const DISPOSAL_STATUSES = {
  DRAFT: 'draft',
  TECHNICAL_ASSESSMENT: 'technical_assessment',
  COMMITTEE_REVIEW: 'committee_review',
  APPROVED: 'approved',
  SCRAP_COMPLETED: 'scrap_completed',
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

