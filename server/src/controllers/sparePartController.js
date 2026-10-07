import { SparePart } from '../models/SparePart.js';
import { PartsRequest } from '../models/PartsRequest.js';
import { Repair } from '../models/Repair.js';
import { Notification } from '../models/Notification.js';
import { User } from '../models/User.js';
import { AuditLog } from '../models/AuditLog.js';
import { assertTransition } from '../domain/stateMachines.js';
import { 
  USER_ROLES, 
  PARTS_REQUEST_STATUSES 
} from '../config/constants.js';

// @desc    Get all spare parts (View spare parts stock)
// @route   GET /api/spare-parts
export const getSpareParts = async (req, res) => {
  try {
    const parts = await SparePart.find().populate('supplier_id', 'code name phone');
    res.json({
      success: true,
      total: parts.length,
      parts
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update spare parts stock (Facility Manager)
// @route   PUT /api/spare-parts/:id/stock
export const updateSparePartStock = async (req, res) => {
  try {
    const { stock, min_stock, price } = req.body;
    const part = await SparePart.findById(req.params.id);
    if (!part) {
      return res.status(404).json({ success: false, message: 'Linh kiện không tồn tại.' });
    }

    if (stock !== undefined) part.stock = Number(stock);
    if (min_stock !== undefined) part.min_stock = Number(min_stock);
    if (price !== undefined) part.price = Number(price);
    await part.save();

    res.json({ success: true, message: 'Cập nhật kho linh kiện thành công.', part });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all parts requests
// @route   GET /api/spare-parts/requests
export const getPartsRequests = async (req, res) => {
  try {
    const requests = await PartsRequest.find()
      .populate('repair_id', 'ticket_code damage_level')
      .populate('requested_by', 'full_name code email role')
      .populate('approved_by', 'full_name code email role')
      .populate('items.part_id', 'code name unit price stock min_stock')
      .sort({ created_at: -1 });

    res.json({ success: true, total: requests.length, requests });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Request spare parts for repair (Technician)
// @route   POST /api/spare-parts/requests
export const requestSpareParts = async (req, res) => {
  try {
    const { repair_id, items } = req.body;
    if (!repair_id || !items || !items.length) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp mã phiếu sửa chữa và danh sách linh kiện.' });
    }

    const repair = await Repair.findById(repair_id);
    if (!repair) {
      return res.status(404).json({ success: false, message: 'Phiếu sửa chữa không tồn tại.' });
    }

    const partsRequest = await PartsRequest.create({
      repair_id: repair._id,
      requested_by: req.user._id,
      items: items.map(it => ({
        part_id: it.part_id,
        qty: Number(it.qty || it.quantity || 1),
        quantity: Number(it.qty || it.quantity || 1),
        unit_price: Number(it.unit_price || 0)
      })),
      status: PARTS_REQUEST_STATUSES.PENDING
    });

    // Notify Facility Managers
    const managers = await User.find({ role: USER_ROLES.FACILITY_MANAGER });
    for (const mgr of managers) {
      await Notification.create({
        user_id: mgr._id,
        type: 'parts_request',
        title: 'Yêu cầu cấp linh kiện sửa chữa mới',
        message: `Kỹ thuật viên ${req.user.full_name} yêu cầu cấp linh kiện cho phiếu ${repair.ticket_code}.`,
        reference_type: 'parts_request',
        reference_id: partsRequest._id
      });
    }

    res.status(201).json({ success: true, message: 'Gửi yêu cầu linh kiện thành công.', partsRequest });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Approve parts request and deduct warehouse stock (Facility Manager)
// @route   PUT /api/spare-parts/requests/:id/approve
export const approvePartsRequest = async (req, res) => {
  try {
    const partsRequest = await PartsRequest.findById(req.params.id);
    if (!partsRequest) {
      return res.status(404).json({ success: false, message: 'Yêu cầu linh kiện không tồn tại.' });
    }

    assertTransition('PARTS_REQUEST', partsRequest.status, PARTS_REQUEST_STATUSES.APPROVED, req.user.role);

    // Deduct stock for each part and check min_stock warning
    const warnings = [];
    for (const item of partsRequest.items) {
      const part = await SparePart.findById(item.part_id);
      if (part) {
        const qtyToDeduct = item.qty || item.quantity || 1;
        part.stock = Math.max(0, part.stock - qtyToDeduct);
        if (part.stock <= part.min_stock) {
          warnings.push(`Linh kiện ${part.name} (${part.code}) còn ${part.stock} cái, dưới mức tối thiểu (${part.min_stock}).`);
        }
        await part.save();
      }
    }

    partsRequest.status = PARTS_REQUEST_STATUSES.APPROVED;
    partsRequest.approved_by = req.user._id;
    partsRequest.approved_at = new Date();
    await partsRequest.save();

    await AuditLog.logAction({
      user_id: req.user._id,
      user_display: `${req.user.full_name} (${req.user.code})`,
      action: 'APPROVE_PARTS_REQUEST',
      target_table: 'parts_requests',
      entity_id: partsRequest._id.toString(),
      ip_address: req.ip || '127.0.0.1',
      new_value: { status: 'approved' }
    });

    res.json({
      success: true,
      message: 'Phê duyệt xuất kho linh kiện thành công.',
      partsRequest,
      warnings
    });
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ success: false, message: error.message });
  }
};

// @desc    Reject parts request (Facility Manager)
// @route   PUT /api/spare-parts/requests/:id/reject
export const rejectPartsRequest = async (req, res) => {
  try {
    const { reject_reason } = req.body;
    const partsRequest = await PartsRequest.findById(req.params.id);
    if (!partsRequest) {
      return res.status(404).json({ success: false, message: 'Yêu cầu linh kiện không tồn tại.' });
    }

    assertTransition('PARTS_REQUEST', partsRequest.status, PARTS_REQUEST_STATUSES.REJECTED, req.user.role);

    partsRequest.status = PARTS_REQUEST_STATUSES.REJECTED;
    partsRequest.approved_by = req.user._id;
    partsRequest.reject_reason = String(reject_reason || 'Không duyệt cấp linh kiện').trim();
    await partsRequest.save();

    res.json({ success: true, message: 'Đã từ chối cấp linh kiện.', partsRequest });
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ success: false, message: error.message });
  }
};
