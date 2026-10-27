import { describe, expect, it } from 'vitest';
import { resolveRoomEquipments, resolveRoomProfile, resolveRoomStatus, summarizeRoomEquipment } from './roomPanel';

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

  it('never fabricates sample equipment when live data is unavailable', () => {
    const result = resolveRoomEquipments(sampleRoom, undefined, []);
    expect(result.source).toBe('none');
    expect(result.items).toEqual([]);
  });

  it('does not invent broken equipment from architectural sample status', () => {
    const result = resolveRoomEquipments({ ...sampleRoom, statusOverride: 'maintenance' }, undefined, []);
    expect(result.items).toEqual([]);
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

  it('marks missing live status as unknown', () => {
    expect(resolveRoomStatus(sampleRoom, undefined)).toMatchObject({ label: 'Chưa có dữ liệu', live: false });
    expect(resolveRoomStatus({ statusOverride: 'maintenance' }, undefined)).toMatchObject({ label: 'Chưa có dữ liệu', live: false });
  });
});

describe('summarizeRoomEquipment', () => {
  it('counts broken and repairing items', () => {
    expect(summarizeRoomEquipment([{ status: 'in_use' }, { status: 'broken' }, { status: 'repairing' }])).toBe('3 thiết bị • 2 hỏng');
    expect(summarizeRoomEquipment([{ status: 'in_use' }])).toBe('1 thiết bị');
    expect(summarizeRoomEquipment()).toBe('0 thiết bị');
  });
});

describe('resolveRoomProfile', () => {
  it('merges architectural function, spatial zone, and accurate type for PH 213 instead of generic office', () => {
    const pod = {
      code: 'A1-213',
      name: 'PH 213',
      floor: 2,
      room_type: 'office',
      capacity: 50,
      area: 65,
      description: ''
    };
    expect(resolveRoomProfile({ code: 'A1-213' }, pod, 2)).toEqual({
      code: 'A1-213',
      building: 'A1',
      floor: 2,
      name: 'PH 213',
      zoneLabel: 'Góc Đông Nam',
      functionLabel: 'Đồ Án Tốt Nghiệp',
      typeLabel: 'Nghiên cứu & Đồ án',
      capacityLabel: '50 chỗ',
      areaLabel: '65 m²'
    });
  });

  it('classifies restrooms and medical rooms accurately without showing 0 capacity', () => {
    const wcPod = { code: 'A1-WC-NU-T2', name: 'NVS Nữ', floor: 2, room_type: 'warehouse', capacity: 0, area: 25 };
    expect(resolveRoomProfile({ code: 'A1-WC-NU-T2' }, wcPod, 2)).toMatchObject({
      typeLabel: 'Khu vệ sinh',
      zoneLabel: 'Cánh Đông',
      functionLabel: 'Khu vệ sinh nữ Tầng 2',
      capacityLabel: 'Không xếp chỗ',
      areaLabel: '25 m²'
    });

    const medicalPod = { code: 'A1-YT-T3', name: 'Phòng Y Tế', floor: 3, room_type: 'warehouse', capacity: 15, area: 78 };
    expect(resolveRoomProfile({ code: 'A1-YT-T3' }, medicalPod, 3)).toMatchObject({
      typeLabel: 'Y tế học đường',
      zoneLabel: 'Dãy Nam Trung Tâm',
      functionLabel: 'Trạm Y Tế & Sơ Cấp Cứu',
      capacityLabel: '15 chỗ',
      areaLabel: '78 m²'
    });
  });

  it('honors custom database descriptions and unmapped rooms created via UC-2.2', () => {
    const customPod = {
      code: 'A1-601',
      name: 'Lab IoT Mới',
      floor: 6,
      room_type: 'lab',
      capacity: 40,
      area: 70,
      description: 'Phòng Lab IoT & Hệ thống nhúng'
    };
    expect(resolveRoomProfile({ code: 'A1-601' }, customPod, 6)).toEqual({
      code: 'A1-601',
      building: 'A1',
      floor: 6,
      name: 'Lab IoT Mới',
      zoneLabel: 'Tòa A1 • Tầng 6',
      functionLabel: 'Phòng Lab IoT & Hệ thống nhúng',
      typeLabel: 'Thực hành / Phòng Lab',
      capacityLabel: '40 chỗ',
      areaLabel: '70 m²'
    });
  });
});
