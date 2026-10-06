import { TRANSFER_STATUSES, REPAIR_STATUSES, DISPOSAL_STATUSES, USER_ROLES } from '../config/constants.js';

/**
 * State Transition Maps with Role-Based Authorizations
 * Admin always has universal override capability.
 */
export const STATE_TRANSITIONS = {
  TRANSFER: {
    [TRANSFER_STATUSES.PENDING]: [
      { to: TRANSFER_STATUSES.APPROVED, allowedRoles: [USER_ROLES.MANAGER, USER_ROLES.ADMIN] },
      { to: TRANSFER_STATUSES.REJECTED, allowedRoles: [USER_ROLES.MANAGER, USER_ROLES.ADMIN] }
    ],
    [TRANSFER_STATUSES.APPROVED]: [
      { to: TRANSFER_STATUSES.COMPLETED, allowedRoles: [USER_ROLES.STAFF, USER_ROLES.ADMIN] }
    ],
    [TRANSFER_STATUSES.REJECTED]: [],
    [TRANSFER_STATUSES.COMPLETED]: []
  },

  REPAIR: {
    [REPAIR_STATUSES.REPORTED]: [
      { to: REPAIR_STATUSES.ASSIGNED, allowedRoles: [USER_ROLES.MANAGER, USER_ROLES.ADMIN] }
    ],
    [REPAIR_STATUSES.ASSIGNED]: [
      { to: REPAIR_STATUSES.IN_PROGRESS, allowedRoles: [USER_ROLES.STAFF, USER_ROLES.ADMIN] }
    ],
    [REPAIR_STATUSES.IN_PROGRESS]: [
      { to: REPAIR_STATUSES.RESOLVED, allowedRoles: [USER_ROLES.STAFF, USER_ROLES.ADMIN] }
    ],
    [REPAIR_STATUSES.RESOLVED]: [
      { to: REPAIR_STATUSES.CLOSED, allowedRoles: [USER_ROLES.MANAGER, USER_ROLES.ADMIN] }
    ],
    [REPAIR_STATUSES.CLOSED]: []
  },

  DISPOSAL: {
    [DISPOSAL_STATUSES.PROPOSED]: [
      { to: DISPOSAL_STATUSES.HC_APPROVED, allowedRoles: [USER_ROLES.MANAGER, USER_ROLES.ADMIN] },
      { to: DISPOSAL_STATUSES.REJECTED, allowedRoles: [USER_ROLES.MANAGER, USER_ROLES.ADMIN] }
    ],
    [DISPOSAL_STATUSES.HC_APPROVED]: [
      { to: DISPOSAL_STATUSES.BGH_APPROVED, allowedRoles: [USER_ROLES.ADMIN] },
      { to: DISPOSAL_STATUSES.REJECTED, allowedRoles: [USER_ROLES.ADMIN] }
    ],
    [DISPOSAL_STATUSES.BGH_APPROVED]: [
      { to: DISPOSAL_STATUSES.PROCURING, allowedRoles: [USER_ROLES.MANAGER, USER_ROLES.ADMIN] }
    ],
    [DISPOSAL_STATUSES.PROCURING]: [
      { to: DISPOSAL_STATUSES.RECEIVED, allowedRoles: [USER_ROLES.STAFF, USER_ROLES.ADMIN] }
    ],
    [DISPOSAL_STATUSES.RECEIVED]: [],
    [DISPOSAL_STATUSES.REJECTED]: []
  },

  PARTS_REQUEST: {
    pending: [
      { to: 'approved', allowedRoles: [USER_ROLES.MANAGER, USER_ROLES.ADMIN] },
      { to: 'rejected', allowedRoles: [USER_ROLES.MANAGER, USER_ROLES.ADMIN] }
    ],
    approved: [],
    rejected: []
  }
};

/**
 * Validates state transition and checks role authorization
 * @param {string} entityType 'TRANSFER' | 'REPAIR' | 'DISPOSAL' | 'PARTS_REQUEST'
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

  if (role !== USER_ROLES.ADMIN && !match.allowedRoles.includes(role)) {
    const err = new Error(
      `Vai trò '${role}' không có thẩm quyền chuyển ${entityType} từ '${currentStatus}' sang '${targetStatus}'. Yêu cầu vai trò: [${match.allowedRoles.join(', ')}].`
    );
    err.statusCode = 403;
    throw err;
  }

  return true;
}
