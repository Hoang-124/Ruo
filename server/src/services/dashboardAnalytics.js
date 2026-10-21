import { EQUIPMENT_STATUSES, REPAIR_STATUSES } from '../config/constants.js';

export const REPORT_TIMEZONE = 'Asia/Ho_Chi_Minh';
export const OPEN_REPAIR_STATUSES = [REPAIR_STATUSES.REPORTED, REPAIR_STATUSES.ASSIGNED, REPAIR_STATUSES.IN_PROGRESS];
export const ACTIVE_EQUIPMENT_FILTER = { status: { $nin: [EQUIPMENT_STATUSES.DISPOSED, EQUIPMENT_STATUSES.LOST] } };
export const EQUIPMENT_STATUS_GROUP = { $group: { _id: '$status', count: { $sum: 1 }, value: { $sum: '$price' } } };

export const summarizeKpi = (groups = [], repairs = {}, sparePartsValue = 0) => {
  const count = (status) => groups.find(row => row._id === status)?.count || 0;
  const totalEquipment = groups.reduce((sum, row) => sum + row.count, 0);
  const activeEquipment = totalEquipment - count('disposed') - count('lost');
  const equipmentStockValue = groups.find(row => row._id === 'in_stock')?.value || 0;
  return {
    totalEquipment, activeEquipment,
    inUseEquipment: count('in_use'), inStockEquipment: count('in_stock'),
    brokenEquipment: count('broken'), repairingEquipment: count('repairing'),
    pendingDisposalEquipment: count('pending_disposal'),
    operatingRate: activeEquipment ? Math.round(count('in_use') / activeEquipment * 10000) / 100 : 0,
    equipmentStockValue, sparePartsValue, warehouseValue: equipmentStockValue + sparePartsValue,
    openRepairs: repairs.openRepairs || 0, overdueRepairs: repairs.overdueRepairs || 0
  };
};

export const parseCostQuery = (query = {}, now = new Date()) => {
  const year = query.year ?? Number(new Intl.DateTimeFormat('en', { timeZone: REPORT_TIMEZONE, year: 'numeric' }).format(now));
  const period = query.period ?? 'month';
  const validYear = ['string', 'number'].includes(typeof year) && /^\d{4}$/.test(String(year)) && Number(year) >= 2000 && Number(year) <= 2100;
  if (!validYear || !['month', 'quarter'].includes(period)) {
    return { valid: false, message: 'Năm phải từ 2000 đến 2100; kỳ báo cáo là month hoặc quarter.' };
  }
  return {
    valid: true, year: Number(year), period,
    start: new Date(Date.UTC(Number(year), 0, 1) - 7 * 3600000),
    end: new Date(Date.UTC(Number(year) + 1, 0, 1) - 7 * 3600000)
  };
};

export const buildCostSeries = (year, period, repairs = [], parts = []) => {
  const monthsPerBucket = period === 'quarter' ? 3 : 1;
  return Array.from({ length: 12 / monthsPerBucket }, (_, index) => {
    const first = index * monthsPerBucket + 1;
    const sum = (rows) => rows.filter(row => row._id >= first && row._id < first + monthsPerBucket).reduce((total, row) => total + (row.cost || 0), 0);
    const repairCost = sum(repairs);
    const partsCost = sum(parts);
    return { key: `${year}-${period === 'quarter' ? 'Q' : ''}${String(index + 1).padStart(period === 'quarter' ? 1 : 2, '0')}`,
      label: `${period === 'quarter' ? 'Quý' : 'Tháng'} ${index + 1}`, repairCost, partsCost, totalCost: repairCost + partsCost };
  });
};

// Calendar-age proxy: the database has purchase dates, but no measured operating hours.
// Score is a transparent heuristic with a 30-day reference interval, not a reliability standard.
export const calculateEquipmentHealth = (equipment, now = new Date()) => {
  const rawDate = equipment.purchase_date ?? equipment.created_at;
  const start = rawDate ? new Date(rawDate).getTime() : NaN;
  const age = (now.getTime() - start) / 86400000;
  const knownAge = Number.isFinite(age) && age > 0;
  const failureCount = Math.max(0, Number(equipment.failureCount) || 0);
  return {
    ...equipment, failureCount,
    ageDays: knownAge ? Math.round(age * 100) / 100 : null,
    mtbfDays: knownAge && failureCount > 0 ? Math.round(age / failureCount * 100) / 100 : null,
    healthScore: knownAge ? Math.round(100 * age / (age + failureCount * 30)) : null
  };
};
