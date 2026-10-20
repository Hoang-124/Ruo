import { EQUIPMENT_STATUSES, REPAIR_STATUSES } from '../config/constants.js';

export const OPEN_REPAIR_STATUSES = [REPAIR_STATUSES.REPORTED, REPAIR_STATUSES.ASSIGNED, REPAIR_STATUSES.IN_PROGRESS];
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

