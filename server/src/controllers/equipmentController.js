import crypto from 'crypto';
import mongoose from 'mongoose';
import { Equipment } from '../models/Equipment.js';
import { Category } from '../models/Category.js';
import { Supplier } from '../models/Supplier.js';
import { Room } from '../models/Room.js';
import { AuditLog } from '../models/AuditLog.js';
import { EQUIPMENT_STATUSES, EQUIPMENT_CONDITIONS } from '../config/constants.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// @desc    Get all equipment categories
// @route   GET /api/equipments/categories
export const getEquipmentCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find().sort({ name: 1 });
  res.status(200).json({
    success: true,
    categories
  });
});

// @desc    Create new equipment item (UC-3.1 & UC-3.7)
// @route   POST /api/equipments
// @access  Private (Staff, Admin)
export const createEquipment = asyncHandler(async (req, res) => {
  const {
    code,
    assetCode,
    name,
    serial_number,
    serialNumber,
    brand,
    model,
    category_id,
    category,
    room_id,
    room,
    supplier_id,
    supplier,
    price,
    originalPrice,
    remaining_value,
    remainingValue,
    purchase_date,
    purchaseDate,
    warranty_expiry,
    warrantyExpiry,
    condition,
    specs,
    specifications,
    images,
    imageUrl,
    qr_code,
    qrCodeData
  } = req.body;

  const rawCode = code || assetCode;
  if (!rawCode || typeof rawCode !== 'string' || !rawCode.trim()) {
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

  const rawCat = category_id || category;
  if (!rawCat) {
    return res.status(400).json({
      success: false,
      message: 'Vui lòng chọn Chủng loại thiết bị.'
    });
  }

  const rawPrice = price !== undefined ? price : originalPrice;
  const numPrice = Number(rawPrice);
  if (rawPrice === undefined || isNaN(numPrice) || numPrice < 0) {
    return res.status(400).json({
      success: false,
      message: 'Vui lòng nhập Nguyên giá là một số dương hợp lệ.'
    });
  }

  const rawDate = purchase_date || purchaseDate;
  const pDate = new Date(rawDate || Date.now());
  if (isNaN(pDate.getTime())) {
    return res.status(400).json({
      success: false,
      message: 'Vui lòng chọn Ngày mua hợp lệ.'
    });
  }

  const cleanCode = rawCode.toUpperCase().trim();

  // Check unique code
  const existingAsset = await Equipment.findOne({ code: cleanCode });
  if (existingAsset) {
    return res.status(409).json({
      success: false,
      message: `Mã tài sản '${cleanCode}' đã tồn tại trong hệ thống. Vui lòng nhập mã khác.`
    });
  }

  // Validate Category in DB
  let categoryDoc = null;
  if (mongoose.Types.ObjectId.isValid(rawCat)) {
    categoryDoc = await Category.findById(rawCat);
  }
  if (!categoryDoc) {
    categoryDoc = await Category.findOne({
      $or: [{ code: String(rawCat).toUpperCase().trim() }, { name: String(rawCat).trim() }]
    });
  }
  if (!categoryDoc) {
    return res.status(404).json({
      success: false,
      message: 'Chủng loại thiết bị không tồn tại trong hệ thống.'
    });
  }

  // Resolve room if provided
  let roomDoc = null;
  const targetRoom = room_id || room;
  if (targetRoom) {
    if (mongoose.Types.ObjectId.isValid(targetRoom)) {
      roomDoc = await Room.findById(targetRoom);
    }
    if (!roomDoc) {
      roomDoc = await Room.findOne({ code: String(targetRoom).toUpperCase().trim() });
    }
  }

  // Resolve supplier if provided
  let supplierDoc = null;
  const targetSupplier = supplier_id || supplier;
  if (targetSupplier && mongoose.Types.ObjectId.isValid(targetSupplier)) {
    supplierDoc = await Supplier.findById(targetSupplier);
  }

  // Handle custom or generated QR Code Data
  const rawQR = qr_code || qrCodeData;
  let finalQrCode;
  if (rawQR && typeof rawQR === 'string' && rawQR.trim() !== '') {
    const cleanCustomQR = rawQR.trim();
    const existingQR = await Equipment.findOne({ qr_code: cleanCustomQR });
    if (existingQR) {
      return res.status(409).json({
        success: false,
        message: `Mã QR '${cleanCustomQR}' đã tồn tại trong hệ thống. Vui lòng sử dụng mã QR khác.`
      });
    }
    finalQrCode = cleanCustomQR;
  } else {
    finalQrCode = `QR-EQ-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  }

  const rawRem = remaining_value !== undefined ? remaining_value : remainingValue;
  const remValue = (rawRem !== undefined && !isNaN(Number(rawRem))) ? Number(rawRem) : numPrice;

  const validConditions = Object.values(EQUIPMENT_CONDITIONS);
  const finalCondition = validConditions.includes(condition) ? condition : EQUIPMENT_CONDITIONS.GOOD;

  const rawExpiry = warranty_expiry || warrantyExpiry;
  const expiryDate = rawExpiry ? new Date(rawExpiry) : null;
  const isExpired = expiryDate && expiryDate.getTime() < Date.now();

  const imageList = Array.isArray(images)
    ? images
    : (imageUrl ? [imageUrl] : []);

  const equipment = await Equipment.create({
    code: cleanCode,
    qr_code: finalQrCode,
    name: name.trim(),
    serial_number: (serial_number || serialNumber || '').trim(),
    brand: (brand || '').trim(),
    model: (model || '').trim(),
    category_id: categoryDoc._id,
    room_id: roomDoc ? roomDoc._id : null,
    supplier_id: supplierDoc ? supplierDoc._id : null,
    price: numPrice,
    remaining_value: remValue,
    purchase_date: pDate,
    warranty_expiry: expiryDate,
    warranty_status: isExpired ? 'expired' : 'active',
    condition: finalCondition,
    specs: specs || specifications || {},
    images: imageList,
    status: EQUIPMENT_STATUSES.ACTIVE
  });

  const populated = await Equipment.findById(equipment._id)
    .populate('category_id')
    .populate('room_id')
    .populate('supplier_id');

  // Audit log
  if (req.user) {
    await AuditLog.logAction({
      user_id: req.user._id,
      user_display: `${req.user.full_name} (${req.user.code})`,
      action: 'EQUIPMENT_CREATE',
      target_table: 'equipments',
      entity_id: equipment._id.toString(),
      ip_address: req.ip,
      new_value: {
        code: equipment.code,
        name: equipment.name,
        price: equipment.price,
        category: categoryDoc.name
      }
    });
  }

  res.status(201).json({
    success: true,
    message: 'Tạo thiết bị mới thành công.',
    equipment: populated
  });
});

// @desc    Get all equipment items with search, filter, and pagination
// @route   GET /api/equipments
export const getEquipments = asyncHandler(async (req, res) => {
  const { category_id, room_id, status, condition, search, page = 1, limit = 20 } = req.query;
  const query = {};

  if (category_id) query.category_id = category_id;
  if (room_id) query.room_id = room_id;
  if (status) query.status = status;
  if (condition) query.condition = condition;

  if (search) {
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    query.$or = [
      { name: { $regex: escaped, $options: 'i' } },
      { code: { $regex: escaped, $options: 'i' } },
      { serial_number: { $regex: escaped, $options: 'i' } }
    ];
  }

  const p = Math.max(1, parseInt(page, 10) || 1);
  const l = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (p - 1) * l;

  const total = await Equipment.countDocuments(query);
  const equipments = await Equipment.find(query)
    .populate('category_id')
    .populate('room_id')
    .populate('supplier_id')
    .sort({ created_at: -1 })
    .skip(skip)
    .limit(l);

  res.json({
    success: true,
    total,
    page: p,
    limit: l,
    totalPages: Math.ceil(total / l),
    equipments
  });
});

// @desc    Lookup single equipment by QR Code (Mobile scanner endpoint)
// @route   GET /api/equipments/qr/:qrCode
export const getEquipmentByQR = asyncHandler(async (req, res) => {
  const qrCodeParam = req.params.qrCode.trim();
  const equipment = await Equipment.findOne({ qr_code: qrCodeParam })
    .populate('category_id')
    .populate('room_id')
    .populate('supplier_id');

  if (!equipment) {
    return res.status(404).json({
      success: false,
      message: 'Mã QR không khớp với bất kỳ thiết bị nào trong hệ thống.'
    });
  }

  res.json({
    success: true,
    equipment
  });
});

// @desc    Get single equipment by ID
// @route   GET /api/equipments/:id
export const getEquipmentById = asyncHandler(async (req, res) => {
  const equipment = await Equipment.findById(req.params.id)
    .populate('category_id')
    .populate('room_id')
    .populate('supplier_id');

  if (!equipment) {
    return res.status(404).json({
      success: false,
      message: 'Không tìm thấy thiết bị.'
    });
  }

  res.json({
    success: true,
    equipment
  });
});
