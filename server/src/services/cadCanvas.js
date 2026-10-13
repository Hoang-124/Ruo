import { EQUIPMENT_STATUSES, ROOM_RULES, ROOM_STATUSES } from '../config/constants.js';
import { getBlockingEquipment } from './roomStatus.js';
import { toInteger } from './roomValidation.js';

/**
 * Pure helpers for the interactive CAD floor plan (UC-2.7 room pod card).
 * No database access so the summary rules can be unit-tested.
 */

const NEEDS_ATTENTION = new Set([EQUIPMENT_STATUSES.BROKEN, EQUIPMENT_STATUSES.REPAIRING]);

/**
 * Summarises one room for its CAD pod card.
 *  - equipments     : items physically in the room (disposed / lost are left out)
 *  - equipmentCount : size of that list
 *  - brokenCount    : broken or under repair
 *  - effectiveStatus: INACTIVE always wins; otherwise MAINTENANCE when the room is in maintenance
 *                     or any equipment needs attention; otherwise the stored status
 */
export const summarizeCadRoom = (room = {}, equipments = []) => {
  const present = getBlockingEquipment(equipments);
  const brokenCount = present.filter((equipment) => NEEDS_ATTENTION.has(equipment.status)).length;

  let effectiveStatus = room.status || ROOM_STATUSES.AVAILABLE;
  if (effectiveStatus !== ROOM_STATUSES.INACTIVE && brokenCount > 0) {
    effectiveStatus = ROOM_STATUSES.MAINTENANCE;
  }

  return { equipments: present, equipmentCount: present.length, brokenCount, effectiveStatus };
};

/**
 * Validates the GET /facilities/cad-canvas query.
 * building defaults to A1, floor to 3 (legacy default); floor must be an integer 1-5.
 * Returns { valid, errors, buildingCode, floorNumber }.
 */
export const parseCadCanvasQuery = (query = {}) => {
  const errors = {};
  const buildingCode = String(query.buildingCode ?? ROOM_RULES.BUILDING).trim().toUpperCase();
  if (!buildingCode) errors.buildingCode = 'Vui lòng nhập mã tòa nhà.';

  const rawFloor = query.floorNumber ?? 3;
  const floorNumber = toInteger(rawFloor);
  if (Number.isNaN(floorNumber) || floorNumber < ROOM_RULES.MIN_FLOOR || floorNumber > ROOM_RULES.MAX_FLOOR) {
    errors.floorNumber = `Tầng phải là số nguyên từ ${ROOM_RULES.MIN_FLOOR} đến ${ROOM_RULES.MAX_FLOOR}.`;
  }

  return { valid: Object.keys(errors).length === 0, errors, buildingCode, floorNumber };
};
