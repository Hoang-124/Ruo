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

const EQUIPMENT_STATUS_LABELS = {
  in_use: 'Đang sử dụng',
  in_stock: 'Trong kho',
  broken: 'Hỏng',
  repairing: 'Đang sửa chữa',
  pending_disposal: 'Chờ thanh lý',
  disposed: 'Đã thanh lý',
  lost: 'Thất lạc'
};

const REPAIR_STATUS_LABELS = {
  reported: 'Đã báo hỏng',
  assigned: 'Đã phân công',
  in_progress: 'Đang sửa',
  resolved: 'Đã sửa xong',
  unrepairable: 'Không thể sửa',
  closed: 'Đã đóng'
};

const MOVEMENT_TYPE_LABELS = {
  transfer: 'Điều chuyển',
  replacement: 'Thay thế',
  repair_out: 'Chuyển đi sửa',
  repair_return: 'Nhận lại sau sửa',
  to_stock: 'Nhập kho'
};

const MOVEMENT_STATUS_LABELS = {
  pending: 'Chờ thực hiện',
  completed: 'Hoàn thành',
  cancelled: 'Đã hủy'
};

const labelOf = (map, value) => map[value] || value || '—';

export const getEquipmentStatusLabel = (value) => labelOf(EQUIPMENT_STATUS_LABELS, value);
export const getRepairStatusLabel = (value) => labelOf(REPAIR_STATUS_LABELS, value);
export const getMovementTypeLabel = (value) => labelOf(MOVEMENT_TYPE_LABELS, value);
export const getMovementStatusLabel = (value) => labelOf(MOVEMENT_STATUS_LABELS, value);

/** dd/MM/yyyy HH:mm in the vi-VN locale; '—' for missing or invalid dates. */
export const formatDateTime = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

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
 * Validates the room form. Returns a map { field: message } (empty when valid).
 * In 'edit' mode the immutable identity fields (code, floor) are not validated.
 */
export const validateRoomForm = (form, mode = 'create') => {
  const errors = {};
  const isEdit = mode === 'edit';
  const code = normalizeRoomCode(form.code);
  const codeFloor = getFloorFromCode(code);

  if (!isEdit) {
    if (!code) {
      errors.code = 'Vui lòng nhập mã phòng.';
    } else if (codeFloor === null) {
      errors.code = `Mã phòng phải nằm trong khoảng ${ROOM_RULES.codeRangeLabel} (P + tầng 1-5 + số phòng 01-08).`;
    }
  }

  const name = String(form.name ?? '').trim();
  if (!name) errors.name = 'Vui lòng nhập tên phòng.';
  else if (name.length > ROOM_RULES.maxName) errors.name = `Tên phòng tối đa ${ROOM_RULES.maxName} ký tự.`;

  // Floor is derived from the (immutable) room code, so it is only validated when creating.
  const floor = toInt(form.floor);
  if (!isEdit) {
    if (Number.isNaN(floor) || floor < ROOM_RULES.minFloor || floor > ROOM_RULES.maxFloor) {
      errors.floor = `Tầng phải từ ${ROOM_RULES.minFloor} đến ${ROOM_RULES.maxFloor}.`;
    } else if (codeFloor !== null && codeFloor !== floor) {
      errors.floor = `Mã phòng ${code} thuộc tầng ${codeFloor}, không khớp với tầng ${floor}.`;
    }
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

/** Pre-fills the form from an existing room (edit mode). */
export const roomToForm = (room) => ({
  code: room.code || '',
  name: room.name || '',
  floor: String(room.floor ?? 1),
  room_type: room.room_type || 'lecture',
  capacity: String(room.capacity ?? ''),
  description: room.description || ''
});

/**
 * Builds the PUT /facilities/rooms/:id payload containing ONLY the editable fields that differ
 * from the stored room. An empty object means there is nothing to save.
 */
export const buildUpdateRoomPayload = (form, room) => {
  const payload = {};
  const name = String(form.name).trim();
  const capacity = Number(form.capacity);
  const description = String(form.description ?? '').trim();

  if (name !== room.name) payload.name = name;
  if (form.room_type !== room.room_type) payload.room_type = form.room_type;
  if (capacity !== room.capacity) payload.capacity = capacity;
  if (description !== (room.description || '')) payload.description = description;
  return payload;
};

export const ROOM_LIST_PAGE_SIZE = 10;

export const EMPTY_ROOM_FILTERS = { q: '', floor: '', room_type: '', status: '' };

export const hasActiveRoomFilters = (filters) => Object.values(filters).some((value) => String(value).trim() !== '');

/** Builds GET /facilities/rooms query params, dropping blank filters. */
export const buildRoomListParams = (filters, page = 1, limit = ROOM_LIST_PAGE_SIZE) => {
  const params = { page, limit };
  const q = String(filters.q ?? '').trim();
  if (q) params.q = q;
  if (filters.floor !== '' && filters.floor != null) params.floor = filters.floor;
  if (filters.room_type) params.room_type = filters.room_type;
  if (filters.status) params.status = filters.status;
  return params;
};

/** Page numbers to render in the pager: always first/last, current +-1, with null as an ellipsis gap. */
export const getPageWindow = (page, totalPages) => {
  const wanted = new Set([1, totalPages, page - 1, page, page + 1]);
  const pages = [...wanted].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);
  const result = [];
  pages.forEach((p, index) => {
    if (index > 0 && p - pages[index - 1] > 1) result.push(null);
    result.push(p);
  });
  return result;
};
