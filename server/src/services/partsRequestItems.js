import mongoose from 'mongoose';

// Merge repeated catalog entries before checking availability or recording an issue.
export function normalizePartsRequestItems(items) {
  const invalid = () => Object.assign(new Error('Danh sách linh kiện phải có mã hợp lệ và số lượng nguyên dương.'), { statusCode: 400 });
  if (!Array.isArray(items) || !items.length) throw invalid();
  const grouped = new Map();
  for (const item of items) {
    const partId = item?.part_id;
    const rawQty = item?.qty ?? item?.quantity;
    const qty = Number(rawQty);
    if (!mongoose.isValidObjectId(partId) || !['number', 'string'].includes(typeof rawQty)
      || !Number.isSafeInteger(qty) || qty <= 0) throw invalid();
    if (item.qty != null && item.quantity != null && Number(item.quantity) !== qty) throw invalid();
    const key = String(partId);
    const total = (grouped.get(key)?.qty || 0) + qty;
    if (!Number.isSafeInteger(total)) throw invalid();
    grouped.set(key, { part_id: partId, qty: total, quantity: total, unit_price: 0 });
  }
  return [...grouped.values()];
}
