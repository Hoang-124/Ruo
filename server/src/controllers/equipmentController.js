import crypto from 'crypto';
import { Equipment, EquipmentCategory, Supplier } from '../models/Equipment.js';
import { Room } from '../models/Facility.js';
import { EquipmentBorrowing } from '../models/EquipmentBorrowing.js';
import { AuditLog } from '../models/AuditLog.js';
import { EQUIPMENT_STATUSES } from '../config/constants.js';

// @desc    Create new equipment item (UC-3.7)
// @route   POST /api/equipments
// @access  Private (Facility Staff, Admin)
export const createEquipment = async (req, res) => {
  const {
    assetCode,
    serialNumber,
    name,
    category,
    room,
    supplier,
    originalPrice,
    remainingValue,
    purchaseDate,
    warrantyExpiry,
    condition,
    specifications,
    imageUrl,
    qrCodeData: customQrCodeData
  } = req.body;

  if (!assetCode || !name || !category || originalPrice === undefined || !purchaseDate) {
    return res.status(400).json({
      success: false,
      message: 'Vui lòng cung cấp đầy đủ thông tin bắt buộc: Mã tài sản, Tên thiết bị, Chủng loại, Nguyên giá và Ngày mua.'
    });
  }

  // Check unique assetCode
  const existingAsset = await Equipment.findOne({ assetCode: assetCode.toUpperCase().trim() });
  if (existingAsset) {
    return res.status(409).json({
      success: false,
      message: `Mã tài sản '${assetCode.toUpperCase().trim()}' đã tồn tại trong hệ thống. Vui lòng nhập mã khác.`
    });
  }

  // Auto-generate immutable QR Code Data token if not provided
  const qrCodeData = customQrCodeData && customQrCodeData.trim() !== ''
    ? customQrCodeData.trim()
    : `QR-EQ-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

  const equipment = await Equipment.create({
    assetCode: assetCode.toUpperCase().trim(),
    qrCodeData,
    serialNumber: serialNumber || '',
    name: name.trim(),
    category,
    room: room || null,
    supplier: supplier || null,
    originalPrice: Number(originalPrice),
    remainingValue: remainingValue !== undefined ? Number(remainingValue) : Number(originalPrice),
    purchaseDate: new Date(purchaseDate),
    warrantyExpiry: warrantyExpiry ? new Date(warrantyExpiry) : null,
    condition: condition || 'brand_new',
    status: 'available',
    specifications: specifications || {},
    imageUrl: imageUrl || ''
  });

  const populatedEquipment = await Equipment.findById(equipment._id)
    .populate('category')
    .populate('room')
    .populate('supplier');

  // Audit log
  if (req.user) {
    await AuditLog.logAction({
      user: req.user._id,
      userDisplay: req.user.fullName,
      action: 'EQUIPMENT_CREATE',
      entityType: 'Equipment',
      entityId: equipment._id.toString(),
      ipAddress: req.ip,
      diffData: {
        assetCode: equipment.assetCode,
        name: equipment.name,
        originalPrice: equipment.originalPrice
      }
    });
  }

  res.status(201).json({
    success: true,
    message: 'Tạo tài sản mới thành công.',
    equipment: populatedEquipment
  });
};


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
