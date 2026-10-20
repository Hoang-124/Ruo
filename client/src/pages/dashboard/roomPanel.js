import { getPodStatus, getEquivalentRoomCode } from '../../components/common/roomPod';

/**
 * Pure helpers for the Dashboard "room inspector" panel next to the CAD floor plan.
 * Priority of data: live database room (GET /facilities/cad-canvas) -> equipment list fetched by
 * the dashboard. Architectural sample data is never used as operational equipment data.
 */

/**
 * Equipment shown for the selected room.
 * Returns { source: 'live' | 'equipment_list' | 'none', items }.
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
    return (roomCode && (code === roomCode || getEquivalentRoomCode(code).toLowerCase() === roomCode)) || (!code && name && roomName === name);
  });
  if (matches.length > 0) return { source: 'equipment_list', items: matches };

  return { source: 'none', items: [] };
};

/** Unknown live status must never be presented as a healthy room. */
export const resolveRoomStatus = (room, pod) => {
  if (pod) {
    const { label, color } = getPodStatus(pod.effectiveStatus);
    return { label, color, live: true };
  }
  return {
    label: 'Chưa có dữ liệu',
    color: '#8A93A3',
    live: false
  };
};

/** One-line equipment summary, e.g. "12 thiết bị • 2 hỏng". */
export const summarizeRoomEquipment = (items = []) => {
  const broken = items.filter((item) => item.status === 'broken' || item.status === 'repairing').length;
  return broken > 0 ? `${items.length} thiết bị • ${broken} hỏng` : `${items.length} thiết bị`;
};
