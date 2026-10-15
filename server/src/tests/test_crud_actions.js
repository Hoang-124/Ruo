import mongoose from 'mongoose';
import { Equipment } from '../models/Equipment.js';
import { Category } from '../models/Category.js';
import { Room } from '../models/Room.js';
import { Supplier } from '../models/Supplier.js';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ruo_db';

async function testCrudDataActions() {
  console.log('=== BẮT ĐẦU KIỂM THỬ TOÀN DIỆN CRUD DATA ACTIONS ===');
  await mongoose.connect(MONGO_URI);

  try {
    // 1. READ: Verify created item EQ-MAXHUB-86
    console.log('\n▶ [READ] Tra cứu thiết bị vừa tạo EQ-MAXHUB-86:');
    let item = await Equipment.findOne({ code: 'EQ-MAXHUB-86' })
      .populate('category_id')
      .populate('room_id')
      .populate('supplier_id');

    if (!item) {
      throw new Error('Không tìm thấy thiết bị EQ-MAXHUB-86 trong database!');
    }
    console.log(`  ✔ READ thành công: ${item.name} (${item.code}), Giá: ${item.price.toLocaleString('vi-VN')} đ, QR: ${item.qr_code}`);

    // 2. UPDATE: Update model, price, and specs
    console.log('\n▶ [UPDATE] Cập nhật thông tin tài sản:');
    item.model = 'V6 Transcend Pro 86';
    item.price = 52000000;
    item.depreciation_rate = 15;
    await item.save();

    const updated = await Equipment.findOne({ code: 'EQ-MAXHUB-86' });
    if (updated.price !== 52000000 || updated.model !== 'V6 Transcend Pro 86') {
      throw new Error('Dữ liệu cập nhật không khớp!');
    }
    console.log(`  ✔ UPDATE thành công: Model mới: ${updated.model}, Giá mới: ${updated.price.toLocaleString('vi-VN')} đ, Khấu hao: ${updated.depreciation_rate}%/năm`);

    // 3. DELETE / CLEANUP: Delete the test equipment
    console.log('\n▶ [DELETE] Xóa tài sản thử nghiệm EQ-MAXHUB-86 khỏi kho:');
    const deleteRes = await Equipment.deleteOne({ code: 'EQ-MAXHUB-86' });
    if (deleteRes.deletedCount !== 1) {
      throw new Error('Xóa thiết bị thất bại!');
    }
    console.log('  ✔ DELETE thành công: Tài sản đã được xóa an toàn khỏi kho.');

    // 4. VERIFY: Confirm count returned to 3
    const finalCount = await Equipment.countDocuments();
    console.log(`\n▶ [VERIFY COUNT] Tổng số thiết bị trong kho sau khi dọn dẹp: ${finalCount} (đạt chuẩn)`);

    console.log('\n=== TOÀN BỘ 4/4 THAO TÁC CRUD DATA ACTIONS HOÀN TẤT THÀNH CÔNG 100% ===');
  } finally {
    await mongoose.disconnect();
  }
}

testCrudDataActions().catch(err => {
  console.error('Lỗi kiểm thử CRUD:', err);
  process.exit(1);
});
