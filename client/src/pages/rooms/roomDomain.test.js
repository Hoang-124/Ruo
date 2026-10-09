import { describe, expect, it } from 'vitest';
import {
  buildCreateRoomPayload,
  createEmptyRoomForm,
  getFloorFromCode,
  getRoomStatusMeta,
  getRoomTypeLabel,
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
