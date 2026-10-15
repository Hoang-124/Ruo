import { Category } from '../models/Category.js';
import { Supplier } from '../models/Supplier.js';
import { RepairUnit } from '../models/RepairUnit.js';
import { Building, Floor, Room } from '../models/Room.js';
import { Equipment } from '../models/Equipment.js';
import { SparePart } from '../models/SparePart.js';
import { Repair } from '../models/Repair.js';
import {
  isValidDocumentId,
  sendAdminValidationError,
  validateAdminMasterData
} from '../utils/adminMasterDataValidation.js';

const sendDuplicateError = (res, error, next) => {
  if (error?.code === 11000) {
    return res.status(409).json({
      success: false,
      message: 'Mã đã tồn tại trong hệ thống.',
      errors: [{ field: 'code', message: 'Mã đã tồn tại trong hệ thống.' }]
    });
  }
  return next(error);
};

const sendNotFound = (res, label) =>
  res.status(404).json({ success: false, message: `Không tìm thấy ${label}.` });
const sendInvalidId = res =>
  res.status(400).json({ success: false, message: 'ID không đúng định dạng ObjectId.' });

const categoryCreateSchema = {
  code: { type: 'code', label: 'Mã loại thiết bị', required: true, minLength: 2, maxLength: 32 },
  name: { type: 'text', label: 'Tên loại thiết bị', required: true, minLength: 2, maxLength: 120 },
  description: { type: 'text', label: 'Mô tả', maxLength: 500, default: '' },
  depreciation_rate: { type: 'number', label: 'Tỷ lệ khấu hao', min: 0, max: 100, default: 20 }
};
const categoryUpdateSchema = {
  name: { type: 'text', label: 'Tên loại thiết bị', minLength: 2, maxLength: 120 },
  description: { type: 'text', label: 'Mô tả', maxLength: 500 },
  depreciation_rate: { type: 'number', label: 'Tỷ lệ khấu hao', min: 0, max: 100 }
};
const supplierCreateSchema = {
  code: { type: 'code', label: 'Mã nhà cung cấp', required: true, minLength: 2, maxLength: 32 },
  name: { type: 'text', label: 'Tên nhà cung cấp', required: true, minLength: 2, maxLength: 150 },
  contact_person: { type: 'text', label: 'Người liên hệ', maxLength: 120, default: '' },
  phone: { type: 'phone', label: 'Số điện thoại', maxLength: 20, default: '' },
  email: { type: 'email', label: 'Email', maxLength: 254, default: '' },
  address: { type: 'text', label: 'Địa chỉ', maxLength: 250, default: '' }
};
const supplierUpdateSchema = {
  name: { type: 'text', label: 'Tên nhà cung cấp', minLength: 2, maxLength: 150 },
  contact_person: { type: 'text', label: 'Người liên hệ', maxLength: 120 },
  phone: { type: 'phone', label: 'Số điện thoại', maxLength: 20 },
  email: { type: 'email', label: 'Email', maxLength: 254 },
  address: { type: 'text', label: 'Địa chỉ', maxLength: 250 }
};
const repairUnitCreateSchema = {
  code: { type: 'code', label: 'Mã đơn vị sửa chữa', required: true, minLength: 2, maxLength: 32 },
  name: { type: 'text', label: 'Tên đơn vị sửa chữa', required: true, minLength: 2, maxLength: 150 },
  specialty: { type: 'text', label: 'Chuyên môn', maxLength: 250, default: '' },
  contact_person: { type: 'text', label: 'Người phụ trách', maxLength: 120, default: '' },
  phone: { type: 'phone', label: 'Số điện thoại', maxLength: 20, default: '' },
  email: { type: 'email', label: 'Email', maxLength: 254, default: '' },
  address: { type: 'text', label: 'Địa chỉ', maxLength: 250, default: '' }
};
const repairUnitUpdateSchema = {
  name: { type: 'text', label: 'Tên đơn vị sửa chữa', minLength: 2, maxLength: 150 },
  specialty: { type: 'text', label: 'Chuyên môn', maxLength: 250 },
  contact_person: { type: 'text', label: 'Người phụ trách', maxLength: 120 },
  phone: { type: 'phone', label: 'Số điện thoại', maxLength: 20 },
  email: { type: 'email', label: 'Email', maxLength: 254 },
  address: { type: 'text', label: 'Địa chỉ', maxLength: 250 }
};
const buildingCreateSchema = {
  code: { type: 'code', label: 'Mã tòa nhà', required: true, minLength: 2, maxLength: 32 },
  name: { type: 'text', label: 'Tên tòa nhà', required: true, minLength: 2, maxLength: 150 },
  campusZone: { type: 'text', label: 'Khuôn viên', maxLength: 100, default: 'Khu A' },
  totalFloors: { type: 'number', label: 'Số tầng', integer: true, min: 1, max: 100, default: 5 },
  description: { type: 'text', label: 'Mô tả', maxLength: 500, default: '' }
};
const buildingUpdateSchema = {
  code: { type: 'code', label: 'Mã tòa nhà', minLength: 2, maxLength: 32 },
  name: { type: 'text', label: 'Tên tòa nhà', minLength: 2, maxLength: 150 },
  campusZone: { type: 'text', label: 'Khuôn viên', maxLength: 100 },
  totalFloors: { type: 'number', label: 'Số tầng', integer: true, min: 1, max: 100 },
  description: { type: 'text', label: 'Mô tả', maxLength: 500 },
  isActive: { type: 'boolean', label: 'Trạng thái hoạt động' }
};

