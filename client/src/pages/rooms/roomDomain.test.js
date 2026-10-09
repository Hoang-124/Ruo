import { describe, expect, it } from 'vitest';
import {
  EMPTY_ROOM_FILTERS,
  buildCreateRoomPayload,
  buildRoomListParams,
  buildUpdateRoomPayload,
  createEmptyRoomForm,
  formatDateTime,
  getEquipmentStatusLabel,
  getFloorFromCode,
  getMovementStatusLabel,
  getMovementTypeLabel,
  getPageWindow,
  getRepairStatusLabel,
  getRoomStatusMeta,
  getRoomTypeLabel,
  hasActiveRoomFilters,
  roomToForm,
  validateRoomForm
} from './roomDomain';

const validForm = () => ({
  code: 'p203',
  name: 'Phòng 203',
  floor: '2',
  room_type: 'lab',
  capacity: '40',
  description: ''
});

describe('roomDomain', () => {
  it('derives the floor from a valid code only', () => {
    expect(getFloorFromCode('P508')).toBe(5);
    expect(getFloorFromCode(' p101 ')).toBe(1);
    expect(getFloorFromCode('P601')).toBeNull();
    expect(getFloorFromCode('A1-101')).toBeNull();
  });

  it('accepts a valid create form', () => {
    expect(validateRoomForm(validForm())).toEqual({});
  });

  it('requires every mandatory field on the empty form', () => {
    const errors = validateRoomForm(createEmptyRoomForm());
    expect(Object.keys(errors).sort()).toEqual(['capacity', 'code', 'name']);
  });

  it('rejects codes outside P101-P508', () => {
    for (const code of ['P001', 'P109', 'P601', 'A1-101', '101']) {
      expect(validateRoomForm({ ...validForm(), code }).code).toBeTruthy();
    }
  });

  it('rejects a floor that does not match the code', () => {
    const errors = validateRoomForm({ ...validForm(), code: 'P301', floor: '2' });
    expect(errors.floor).toMatch(/tầng 3/);
  });

  it('rejects floors outside 1-5 and invalid capacities', () => {
    expect(validateRoomForm({ ...validForm(), floor: '6' }).floor).toBeTruthy();
    for (const capacity of ['0', '-1', '501', '1.5', 'abc']) {
      expect(validateRoomForm({ ...validForm(), capacity }).capacity).toBeTruthy();
    }
  });

  it('builds a normalized payload', () => {
    expect(buildCreateRoomPayload({ ...validForm(), name: '  Phòng 203  ' })).toEqual({
      code: 'P203',
      name: 'Phòng 203',
      building: 'A1',
      floor: 2,
      room_type: 'lab',
      capacity: 40,
      description: ''
    });
  });

  it('labels types and statuses with a safe fallback', () => {
    expect(getRoomTypeLabel('lab')).toBe('Phòng thực hành (Lab)');
    expect(getRoomTypeLabel('mystery')).toBe('mystery');
    expect(getRoomStatusMeta('maintenance').label).toBe('Đang bảo trì');
    expect(getRoomStatusMeta('weird').label).toBe('weird');
  });
});

describe('room list helpers (UC-2.2)', () => {
  it('drops blank filters and trims the search keyword', () => {
    expect(buildRoomListParams(EMPTY_ROOM_FILTERS)).toEqual({ page: 1, limit: 10 });
    expect(
      buildRoomListParams({ q: '  p10 ', floor: '3', room_type: 'lab', status: 'available' }, 2, 5)
    ).toEqual({ page: 2, limit: 5, q: 'p10', floor: '3', room_type: 'lab', status: 'available' });
  });

  it('detects whether any filter is active', () => {
    expect(hasActiveRoomFilters(EMPTY_ROOM_FILTERS)).toBe(false);
    expect(hasActiveRoomFilters({ ...EMPTY_ROOM_FILTERS, floor: '2' })).toBe(true);
    expect(hasActiveRoomFilters({ ...EMPTY_ROOM_FILTERS, q: '   ' })).toBe(false);
  });

  it('builds a compact page window with ellipsis gaps', () => {
    expect(getPageWindow(1, 1)).toEqual([1]);
    expect(getPageWindow(1, 3)).toEqual([1, 2, 3]);
    expect(getPageWindow(1, 10)).toEqual([1, 2, null, 10]);
    expect(getPageWindow(5, 10)).toEqual([1, null, 4, 5, 6, null, 10]);
    expect(getPageWindow(10, 10)).toEqual([1, null, 9, 10]);
  });
});

describe('room detail helpers (UC-2.3)', () => {
  it('translates equipment, repair and movement states with fallbacks', () => {
    expect(getEquipmentStatusLabel('in_use')).toBe('Đang sử dụng');
    expect(getEquipmentStatusLabel('???')).toBe('???');
    expect(getRepairStatusLabel('in_progress')).toBe('Đang sửa');
    expect(getMovementTypeLabel('to_stock')).toBe('Nhập kho');
    expect(getMovementStatusLabel('pending')).toBe('Chờ thực hiện');
    expect(getMovementStatusLabel(undefined)).toBe('—');
  });

  it('formats dates safely', () => {
    expect(formatDateTime(null)).toBe('—');
    expect(formatDateTime('not-a-date')).toBe('—');
    expect(formatDateTime('2026-03-05T08:30:00')).toMatch(/05\/03\/2026/);
  });
});

describe('room edit helpers (UC-2.4)', () => {
  const room = { code: 'P203', name: 'Phòng 203', floor: 2, room_type: 'lab', capacity: 40, description: '' };

  it('pre-fills the form from a stored room', () => {
    expect(roomToForm(room)).toEqual({
      code: 'P203', name: 'Phòng 203', floor: '2', room_type: 'lab', capacity: '40', description: ''
    });
    expect(roomToForm({ ...room, description: undefined }).description).toBe('');
  });

  it('does not validate the immutable code/floor in edit mode', () => {
    const form = { ...roomToForm(room), code: 'LEGACY-1', floor: '9' };
    expect(validateRoomForm(form, 'edit')).toEqual({});
    expect(validateRoomForm(form, 'create').code).toBeTruthy();
  });

  it('still validates editable fields in edit mode', () => {
    const errors = validateRoomForm({ ...roomToForm(room), name: ' ', capacity: '0' }, 'edit');
    expect(Object.keys(errors).sort()).toEqual(['capacity', 'name']);
  });

  it('sends only the fields that changed', () => {
    expect(buildUpdateRoomPayload(roomToForm(room), room)).toEqual({});
    expect(
      buildUpdateRoomPayload({ ...roomToForm(room), name: ' Lab 203 ', capacity: '45', description: 'Thực hành' }, room)
    ).toEqual({ name: 'Lab 203', capacity: 45, description: 'Thực hành' });
    expect(buildUpdateRoomPayload({ ...roomToForm(room), room_type: 'lecture' }, room)).toEqual({ room_type: 'lecture' });
  });
});
