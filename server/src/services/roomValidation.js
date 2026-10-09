import mongoose from 'mongoose';
import { ROOM_RULES, ROOM_STATUSES, ROOM_TYPES } from '../config/constants.js';

/**
 * Pure validation helpers for the Room & Facility module (UC-2.1 .. UC-2.4).
 * No database access here so the rules can be unit-tested in isolation.
 */

const pick = (obj, ...keys) => {
  for (const key of keys) {
    if (obj[key] !== undefined && obj[key] !== null && obj[key] !== '') return obj[key];
  }
  return undefined;
};

/** Parses integers from numbers or digit-only strings. Returns NaN when not a valid integer. */
export const toInteger = (value) => {
  if (typeof value === 'number') return Number.isInteger(value) ? value : NaN;
  if (typeof value === 'string' && /^-?\d+$/.test(value.trim())) return Number(value.trim());
  return NaN;
};

export const normalizeRoomCode = (code) => String(code ?? '').trim().toUpperCase();

/** Returns the floor encoded in a valid room code (P3xx -> 3) or null. */
export const getFloorFromRoomCode = (code) => {
  const match = ROOM_RULES.CODE_PATTERN.exec(normalizeRoomCode(code));
  return match ? Number(match[1]) : null;
};

export const isValidRoomCode = (code) => ROOM_RULES.CODE_PATTERN.test(normalizeRoomCode(code));

const validateName = (raw, errors) => {
  const name = typeof raw === 'string' ? raw.trim() : '';
  if (!name) {
    errors.name = 'Vui lòng nhập tên phòng.';
    return null;
  }
  if (name.length > ROOM_RULES.MAX_NAME_LENGTH) {
    errors.name = `Tên phòng tối đa ${ROOM_RULES.MAX_NAME_LENGTH} ký tự.`;
    return null;
  }
  return name;
};

const validateCapacity = (raw, errors) => {
  const capacity = toInteger(raw);
  if (raw === undefined || raw === null || raw === '') {
    errors.capacity = 'Vui lòng nhập sức chứa của phòng.';
    return null;
  }
  if (Number.isNaN(capacity) || capacity < ROOM_RULES.MIN_CAPACITY || capacity > ROOM_RULES.MAX_CAPACITY) {
    errors.capacity = `Sức chứa phải là số nguyên từ ${ROOM_RULES.MIN_CAPACITY} đến ${ROOM_RULES.MAX_CAPACITY}.`;
    return null;
  }
  return capacity;
};

const validateRoomType = (raw, errors) => {
  if (raw === undefined || raw === null || raw === '') {
    errors.room_type = 'Vui lòng chọn loại phòng.';
    return null;
  }
  if (!Object.values(ROOM_TYPES).includes(raw)) {
    errors.room_type = `Loại phòng không hợp lệ. Chấp nhận: ${Object.values(ROOM_TYPES).join(', ')}.`;
    return null;
  }
  return raw;
};

const validateOptionalText = (raw, field, label, maxLength, errors) => {
  if (raw === undefined || raw === null) return undefined;
  if (typeof raw !== 'string') {
    errors[field] = `${label} phải là chuỗi ký tự.`;
    return undefined;
  }
  const text = raw.trim();
  if (text.length > maxLength) {
    errors[field] = `${label} tối đa ${maxLength} ký tự.`;
    return undefined;
  }
  return text;
};

const validateRequiredEquipment = (raw, errors) => {
  if (raw === undefined || raw === null) return undefined;
  if (!Array.isArray(raw)) {
    errors.required_equipment = 'Danh sách định mức thiết bị phải là một mảng.';
    return undefined;
  }
  const items = [];
  for (const item of raw) {
    const quantity = item?.quantity === undefined ? 1 : toInteger(item.quantity);
    if (!mongoose.isValidObjectId(item?.category_id) || Number.isNaN(quantity) || quantity < 1) {
      errors.required_equipment = 'Mỗi định mức thiết bị cần category_id hợp lệ và số lượng nguyên >= 1.';
      return undefined;
    }
    items.push({ category_id: item.category_id, quantity });
  }
  return items;
};

/**
 * UC-2.1 Create Room.
 * Rules: code in P101..P508 (floor digit must match `floor`), single building A1,
 * floor 1-5, integer capacity, known room type.
 */