export const listAdminCategories = async (req, res) => {
  const categories = await Category.find().sort({ name: 1 });
  res.json({ success: true, categories });
};

export const createAdminCategory = async (req, res, next) => {
  const { value, errors } = validateAdminMasterData(req.body, categoryCreateSchema);
  if (errors.length) return sendAdminValidationError(res, errors);
  try {
    const category = await Category.create(value);
    return res.status(201).json({ success: true, category });
  } catch (error) {
    return sendDuplicateError(res, error, next);
  }
};

export const updateAdminCategory = async (req, res) => {
  if (!isValidDocumentId(req.params.id)) return sendInvalidId(res);
  const { value: updates, errors } = validateAdminMasterData(req.body, categoryUpdateSchema, { requireAtLeastOne: true });
  if (errors.length) return sendAdminValidationError(res, errors);
  const category = await Category.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
  return category ? res.json({ success: true, category }) : sendNotFound(res, 'loại thiết bị');
};

export const deleteAdminCategory = async (req, res) => {
  if (!isValidDocumentId(req.params.id)) return sendInvalidId(res);
  const category = await Category.findById(req.params.id);
  if (!category) return sendNotFound(res, 'loại thiết bị');
  const [equipment, rooms, spareParts] = await Promise.all([
    Equipment.exists({ category_id: category._id }),
    Room.exists({ 'required_equipment.category_id': category._id }),
    SparePart.exists({ category_id: category._id })
  ]);
  if (equipment || rooms || spareParts) {
    return res.status(409).json({ success: false, message: 'Không thể xóa loại thiết bị đang được tài sản, phòng hoặc linh kiện tham chiếu.' });
  }
  await category.deleteOne();
  return res.json({ success: true, message: 'Đã xóa loại thiết bị.' });
};

export const listAdminSuppliers = async (req, res) => {
  const suppliers = await Supplier.find().sort({ name: 1 });
  res.json({ success: true, suppliers });
};

export const createAdminSupplier = async (req, res, next) => {
  const { value, errors } = validateAdminMasterData(req.body, supplierCreateSchema);
  if (errors.length) return sendAdminValidationError(res, errors);
  try {
    const supplier = await Supplier.create({
      code: value.code,
      name: value.name,
      phone: value.phone,
      email: value.email,
      address: value.address,
      contact: value.contact_person
    });
    return res.status(201).json({ success: true, supplier });
  } catch (error) {
    return sendDuplicateError(res, error, next);
  }
};

export const updateAdminSupplier = async (req, res) => {
  if (!isValidDocumentId(req.params.id)) return sendInvalidId(res);
  const { value, errors } = validateAdminMasterData(req.body, supplierUpdateSchema, { requireAtLeastOne: true });
  if (errors.length) return sendAdminValidationError(res, errors);
  const updates = { ...value };
  if (Object.hasOwn(updates, 'contact_person')) {
    updates.contact = updates.contact_person;
    delete updates.contact_person;
  }
  const supplier = await Supplier.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
  return supplier ? res.json({ success: true, supplier }) : sendNotFound(res, 'nhà cung cấp');
};

export const deleteAdminSupplier = async (req, res) => {
  if (!isValidDocumentId(req.params.id)) return sendInvalidId(res);
  const supplier = await Supplier.findById(req.params.id);
  if (!supplier) return sendNotFound(res, 'nhà cung cấp');
  const [equipment, parts] = await Promise.all([
    Equipment.exists({ supplier_id: supplier._id }),
    SparePart.exists({ supplier_id: supplier._id })
  ]);
  if (equipment || parts) {
    return res.status(409).json({ success: false, message: 'Không thể xóa nhà cung cấp đang được thiết bị hoặc linh kiện tham chiếu.' });
  }
  await supplier.deleteOne();
  return res.json({ success: true, message: 'Đã xóa nhà cung cấp.' });
};

export const listAdminRepairUnits = async (req, res) => {
  const repairUnits = await RepairUnit.find().sort({ name: 1 });
  res.json({ success: true, repairUnits });
};

export const createAdminRepairUnit = async (req, res, next) => {
  const { value, errors } = validateAdminMasterData(req.body, repairUnitCreateSchema);
  if (errors.length) return sendAdminValidationError(res, errors);
  try {
    const repairUnit = await RepairUnit.create(value);
    return res.status(201).json({ success: true, repairUnit });
  } catch (error) {
    return sendDuplicateError(res, error, next);
  }
};

