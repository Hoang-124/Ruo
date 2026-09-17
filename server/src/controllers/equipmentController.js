import { Equipment, EquipmentCategory, Supplier } from '../models/Equipment.js';
import { EquipmentBorrowing } from '../models/EquipmentBorrowing.js';
import { AuditLog } from '../models/AuditLog.js';
import { EQUIPMENT_STATUSES } from '../config/constants.js';

// @desc    Get all equipment items
// @route   GET /api/equipments
export const getEquipments = async (req, res) => {
  const { category, status, condition, search } = req.query;
  const query = { deletedAt: null };

  if (status) query.status = status;
  if (condition) query.condition = condition;

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { assetCode: { $regex: search, $options: 'i' } }
    ];
  }

  const equipments = await Equipment.find(query)
    .populate('category')
    .populate('room', 'code name building floorNumber')
    .populate('supplier');

  res.json({
    success: true,
    total: equipments.length,
    equipments
  });
};

// @desc    Lookup single equipment by QR Code (Mobile scanner endpoint)
// @route   GET /api/equipments/qr/:qrCode
export const getEquipmentByQR = async (req, res) => {
  const equipment = await Equipment.findOne({ qrCodeData: req.params.qrCode })
    .populate('category')
    .populate('room')
    .populate('supplier');

  if (!equipment) {
    return res.status(404).json({ success: false, message: 'Mã QR không khớp với bất kỳ tài sản nào trong kho.' });
  }

  res.json({
    success: true,
    equipment
  });
};

// @desc    Create equipment borrow request
// @route   POST /api/equipments/borrow
export const requestBorrowEquipment = async (req, res) => {
  const { equipmentId, startTime, endTime, purpose } = req.body;

  const equipment = await Equipment.findById(equipmentId);
  if (!equipment) {
    return res.status(404).json({ success: false, message: 'Thiết bị không tồn tại.' });
  }

  if (equipment.status !== EQUIPMENT_STATUSES.AVAILABLE) {
    return res.status(400).json({
      success: false,
      message: `Thiết bị hiện không khả dụng để mượn (Trạng thái: ${equipment.status}).`
    });
  }

  // Escalation: High value threshold > 50,000,000 VNĐ
  const isHighValue = equipment.originalPrice >= 50000000;
  const borrowCode = `EQB-${Date.now().toString().slice(-6)}`;

  const borrowing = await EquipmentBorrowing.create({
    borrowCode,
    user: req.user._id,
    equipment: equipment._id,
    startTime: new Date(startTime),
    endTime: new Date(endTime),
    purpose,
    status: isHighValue ? 'pending' : 'approved', // Auto-approve low value, escalate high value
    isEscalated: isHighValue,
    escalationReason: isHighValue ? 'Thiết bị có nguyên giá trị cao >= 50.000.000 VNĐ (RULE_HIGH_VALUE)' : null
  });

  if (!isHighValue) {
    equipment.status = EQUIPMENT_STATUSES.BORROWED;
    await equipment.save();
  }

  await AuditLog.logAction({
    user: req.user._id,
    userDisplay: req.user.fullName,
    action: 'EQUIPMENT_BORROW_REQUEST',
    entityType: 'EquipmentBorrowing',
    entityId: borrowing._id.toString(),
    ipAddress: req.ip,
    diffData: {
      borrowCode,
      assetCode: equipment.assetCode,
      isHighValue
    }
  });

  res.status(201).json({
    success: true,
    message: isHighValue
      ? 'Đơn mượn thiết bị giá trị cao (>50 triệu) đã được ghi nhận và chuyển cấp Ban Giám Hiệu phê duyệt.'
      : 'Mượn thiết bị thành công.',
    borrowing
  });
};
