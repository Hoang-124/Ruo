import { EQUIPMENT_STATUSES, ROOM_STATUSES } from '../config/constants.js';
import { getBlockingEquipment } from './roomStatus.js';

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
