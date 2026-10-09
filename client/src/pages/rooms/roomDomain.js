/**
 * Room & Facility domain helpers shared by the room pages (UC-2.1 .. UC-2.4).
 * Mirrors the backend rules in server/src/services/roomValidation.js so users get
 * instant feedback; the server remains the source of truth.
 */

export const ROOM_RULES = {
  building: 'A1',
  minFloor: 1,
  maxFloor: 5,
  minCapacity: 1,
  maxCapacity: 500,
  maxName: 120,
  maxDescription: 500,
  codePattern: /^P([1-5])0([1-8])$/,
  codeRangeLabel: 'P101 - P508'
};

export const FLOOR_OPTIONS = [1, 2, 3, 4, 5];

export const ROOM_TYPE_OPTIONS = [
  { value: 'lecture', label: 'Phòng lý thuyết' },
  { value: 'lab', label: 'Phòng thực hành (Lab)' },
  { value: 'office', label: 'Phòng làm việc' },
  { value: 'warehouse', label: 'Kho thiết bị' }
];

export const ROOM_STATUS_OPTIONS = [
  { value: 'available', label: 'Sẵn sàng', tone: '#2FB37A' },
  { value: 'maintenance', label: 'Đang bảo trì', tone: '#E5A33B' },
  { value: 'inactive', label: 'Ngừng sử dụng', tone: '#8A93A3' }
];

export const getRoomTypeLabel = (value) =>
  ROOM_TYPE_OPTIONS.find((option) => option.value === value)?.label || value || '—';

export const getRoomStatusMeta = (value) =>
  ROOM_STATUS_OPTIONS.find((option) => option.value === value) || { value, label: value || '—', tone: '#8A93A3' };

export const normalizeRoomCode = (code) => String(code ?? '').trim().toUpperCase();

/** Floor encoded in a valid room code (P307 -> 3); null when the code is out of range. */
export const getFloorFromCode = (code) => {
  const match = ROOM_RULES.codePattern.exec(normalizeRoomCode(code));
  return match ? Number(match[1]) : null;
};

export const createEmptyRoomForm = () => ({
  code: '',
  name: '',
  floor: '1',
  room_type: 'lecture',
  capacity: '',
  description: ''
});

const toInt = (value) => (/^-?\d+$/.test(String(value ?? '').trim()) ? Number(String(value).trim()) : NaN);

/**
 * Validates the create-room form. Returns a map { field: message } (empty when valid).
 */
export const validateRoomForm = (form) => {
  const errors = {};
  const code = normalizeRoomCode(form.code);
  const codeFloor = getFloorFromCode(code);

  if (!code) {
    errors.code = 'Vui lòng nhập mã phòng.';
  } else if (codeFloor === null) {
    errors.code = `Mã phòng phải nằm trong khoảng ${ROOM_RULES.codeRangeLabel} (P + tầng 1-5 + số phòng 01-08).`;
  }

  const name = String(form.name ?? '').trim();
  if (!name) errors.name = 'Vui lòng nhập tên phòng.';
  else if (name.length > ROOM_RULES.maxName) errors.name = `Tên phòng tối đa ${ROOM_RULES.maxName} ký tự.`;

  const floor = toInt(form.floor);
  if (Number.isNaN(floor) || floor < ROOM_RULES.minFloor || floor > ROOM_RULES.maxFloor) {
    errors.floor = `Tầng phải từ ${ROOM_RULES.minFloor} đến ${ROOM_RULES.maxFloor}.`;
  } else if (codeFloor !== null && codeFloor !== floor) {
    errors.floor = `Mã phòng ${code} thuộc tầng ${codeFloor}, không khớp với tầng ${floor}.`;
  }

  if (!ROOM_TYPE_OPTIONS.some((option) => option.value === form.room_type)) {
    errors.room_type = 'Vui lòng chọn loại phòng.';
  }

  const capacity = toInt(form.capacity);
  if (String(form.capacity ?? '').trim() === '') {
    errors.capacity = 'Vui lòng nhập sức chứa.';
  } else if (Number.isNaN(capacity) || capacity < ROOM_RULES.minCapacity || capacity > ROOM_RULES.maxCapacity) {
    errors.capacity = `Sức chứa phải là số nguyên từ ${ROOM_RULES.minCapacity} đến ${ROOM_RULES.maxCapacity}.`;
  }

  if (String(form.description ?? '').trim().length > ROOM_RULES.maxDescription) {
    errors.description = `Chức năng phòng tối đa ${ROOM_RULES.maxDescription} ký tự.`;
  }

  return errors;
};

/** Converts the form state into the POST /facilities/rooms payload. */
export const buildCreateRoomPayload = (form) => ({
  code: normalizeRoomCode(form.code),
  name: String(form.name).trim(),
  building: ROOM_RULES.building,
  floor: Number(form.floor),
  room_type: form.room_type,
  capacity: Number(form.capacity),
  description: String(form.description ?? '').trim()
});
