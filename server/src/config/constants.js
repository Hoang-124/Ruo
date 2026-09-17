// Domain Constants and Enumerations for Ruo UFMS

export const USER_ROLES = {
  STUDENT: 'student',
  LECTURER: 'lecturer',
  FACILITY_STAFF: 'facility_staff',
  MAINTENANCE: 'maintenance',
  ACADEMIC_AFFAIRS: 'academic_affairs',
  ADMIN: 'admin'
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
  MEETING: 'meeting'
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
  BORROWED: 'borrowed',
  UNDER_MAINTENANCE: 'under_maintenance',
  PENDING_DISPOSAL: 'pending_disposal'
};

export const BOOKING_STATUSES = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
  CHECKED_IN: 'checked_in',
  NO_SHOW: 'no_show',
  COMPLETED: 'completed'
};

export const TICKET_PRIORITIES = {
  CRITICAL: 'critical', // 4 hours 24/7
  HIGH: 'high',         // 8 business hours
  MEDIUM: 'medium',     // 24 business hours
  LOW: 'low'            // 48 business hours
};

export const TICKET_STATUSES = {
  OPEN: 'open',
  ASSIGNED: 'assigned',
  IN_PROGRESS: 'in_progress',
  PENDING_PARTS: 'pending_parts',
  RESOLVED: 'resolved',
  CLOSED: 'closed'
};

export const SLA_STATES = {
  ON_TRACK: 'on_track',
  AT_RISK: 'at_risk',
  OVERDUE: 'overdue',
  MET: 'met',
  BREACHED: 'breached'
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
  WORKING_DAYS: [1, 2, 3, 4, 5] // Monday to Friday (Sunday = 0, Saturday = 6)
};

// Check-in grace period in minutes
export const CHECK_IN_GRACE_PERIOD_MINUTES = 15;

// Penalty score deducted on No-Show
export const NO_SHOW_PENALTY_SCORE = 10;

// Disposal financial threshold ratio
export const DISPOSAL_R_RATIO_THRESHOLD = 60.0;
