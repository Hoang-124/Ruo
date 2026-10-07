import { BUSINESS_HOURS, DAMAGE_LEVELS } from '../config/constants.js';

export const SLA_STATES = {
  ON_TRACK: 'on_track',
  AT_RISK: 'at_risk',
  OVERDUE: 'overdue'
};

/**
 * SLA Reactor Service
 * Handles business-hour aware SLA calculation, real-time remaining countdown,
 * and deadline computation for damage levels (minor, major, critical).
 */

/**
 * Add business minutes to a starting date
 * Business hours: 07:30 - 17:00 (570 minutes / day), Monday through Friday
 */
export function addBusinessMinutes(startDate, minutesToAdd) {
  let current = new Date(startDate);
  let remaining = minutesToAdd;

  while (remaining > 0) {
    const day = current.getDay(); // 0 = Sun, 6 = Sat
    const isWorkingDay = BUSINESS_HOURS.WORKING_DAYS.includes(day);

    if (!isWorkingDay) {
      // Advance to next Monday 07:30
      current.setDate(current.getDate() + 1);
      current.setHours(BUSINESS_HOURS.START_HOUR, BUSINESS_HOURS.START_MINUTE, 0, 0);
      continue;
    }

    const currentHour = current.getHours();
    const currentMin = current.getMinutes();
    const currentTotalMin = currentHour * 60 + currentMin;
    const startTotalMin = BUSINESS_HOURS.START_HOUR * 60 + BUSINESS_HOURS.START_MINUTE;
    const endTotalMin = BUSINESS_HOURS.END_HOUR * 60 + BUSINESS_HOURS.END_MINUTE;

    if (currentTotalMin < startTotalMin) {
      current.setHours(BUSINESS_HOURS.START_HOUR, BUSINESS_HOURS.START_MINUTE, 0, 0);
      continue;
    }

    if (currentTotalMin >= endTotalMin) {
      current.setDate(current.getDate() + 1);
      current.setHours(BUSINESS_HOURS.START_HOUR, BUSINESS_HOURS.START_MINUTE, 0, 0);
      continue;
    }

    const availableToday = endTotalMin - currentTotalMin;
    if (remaining <= availableToday) {
      current = new Date(current.getTime() + remaining * 60 * 1000);
      remaining = 0;
    } else {
      remaining -= availableToday;
      current.setDate(current.getDate() + 1);
      current.setHours(BUSINESS_HOURS.START_HOUR, BUSINESS_HOURS.START_MINUTE, 0, 0);
    }
  }

  return current;
}

/**
 * Compute deadline from damage level (or priority):
 * - critical: 8 hours (24/7 calendar clock)
 * - major / high: 24 business hours
 * - minor / low: 48 business hours
 */
export function computeDeadline(damageLevel = DAMAGE_LEVELS.MINOR, startTime = new Date()) {
  const isCritical = damageLevel === DAMAGE_LEVELS.CRITICAL || damageLevel === 'critical';
  const isMajor = damageLevel === DAMAGE_LEVELS.MAJOR || damageLevel === 'high' || damageLevel === 'major';

  let resolutionMinutes = 48 * 60; // 48h
  if (isCritical) {
    resolutionMinutes = 8 * 60; // 8h
    return new Date(startTime.getTime() + resolutionMinutes * 60 * 1000);
  } else if (isMajor) {
    resolutionMinutes = 24 * 60; // 24h
  }

  return addBusinessMinutes(startTime, resolutionMinutes);
}

/**
 * Evaluate real-time SLA countdown and state
 */
export function evaluateSlaStatus(deadline, now = new Date()) {
  if (!deadline) {
    return { remainingMinutes: 0, state: SLA_STATES.ON_TRACK };
  }

  const diffMs = new Date(deadline).getTime() - now.getTime();
  const remainingMinutes = Math.round(diffMs / (60 * 1000));

  let state = SLA_STATES.ON_TRACK;
  if (remainingMinutes <= 0) {
    state = SLA_STATES.OVERDUE;
  } else if (remainingMinutes <= 120) { // under 2h: at risk
    state = SLA_STATES.AT_RISK;
  }

  return {
    remainingMinutes,
    state
  };
}

export default { addBusinessMinutes, computeDeadline, evaluateSlaStatus, SLA_STATES };
