import { BUSINESS_HOURS, SLA_STATES, TICKET_PRIORITIES } from '../config/constants.js';

/**
 * SLA Reactor Service
 * Handles business-hour aware SLA calculation, real-time remaining countdown,
 * and automated state transitions (on_track -> at_risk -> overdue).
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
      // Jump to start of today's business hours
      current.setHours(BUSINESS_HOURS.START_HOUR, BUSINESS_HOURS.START_MINUTE, 0, 0);
      continue;
    }

    if (currentTotalMin >= endTotalMin) {
      // After hours, advance to tomorrow 07:30
      current.setDate(current.getDate() + 1);
      current.setHours(BUSINESS_HOURS.START_HOUR, BUSINESS_HOURS.START_MINUTE, 0, 0);
      continue;
    }

    // Inside business hours
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
 * Calculate SLA deadlines for a newly reported incident
 */
export function computeSlaDeadlines(priority, startTime = new Date()) {
  const isCritical = priority === TICKET_PRIORITIES.CRITICAL;

  // 1. Response Deadline
  let responseMinutes = 30; // default 30 mins to acknowledge
  let resolutionMinutes = 240; // 4 hours for critical

  if (priority === TICKET_PRIORITIES.HIGH) {
    responseMinutes = 60;
    resolutionMinutes = 8 * 60; // 8 hours
  } else if (priority === TICKET_PRIORITIES.MEDIUM) {
    responseMinutes = 120;
    resolutionMinutes = 24 * 60; // 24 hours
  } else if (priority === TICKET_PRIORITIES.LOW) {
    responseMinutes = 240;
    resolutionMinutes = 48 * 60; // 48 hours
  }

  let responseDeadline;
  let resolutionDeadline;

  if (isCritical) {
    // Critical incidents run 24/7 calendar clock without pausing
    responseDeadline = new Date(startTime.getTime() + responseMinutes * 60 * 1000);
    resolutionDeadline = new Date(startTime.getTime() + resolutionMinutes * 60 * 1000);
  } else {
    // Other priorities respect official university working hours
    responseDeadline = addBusinessMinutes(startTime, responseMinutes);
    resolutionDeadline = addBusinessMinutes(startTime, resolutionMinutes);
  }

  return {
    slaStartTime: startTime,
    responseDeadline,
    resolutionDeadline,
    totalMinutes: resolutionMinutes
  };
}

/**
 * Evaluate real-time SLA countdown and state
 */
export function evaluateSlaStatus(slaTracking, now = new Date()) {
  if (!slaTracking || !slaTracking.resolutionDeadline) {
    return { remainingMinutes: 0, state: SLA_STATES.ON_TRACK };
  }

  // Calculate actual difference in calendar minutes
  const diffMs = new Date(slaTracking.resolutionDeadline).getTime() - now.getTime();
  const remainingMinutes = Math.round(diffMs / (60 * 1000));

  let state = SLA_STATES.ON_TRACK;

  if (remainingMinutes <= 0) {
    state = SLA_STATES.OVERDUE;
  } else if (remainingMinutes <= 60) {
    state = SLA_STATES.AT_RISK;
  } else {
    state = SLA_STATES.ON_TRACK;
  }

  return {
    remainingMinutes,
    state
  };
}
