import { getPodStatus, getEquivalentRoomCode } from '../../components/common/roomPod';
import { CAMPUS_FLOORS, ROOM_CATEGORIES } from '../../mock/campusBuildingData';

/**
 * Pure helpers for the Dashboard "room inspector" panel next to the CAD floor plan.
 * Priority of data: live database room (GET /facilities/cad-canvas) -> equipment list fetched by
 * the dashboard. Architectural sample data is never used as operational equipment data.
 */

const ARCHITECTURAL_ROOM_INDEX = (() => {
  const index = new Map();
  Object.values(CAMPUS_FLOORS).forEach((floorData) => {
    const rooms = [
      ...(floorData?.topRooms || []),
      ...(floorData?.bottomRooms || []),
      ...(floorData?.wingRooms || [])
    ];
    rooms.forEach((room) => {
      if (!room?.code) return;
      index.set(String(room.code).toUpperCase(), room);
      const eq = getEquivalentRoomCode(room.code);
      if (eq) index.set(String(eq).toUpperCase(), room);
    });
  });
  return index;
})();

const DB_ROOM_TYPE_LABELS = {
  lecture: 'Phòng học lý thuyết',
  lab: 'Thực hành / Phòng Lab',
  office: 'Văn phòng / Hành chính',
  warehouse: 'Kho vật tư'
};

const FUNCTION_REWRITES = {
  'Gộp PH & PTH 1': 'Phòng Học & Tự Học liên thông',
  'Gộp PTH 2 & 3': 'Phòng Tự Học Lớn mở rộng',
  'To bằng PTH 2': 'Giảng đường & Phòng học lớn',
  'Lý thuyết': 'Giảng dạy lý thuyết tập trung',
  'Nghiên Cứu': 'Nghiên cứu chuyên đề & học thuật',
  'Tụ tập nói chuyện sau giờ học': 'Sinh hoạt chung & Giao lưu sinh viên'
};

const inferZoneByCode = (upperCode, floor) => {
  if (upperCode === 'A1-PTV') return 'Dãy Bắc Trung Tâm';
  if (upperCode === 'A1-K1' || upperCode === 'A1-K2') return 'Góc Đông Bắc';
  if (upperCode === 'A1-KHO-TAY') return 'Cánh Tây';
  if (upperCode === 'A1-CV') return 'Mặt Nam Trung Tâm';
  if (upperCode.includes('WC') || upperCode.includes('NVS')) return 'Cánh Đông';
  return `Tòa A1 • Tầng ${floor}`;
};

const parseArchitecturalSubName = (subName, upperCode, floor) => {
  const raw = String(subName || '').trim();
  if (!raw) {
    return { zoneLabel: inferZoneByCode(upperCode, floor), functionText: '' };
  }
  if (raw.includes('•')) {
    const [left, ...rest] = raw.split('•');
    const cleanedZone = left.replace(/\s*\([^)]*\)/g, '').trim() || inferZoneByCode(upperCode, floor);
    const rawFunc = rest.join('•').trim();
    return {
      zoneLabel: cleanedZone,
      functionText: FUNCTION_REWRITES[rawFunc] || rawFunc
    };
  }
  return {
    zoneLabel: inferZoneByCode(upperCode, floor),
    functionText: FUNCTION_REWRITES[raw] || raw
  };
};

const resolveTypeLabel = (upperCode, template, pod, functionText) => {
  if (upperCode.includes('WC') || upperCode.includes('NVS')) return 'Khu vệ sinh';
  if (upperCode.includes('YT')) return 'Y tế học đường';
  if (upperCode === 'A1-PTV') return 'Thư viện';
  if (upperCode === 'A1-CV' || upperCode === 'A1-SBC' || upperCode === 'A1-501') return 'Không gian chung';

  if (template) {
    if (template.category === 'utility') return 'Kho vật tư';
    if (template.category === 'lab') return 'Thực hành / Phòng Lab';
    if (template.category === 'event' || upperCode === 'A1-PHT') return 'Hội thảo / Chuyên đề';
    if (template.category === 'public_service') {
      if (/tiếp sinh viên|tư vấn|tài vụ/i.test(functionText)) return 'Hành chính / Sinh viên';
      return 'Phòng học thông minh';
    }
    if (template.category === 'admin') {
      if (/văn phòng|đào tạo|khảo thí|phòng họp|giáo viên/i.test(functionText)) {
        return 'Văn phòng / Hành chính';
      }
      return 'Nghiên cứu & Đồ án';
    }
    if (template.category === 'academic') return 'Phòng học lý thuyết';
  }

  return DB_ROOM_TYPE_LABELS[pod?.room_type]
    || ROOM_CATEGORIES[template?.category]?.name
    || 'Phòng chức năng';
};

/**
 * Resolves unified room metadata (code, name, spatial zone, specific function,
 * accurate classification, capacity, and floor area) for the right-hand inspector panel.
 */
export const resolveRoomProfile = (room, pod, fallbackFloor = 1) => {
  if (!room && !pod) return null;

  const rawCode = String(pod?.code || room?.code || '').trim();
  const upperCode = rawCode.toUpperCase();
  const eqCode = getEquivalentRoomCode(upperCode);
  const template = ARCHITECTURAL_ROOM_INDEX.get(upperCode)
    || (eqCode ? ARCHITECTURAL_ROOM_INDEX.get(String(eqCode).toUpperCase()) : undefined);

  const building = pod?.building || 'A1';
  const floor = pod?.floor ?? room?.floor ?? template?.floor ?? fallbackFloor;
  const name = pod?.name || room?.name || template?.name || 'Thông Tin Phòng Học';

  const { zoneLabel, functionText } = parseArchitecturalSubName(
    template?.subName || room?.subName,
    upperCode,
    floor
  );
  const typeLabel = resolveTypeLabel(upperCode, template, pod, functionText);
  const customDescription = String(pod?.description || '').trim();
  const functionLabel = customDescription || functionText || typeLabel;

  const rawCapacity = pod?.capacity ?? room?.capacity ?? template?.capacity;
  const isUtilitySpace = template?.category === 'utility'
    || upperCode.includes('WC')
    || upperCode.includes('KHO')
    || pod?.room_type === 'warehouse';
  const capacityLabel = rawCapacity > 0
    ? `${rawCapacity} chỗ`
    : (rawCapacity === 0 || isUtilitySpace)
      ? 'Không xếp chỗ'
      : 'Chưa rõ';

  const rawArea = pod?.area ?? room?.area ?? template?.area;
  const areaLabel = rawArea != null && rawArea > 0 ? `${rawArea} m²` : 'Chưa rõ';

  return {
    code: rawCode || '—',
    building,
    floor,
    name,
    zoneLabel,
    functionLabel,
    typeLabel,
    capacityLabel,
    areaLabel
  };
};

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
