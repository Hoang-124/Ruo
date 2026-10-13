import { EQUIPMENT_STATUSES, ROOM_STATUSES } from '../config/constants.js';

/**
 * Pure helpers for room lifecycle changes (UC-2.5 Deactivate Room, UC-2.6 Update Room Status).
 * No database access so the rules can be unit-tested in isolation.
 */

export const DEACTIVATION_REASON_MAX_LENGTH = 500;

// Equipment in these states is no longer physically stationed in the room.
const NOT_IN_ROOM_STATUSES = new Set([EQUIPMENT_STATUSES.DISPOSED, EQUIPMENT_STATUSES.LOST]);

/**
 * Equipment that must be moved out before a room can become INACTIVE.
 * Disposed or lost items are ignored because they are not in the room anymore.
 */
export const getBlockingEquipment = (equipments = []) =>
  equipments.filter((equipment) => !NOT_IN_ROOM_STATUSES.has(equipment?.status));

/** Compact projection of blocking equipment returned to the client. */
export const summarizeBlockingEquipment = (equipments = []) =>
  getBlockingEquipment(equipments).map((equipment) => ({
    _id: equipment._id,
    code: equipment.code,
    name: equipment.name,
    status: equipment.status
  }));

/**
 * UC-2.5 — validates the optional free-text reason that accompanies a deactivation.
 * Returns { valid, errors, reason } where `reason` is trimmed ('' when omitted).
 */
export const validateDeactivationPayload = (body = {}) => {
  const errors = {};
  let reason = '';

  if (body.reason !== undefined && body.reason !== null) {
    if (typeof body.reason !== 'string') {
      errors.reason = 'Lý do ngừng sử dụng phải là chuỗi ký tự.';
    } else {
      reason = body.reason.trim();
      if (reason.length > DEACTIVATION_REASON_MAX_LENGTH) {
        errors.reason = `Lý do ngừng sử dụng tối đa ${DEACTIVATION_REASON_MAX_LENGTH} ký tự.`;
      }
    }
  }

  return { valid: Object.keys(errors).length === 0, errors, reason };
};

/**
 * Decides whether a room may move to INACTIVE.
 * - already inactive            -> ALREADY_INACTIVE (409)
 * - still holds equipment       -> HAS_EQUIPMENT   (409) with the list of blockers
 * - otherwise                   -> allowed
 */
export const evaluateDeactivation = (room = {}, equipments = []) => {
  if (room.status === ROOM_STATUSES.INACTIVE) {
    return {
      allowed: false,
      reason: 'ALREADY_INACTIVE',
      message: `Phòng ${room.code} đã ở trạng thái ngừng sử dụng.`,
      blockers: []
    };
  }

  const blockers = summarizeBlockingEquipment(equipments);
  if (blockers.length > 0) {
    return {
      allowed: false,
      reason: 'HAS_EQUIPMENT',
      message: `Phòng ${room.code} vẫn còn ${blockers.length} thiết bị. Vui lòng điều chuyển toàn bộ thiết bị ra khỏi phòng trước khi ngừng sử dụng.`,
      blockers
    };
  }

  return { allowed: true, reason: null, message: '', blockers: [] };
};
