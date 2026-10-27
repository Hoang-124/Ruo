import { DAMAGE_LEVELS } from '../config/constants.js';
import { OPEN_REPAIR_STATUSES } from './dashboardAnalytics.js';

export const DAY_MS = 86400000;
const VIETNAM_OFFSET = 7 * 3600000;
const integerParam = (value, fallback, min, max) => {
  if (value === undefined) return fallback;
  if (typeof value !== 'string' || !/^\d+$/.test(value)) return null;
  const number = Number(value);
  return Number.isSafeInteger(number) && number >= min && number <= max ? number : null;
};

export const parseReportPagination = (query = {}) => {
  const page = integerParam(query.page, 1, 1, 1000000);
  const limit = integerParam(query.limit, 20, 1, 100);
  if (page === null || limit === null) return { valid: false, message: 'Trang phải từ 1 đến 1000000; giới hạn từ 1 đến 100.' };
  return { valid: true, page, limit, skip: (page - 1) * limit };
};

const vietnamDayStart = date => Math.floor((new Date(date).getTime() + VIETNAM_OFFSET) / DAY_MS) * DAY_MS - VIETNAM_OFFSET;
export const parseWarrantyQuery = (query = {}, now = new Date()) => {
  const pagination = parseReportPagination(query);
  if (!pagination.valid) return pagination;
  const days = integerParam(query.days, 30, 0, 365);
  if (days === null) return { valid: false, message: 'Số ngày phải là số nguyên từ 0 đến 365.' };
  const start = new Date(vietnamDayStart(now));
  return { ...pagination, days, start, end: new Date(start.getTime() + (days + 1) * DAY_MS) };
};
export const warrantyDaysRemaining = (expiry, start) => Math.round((vietnamDayStart(expiry) - start.getTime()) / DAY_MS);

export const parseOverdueQuery = (query = {}, now = new Date()) => {
  const pagination = parseReportPagination(query);
  if (!pagination.valid) return pagination;
  const severity = query.severity ?? 'all';
  if (!['all', ...Object.values(DAMAGE_LEVELS)].includes(severity)) return { valid: false, message: 'Mức độ hỏng không hợp lệ.' };
  return { ...pagination, filter: { status: { $in: OPEN_REPAIR_STATUSES }, deadline: { $ne: null, $lt: now },
    ...(severity === 'all' ? {} : { damage_level: severity }) } };
};
