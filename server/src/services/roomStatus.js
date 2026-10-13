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

// UC-2.6 — every status can move to either of the other two (AVAILABLE <-> MAINTENANCE <-> INACTIVE).
export const ROOM_STATUS_TRANSITIONS = {
  [ROOM_STATUSES.AVAILABLE]: [ROOM_STATUSES.MAINTENANCE, ROOM_STATUSES.INACTIVE],
  [ROOM_STATUSES.MAINTENANCE]: [ROOM_STATUSES.AVAILABLE, ROOM_STATUSES.INACTIVE],
  [ROOM_STATUSES.INACTIVE]: [ROOM_STATUSES.AVAILABLE, ROOM_STATUSES.MAINTENANCE]
};

export const getAllowedRoomStatuses = (current) => ROOM_STATUS_TRANSITIONS[current] || [];

/**
 * UC-2.6 Update Room Status.
 * Returns { ok, httpStatus, code, message, errors, blockers, target, reason }.
 *  - 400 INVALID_PAYLOAD      : missing/unknown status or bad reason
 *  - 409 NO_CHANGE            : room already has the requested status
 *  - 409 INVALID_TRANSITION   : move not allowed by ROOM_STATUS_TRANSITIONS
 *  - 409 HAS_EQUIPMENT        : moving to INACTIVE while equipment is still stationed in the room
 */
export const evaluateStatusChange = (body = {}, room = {}, equipments = []) => {
  const fail = (httpStatus, code, message, extra = {}) => ({
    ok: false, httpStatus, code, message, errors: {}, blockers: [], target: null, reason: '', ...extra
  });

  const target = typeof body.status === 'string' ? body.status.trim() : '';
  if (!target) {
    const message = 'Vui lòng chọn trạng thái mới của phòng.';
    return fail(400, 'INVALID_PAYLOAD', message, { errors: { status: message } });
  }
  if (!Object.values(ROOM_STATUSES).includes(target)) {
    const message = `Trạng thái phòng không hợp lệ. Chấp nhận: ${Object.values(ROOM_STATUSES).join(', ')}.`;
    return fail(400, 'INVALID_PAYLOAD', message, { errors: { status: message } });
  }

  const payload = validateDeactivationPayload(body);
  if (!payload.valid) {
    return fail(400, 'INVALID_PAYLOAD', Object.values(payload.errors)[0], { errors: payload.errors });
  }

  if (room.status === target) {
    return fail(409, 'NO_CHANGE', `Phòng ${room.code} đã ở trạng thái này.`);
  }
  if (!getAllowedRoomStatuses(room.status).includes(target)) {
    return fail(409, 'INVALID_TRANSITION', `Không thể chuyển phòng ${room.code} từ "${room.status}" sang "${target}".`);
  }

  if (target === ROOM_STATUSES.INACTIVE) {
    const decision = evaluateDeactivation(room, equipments);
    if (!decision.allowed) return fail(409, decision.reason, decision.message, { blockers: decision.blockers });
  }

  return { ok: true, httpStatus: 200, code: null, message: '', errors: {}, blockers: [], target, reason: payload.reason };
};

export const ROOM_STATUS_LABELS = {
  [ROOM_STATUSES.AVAILABLE]: 'Sẵn sàng',
  [ROOM_STATUSES.MAINTENANCE]: 'Đang bảo trì',
  [ROOM_STATUSES.INACTIVE]: 'Ngừng sử dụng'
};
