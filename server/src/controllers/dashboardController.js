import { Equipment } from '../models/Equipment.js';
import { Repair } from '../models/Repair.js';
import { RepairLog } from '../models/RepairLog.js';
import { PartsRequest } from '../models/PartsRequest.js';
import { SparePart } from '../models/SparePart.js';
import { Room } from '../models/Room.js';
import { Disposal } from '../models/Disposal.js';
import { EQUIPMENT_STATUSES, PARTS_REQUEST_STATUSES, DISPOSAL_STATUSES } from '../config/constants.js';
import { ACTIVE_EQUIPMENT_FILTER, OPEN_REPAIR_STATUSES, EQUIPMENT_STATUS_GROUP, REPORT_TIMEZONE,
  summarizeKpi, parseCostQuery, buildCostSeries, calculateEquipmentHealth } from '../services/dashboardAnalytics.js';

export const getKpi = async (req, res) => {
  try {
    const now = new Date();
    const [groups, repairGroups, stock, totalRooms, pendingDisposals] = await Promise.all([
      Equipment.aggregate([EQUIPMENT_STATUS_GROUP]),
      Repair.aggregate([
        { $match: { status: { $in: OPEN_REPAIR_STATUSES } } },
        { $group: { _id: null, openRepairs: { $sum: 1 }, overdueRepairs: { $sum: { $cond: [
          { $and: [{ $ne: ['$deadline', null] }, { $lt: ['$deadline', now] }] }, 1, 0
        ] } } } }
      ]),
      SparePart.aggregate([{ $group: { _id: null, value: { $sum: { $multiply: ['$stock', '$price'] } } } }]),
      Room.countDocuments(), Disposal.countDocuments({ status: DISPOSAL_STATUSES.PROPOSED })
    ]);
    res.json({ success: true, generatedAt: now, metrics: { ...summarizeKpi(groups, repairGroups[0], stock[0]?.value), totalRooms, pendingDisposals } });
  } catch {
    res.status(500).json({ success: false, message: 'Không tải được chỉ số tổng quan.' });
  }
};

export const getRepairCost = async (req, res) => {
  const query = parseCostQuery(req.query);
  if (!query.valid) return res.status(400).json({ success: false, message: query.message });
  try {
    const { start, end, year, period } = query;
    const month = (date) => ({ $month: { date, timezone: REPORT_TIMEZONE } });
    const [repairs, parts] = await Promise.all([
      // total_cost is the cumulative mirror of these logs: never add it again.
      RepairLog.aggregate([
        { $match: { timestamp: { $gte: start, $lt: end }, cost: { $gt: 0 } } },
        { $group: { _id: month('$timestamp'), cost: { $sum: '$cost' } } }
      ]),
      PartsRequest.aggregate([
        { $match: { status: PARTS_REQUEST_STATUSES.APPROVED, approved_at: { $gte: start, $lt: end } } },
        { $unwind: '$items' },
        { $group: { _id: month('$approved_at'), cost: { $sum: { $multiply: [
          { $ifNull: ['$items.qty', '$items.quantity'] }, { $ifNull: ['$items.unit_price', 0] }
        ] } }, unpricedItems: { $sum: { $cond: [{ $gt: ['$items.unit_price', 0] }, 0, 1] } } } }
      ])
    ]);
    const series = buildCostSeries(year, period, repairs, parts);
    res.json({ success: true, year, period, timezone: REPORT_TIMEZONE, series,
      totals: series.reduce((total, row) => ({ repairCost: total.repairCost + row.repairCost,
        partsCost: total.partsCost + row.partsCost, totalCost: total.totalCost + row.totalCost }), { repairCost: 0, partsCost: 0, totalCost: 0 }),
      unpricedItems: parts.reduce((sum, row) => sum + row.unpricedItems, 0)
    });
  } catch {
    res.status(500).json({ success: false, message: 'Không tải được xu hướng chi phí sửa chữa.' });
  }
};

