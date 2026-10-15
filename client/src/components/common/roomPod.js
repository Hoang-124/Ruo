/**
 * Pure helpers for the interactive CAD room pod card (UC-2.7).
 * Kept free of React so the data mapping and geometry can be unit-tested.
 */

export const POD_HEIGHT = 15;
export const POD_MARGIN = 6;
const POD_CHIP_GAP = 3;
const POD_CHAR_WIDTH = 5.9;
const POD_CHIP_PADDING = 10;

export const POD_STATUS_STYLES = {
  available: { color: '#10B981', label: 'Sẵn sàng' },
  maintenance: { color: '#F59E0B', label: 'Đang bảo trì' },
  inactive: { color: '#8A93A3', label: 'Ngừng sử dụng' }
};

export const POD_BROKEN_COLOR = '#E5484D';

/** Visual style (colour + label) for a room's effective status; unknown values look inactive. */
export const getPodStatus = (effectiveStatus) => POD_STATUS_STYLES[effectiveStatus] || POD_STATUS_STYLES.inactive;

/** 'A1-202' -> '202' (the building prefix is implied by the floor plan). */
export const getShortRoomCode = (code) => String(code ?? '').replace(/^A1-/, '');

/**
 * Maps between Building A1's two room code notations ('A1-202' <-> 'P202')
 * so rooms created via UC-2.1 (P101..P508) and CAD architectural rooms (A1-101..A1-508)
 * resolve to the same physical room on the floor plan.
 */
export const getEquivalentRoomCode = (code) => {
  const clean = String(code ?? '').trim().toUpperCase();
  if (/^P[1-5]0[1-8]$/.test(clean)) return `A1-${clean.slice(1)}`;
  if (/^A1-[1-5]0[1-8]$/.test(clean)) return `P${clean.slice(3)}`;
  return clean;
};

/**
 * Looks up a live pod by room code, matching both 'A1-202' and 'P202' in Building A1.
 */
export const getRoomPod = (roomPods = {}, code) => {
  if (!code || !roomPods) return undefined;
  return roomPods[code] || roomPods[getEquivalentRoomCode(code)];
};

/**
 * Indexes the GET /facilities/cad-canvas rooms by room code so a floor plan can look up the
 * live pod data for each architectural room in O(1).
 */
export const buildRoomPodIndex = (rooms = []) =>
  Object.fromEntries(
    rooms
      .filter((room) => room?.code)
      .map((room) => [
        room.code,
        {
          code: room.code,
          status: room.status,
          effectiveStatus: room.effectiveStatus || room.status,
          equipmentCount: room.equipmentCount ?? 0,
          brokenCount: room.brokenCount ?? 0,
          equipments: room.equipments || []
        }
      ])
  );

const estimateChipWidth = (text) => Math.ceil(text.length * POD_CHAR_WIDTH + POD_CHIP_PADDING);

/**
 * Geometry of the pod chips relative to the room's top-left corner.
 * - Large rooms get the full pod: short code + equipment count, plus a red "n hỏng" chip.
 * - Small rooms (WC, storage, narrow classrooms) get a compact pod: just the numbers.
 * Chips are right-aligned at the bottom of the room so they never cover the left-aligned title.
 */
export const getPodLayout = ({ w, h, code, equipmentCount = 0, brokenCount = 0 }) => {
  const full = h >= 90 && w >= 110;
  const main = full ? `${getShortRoomCode(code)} · ${equipmentCount} TB` : String(equipmentCount);
  const broken = brokenCount > 0 ? (full ? `${brokenCount} hỏng` : `!${brokenCount}`) : '';

  const mainWidth = estimateChipWidth(main);
  const brokenWidth = broken ? estimateChipWidth(broken) : 0;
  const y = h - POD_MARGIN - POD_HEIGHT;
  const mainX = w - POD_MARGIN - mainWidth;

  return {
    mode: full ? 'full' : 'compact',
    y,
    main: { text: main, x: mainX, width: mainWidth },
    broken: broken ? { text: broken, x: mainX - POD_CHIP_GAP - brokenWidth, width: brokenWidth } : null
  };
};

/** Tooltip / aria text for a pod, e.g. "A1-202 • 12 thiết bị • 2 hỏng • Đang bảo trì". */
export const getPodTooltip = (code, pod) => {
  const parts = [String(code ?? ''), `${pod.equipmentCount} thiết bị`];
  if (pod.brokenCount > 0) parts.push(`${pod.brokenCount} hỏng`);
  parts.push(getPodStatus(pod.effectiveStatus).label);
  return parts.join(' • ');
};
