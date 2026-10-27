import { describe, expect, it } from 'vitest';
import {
  getCalendarDateKey,
  getMaintenanceCalendarDays,
  getMaintenanceOccurrencesForMonth
} from './maintenanceCalendar';

describe('preventive maintenance calendar', () => {
  it('creates a Monday-first six-week grid with stable date keys', () => {
    const days = getMaintenanceCalendarDays(2026, 9);

    expect(days).toHaveLength(42);
    expect(days[0].key).toBe('2026-09-28');
    expect(days[0].date.getUTCDay()).toBe(1);
    expect(days.find((day) => day.key === '2026-10-20').isCurrentMonth).toBe(true);
    expect(getCalendarDateKey(new Date(Date.UTC(2026, 9, 20)))).toBe('2026-10-20');
  });

  it('places monthly and quarterly plans on their recurrence day', () => {
    const plans = [
      { _id: 'monthly', start_date: '2026-10-20T00:00:00.000Z', frequency: 'monthly' },
      { _id: 'quarterly', start_date: '2026-10-20T00:00:00.000Z', frequency: 'quarterly' }
    ];

    const november = getMaintenanceOccurrencesForMonth(plans, 2026, 10);
    const january = getMaintenanceOccurrencesForMonth(plans, 2027, 0);

    expect(november.get('2026-11-20').map((plan) => plan._id)).toEqual(['monthly']);
    expect(january.get('2027-01-20').map((plan) => plan._id)).toEqual(['monthly', 'quarterly']);
  });

  it('clamps month-end dates and excludes months before a plan starts', () => {
    const plan = { _id: 'month-end', start_date: '2026-01-31T00:00:00.000Z', frequency: 'monthly' };

    expect(getMaintenanceOccurrencesForMonth([plan], 2025, 11).size).toBe(0);
    expect(getMaintenanceOccurrencesForMonth([plan], 2026, 1).get('2026-02-28')).toEqual([plan]);
    expect(getMaintenanceOccurrencesForMonth([plan], 2026, 2).get('2026-03-31')).toEqual([plan]);
  });
});