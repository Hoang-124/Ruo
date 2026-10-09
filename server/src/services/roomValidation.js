import mongoose from 'mongoose';
import { ROOM_RULES, ROOM_TYPES } from '../config/constants.js';

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
