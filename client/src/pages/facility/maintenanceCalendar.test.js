import { describe, expect, it } from 'vitest';
import {
  getCalendarDateKey,
  getMaintenanceCalendarDays,
  getMaintenanceOccurrencesForMonth,
  getMaintenancePlanDetails
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

  it('summarizes building scope, exact rooms, equipment categories, and matching equipment count', () => {
    const plan = {
      building: 'A1',
      floor: 2,
      room_ids: [
        { _id: 'room-1', code: 'P201' },
        { _id: 'room-2', code: 'P202' }
      ],
      category_ids: [{ _id: 'category-1', name: 'Máy chiếu' }]
    };
    const equipment = [
      { room_id: { _id: 'room-1' }, category_id: { _id: 'category-1' } },
      { room_id: { _id: 'room-2' }, category_id: { _id: 'category-1' } },
      { room_id: { _id: 'room-2' }, category_id: { _id: 'category-2' } },
      { room_id: { _id: 'room-3' }, category_id: { _id: 'category-1' } }
    ];

    expect(getMaintenancePlanDetails(plan, equipment)).toEqual({
      roomNames: ['P201', 'P202'],
      roomLabel: 'P201, P202',
      categoryNames: ['Máy chiếu'],
      categoryLabel: 'Máy chiếu',
      equipmentCount: 2
    });
  });

  it('labels an unfiltered plan as covering all equipment categories', () => {
    const details = getMaintenancePlanDetails({
      room_ids: [{ _id: 'room-1', code: 'P101' }],
      category_ids: []
    });

    expect(details.roomLabel).toBe('P101');
    expect(details.categoryLabel).toBe('Tất cả loại thiết bị');
  });
});
