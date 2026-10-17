import { getPodStatus } from '../../components/common/roomPod';

/**
 * Pure helpers for the Dashboard "room inspector" panel next to the CAD floor plan.
 * Priority of data: live database room (GET /facilities/cad-canvas) -> equipment list fetched by
 * the dashboard -> architectural sample data from CAMPUS_FLOORS. Kept free of React for unit tests.
 */

/**
 * Equipment shown for the selected room.
 * Returns { source: 'live' | 'equipment_list' | 'sample' | 'none', items }.
 * A live room is authoritative: an empty list there means the room really has no equipment,
 * so sample data is never mixed in.
 */
export const resolveRoomEquipments = (room, pod, equipmentsList = []) => {
  if (!room) return { source: 'none', items: [] };

  if (pod) return { source: 'live', items: pod.equipments || [] };

  const roomCode = String(room.code ?? '').toLowerCase();
  const roomName = String(room.name ?? '').toLowerCase();
  const matches = equipmentsList.filter((equipment) => {
    const code = String(equipment.room_id?.code || equipment.room_code || '').toLowerCase();
    const name = String(equipment.room_id?.name || '').toLowerCase();
    return (roomCode && code.includes(roomCode)) || (name && roomName.includes(name));
  });
  if (matches.length > 0) return { source: 'equipment_list', items: matches };

  const cleanCode = String(room.code ?? '').replace(/^A1-/, '');
  const underMaintenance = room.statusOverride === 'maintenance';
  const items = (room.equipments || []).map((name, idx) => ({
    _id: `room-eq-${idx}`,
    code: `${cleanCode || 'PH'}-EQ-${101 + idx}`,
    name,
    status: idx === 1 && underMaintenance ? 'repairing' : 'active',
    rRatio: idx === 1 && underMaintenance ? 62 : 12 + idx * 8
  }));
  return { source: items.length > 0 ? 'sample' : 'none', items };
};

/** Status text + colour for the selected room; live data wins over the sample override. */
export const resolveRoomStatus = (room, pod) => {
  if (pod) {
    const { label, color } = getPodStatus(pod.effectiveStatus);
    return { label, color, live: true };
  }
  const underMaintenance = room?.statusOverride === 'maintenance';
  return {
    label: underMaintenance ? 'Đang bảo trì' : 'Vận hành tốt',
    color: underMaintenance ? '#E5A33B' : '#2FB37A',
    live: false
  };
};

/** One-line equipment summary, e.g. "12 thiết bị • 2 hỏng". */
export const summarizeRoomEquipment = (items = []) => {
  const broken = items.filter((item) => item.status === 'broken' || item.status === 'repairing').length;
  return broken > 0 ? `${items.length} thiết bị • ${broken} hỏng` : `${items.length} thiết bị`;
};
