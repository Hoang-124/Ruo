import { 
  MOVEMENT_STATUSES, 
  REPAIR_STATUSES, 
  DISPOSAL_STATUSES, 
  PARTS_REQUEST_STATUSES,
  INVENTORY_STATUSES,
  USER_ROLES 
} from '../config/constants.js';

/**
 * State Transition Maps with Role-Based Authorizations
 * 4 Canonical Roles: Lecturer, Technician, Facility Manager, Admin.
 * Separation of Duties: Người làm không tự duyệt việc của mình.
 */
export const STATE_TRANSITIONS = {
  MOVEMENT: {
    [MOVEMENT_STATUSES.PENDING]: [
      { to: MOVEMENT_STATUSES.COMPLETED, allowedRoles: [USER_ROLES.TECHNICIAN] },
      { to: MOVEMENT_STATUSES.CANCELLED, allowedRoles: [USER_ROLES.FACILITY_MANAGER] }
    ],
    [MOVEMENT_STATUSES.COMPLETED]: [],
    [MOVEMENT_STATUSES.CANCELLED]: []
  },

  REPAIR: {
    [REPAIR_STATUSES.REPORTED]: [
      { to: REPAIR_STATUSES.ASSIGNED, allowedRoles: [USER_ROLES.FACILITY_MANAGER] }
    ],
    [REPAIR_STATUSES.ASSIGNED]: [
      { to: REPAIR_STATUSES.IN_PROGRESS, allowedRoles: [USER_ROLES.TECHNICIAN] }
    ],
    [REPAIR_STATUSES.IN_PROGRESS]: [
      { to: REPAIR_STATUSES.RESOLVED, allowedRoles: [USER_ROLES.TECHNICIAN] },
      { to: REPAIR_STATUSES.UNREPAIRABLE, allowedRoles: [USER_ROLES.TECHNICIAN] }
    ],
    [REPAIR_STATUSES.RESOLVED]: [
      { to: REPAIR_STATUSES.CLOSED, allowedRoles: [USER_ROLES.FACILITY_MANAGER] }
    ],
    [REPAIR_STATUSES.UNREPAIRABLE]: [
      { to: REPAIR_STATUSES.CLOSED, allowedRoles: [USER_ROLES.FACILITY_MANAGER] }
    ],
    [REPAIR_STATUSES.CLOSED]: []
  },

  DISPOSAL: {
    [DISPOSAL_STATUSES.PROPOSED]: [
      { to: DISPOSAL_STATUSES.APPROVED, allowedRoles: [USER_ROLES.ADMIN] },
      { to: DISPOSAL_STATUSES.REJECTED, allowedRoles: [USER_ROLES.ADMIN] }
    ],
    [DISPOSAL_STATUSES.APPROVED]: [
      { to: DISPOSAL_STATUSES.COMPLETED, allowedRoles: [USER_ROLES.ADMIN, USER_ROLES.FACILITY_MANAGER] }
    ],
    [DISPOSAL_STATUSES.REJECTED]: [],
    [DISPOSAL_STATUSES.COMPLETED]: []
  },

  PARTS_REQUEST: {
    [PARTS_REQUEST_STATUSES.PENDING]: [
      { to: PARTS_REQUEST_STATUSES.APPROVED, allowedRoles: [USER_ROLES.FACILITY_MANAGER] },
      { to: PARTS_REQUEST_STATUSES.REJECTED, allowedRoles: [USER_ROLES.FACILITY_MANAGER] }
    ],
    [PARTS_REQUEST_STATUSES.APPROVED]: [],
    [PARTS_REQUEST_STATUSES.REJECTED]: []
  },

  INVENTORY_SESSION: {
    [INVENTORY_STATUSES.DRAFT]: [
      { to: INVENTORY_STATUSES.IN_PROGRESS, allowedRoles: [USER_ROLES.FACILITY_MANAGER] }
    ],
    [INVENTORY_STATUSES.IN_PROGRESS]: [
      { to: INVENTORY_STATUSES.COMPLETED, allowedRoles: [USER_ROLES.FACILITY_MANAGER] }
    ],
    [INVENTORY_STATUSES.COMPLETED]: [
      { to: INVENTORY_STATUSES.RECONCILED, allowedRoles: [USER_ROLES.FACILITY_MANAGER] }
    ],
    [INVENTORY_STATUSES.RECONCILED]: []
  }
};

// Backward compatibility alias for TRANSFER
STATE_TRANSITIONS.TRANSFER = STATE_TRANSITIONS.MOVEMENT;

/**
 * Validates state transition and checks role authorization
 * @param {string} entityType 'MOVEMENT' | 'TRANSFER' | 'REPAIR' | 'DISPOSAL' | 'PARTS_REQUEST' | 'INVENTORY_SESSION'
 * @param {string} currentStatus Current state
 * @param {string} targetStatus Target state
 * @param {string} role User role
 * @returns {boolean} true if valid
 * @throws {Error} Error with statusCode 409 (invalid transition) or 403 (unauthorized role)
 */
export function assertTransition(entityType, currentStatus, targetStatus, role) {
  const transitions = STATE_TRANSITIONS[entityType];
  if (!transitions) {
    const err = new Error(`Entity type '${entityType}' không có định nghĩa quy trình chuyển trạng thái.`);
    err.statusCode = 400;
    throw err;
  }

  const allowedNext = transitions[currentStatus] || [];
  const match = allowedNext.find(t => t.to === targetStatus);

  if (!match) {
    const validTargets = allowedNext.map(t => t.to).join(', ') || 'không có (trạng thái kết thúc)';
    const err = new Error(
      `Chuyển trạng thái không hợp lệ cho ${entityType}: không thể chuyển từ '${currentStatus}' sang '${targetStatus}'. Các trạng thái tiếp theo hợp lệ: [${validTargets}].`
    );
    err.statusCode = 409;
    throw err;
  }

  if (!match.allowedRoles.includes(role)) {
    const err = new Error(
      `Vai trò '${role}' không có thẩm quyền chuyển ${entityType} từ '${currentStatus}' sang '${targetStatus}'. Yêu cầu vai trò: [${match.allowedRoles.join(', ')}].`
    );
    err.statusCode = 403;
    throw err;
  }

  return true;
}

export default { STATE_TRANSITIONS, assertTransition };
