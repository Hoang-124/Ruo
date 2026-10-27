import { Equipment } from '../models/Equipment.js';
import { Repair } from '../models/Repair.js';
import { Room } from '../models/Room.js';
import { Category } from '../models/Category.js';
import { parseCostQuery, REPORT_TIMEZONE, ACTIVE_EQUIPMENT_FILTER } from '../services/dashboardAnalytics.js';
import { parseWarrantyQuery, warrantyDaysRemaining, parseOverdueQuery } from '../services/reportAnalytics.js';
import '../models/Supplier.js';
import '../models/User.js';
import '../models/RepairUnit.js';
import { parseExportQuery, renderReportCsv, renderReportHtml } from '../services/reportExport.js';
import { loadExportReport } from '../services/reportExportData.js';
export { getKpi as getDashboardMetrics } from './dashboardController.js';

export const getOverdueRepairs = async (req, res) => {
  const now = new Date();
  const query = parseOverdueQuery(req.query, now);
  if (!query.valid) return res.status(400).json({ success: false, message: query.message });
  try {
    const [repairs, total] = await Promise.all([
      Repair.find(query.filter).select('ticket_code equipment_id room_id assigned_to repair_unit_id damage_level status deadline reported_at incident_description')
        .populate('equipment_id', 'code name').populate('room_id', 'code name')
        .populate('assigned_to', 'code full_name').populate('repair_unit_id', 'code name')
        .sort({ deadline: 1, _id: 1 }).skip(query.skip).limit(query.limit).lean(),
      Repair.countDocuments(query.filter)
    ]);
    res.json({ success: true, generatedAt: now, page: query.page, limit: query.limit,
      total, totalPages: Math.max(1, Math.ceil(total / query.limit)),
      repairs: repairs.map(item => ({ ...item, overdueMinutes: Math.ceil((now - item.deadline) / 60000) })) });
  } catch {
    res.status(500).json({ success: false, message: 'Không tải được báo cáo quá hạn SLA.' });
  }
};

export const getWarrantyExpiring = async (req, res) => {
  const now = new Date();
  const query = parseWarrantyQuery(req.query, now);
  if (!query.valid) return res.status(400).json({ success: false, message: query.message });
  try {
    const filter = { ...ACTIVE_EQUIPMENT_FILTER, warranty_status: { $ne: 'void' },
      warranty_expiry: { $gte: query.start, $lt: query.end } };
    const [equipment, total] = await Promise.all([
      Equipment.find(filter).select('code name status warranty_expiry warranty_status category_id room_id supplier_id')
        .populate('category_id', 'code name').populate('room_id', 'code name')
        .populate('supplier_id', 'code name contact phone email')
        .sort({ warranty_expiry: 1, code: 1, _id: 1 }).skip(query.skip).limit(query.limit).lean(),
      Equipment.countDocuments(filter)
    ]);
    res.json({ success: true, generatedAt: now, timezone: REPORT_TIMEZONE, days: query.days,
      page: query.page, limit: query.limit, total, totalPages: Math.max(1, Math.ceil(total / query.limit)),
      equipment: equipment.map(item => ({ ...item, daysRemaining: warrantyDaysRemaining(item.warranty_expiry, query.start) })) });
  } catch {
    res.status(500).json({ success: false, message: 'Không tải được báo cáo sắp hết bảo hành.' });
  }
};

export const getRepairFrequency = async (req, res) => {
  const query = parseCostQuery(req.query);
  if (!query.valid) return res.status(400).json({ success: false, message: query.message });
  try {
    const now = new Date();
    const groupBy = (field, collection) => [
      { $group: { _id: field, failureCount: { $sum: 1 }, equipmentIds: { $addToSet: '$equipment_id' } } },
      { $lookup: { from: collection, localField: '_id', foreignField: '_id', as: 'label' } },
      { $project: { failureCount: 1, affectedEquipment: { $size: '$equipmentIds' },
        code: { $ifNull: [{ $arrayElemAt: ['$label.code', 0] }, '—'] },
        name: { $ifNull: [{ $arrayElemAt: ['$label.name', 0] }, 'Chưa xác định'] } } },
      { $sort: { failureCount: -1, code: 1, _id: 1 } }
    ];
    const [result] = await Repair.aggregate([
      { $match: { reported_at: { $gte: query.start, $lt: query.end, $lte: now } } },
      { $lookup: { from: Equipment.collection.name, localField: 'equipment_id', foreignField: '_id', as: 'equipment' } },
      { $set: { category: { $ifNull: [{ $arrayElemAt: ['$equipment.category_id', 0] }, null] },
        reportRoom: { $ifNull: ['$room_id', { $ifNull: [{ $arrayElemAt: ['$equipment.room_id', 0] }, null] }] } } },
      { $facet: {
        byCategory: groupBy('$category', Category.collection.name),
        byRoom: groupBy('$reportRoom', Room.collection.name),
        summary: [
          { $group: { _id: null, failureCount: { $sum: 1 }, equipmentIds: { $addToSet: '$equipment_id' },
            legacyRoomCount: { $sum: { $cond: [{ $eq: [{ $ifNull: ['$room_id', null] }, null] }, 1, 0] } } } },
          { $project: { _id: 0, failureCount: 1, legacyRoomCount: 1, affectedEquipment: { $size: '$equipmentIds' } } }
        ]
      } }
    ]);
    const withFrequency = rows => rows.map(row => ({ ...row,
      incidentsPerEquipment: row.affectedEquipment ? Math.round(row.failureCount / row.affectedEquipment * 100) / 100 : 0 }));
    res.json({ success: true, year: query.year, timezone: REPORT_TIMEZONE, generatedAt: now,
      summary: result?.summary[0] || { failureCount: 0, affectedEquipment: 0, legacyRoomCount: 0 },
      byCategory: withFrequency(result?.byCategory || []), byRoom: withFrequency(result?.byRoom || []) });
  } catch {
    res.status(500).json({ success: false, message: 'Không tải được báo cáo tần suất hỏng.' });
  }
};

// @desc    View statistical report (Admin)
// @route   GET /api/reports/statistics
export const getStatisticalReport = async (req, res) => {
  try {
    const equipmentsByCategory = await Equipment.aggregate([
      {
        $group: {
          _id: '$category_id',
          count: { $sum: 1 },
          totalValue: { $sum: '$price' },
          totalRepairCost: { $sum: '$estimated_repair_cost' }
        }
      },
      {
        $lookup: {
          from: 'categories',
          localField: '_id',
          foreignField: '_id',
          as: 'category'
        }
      },
      { $unwind: '$category' }
    ]);

    const repairsByStatus = await Repair.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 }, totalCost: { $sum: '$total_cost' } } }
    ]);

    res.json({
      success: true,
      equipmentsByCategory,
      repairsByStatus
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Export asset/inventory CSV or printable HTML (Manager/Admin)
// @route   GET /api/reports/export
export const exportStatisticalReport = async (req, res) => {
  const query = parseExportQuery(req.query);
  if (!query.valid) return res.status(400).json({ success: false, message: query.message });
  try {
    const now = new Date();
    const report = await loadExportReport(query, req.user, now);
    if (!report) return res.status(404).json({ success: false, message: 'Không tìm thấy đợt kiểm kê.' });
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (query.format === 'print') {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'self'");
      return res.send(renderReportHtml(report));
    }
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="ruo_${query.type}_${now.toISOString().slice(0, 10)}.csv"`);
    res.send(renderReportCsv(report));
  } catch {
    res.status(500).json({ success: false, message: 'Không xuất được báo cáo. Vui lòng thử lại.' });
  }
};
