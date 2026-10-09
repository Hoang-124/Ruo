import { EQUIPMENT_STATUSES, REPAIR_STATUSES } from '../config/constants.js';

/**
 * Pure helpers for the Room Detail View (UC-2.3).
 * Kept free of database access so the summary maths can be unit-tested.
 */

export const HISTORY_LIMIT = 20;

const OPEN_REPAIR_STATUSES = new Set([
  REPAIR_STATUSES.REPORTED,
  REPAIR_STATUSES.ASSIGNED,
  REPAIR_STATUSES.IN_PROGRESS
]);

export const isOpenRepair = (repair) => OPEN_REPAIR_STATUSES.has(repair?.status);

/**
 * Summarises the equipment stationed in a room.
 * - byStatus: count per equipment status (every known status is present, zero when unused)
 * - needsAttention: broken or under repair
 * - openRepairs: repair tickets that are not yet resolved/closed
 */
export const summarizeRoomEquipment = (equipments = [], repairs = []) => {
  const byStatus = Object.fromEntries(Object.values(EQUIPMENT_STATUSES).map((status) => [status, 0]));
  for (const equipment of equipments) {
    if (equipment.status in byStatus) byStatus[equipment.status] += 1;
  }

  return {
    equipmentCount: equipments.length,
    byStatus,
    needsAttention: byStatus[EQUIPMENT_STATUSES.BROKEN] + byStatus[EQUIPMENT_STATUSES.REPAIRING],
    openRepairs: repairs.filter(isOpenRepair).length
  };
};
