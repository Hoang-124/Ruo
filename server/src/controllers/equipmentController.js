import crypto from 'crypto';
import mongoose from 'mongoose';
import { Equipment } from '../models/Equipment.js';
import { Category } from '../models/Category.js';
import { Supplier } from '../models/Supplier.js';
import { Room } from '../models/Room.js';
import { AuditLog } from '../models/AuditLog.js';
import { EquipmentMovement } from '../models/EquipmentMovement.js';
import { Repair } from '../models/Repair.js';
import { PreventiveMaintenance } from '../models/PreventiveMaintenance.js';
import { EQUIPMENT_STATUSES } from '../config/constants.js';
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
    qrCodeData,
    current_repair_unit_id,
    currentRepairUnitId,
    import_session_id,
    importSessionId,
    depreciation_rate,
    depreciationRate
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

  const finalCondition = condition || 'good';

  const rawExpiry = warranty_expiry || warrantyExpiry;
  const expiryDate = rawExpiry ? new Date(rawExpiry) : null;
  const isExpired = expiryDate && expiryDate.getTime() < Date.now();

  const imageList = Array.isArray(images)
    ? images
    : (imageUrl ? [imageUrl] : []);

    const defaultStatus = roomDoc ? EQUIPMENT_STATUSES.IN_USE : EQUIPMENT_STATUSES.IN_STOCK;
    const reqStatus = req.body.status;
    const finalStatus = reqStatus && Object.values(EQUIPMENT_STATUSES).includes(reqStatus) ? reqStatus : defaultStatus;

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
      specs: specs || specifications || {},
      images: imageList,
      depreciation_rate: depreciation_rate !== undefined ? Number(depreciation_rate) : (depreciationRate !== undefined ? Number(depreciationRate) : 20),
      current_repair_unit_id: current_repair_unit_id || currentRepairUnitId || null,
      import_session_id: import_session_id || importSessionId || null,
      status: finalStatus
    });

  const populated = await Equipment.findById(equipment._id)
    .populate('category_id')
    .populate('room_id')
    .populate('supplier_id')
    .populate('current_repair_unit_id')
    .populate('import_session_id');

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