export const getHealthScore = async (req, res) => {
  const page = Number(req.query.page ?? 1);
  const limit = Number(req.query.limit ?? 20);
  if (![req.query.page, req.query.limit].every(value => value === undefined || (typeof value === 'string' && /^\d+$/.test(value))) ||
      !Number.isSafeInteger(page) || page < 1 || !Number.isSafeInteger(limit) || limit < 1 || limit > 100) {
    return res.status(400).json({ success: false, message: 'Trang phải là số nguyên dương; giới hạn từ 1 đến 100.' });
  }
  try {
    const now = new Date();
    const rows = await Equipment.aggregate([
      { $match: ACTIVE_EQUIPMENT_FILTER },
      { $lookup: { from: Repair.collection.name, let: { equipmentId: '$_id' }, pipeline: [
        { $match: { $expr: { $eq: ['$equipment_id', '$$equipmentId'] }, reported_at: { $lte: now } } },
        { $count: 'count' }
      ], as: 'failures' } },
      { $project: { code: 1, name: 1, status: 1, purchase_date: 1, created_at: 1,
        failureCount: { $ifNull: [{ $arrayElemAt: ['$failures.count', 0] }, 0] } } }
    ]);
    const equipment = rows.map(row => calculateEquipmentHealth(row, now))
      .sort((a, b) => (a.healthScore ?? 101) - (b.healthScore ?? 101) || a.code.localeCompare(b.code));
    const known = equipment.filter(row => row.healthScore !== null);
    res.json({ success: true, generatedAt: now, page, limit, total: equipment.length,
      totalPages: Math.max(1, Math.ceil(equipment.length / limit)),
      summary: { averageHealthScore: known.length ? Math.round(known.reduce((sum, row) => sum + row.healthScore, 0) / known.length) : null,
        unknownAgeCount: equipment.length - known.length, atRiskCount: known.filter(row => row.healthScore < 50).length },
      methodology: { basis: 'calendar_age', referenceDays: 30,
        mtbf: 'Tuổi thiết bị (ngày) / số phiếu sự cố. Chưa có sự cố: chưa xác định MTBF.',
        score: '100 × tuổi / (tuổi + 30 × số sự cố). Chỉ số tham khảo, chưa trừ thời gian dừng máy.' },
      equipment: equipment.slice((page - 1) * limit, page * limit)
    });
  } catch {
    res.status(500).json({ success: false, message: 'Không tải được chỉ số sức khỏe thiết bị.' });
  }
};

export const getEquipmentByStatus = async (req, res) => {
  try {
    const groups = await Equipment.aggregate([EQUIPMENT_STATUS_GROUP]);
    res.json({ success: true, groups: Object.values(EQUIPMENT_STATUSES).map(status => ({ status,
      count: groups.find(row => row._id === status)?.count || 0, value: groups.find(row => row._id === status)?.value || 0 })) });
  } catch { res.status(500).json({ success: false, message: 'Không tải được báo cáo theo trạng thái.' }); }
};

export const getEquipmentByRoom = async (req, res) => {
  try {
    const [rooms, groups] = await Promise.all([
      Room.find().select('code name floor status').sort({ code: 1 }).lean(),
      Equipment.aggregate([{ $match: ACTIVE_EQUIPMENT_FILTER }, { $group: { _id: '$room_id', count: { $sum: 1 }, value: { $sum: '$price' },
        brokenCount: { $sum: { $cond: [{ $in: ['$status', ['broken', 'repairing']] }, 1, 0] } } } }])
    ]);
    const knownIds = new Set(rooms.map(room => String(room._id)));
    const unassigned = groups.filter(group => !knownIds.has(String(group._id)));
    res.json({ success: true, rooms: rooms.map(room => {
      const group = groups.find(item => String(item._id) === String(room._id));
      return { ...room, count: group?.count || 0, value: group?.value || 0, brokenCount: group?.brokenCount || 0 };
    }), unassigned: unassigned.reduce((total, row) => ({ count: total.count + row.count, value: total.value + row.value }), { count: 0, value: 0 }) });
  } catch { res.status(500).json({ success: false, message: 'Không tải được báo cáo theo phòng.' }); }
};
