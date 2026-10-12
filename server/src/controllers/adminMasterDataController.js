import { Category } from '../models/Category.js';
import { Supplier } from '../models/Supplier.js';
import { RepairUnit } from '../models/RepairUnit.js';
import { Building, Floor, Room } from '../models/Room.js';
import { Equipment } from '../models/Equipment.js';
import { SparePart } from '../models/SparePart.js';
import { Repair } from '../models/Repair.js';

const normalizeCode = (value) => String(value || '').trim().toUpperCase();
const sendDuplicateError = (res, error) => {
  if (error?.code === 11000) {
    return res.status(409).json({ success: false, message: 'Mã đã tồn tại trong hệ thống.' });
  }
  return res.status(500).json({ success: false, message: 'Không thể lưu dữ liệu danh mục.' });
};

const sendNotFound = (res, label) =>
  res.status(404).json({ success: false, message: `Không tìm thấy ${label}.` });

export const listAdminCategories = async (req, res) => {
  const categories = await Category.find().sort({ name: 1 });
  res.json({ success: true, categories });
};

export const createAdminCategory = async (req, res) => {
  const { code, name, description = '', depreciation_rate = 20 } = req.body;
  if (!code?.trim() || !name?.trim()) {
    return res.status(400).json({ success: false, message: 'Mã và tên loại thiết bị là bắt buộc.' });
  }
  const rate = Number(depreciation_rate);
  if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
    return res.status(400).json({ success: false, message: 'Tỷ lệ khấu hao phải nằm trong khoảng 0–100%.' });
  }
  try {
    const category = await Category.create({
      code: normalizeCode(code),
      name: name.trim(),
      description: String(description).trim(),
      depreciation_rate: rate
    });
    return res.status(201).json({ success: true, category });
  } catch (error) {
    return sendDuplicateError(res, error);
  }
};

export const updateAdminCategory = async (req, res) => {
  const { name, description, depreciation_rate } = req.body;
  const updates = {};
  if (name !== undefined) {
    if (!String(name).trim()) return res.status(400).json({ success: false, message: 'Tên loại thiết bị không được để trống.' });
    updates.name = String(name).trim();
  }
  if (description !== undefined) updates.description = String(description).trim();
  if (depreciation_rate !== undefined) {
    const rate = Number(depreciation_rate);
    if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
      return res.status(400).json({ success: false, message: 'Tỷ lệ khấu hao phải nằm trong khoảng 0–100%.' });
    }
    updates.depreciation_rate = rate;
  }
  const category = await Category.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
  return category ? res.json({ success: true, category }) : sendNotFound(res, 'loại thiết bị');
};