// @desc    Get all equipment items with search, filter, and pagination (UC-3.8)
// @route   GET /api/equipments
export const getEquipments = asyncHandler(async (req, res) => {
  const {
    category_id,
    category,
    room_id,
    room,
    building,
    status,
    condition,
    search,
    q,
    minPrice,
    maxPrice,
    page = 1,
    limit = 20
  } = req.query;

  const query = {};

  const targetCategory = category_id || category;
  if (targetCategory && targetCategory !== 'ALL') {
    if (mongoose.Types.ObjectId.isValid(targetCategory)) {
      query.category_id = targetCategory;
    } else {
      const catDoc = await Category.findOne({
        $or: [{ code: String(targetCategory).toUpperCase().trim() }, { name: String(targetCategory).trim() }]
      });
      if (catDoc) query.category_id = catDoc._id;
    }
  }

  const targetRoom = room_id || room;
  if (targetRoom && targetRoom !== 'ALL') {
    if (mongoose.Types.ObjectId.isValid(targetRoom)) {
      query.room_id = targetRoom;
    } else {
      const roomDoc = await Room.findOne({ code: String(targetRoom).toUpperCase().trim() });
      if (roomDoc) query.room_id = roomDoc._id;
    }
  }

  if (building && building !== 'ALL') {
    const roomsInBuilding = await Room.find({ building: String(building).trim() }).select('_id');
    const roomIds = roomsInBuilding.map((r) => r._id);
    query.room_id = { $in: roomIds };
  }

  if (status && status !== 'ALL') {
    query.status = status;
  }

  if (condition && condition !== 'ALL') {
    query.condition = condition;
  }

  if (minPrice !== undefined || maxPrice !== undefined) {
    query.price = {};
    if (minPrice !== undefined && !isNaN(Number(minPrice))) {
      query.price.$gte = Number(minPrice);
    }
    if (maxPrice !== undefined && !isNaN(Number(maxPrice))) {
      query.price.$lte = Number(maxPrice);
    }
  }

  const keyword = (q || search || '').trim();
  if (keyword) {
    const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    query.$or = [
      { name: { $regex: escaped, $options: 'i' } },
      { code: { $regex: escaped, $options: 'i' } },
      { serial_number: { $regex: escaped, $options: 'i' } },
      { brand: { $regex: escaped, $options: 'i' } },
      { model: { $regex: escaped, $options: 'i' } }
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
    .populate('current_repair_unit_id')
    .populate('import_session_id')
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
  const rawQr = req.params.qrCode || req.params.qr_code;
  if (!rawQr || typeof rawQr !== 'string') {
    return res.status(400).json({
      success: false,
      message: 'Vui lòng cung cấp mã QR hợp lệ.'
    });
  }

  const qrCodeParam = rawQr.trim();
  const equipment = await Equipment.findOne({
    $or: [{ qr_code: qrCodeParam }, { code: qrCodeParam }]
  })
    .populate('category_id')
    .populate('room_id')
    .populate('supplier_id')
    .populate('current_repair_unit_id')
    .populate('import_session_id');

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

// @desc    Get single equipment by ID with Aggregated Life-cycle Timeline & Depreciation (UC-3.9)
// @route   GET /api/equipments/:id
export const getEquipmentById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const equipment = await Equipment.findById(id)
    .populate('category_id')
    .populate('room_id')
    .populate('supplier_id')
    .populate('current_repair_unit_id')
    .populate('import_session_id');

  if (!equipment) {
    return res.status(404).json({
      success: false,
      message: 'Không tìm thấy thiết bị.'
    });
  }

  // 1. Location movement timeline
  const movements = await EquipmentMovement.find({ equipment_id: id })
    .populate('from_room_id', 'code name building floor')
    .populate('to_room_id', 'code name building floor')
    .populate('ordered_by', 'code full_name email role')
    .populate('performed_by', 'code full_name email role')
    .sort({ created_at: -1 });

  // 2. Incidents & repairs timeline
  const repairs = await Repair.find({ equipment_id: id })
    .populate('reported_by', 'code full_name email')
    .populate('assigned_to', 'code full_name email')
    .populate('repair_unit_id', 'code name specialty phone email')
    .sort({ reported_at: -1 });

  // 3. Preventive maintenance timeline
  const maintenance = await PreventiveMaintenance.find({ equipment_id: id })
    .populate('checked_by', 'code full_name email')
    .sort({ check_date: -1 });

  // 4. Financial straight-line depreciation schedule
  const originalPrice = equipment.price || 0;
  const depRate = equipment.depreciation_rate || 20; // % per year
  const purchaseDate = equipment.purchase_date ? new Date(equipment.purchase_date) : new Date();
  const yearsPassed = Math.max(0, (Date.now() - purchaseDate.getTime()) / (365.25 * 24 * 3600 * 1000));
  const depreciationFactor = Math.min(1, Math.max(0, (yearsPassed * depRate) / 100));
  const remainingValue = Math.round(originalPrice * (1 - depreciationFactor));
  const depreciatedValue = Math.round(originalPrice - remainingValue);

  res.json({
    success: true,
    equipment,
    movements,
    repairs,
    maintenance,
    depreciation: {
      originalPrice,
      depreciationRate: depRate,
      purchaseDate,
      yearsPassed: Number(yearsPassed.toFixed(2)),
      remainingValue,
      depreciatedValue,
      depreciationPercent: Number((depreciationFactor * 100).toFixed(1))
    }
  });
});

// @desc    Update equipment info (UC: Update equipment info)
// @route   PUT /api/equipments/:id
export const updateEquipment = asyncHandler(async (req, res) => {
  const equipment = await Equipment.findById(req.params.id);
  if (!equipment) {
    return res.status(404).json({ success: false, message: 'Không tìm thấy thiết bị.' });
  }

  const { name, brand, model, serial_number, price, depreciation_rate, specs } = req.body;
  if (name) equipment.name = name.trim();
  if (brand !== undefined) equipment.brand = String(brand).trim();
  if (model !== undefined) equipment.model = String(model).trim();
  if (serial_number !== undefined) equipment.serial_number = String(serial_number).trim();
  if (price !== undefined) equipment.price = Number(price);
  if (depreciation_rate !== undefined) equipment.depreciation_rate = Number(depreciation_rate);
  if (specs !== undefined) equipment.specs = specs;

  await equipment.save();

  const updated = await Equipment.findById(equipment._id)
    .populate('category_id')
    .populate('room_id')
    .populate('supplier_id');

  res.json({
    success: true,
    message: 'Cập nhật thông tin thiết bị thành công.',
    equipment: updated
  });
});

// @desc    Update warranty info (UC: Update warranty info)
// @route   PATCH /api/equipments/:id/warranty
export const updateWarrantyInfo = asyncHandler(async (req, res) => {
  const equipment = await Equipment.findById(req.params.id);
  if (!equipment) {
    return res.status(404).json({ success: false, message: 'Không tìm thấy thiết bị.' });
  }

  const { warranty_expiry, warranty_status } = req.body;
  if (warranty_expiry) {
    equipment.warranty_expiry = new Date(warranty_expiry);
  }
  if (warranty_status) {
    equipment.warranty_status = warranty_status;
  }

  await equipment.save();

  res.json({
    success: true,
    message: 'Cập nhật thông tin bảo hành thành công.',
    equipment
  });
});

