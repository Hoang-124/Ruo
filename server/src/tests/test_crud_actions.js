import mongoose from 'mongoose';
import { Equipment } from '../models/Equipment.js';
import { Category } from '../models/Category.js';
import { Room } from '../models/Room.js';
import { Supplier } from '../models/Supplier.js';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ruo_db';

async function testCrudDataActions() {
  console.log('=== BẮT ĐẦU KIỂM THỬ TOÀN DIỆN CRUD DATA ACTIONS (IDEMPOTENT) ===');
  await mongoose.connect(MONGO_URI);

  try {
    const baseCount = await Equipment.countDocuments();
    const category = await Category.findOne();
    const room = await Room.findOne();
    const supplier = await Supplier.findOne();

    // 1. CREATE: Create test equipment
    console.log('\n▶ [CREATE] Khởi tạo thiết bị thử nghiệm EQ-MAXHUB-86:');
    await Equipment.deleteOne({ code: 'EQ-MAXHUB-86' }); // Clean if existing
    const created = await Equipment.create({
      code: 'EQ-MAXHUB-86',
      name: 'Màn Hình Tương Tác Maxhub V6 86 Inch',
      brand: 'Maxhub',
      model: 'V6 Classic',
      serial_number: 'SN-MAXHUB-86-9901',
      category_id: category?._id,
      room_id: room?._id,
      supplier_id: supplier?._id,
      price: 48000000,
      depreciation_rate: 15,
      qr_code: `QR-EQ-MAXHUB-86-${Date.now()}`
    });
    console.log(`  ✔ CREATE thành công: ${created.name} (${created.code}), Nguyên giá: ${created.price.toLocaleString('vi-VN')} đ`);

    // 2. READ: Verify created item
    console.log('\n▶ [READ] Tra cứu thiết bị vừa tạo:');
    let item = await Equipment.findOne({ code: 'EQ-MAXHUB-86' })
      .populate('category_id')
      .populate('room_id')
      .populate('supplier_id');

    if (!item) {
      throw new Error('Không tìm thấy thiết bị EQ-MAXHUB-86 trong database!');
    }
    console.log(`  ✔ READ thành công: ${item.name} (${item.code}), Vị trí: ${item.room_id?.name || 'Chưa gắn phòng'}`);

    // 3. UPDATE: Update model, price, and specs
    console.log('\n▶ [UPDATE] Cập nhật thông tin tài sản:');
    item.model = 'V6 Transcend Pro 86';
    item.price = 52000000;
    item.depreciation_rate = 12;
    await item.save();

    const updated = await Equipment.findOne({ code: 'EQ-MAXHUB-86' });
    if (updated.price !== 52000000 || updated.model !== 'V6 Transcend Pro 86' || updated.depreciation_rate !== 12) {
      throw new Error('Dữ liệu cập nhật không khớp!');
    }
    console.log(`  ✔ UPDATE thành công: Model mới: ${updated.model}, Giá mới: ${updated.price.toLocaleString('vi-VN')} đ, Khấu hao: ${updated.depreciation_rate}%/năm`);

    // 4. DELETE / CLEANUP: Delete the test equipment
    console.log('\n▶ [DELETE] Xóa tài sản thử nghiệm EQ-MAXHUB-86 khỏi kho:');
    const deleteRes = await Equipment.deleteOne({ code: 'EQ-MAXHUB-86' });
    if (deleteRes.deletedCount !== 1) {
      throw new Error('Xóa thiết bị thất bại!');
    }
    console.log('  ✔ DELETE thành công: Tài sản đã được xóa an toàn khỏi kho.');

    // 5. VERIFY: Confirm count returned to initial baseCount
    const finalCount = await Equipment.countDocuments();
    if (finalCount !== baseCount) {
      throw new Error(`Số lượng thiết bị sau kiểm thử không khớp: ban đầu ${baseCount}, hiện tại ${finalCount}`);
    }
    console.log(`\n▶ [VERIFY COUNT] Tổng số thiết bị trong kho sau khi dọn dẹp: ${finalCount} (khớp 100% dữ liệu gốc)`);

    console.log('\n=== TOÀN BỘ 4/4 THAO TÁC CRUD DATA ACTIONS HOÀN TẤT THÀNH CÔNG 100% ===');
  } finally {
    await mongoose.disconnect();
  }
}

testCrudDataActions().catch(err => {
  console.error('Lỗi kiểm thử CRUD:', err);
  process.exit(1);
});
