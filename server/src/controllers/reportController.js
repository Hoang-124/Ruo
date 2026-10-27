import { Equipment } from '../models/Equipment.js';
import { Repair } from '../models/Repair.js';
import { Room } from '../models/Room.js';
import { Category } from '../models/Category.js';
import { parseCostQuery, REPORT_TIMEZONE } from '../services/dashboardAnalytics.js';
export { getKpi as getDashboardMetrics } from './dashboardController.js';

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

// @desc    Export statistical report as CSV (Admin Only - Zero dependencies)
// @route   GET /api/reports/export
export const exportStatisticalReport = async (req, res) => {
  try {
    const equipments = await Equipment.find()
      .populate('category_id', 'code name')
      .populate('room_id', 'code name building floor')
      .sort({ code: 1 });

    const headers = ['Mã Tài Sản', 'Tên Thiết Bị', 'Chủng Loại', 'Phòng', 'Tình Trạng', 'Nguyên Giá (VNĐ)', 'Hạn Bảo Hành'];
    const rows = equipments.map(eq => [
      `"${eq.code}"`,
      `"${(eq.name || '').replace(/"/g, '""')}"`,
      `"${eq.category_id ? eq.category_id.name : ''}"`,
      `"${eq.room_id ? eq.room_id.code : 'Kho'}"`,
      `"${eq.status}"`,
      eq.price || 0,
      `"${eq.warranty_expiry ? new Date(eq.warranty_expiry).toISOString().slice(0, 10) : ''}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="ruo_equipment_report_${Date.now()}.csv"`);
    res.send(csvContent);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
