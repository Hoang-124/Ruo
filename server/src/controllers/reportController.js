import { Equipment } from '../models/Equipment.js';
import { Repair } from '../models/Repair.js';
import { Room } from '../models/Room.js';
import { Disposal } from '../models/Disposal.js';
import { User } from '../models/User.js';
import { EquipmentMovement } from '../models/EquipmentMovement.js';
import { EQUIPMENT_STATUSES, REPAIR_STATUSES, DISPOSAL_STATUSES } from '../config/constants.js';

// @desc    View operation dashboard (Facility Manager & Admin)
// @route   GET /api/reports/dashboard
export const getDashboardMetrics = async (req, res) => {
  try {
    const totalEquipment = await Equipment.countDocuments();
    const inUseEquipment = await Equipment.countDocuments({ status: EQUIPMENT_STATUSES.IN_USE });
    const inStockEquipment = await Equipment.countDocuments({ status: EQUIPMENT_STATUSES.IN_STOCK });
    const brokenEquipment = await Equipment.countDocuments({ status: EQUIPMENT_STATUSES.BROKEN });
    const repairingEquipment = await Equipment.countDocuments({ status: EQUIPMENT_STATUSES.REPAIRING });
    const pendingDisposalEquipment = await Equipment.countDocuments({ status: EQUIPMENT_STATUSES.PENDING_DISPOSAL });

    const openRepairs = await Repair.countDocuments({
      status: { $in: [REPAIR_STATUSES.REPORTED, REPAIR_STATUSES.ASSIGNED, REPAIR_STATUSES.IN_PROGRESS] }
    });
    const overdueRepairs = await Repair.countDocuments({
      status: { $in: [REPAIR_STATUSES.REPORTED, REPAIR_STATUSES.ASSIGNED, REPAIR_STATUSES.IN_PROGRESS] },
      deadline: { $lt: new Date() }
    });

    const pendingDisposals = await Disposal.countDocuments({ status: DISPOSAL_STATUSES.PROPOSED });
    const totalRooms = await Room.countDocuments();

    res.json({
      success: true,
      metrics: {
        totalEquipment,
        inUseEquipment,
        inStockEquipment,
        brokenEquipment,
        repairingEquipment,
        pendingDisposalEquipment,
        openRepairs,
        overdueRepairs,
        pendingDisposals,
        totalRooms
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
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