export const validateCreateRoomPayload = (body = {}) => {
  const errors = {};

  // --- Room code ---
  const code = normalizeRoomCode(body.code);
  const codeFloor = getFloorFromRoomCode(code);
  if (!code) {
    errors.code = 'Vui lòng nhập mã phòng.';
  } else if (codeFloor === null) {
    errors.code = `Mã phòng phải nằm trong khoảng ${ROOM_RULES.CODE_RANGE_LABEL} (P + tầng 1-5 + số phòng 01-08).`;
  }

  // --- Building (single building only) ---
  const rawBuilding = pick(body, 'building', 'building_code', 'buildingCode');
  const building = rawBuilding === undefined ? ROOM_RULES.BUILDING : String(rawBuilding).trim().toUpperCase();
  if (building !== ROOM_RULES.BUILDING) {
    errors.building = `Hệ thống chỉ quản lý một tòa nhà duy nhất: ${ROOM_RULES.BUILDING}.`;
  }

  // --- Floor ---
  const rawFloor = pick(body, 'floor', 'floor_number', 'floorNumber');
  let floor = codeFloor;
  if (rawFloor !== undefined) {
    const parsedFloor = toInteger(rawFloor);
    if (Number.isNaN(parsedFloor) || parsedFloor < ROOM_RULES.MIN_FLOOR || parsedFloor > ROOM_RULES.MAX_FLOOR) {
      errors.floor = `Tầng phải là số nguyên từ ${ROOM_RULES.MIN_FLOOR} đến ${ROOM_RULES.MAX_FLOOR}.`;
      floor = null;
    } else if (codeFloor !== null && parsedFloor !== codeFloor) {
      errors.floor = `Mã phòng ${code} thuộc tầng ${codeFloor}, không khớp với tầng ${parsedFloor}.`;
      floor = null;
    } else {
      floor = parsedFloor;
    }
  } else if (codeFloor === null) {
    errors.floor = 'Vui lòng chọn tầng của phòng.';
  }

  const name = validateName(body.name, errors);
  const capacity = validateCapacity(body.capacity, errors);
  const roomType = validateRoomType(pick(body, 'room_type', 'type'), errors);

  // --- Optional fields ---
  let area;
  if (body.area !== undefined && body.area !== null && body.area !== '') {
    area = Number(body.area);
    if (!Number.isFinite(area) || area <= 0) {
      errors.area = 'Diện tích phải là số lớn hơn 0.';
    }
  }
  const department = validateOptionalText(body.department, 'department', 'Khoa/Đơn vị quản lý', 120, errors);
  const description = validateOptionalText(body.description, 'description', 'Chức năng phòng', 500, errors);
  const requiredEquipment = validateRequiredEquipment(body.required_equipment, errors);

  const value = {
    code,
    name,
    building,
    floor,
    room_type: roomType,
    capacity,
    ...(area !== undefined && !errors.area ? { area } : {}),
    ...(department !== undefined ? { department } : {}),
    ...(description !== undefined ? { description } : {}),
    ...(requiredEquipment !== undefined ? { required_equipment: requiredEquipment } : {})
  };

  return { valid: Object.keys(errors).length === 0, errors, value };
};

export const ROOM_EDITABLE_FIELDS = ['name', 'room_type', 'capacity', 'description'];

/**
 * UC-2.4 Update Room Info.
 * Editable: name, room_type, capacity, description (room function).
 * Immutable identity fields (code, building, floor) are rejected when they differ from the stored room,
 * because equipment, bookings and audit history reference them.
 *
 * Returns `changes` (new values) and `previous` (old values) containing ONLY the fields that really
 * changed, so callers can skip no-op updates and write a minimal audit record.
 */