export const updateAdminRepairUnit = async (req, res) => {
  if (!isValidDocumentId(req.params.id)) return sendInvalidId(res);
  const { value: updates, errors } = validateAdminMasterData(req.body, repairUnitUpdateSchema, { requireAtLeastOne: true });
  if (errors.length) return sendAdminValidationError(res, errors);
  const repairUnit = await RepairUnit.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
  return repairUnit ? res.json({ success: true, repairUnit }) : sendNotFound(res, 'đơn vị sửa chữa');
};

export const deleteAdminRepairUnit = async (req, res) => {
  if (!isValidDocumentId(req.params.id)) return sendInvalidId(res);
  const repairUnit = await RepairUnit.findById(req.params.id);
  if (!repairUnit) return sendNotFound(res, 'đơn vị sửa chữa');
  if (await Repair.exists({ repair_unit_id: repairUnit._id })) {
    return res.status(409).json({ success: false, message: 'Không thể xóa đơn vị sửa chữa đang được phiếu sửa chữa tham chiếu.' });
  }
  await repairUnit.deleteOne();
  return res.json({ success: true, message: 'Đã xóa đơn vị sửa chữa.' });
};

export const listAdminBuildings = async (req, res) => {
  const buildings = await Building.find({ code: 'A1' }).sort({ code: 1 });
  res.json({ success: true, buildings });
};

export const createAdminBuilding = async (req, res, next) => {
  const { value, errors } = validateAdminMasterData(req.body, buildingCreateSchema);
  if (errors.length) return sendAdminValidationError(res, errors);
  if (String(value.code).trim().toUpperCase() !== 'A1') {
    return res.status(400).json({
      success: false,
      message: 'Hệ thống đang triển khai thí điểm tại duy nhất Tòa nhà A1 (5 tầng), không hỗ trợ thêm tòa nhà khác.'
    });
  }
  try {
    const building = await Building.create({ ...value, code: 'A1', totalFloors: 5 });
    return res.status(201).json({ success: true, building });
  } catch (error) {
    return sendDuplicateError(res, error, next);
  }
};

export const updateAdminBuilding = async (req, res, next) => {
  if (!isValidDocumentId(req.params.id)) return sendInvalidId(res);
  const building = await Building.findById(req.params.id);
  if (!building) return sendNotFound(res, 'tòa nhà');
  const originalCode = building.code;
  const { value: updates, errors } = validateAdminMasterData(req.body, buildingUpdateSchema, { requireAtLeastOne: true });
  if (errors.length) return sendAdminValidationError(res, errors);
  const { code, name, campusZone, totalFloors, description, isActive } = updates;
  if (code !== undefined && String(code).trim().toUpperCase() !== originalCode) {
    return res.status(409).json({
      success: false,
      message: 'Không thể đổi mã Tòa nhà A1 trong phạm vi thí điểm.'
    });
  }
  if (isActive === false && originalCode === 'A1') {
    return res.status(409).json({
      success: false,
      message: 'Không thể ngừng hoạt động Tòa nhà A1 (tòa nhà duy nhất trong phạm vi thí điểm).'
    });
  }
  if (name !== undefined) {
    building.name = name;
  }
  if (campusZone !== undefined) building.campusZone = campusZone;
  if (description !== undefined) building.description = description;
  if (isActive !== undefined) building.isActive = isActive;
  if (totalFloors !== undefined) {
    if (originalCode === 'A1' && Number(totalFloors) !== 5) {
      return res.status(409).json({
        success: false,
        message: 'Tòa nhà thí điểm A1 có cấu trúc cố định 5 tầng.'
      });
    }
    const [maxRoomFloor, maxDeclaredFloor] = await Promise.all([
      Room.findOne({ building: originalCode }).sort({ floor: -1 }).select('floor'),
      Floor.findOne({ building: building._id }).sort({ floorNumber: -1 }).select('floorNumber')
    ]);
    const usedFloor = Math.max(maxRoomFloor?.floor || 0, maxDeclaredFloor?.floorNumber || 0);
    if (usedFloor && totalFloors < usedFloor) {
      return res.status(409).json({ success: false, message: `Tòa nhà đang khai báo/sử dụng tầng ${usedFloor}; không thể giảm số tầng thấp hơn.` });
    }
    building.totalFloors = totalFloors;
  }
  try {
    await building.save();
    return res.json({ success: true, building });
  } catch (error) {
    return sendDuplicateError(res, error, next);
  }
};

export const deleteAdminBuilding = async (req, res) => {
  if (!isValidDocumentId(req.params.id)) return sendInvalidId(res);
  const building = await Building.findById(req.params.id);
  if (!building) return sendNotFound(res, 'tòa nhà');
  if (building.code === 'A1') {
    return res.status(409).json({
      success: false,
      message: 'Không thể xóa Tòa nhà A1 (tòa nhà duy nhất trong phạm vi thí điểm).'
    });
  }
  const [rooms, floors] = await Promise.all([
    Room.exists({ building: building.code }),
    Floor.exists({ building: building._id })
  ]);
  if (rooms || floors) {
    return res.status(409).json({ success: false, message: 'Không thể xóa tòa nhà đang có phòng hoặc tầng được khai báo.' });
  }
  await building.deleteOne();
  return res.json({ success: true, message: 'Đã xóa tòa nhà.' });
};