export const deleteAdminCategory = async (req, res) => {
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

export const createAdminSupplier = async (req, res) => {
  const { code, name, phone = '', email = '', address = '', contact_person = '' } = req.body;
  if (!code?.trim() || !name?.trim()) {
    return res.status(400).json({ success: false, message: 'Mã và tên nhà cung cấp là bắt buộc.' });
  }
  try {
    const supplier = await Supplier.create({
      code: normalizeCode(code),
      name: name.trim(),
      phone: String(phone).trim(),
      email: String(email).trim().toLowerCase(),
      address: String(address).trim(),
      contact: String(contact_person).trim()
    });
    return res.status(201).json({ success: true, supplier });
  } catch (error) {
    return sendDuplicateError(res, error);
  }
};

export const updateAdminSupplier = async (req, res) => {
  const { name, phone, email, address, contact_person } = req.body;
  const updates = {};
  if (name !== undefined) {
    if (!String(name).trim()) return res.status(400).json({ success: false, message: 'Tên nhà cung cấp không được để trống.' });
    updates.name = String(name).trim();
  }
  if (phone !== undefined) updates.phone = String(phone).trim();
  if (email !== undefined) updates.email = String(email).trim().toLowerCase();
  if (address !== undefined) updates.address = String(address).trim();
  if (contact_person !== undefined) updates.contact = String(contact_person).trim();
  const supplier = await Supplier.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
  return supplier ? res.json({ success: true, supplier }) : sendNotFound(res, 'nhà cung cấp');
};

export const deleteAdminSupplier = async (req, res) => {
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

export const createAdminRepairUnit = async (req, res) => {
  const { code, name, specialty = '', contact_person = '', phone = '', email = '', address = '' } = req.body;
  if (!code?.trim() || !name?.trim()) {
    return res.status(400).json({ success: false, message: 'Mã và tên đơn vị sửa chữa là bắt buộc.' });
  }
  try {
    const repairUnit = await RepairUnit.create({
      code: normalizeCode(code),
      name: name.trim(),
      specialty: String(specialty).trim(),
      contact_person: String(contact_person).trim(),
      phone: String(phone).trim(),
      email: String(email).trim().toLowerCase(),
      address: String(address).trim()
    });
    return res.status(201).json({ success: true, repairUnit });
  } catch (error) {
    return sendDuplicateError(res, error);
  }
};

export const updateAdminRepairUnit = async (req, res) => {
  const { name, specialty, contact_person, phone, email, address } = req.body;
  const updates = {};
  if (name !== undefined) {
    if (!String(name).trim()) return res.status(400).json({ success: false, message: 'Tên đơn vị sửa chữa không được để trống.' });
    updates.name = String(name).trim();
  }
  if (specialty !== undefined) updates.specialty = String(specialty).trim();
  if (contact_person !== undefined) updates.contact_person = String(contact_person).trim();
  if (phone !== undefined) updates.phone = String(phone).trim();
  if (email !== undefined) updates.email = String(email).trim().toLowerCase();
  if (address !== undefined) updates.address = String(address).trim();
  const repairUnit = await RepairUnit.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
  return repairUnit ? res.json({ success: true, repairUnit }) : sendNotFound(res, 'đơn vị sửa chữa');
};

export const deleteAdminRepairUnit = async (req, res) => {
  const repairUnit = await RepairUnit.findById(req.params.id);
  if (!repairUnit) return sendNotFound(res, 'đơn vị sửa chữa');
  if (await Repair.exists({ repair_unit_id: repairUnit._id })) {
    return res.status(409).json({ success: false, message: 'Không thể xóa đơn vị sửa chữa đang được phiếu sửa chữa tham chiếu.' });
  }
  await repairUnit.deleteOne();
  return res.json({ success: true, message: 'Đã xóa đơn vị sửa chữa.' });
};

export const listAdminBuildings = async (req, res) => {
  const buildings = await Building.find().sort({ code: 1 });
  res.json({ success: true, buildings });
};

export const createAdminBuilding = async (req, res) => {
  const { code, name, campusZone = 'Khu A', totalFloors = 5, description = '' } = req.body;
  if (!code?.trim() || !name?.trim()) {
    return res.status(400).json({ success: false, message: 'Mã và tên tòa nhà là bắt buộc.' });
  }
  const floors = Number(totalFloors);
  if (!Number.isInteger(floors) || floors < 1 || floors > 100) {
    return res.status(400).json({ success: false, message: 'Số tầng phải là số nguyên từ 1 đến 100.' });
  }
  try {
    const building = await Building.create({
      code: normalizeCode(code),
      name: name.trim(),
      campusZone: String(campusZone).trim(),
      totalFloors: floors,
      description: String(description).trim()
    });
    return res.status(201).json({ success: true, building });
  } catch (error) {
    return sendDuplicateError(res, error);
  }
};

export const updateAdminBuilding = async (req, res) => {
  const building = await Building.findById(req.params.id);
  if (!building) return sendNotFound(res, 'tòa nhà');
  const { code, name, campusZone, totalFloors, description, isActive } = req.body;
  if (code !== undefined) {
    const nextCode = normalizeCode(code);
    if (!nextCode) return res.status(400).json({ success: false, message: 'Mã tòa nhà không được để trống.' });
    if (nextCode !== building.code && await Room.exists({ building: building.code })) {
      return res.status(409).json({ success: false, message: 'Không thể đổi mã tòa nhà đang được phòng học tham chiếu.' });
    }
    building.code = nextCode;
  }
  if (name !== undefined) {
    if (!String(name).trim()) return res.status(400).json({ success: false, message: 'Tên tòa nhà không được để trống.' });
    building.name = String(name).trim();
  }
  if (campusZone !== undefined) building.campusZone = String(campusZone).trim();
  if (description !== undefined) building.description = String(description).trim();
  if (isActive !== undefined) building.isActive = Boolean(isActive);
  if (totalFloors !== undefined) {
    const floors = Number(totalFloors);
    if (!Number.isInteger(floors) || floors < 1 || floors > 100) {
      return res.status(400).json({ success: false, message: 'Số tầng phải là số nguyên từ 1 đến 100.' });
    }
    const [maxRoomFloor, maxDeclaredFloor] = await Promise.all([
      Room.findOne({ building: building.code }).sort({ floor: -1 }).select('floor'),
      Floor.findOne({ building: building._id }).sort({ floorNumber: -1 }).select('floorNumber')
    ]);
    const usedFloor = Math.max(maxRoomFloor?.floor || 0, maxDeclaredFloor?.floorNumber || 0);
    if (usedFloor && floors < usedFloor) {
      return res.status(409).json({ success: false, message: `Tòa nhà đang khai báo/sử dụng tầng ${usedFloor}; không thể giảm số tầng thấp hơn.` });
    }
    building.totalFloors = floors;
  }
  try {
    await building.save();
    return res.json({ success: true, building });
  } catch (error) {
    return sendDuplicateError(res, error);
  }
};

export const deleteAdminBuilding = async (req, res) => {
  const building = await Building.findById(req.params.id);
  if (!building) return sendNotFound(res, 'tòa nhà');
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