export const validateUpdateRoomPayload = (body = {}, existing = {}) => {
  const errors = {};

  // --- Immutable identity fields ---
  if (body.code !== undefined && normalizeRoomCode(body.code) !== existing.code) {
    errors.code = 'Không thể thay đổi mã phòng.';
  }
  const rawBuilding = pick(body, 'building', 'building_code', 'buildingCode');
  if (rawBuilding !== undefined && String(rawBuilding).trim().toUpperCase() !== existing.building) {
    errors.building = 'Không thể thay đổi tòa nhà của phòng.';
  }
  const rawFloor = pick(body, 'floor', 'floor_number', 'floorNumber');
  if (rawFloor !== undefined && toInteger(rawFloor) !== existing.floor) {
    errors.floor = 'Không thể thay đổi tầng của phòng.';
  }

  // --- Editable fields (validated only when supplied) ---
  const next = {};
  if (body.name !== undefined) next.name = validateName(body.name, errors);
  if (pick(body, 'room_type', 'type') !== undefined) next.room_type = validateRoomType(pick(body, 'room_type', 'type'), errors);
  if (body.capacity !== undefined) next.capacity = validateCapacity(body.capacity, errors);
  if (body.description !== undefined) {
    next.description = validateOptionalText(body.description, 'description', 'Chức năng phòng', 500, errors);
  }

  const supplied = ROOM_EDITABLE_FIELDS.filter((field) => next[field] !== undefined || errors[field]);
  if (supplied.length === 0 && Object.keys(errors).length === 0) {
    errors.body = `Cần cung cấp ít nhất một trường cần sửa: ${ROOM_EDITABLE_FIELDS.join(', ')}.`;
  }

  const changes = {};
  const previous = {};
  for (const field of ROOM_EDITABLE_FIELDS) {
    if (next[field] === undefined || errors[field]) continue;
    const before = existing[field] ?? (field === 'description' ? '' : undefined);
    if (next[field] !== before) {
      changes[field] = next[field];
      previous[field] = before ?? null;
    }
  }

  return { valid: Object.keys(errors).length === 0, errors, changes, previous };
};

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const LIST_DEFAULT_LIMIT = 20;
const LIST_MAX_LIMIT = 100;

/**
 * UC-2.2 Room List View — turns query-string params into a MongoDB filter + pagination.
 * Filters: floor (1-5), room_type, status, building, q/search (name or room code).
 * Pagination is opt-in (page/limit); without either param every matching room is returned
 * so existing dropdown consumers keep working.
 */
export const parseRoomListQuery = (query = {}) => {
  const errors = {};
  const filter = {};

  const rawFloor = pick(query, 'floor', 'floorNumber');
  if (rawFloor !== undefined) {
    const floor = toInteger(rawFloor);
    if (Number.isNaN(floor) || floor < ROOM_RULES.MIN_FLOOR || floor > ROOM_RULES.MAX_FLOOR) {
      errors.floor = `Tầng phải là số nguyên từ ${ROOM_RULES.MIN_FLOOR} đến ${ROOM_RULES.MAX_FLOOR}.`;
    } else {
      filter.floor = floor;
    }
  }

  const rawType = pick(query, 'room_type', 'type');
  if (rawType !== undefined) {
    if (!Object.values(ROOM_TYPES).includes(rawType)) errors.room_type = 'Loại phòng không hợp lệ.';
    else filter.room_type = rawType;
  }

  if (query.status !== undefined && query.status !== '') {
    if (!Object.values(ROOM_STATUSES).includes(query.status)) errors.status = 'Trạng thái phòng không hợp lệ.';
    else filter.status = query.status;
  }

  const rawBuilding = pick(query, 'building', 'building_code', 'buildingCode');
  if (rawBuilding !== undefined) filter.building = String(rawBuilding).trim().toUpperCase();

  const keyword = String(pick(query, 'q', 'search') ?? '').trim();
  if (keyword) {
    const pattern = new RegExp(escapeRegex(keyword.slice(0, 60)), 'i');
    filter.$or = [{ code: pattern }, { name: pattern }];
  }

  const hasPaging = query.page !== undefined || query.limit !== undefined;
  let page = 1;
  let limit = null;
  if (hasPaging) {
    page = query.page === undefined ? 1 : toInteger(query.page);
    limit = query.limit === undefined ? LIST_DEFAULT_LIMIT : toInteger(query.limit);
    if (Number.isNaN(page) || page < 1) errors.page = 'Trang phải là số nguyên >= 1.';
    if (Number.isNaN(limit) || limit < 1) errors.limit = 'Số bản ghi mỗi trang phải là số nguyên >= 1.';
    else limit = Math.min(limit, LIST_MAX_LIMIT);
  }

  return { valid: Object.keys(errors).length === 0, errors, filter, page, limit, paginated: hasPaging };
};
