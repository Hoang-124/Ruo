import { MaintenancePlan, MaintenanceLog, Equipment, Repair, AuditLog } from '../models/index.js';

// @desc    Get all maintenance plans (UC: Schedule preventive maintenance)
// @route   GET /api/maintenance/plans
export const getPlans = async (req, res) => {
  try {
    const plans = await MaintenancePlan.find()
      .populate('created_by', 'full_name code email')
      .sort({ next_due: 1 });
    res.json({ success: true, count: plans.length, data: plans });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create maintenance plan
// @route   POST /api/maintenance/plans
export const createPlan = async (req, res) => {
  try {
    const { name, target_type = 'category', target_ids = [], frequency = 'monthly', checklist = [], next_due } = req.body;

    if (!name || !next_due) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp tên kế hoạch và ngày đến hạn' });
    }

    const plan = await MaintenancePlan.create({
      name,
      target_type,
      target_ids,
      frequency,
      checklist,
      next_due: new Date(next_due),
      created_by: req.user._id,
      status: 'active'
    });

    res.status(201).json({ success: true, message: 'Đã lập kế hoạch bảo trì định kỳ', data: plan });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get maintenance execution logs
// @route   GET /api/maintenance/logs
export const getLogs = async (req, res) => {
  try {
    const logs = await MaintenanceLog.find()
      .populate('plan_id', 'name frequency')
      .populate('equipment_id', 'code name room_id qr_code')
      .populate('checked_by', 'full_name code email')
      .populate('auto_repair_id', 'ticket_code status')
      .sort({ check_date: -1 });

    res.json({ success: true, count: logs.length, data: logs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Execute maintenance checklist & record result (UC: Execute maintenance checklist & Log maintenance result)
// @route   POST /api/maintenance/logs
export const executeChecklist = async (req, res) => {
  try {
    const { plan_id, equipment_id, checklist_results = [], status = 'passed', notes = '' } = req.body;

    if (!plan_id || !equipment_id) {
      return res.status(400).json({ success: false, message: 'Thiếu thông tin kế hoạch hoặc thiết bị' });
    }

    let autoRepair = null;
    // Auto-create repair ticket if needs repair
    if (status === 'needs_repair') {
      const equipment = await Equipment.findById(equipment_id);
      autoRepair = await Repair.create({
        equipment_id,
        reported_by: req.user._id,
        incident_description: `[Tự động từ Bảo Trì] Phát hiện hỏng hóc trong đợt kiểm tra định kỳ: ${notes}`,
        damage_level: 'minor',
        status: 'reported'
      });
      if (equipment) {
        equipment.status = 'repairing';
        await equipment.save();
      }
    }

    const log = await MaintenanceLog.create({
      plan_id,
      equipment_id,
      checked_by: req.user._id,
      check_date: new Date(),
      checklist_results,
      status,
      auto_repair_id: autoRepair ? autoRepair._id : null,
      notes
    });

    res.status(201).json({ 
      success: true, 
      message: status === 'needs_repair' 
        ? 'Đã ghi nhận kết quả bảo trì và tự động tạo phiếu sửa chữa' 
        : 'Đã hoàn thành kiểm tra bảo trì định kỳ',
      data: log 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
