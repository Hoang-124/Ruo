import crypto from 'crypto';
import mongoose from 'mongoose';
import { Equipment, EquipmentCategory, Supplier } from '../models/Equipment.js';
import { Room } from '../models/Facility.js';
import { EquipmentBorrowing } from '../models/EquipmentBorrowing.js';
import { AuditLog } from '../models/AuditLog.js';
import { EQUIPMENT_STATUSES } from '../config/constants.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// @desc    Get all equipment categories
// @route   GET /api/equipments/categories
export const getEquipmentCategories = asyncHandler(async (req, res) => {
  const categories = await EquipmentCategory.find({ deletedAt: null }).sort({ name: 1 });
  res.status(200).json({
    success: true,
    categories
  });
});

// @desc    Create new equipment item (UC-3.7)
// @route   POST /api/equipments
// @access  Private (Facility Staff, Admin)
export const createEquipment = asyncHandler(async (req, res) => {
  const {
    assetCode,
    serialNumber,
    name,
    category,
    room,
    locationRoom,
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

  // Basic presence & type validation
  if (!assetCode || typeof assetCode !== 'string' || !assetCode.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Vui lòng nhập Mã tài sản hợp lệ.'
    });
  }

  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Vui lòng nhập Tên thiết bị hợp lệ.'
    });
  }

  if (!category) {
    return res.status(400).json({
      success: false,
      message: 'Vui lòng chọn Chủng loại thiết bị.'
    });
  }

  const numOriginalPrice = Number(originalPrice);
  if (originalPrice === undefined || isNaN(numOriginalPrice) || numOriginalPrice < 0) {
    return res.status(400).json({
      success: false,
      message: 'Vui lòng nhập Nguyên giá là một số dương hợp lệ.'
    });
  }

  const pDate = new Date(purchaseDate);
  if (!purchaseDate || isNaN(pDate.getTime())) {
    return res.status(400).json({
      success: false,
      message: 'Vui lòng chọn Ngày mua hợp lệ.'
    });
  }

  const cleanAssetCode = assetCode.toUpperCase().trim();

  // Check unique assetCode
  const existingAsset = await Equipment.findOne({ assetCode: cleanAssetCode });
  if (existingAsset) {
    return res.status(409).json({
      success: false,
      message: `Mã tài sản '${cleanAssetCode}' đã tồn tại trong hệ thống. Vui lòng nhập mã khác.`
    });
  }

  // Validate Category existence in DB (support ObjectId, Code, or Name)
  let categoryDoc = null;
  if (mongoose.Types.ObjectId.isValid(category)) {
    categoryDoc = await EquipmentCategory.findById(category);
  }
  if (!categoryDoc) {
    categoryDoc = await EquipmentCategory.findOne({
      $or: [{ code: category }, { name: category }]
    });
  }
  if (!categoryDoc) {
    return res.status(404).json({
      success: false,
      message: 'Chủng loại thiết bị không tồn tại trong hệ thống.'
    });
  }

  // Resolve room if provided by ID or code
  let roomDoc = null;
  const targetRoom = room || locationRoom;
  if (targetRoom) {
    if (mongoose.Types.ObjectId.isValid(targetRoom)) {
      roomDoc = await Room.findById(targetRoom);
    }
    if (!roomDoc) {
      roomDoc = await Room.findOne({ code: targetRoom.toString().toUpperCase().trim() });
    }
  }

  // Handle custom or generated QR Code Data
  let qrCodeData;
  if (customQrCodeData && typeof customQrCodeData === 'string' && customQrCodeData.trim() !== '') {
    const cleanCustomQR = customQrCodeData.trim();
    const existingQR = await Equipment.findOne({ qrCodeData: cleanCustomQR });
    if (existingQR) {
      return res.status(409).json({
        success: false,
        message: `Mã QR tùy chỉnh '${cleanCustomQR}' đã tồn tại trong hệ thống. Vui lòng nhập mã QR khác.`
      });
    }
    qrCodeData = cleanCustomQR;
  } else {
    qrCodeData = `QR-EQ-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  }

  const equipment = await Equipment.create({
    assetCode: cleanAssetCode,
    qrCodeData,
    serialNumber: typeof serialNumber === 'string' ? serialNumber.trim() : '',
    name: name.trim(),
    category: categoryDoc._id,
    room: roomDoc ? roomDoc._id : null,
    supplier: supplier || null,
    originalPrice: numOriginalPrice,
    remainingValue: remainingValue !== undefined && !isNaN(Number(remainingValue)) ? Number(remainingValue) : numOriginalPrice,
    purchaseDate: pDate,
    warrantyExpiry: warrantyExpiry ? new Date(warrantyExpiry) : null,
    condition: condition || 'brand_new',
    status: 'available',
    specifications: specifications || {},
    imageUrl: typeof imageUrl === 'string' ? imageUrl.trim() : ''
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
});

// @desc    Get all equipment items
// @route   GET /api/equipments
export const getEquipments = asyncHandler(async (req, res) => {
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
});

// @desc    Lookup single equipment by QR Code (Mobile scanner endpoint)
// @route   GET /api/equipments/qr/:qrCode
export const getEquipmentByQR = asyncHandler(async (req, res) => {
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
});

// @desc    Create equipment borrow request
// @route   POST /api/equipments/borrow
export const requestBorrowEquipment = asyncHandler(async (req, res) => {
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
});
