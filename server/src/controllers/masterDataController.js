import { Category } from '../models/Category.js';
import { Supplier } from '../models/Supplier.js';
import { RepairUnit } from '../models/RepairUnit.js';

// Categories
export const getCategories = async (req, res) => {
  const categories = await Category.find().sort({ name: 1 });
  res.json({ success: true, total: categories.length, categories });
};

export const createCategory = async (req, res) => {
  const { code, name, description } = req.body;
  if (!code || !name) {
    return res.status(400).json({ success: false, message: 'Vui lòng cung cấp mã và tên chủng loại.' });
  }
  const cleanCode = String(code).trim().toUpperCase();
  const existing = await Category.findOne({ code: cleanCode });
  if (existing) {
    return res.status(409).json({ success: false, message: 'Mã chủng loại đã tồn tại.' });
  }
  const category = await Category.create({ code: cleanCode, name: String(name).trim(), description });
  res.status(201).json({ success: true, message: 'Thêm chủng loại thành công.', category });
};

// Suppliers
export const getSuppliers = async (req, res) => {
  const suppliers = await Supplier.find().sort({ name: 1 });
  res.json({ success: true, total: suppliers.length, suppliers });
};

export const createSupplier = async (req, res) => {
  const { code, name, phone, email, address, contact } = req.body;
  if (!code || !name) {
    return res.status(400).json({ success: false, message: 'Vui lòng cung cấp mã và tên nhà cung cấp.' });
  }
  const cleanCode = String(code).trim().toUpperCase();
  const existing = await Supplier.findOne({ code: cleanCode });
  if (existing) {
    return res.status(409).json({ success: false, message: 'Mã nhà cung cấp đã tồn tại.' });
  }
  const supplier = await Supplier.create({ code: cleanCode, name: String(name).trim(), phone, email, address, contact });
  res.status(201).json({ success: true, message: 'Đăng ký nhà cung cấp thành công.', supplier });
};

// Repair Units
export const getRepairUnits = async (req, res) => {
  const repairUnits = await RepairUnit.find().sort({ name: 1 });
  res.json({ success: true, total: repairUnits.length, repairUnits });
};

export const createRepairUnit = async (req, res) => {
  const { code, name, specialty, phone, address } = req.body;
  if (!code || !name) {
    return res.status(400).json({ success: false, message: 'Vui lòng cung cấp mã và tên đơn vị sửa chữa.' });
  }
  const cleanCode = String(code).trim().toUpperCase();
  const existing = await RepairUnit.findOne({ code: cleanCode });
  if (existing) {
    return res.status(409).json({ success: false, message: 'Mã đơn vị sửa chữa đã tồn tại.' });
  }
  const repairUnit = await RepairUnit.create({ code: cleanCode, name: String(name).trim(), specialty, phone, address });
  res.status(201).json({ success: true, message: 'Đăng ký đơn vị sửa chữa thành công.', repairUnit });
};
