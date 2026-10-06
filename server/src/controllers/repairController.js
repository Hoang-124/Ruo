import { Repair, RepairLog, Equipment, SparePart, PartsRequest, RepairPart, AuditLog, Notification } from '../models/index.js';

// @desc    Get all repairs
// @route   GET /api/repairs
export const getRepairs = async (req, res) => {
  try {
    const { status, reported_by, assigned_to, damage_level } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (reported_by) filter.reported_by = reported_by;
    if (assigned_to) filter.assigned_to = assigned_to;
    if (damage_level) filter.damage_level = damage_level;

    // If user is Lecturer, default to showing their own reports unless admin/staff
    if (req.user.role === 'lecturer' && !filter.reported_by) {
      filter.reported_by = req.user._id;
    }

    const repairs = await Repair.find(filter)
      .populate('equipment_id', 'code name brand model qr_code room_id')
      .populate('reported_by', 'full_name code email role department')
      .populate('assigned_to', 'full_name code email role')
      .populate('repair_unit_id', 'code name specialty phone')
      .populate('return_room_id', 'code name building floor')
      .populate('feedback_by', 'full_name code email')
      .sort({ created_at: -1 });

    res.json({ success: true, count: repairs.length, data: repairs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single repair detail with timeline logs
// @route   GET /api/repairs/:id
export const getRepairById = async (req, res) => {
  try {
    const repair = await Repair.findById(req.params.id)
      .populate('equipment_id')
      .populate('reported_by', 'full_name code email role department')
      .populate('assigned_to', 'full_name code email role')
      .populate('repair_unit_id')
      .populate('return_room_id');

    if (!repair) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy phiếu sửa chữa' });
    }

    const logs = await RepairLog.find({ repair_id: repair._id })
      .populate('performed_by', 'full_name code email role')
      .populate('parts_used.part_id', 'code name unit price')
      .sort({ timestamp: 1 });

    const partsRequests = await PartsRequest.find({ repair_id: repair._id })
      .populate('requested_by', 'full_name code')
      .populate('approved_by', 'full_name code')
      .populate('items.part_id', 'code name unit price');

    res.json({ success: true, data: { ...repair.toJSON(), logs, partsRequests } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Report malfunction (Lecturer flow: UC Report equipment malfunction)
// @route   POST /api/repairs
export const createRepairReport = async (req, res) => {
  try {
    const { equipment_id, incident_description, incident_images = [], damage_level = 'minor' } = req.body;

    if (!equipment_id || !incident_description) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp mã thiết bị và mô tả sự cố' });
    }

    const equipment = await Equipment.findById(equipment_id);
    if (!equipment) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy thiết bị' });
    }

    // Default SLA deadline: 48h for minor, 24h for major, 8h for critical
    const hours = damage_level === 'critical' ? 8 : (damage_level === 'major' ? 24 : 48);
    const deadline = new Date(Date.now() + hours * 3600 * 1000);

    const repair = await Repair.create({
      equipment_id,
      reported_by: req.user._id,
      incident_description,
      incident_images,
      damage_level,
      deadline,
      status: 'reported'
    });

    // Update equipment status
    equipment.status = 'repairing';
    equipment.repair_count = (equipment.repair_count || 0) + 1;
    await equipment.save();

    // Create initial timeline log
    await RepairLog.create({
      repair_id: repair._id,
      action: 'reported',
      performed_by: req.user._id,
      description: `Báo cáo sự cố: ${incident_description}`,
      images: incident_images
    });

    // SHA-256 Audit Log
    await AuditLog.logAction({
      user_id: req.user._id,
      user_display: req.user.full_name || req.user.fullName,
      action: 'INCIDENT_REPORT',
      target_table: 'repairs',
      entity_id: repair._id.toString(),
      ip_address: req.ip,
      new_value: { equipment_id, incident_description, damage_level }
    });

    res.status(201).json({ success: true, message: 'Báo cáo sự cố thành công', data: repair });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Assign repair task (UC: Assign repair task)
// @route   PUT /api/repairs/:id/assign
export const assignRepairTask = async (req, res) => {
  try {
    const { assigned_to, repair_unit_id, deadline, repair_location = 'on_site' } = req.body;
    const repair = await Repair.findById(req.params.id);
    if (!repair) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy phiếu sửa chữa' });
    }

    repair.assigned_to = assigned_to || req.user._id;
    if (repair_unit_id) repair.repair_unit_id = repair_unit_id;
    if (deadline) repair.deadline = new Date(deadline);
    repair.repair_location = repair_location;
    repair.status = 'assigned';
    await repair.save();

    await RepairLog.create({
      repair_id: repair._id,
      action: 'assigned',
      performed_by: req.user._id,
      description: `Phân công nhiệm vụ xử lý kỹ thuật cho kỹ thuật viên`
    });

    // Audit Log SHA-256
    await AuditLog.logAction({
      user_id: req.user._id,
      user_display: req.user.full_name || req.user.fullName,
      action: 'REPAIR_ASSIGN',
      target_table: 'repairs',
      entity_id: repair._id.toString(),
      ip_address: req.ip,
      new_value: { assigned_to: repair.assigned_to, repair_location }
    });

    res.json({ success: true, message: 'Phân công nhiệm vụ thành công', data: repair });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Log repair progress (UC: Log repair progress)
// @route   POST /api/repairs/:id/logs
export const addRepairLog = async (req, res) => {
  try {
    const { action = 'in_progress', description, cost = 0, parts_used = [], images = [] } = req.body;
    const repair = await Repair.findById(req.params.id);
    if (!repair) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy phiếu sửa chữa' });
    }

    const log = await RepairLog.create({
      repair_id: repair._id,
      action,
      performed_by: req.user._id,
      description,
      cost,
      parts_used,
      images
    });

    repair.status = 'in_progress';
    if (cost > 0) repair.total_cost = (repair.total_cost || 0) + Number(cost);
    await repair.save();

    res.status(201).json({ success: true, message: 'Đã cập nhật tiến độ sửa chữa', data: log });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Mark repair resolved (UC: Close repair ticket step 1)
// @route   PUT /api/repairs/:id/resolve
export const resolveRepair = async (req, res) => {
  try {
    const { post_repair_warranty, return_room_id, notes = '' } = req.body;
    const repair = await Repair.findById(req.params.id).populate('equipment_id');
    if (!repair) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy phiếu sửa chữa' });
    }

    repair.status = 'resolved';
    if (post_repair_warranty) repair.post_repair_warranty = new Date(post_repair_warranty);
    if (return_room_id) repair.return_room_id = return_room_id;
    await repair.save();

    // Mark equipment back to active
    if (repair.equipment_id) {
      await Equipment.findByIdAndUpdate(repair.equipment_id._id, {
        status: 'active',
        warranty_status: post_repair_warranty ? 'extended' : 'active'
      });
    }

    await RepairLog.create({
      repair_id: repair._id,
      action: 'resolved',
      performed_by: req.user._id,
      description: `Đã hoàn thành sửa chữa kỹ thuật. ${notes}`
    });

    // Notify Lecturer to evaluate repair
    await Notification.create({
      user_id: repair.reported_by,
      type: 'feedback_requested',
      title: 'Thiết bị đã được sửa xong - Mời đánh giá',
      message: `Sự cố trên thiết bị đã được kỹ thuật viên xử lý. Vui lòng kiểm tra và đánh giá chất lượng.`,
      reference_type: 'repair',
      reference_id: repair._id
    });

    res.json({ success: true, message: 'Đã hoàn tất xử lý kỹ thuật, gửi yêu cầu đánh giá cho giảng viên', data: repair });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Lecturer evaluates repair quality (UC: Evaluate repair quality)
// @route   POST /api/repairs/:id/feedback
export const submitRepairFeedback = async (req, res) => {
  try {
    const { rating, comment } = req.body;
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: 'Số sao đánh giá phải từ 1 đến 5' });
    }

    const repair = await Repair.findById(req.params.id);
    if (!repair) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy phiếu sửa chữa' });
    }

    repair.feedback_rating = rating;
    repair.feedback_comment = comment || '';
    repair.feedback_by = req.user._id;
    repair.feedback_at = new Date();
    repair.status = 'closed'; // Final ticket closure after evaluation
    await repair.save();

    await RepairLog.create({
      repair_id: repair._id,
      action: 'closed',
      performed_by: req.user._id,
      description: `Giảng viên đã đánh giá ${rating}⭐: "${comment || 'Hài lòng'}" - Đóng ticket sự cố.`
    });

    // Audit Log SHA-256
    await AuditLog.logAction({
      user_id: req.user._id,
      user_display: req.user.full_name || req.user.fullName,
      action: 'REPAIR_FEEDBACK',
      target_table: 'repairs',
      entity_id: repair._id.toString(),
      ip_address: req.ip,
      new_value: { rating, comment, status: 'closed' }
    });

    res.json({ success: true, message: 'Cảm ơn bạn đã đánh giá chất lượng sửa chữa!', data: repair });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
