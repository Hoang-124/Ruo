import { describe, expect, it } from 'vitest';
import { resolveRoomEquipments, resolveRoomStatus, summarizeRoomEquipment } from './roomPanel';

const sampleRoom = { code: 'A1-202', name: 'PH 202', equipments: ['Máy chiếu', 'Điều hòa'], statusOverride: undefined };

describe('resolveRoomEquipments (CAD front page)', () => {
  it('returns nothing when no room is selected', () => {
    expect(resolveRoomEquipments(null, undefined, [])).toEqual({ source: 'none', items: [] });
  });

  it('uses the live database equipment and never mixes in sample data', () => {
    const pod = { equipments: [{ _id: '1', code: 'E1', name: 'Máy chiếu', status: 'in_use' }] };
    expect(resolveRoomEquipments(sampleRoom, pod, [])).toEqual({ source: 'live', items: pod.equipments });
    expect(resolveRoomEquipments(sampleRoom, { equipments: [] }, [{ room_code: 'A1-202' }])).toEqual({ source: 'live', items: [] });
  });

  it('falls back to the dashboard equipment list matched by room code or name', () => {
    const list = [
      { _id: 'a', room_id: { code: 'A1-202', name: 'PH 202' } },
      { _id: 'b', room_id: { code: 'A1-999', name: 'Khác' } },
      { _id: 'c', room_code: 'a1-202' }
    ];
    const result = resolveRoomEquipments(sampleRoom, undefined, list);
    expect(result.source).toBe('equipment_list');
    expect(result.items.map((item) => item._id)).toEqual(['a', 'c']);
  });

  it('falls back to architectural sample equipment as a last resort', () => {
    const result = resolveRoomEquipments(sampleRoom, undefined, []);
    expect(result.source).toBe('sample');
    expect(result.items.map((item) => item.name)).toEqual(['Máy chiếu', 'Điều hòa']);
    expect(result.items[0].code).toBe('202-EQ-101');
  });

  it('marks the second sample item as repairing when the sample room is in maintenance', () => {
    const result = resolveRoomEquipments({ ...sampleRoom, statusOverride: 'maintenance' }, undefined, []);
    expect(result.items[1].status).toBe('repairing');
    expect(result.items[0].status).toBe('active');
  });

  it('reports none for a room with no live data and no sample equipment', () => {
    expect(resolveRoomEquipments({ code: 'A1-X', equipments: [] }, undefined, [])).toEqual({ source: 'none', items: [] });
  });
});

describe('resolveRoomStatus', () => {
  it('prefers the live effective status', () => {
    expect(resolveRoomStatus(sampleRoom, { effectiveStatus: 'maintenance' })).toMatchObject({ label: 'Đang bảo trì', live: true });
    expect(resolveRoomStatus(sampleRoom, { effectiveStatus: 'inactive' })).toMatchObject({ label: 'Ngừng sử dụng', live: true });
    expect(resolveRoomStatus(sampleRoom, { effectiveStatus: 'available' })).toMatchObject({ label: 'Sẵn sàng', live: true });
  });

  it('falls back to the sample override without live data', () => {
    expect(resolveRoomStatus(sampleRoom, undefined)).toMatchObject({ label: 'Vận hành tốt', live: false });
    expect(resolveRoomStatus({ statusOverride: 'maintenance' }, undefined)).toMatchObject({ label: 'Đang bảo trì', live: false });
  });
});

describe('summarizeRoomEquipment', () => {
  it('counts broken and repairing items', () => {
    expect(summarizeRoomEquipment([{ status: 'in_use' }, { status: 'broken' }, { status: 'repairing' }])).toBe('3 thiết bị • 2 hỏng');
    expect(summarizeRoomEquipment([{ status: 'in_use' }])).toBe('1 thiết bị');
    expect(summarizeRoomEquipment()).toBe('0 thiết bị');
  });
});
