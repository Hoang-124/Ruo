import mongoose from 'mongoose';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { Room } from '../models/Facility.js';
import { EquipmentCategory, Equipment } from '../models/Equipment.js';
import { createEquipment, getEquipmentByQR } from '../controllers/equipmentController.js';

dotenv.config();

const mockRes = () => {
  const res = {};
  res.statusCode = 200;
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (data) => {
    res.body = data;
    return res;
  };
  return res;
};

const mockNext = (res) => (err) => {
  if (err) {
    if (res.statusCode === 200) res.statusCode = 500;
    res.body = { success: false, message: err.message || 'Server Error' };
  }
};

const runTests = async () => {
  const mongoURI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ruo_db';
  console.log(`[UC-3.7 & QR Test] Connecting to DB: ${mongoURI}`);
  await mongoose.connect(mongoURI);

  try {
    // 1. Fetch or create test user & category
    let user = await User.findOne({ role: 'facility_staff' });
    if (!user) {
      user = await User.findOne();
    }
    let category = await EquipmentCategory.findOne();
    if (!category) {
      category = await EquipmentCategory.create({
        code: 'TEST_CAT',
        name: 'Category Kiểm Thử',
        depreciationYears: 5
      });
    }

    const testAssetCode = `TS-TEST-${Date.now().toString().slice(-5)}`;
    const customQR = `CUSTOM-QR-TEST-${Date.now()}`;

    console.log('\n--- Test Case 1: Tạo thiết bị mới hợp lệ (UC-3.7) ---');
    const req1 = {
      body: {
        assetCode: testAssetCode,
        name: 'Máy chiếu kiểm thử tự động',
        category: category._id,
        originalPrice: 15000000,
        purchaseDate: '2026-01-10',
        serialNumber: 'SN-99887766',
        qrCodeData: customQR
      },
      user,
      ip: '127.0.0.1'
    };
    const res1 = mockRes();
    await createEquipment(req1, res1, mockNext(res1));

    console.log(`Status Code: ${res1.statusCode}`);
    console.log(`Message: ${res1.body?.message}`);
    if (res1.statusCode !== 201 || !res1.body?.success) {
      throw new Error(`[FAIL] TC1 Failed: Expected 201, got ${res1.statusCode}. Details: ${res1.body?.message}`);
    }
    const createdEquipment = res1.body.equipment;
    console.log(`[PASS] TC1 Passed! Asset Code: ${createdEquipment.assetCode}, Generated QR: ${createdEquipment.qrCodeData}`);

    console.log('\n--- Test Case 2: Tạo bị trùng mã tài sản (UC-3.7 Error 409) ---');
    const req2 = {
      body: {
        assetCode: testAssetCode, // Duplicate
        name: 'Máy chiếu trùng mã',
        category: category._id,
        originalPrice: 15000000,
        purchaseDate: '2026-01-10'
      },
      user,
      ip: '127.0.0.1'
    };
    const res2 = mockRes();
    await createEquipment(req2, res2, mockNext(res2));

    console.log(`Status Code: ${res2.statusCode}`);
    console.log(`Message: ${res2.body?.message}`);
    if (res2.statusCode !== 409 || res2.body?.success !== false) {
      throw new Error(`[FAIL] TC2 Failed: Expected 409 Conflict, got ${res2.statusCode}`);
    }
    console.log('[PASS] TC2 Passed! Conflict duplicate assetCode handled correctly.');

    console.log('\n--- Test Case 3: Bỏ sót trường bắt buộc (UC-3.7 Error 400) ---');
    const req3 = {
      body: {
        assetCode: `TS-MISSING-${Date.now()}`
      },
      user,
      ip: '127.0.0.1'
    };
    const res3 = mockRes();
    await createEquipment(req3, res3, mockNext(res3));

    console.log(`Status Code: ${res3.statusCode}`);
    console.log(`Message: ${res3.body?.message}`);
    if (res3.statusCode !== 400 || res3.body?.success !== false) {
      throw new Error(`[FAIL] TC3 Failed: Expected 400 Bad Request, got ${res3.statusCode}`);
    }
    console.log('[PASS] TC3 Passed! Missing required fields rejected with 400.');

    console.log('\n--- Test Case 4: Quét tra cứu mã QR hợp lệ (QR-SCAN) ---');
    const req4 = {
      params: { qrCode: createdEquipment.qrCodeData }
    };
    const res4 = mockRes();
    await getEquipmentByQR(req4, res4, mockNext(res4));

    console.log(`Status Code: ${res4.statusCode}`);
    if (res4.statusCode !== 200 || !res4.body?.equipment) {
      throw new Error(`[FAIL] TC4 Failed: Expected 200 OK, got ${res4.statusCode}`);
    }
    console.log(`[PASS] TC4 Passed! Matched QR Code: ${res4.body.equipment.qrCodeData}, Asset Name: ${res4.body.equipment.name}`);

    console.log('\n--- Test Case 5: Quét mã QR không tồn tại (QR-SCAN Error 404) ---');
    const req5 = {
      params: { qrCode: 'INVALID_NON_EXISTENT_QR_CODE_9999' }
    };
    const res5 = mockRes();
    await getEquipmentByQR(req5, res5, mockNext(res5));

    console.log(`Status Code: ${res5.statusCode}`);
    console.log(`Message: ${res5.body?.message}`);
    if (res5.statusCode !== 404 || res5.body?.success !== false) {
      throw new Error(`[FAIL] TC5 Failed: Expected 404 Not Found, got ${res5.statusCode}`);
    }
    console.log('[PASS] TC5 Passed! Invalid QR Code returns 404.');

    console.log('\n--- Test Case 6: Trùng mã QR tùy chỉnh (UC-3.7 Custom QR Conflict 409) ---');
    const req6 = {
      body: {
        assetCode: `TS-NEW-${Date.now().toString().slice(-4)}`,
        name: 'Thiết bị trùng QR tùy chỉnh',
        category: category._id,
        originalPrice: 5000000,
        purchaseDate: '2026-02-01',
        qrCodeData: customQR // Duplicate QR
      },
      user,
      ip: '127.0.0.1'
    };
    const res6 = mockRes();
    await createEquipment(req6, res6, mockNext(res6));

    console.log(`Status Code: ${res6.statusCode}`);
    console.log(`Message: ${res6.body?.message}`);
    if (res6.statusCode !== 409 || res6.body?.success !== false) {
      throw new Error(`[FAIL] TC6 Failed: Expected 409 Conflict for duplicate custom QR, got ${res6.statusCode}`);
    }
    console.log('[PASS] TC6 Passed! Duplicate custom QR rejected with 409 Conflict.');

    console.log('\n--- Test Case 7: Chủng loại thiết bị (Category) không tồn tại (UC-3.7 404 Not Found) ---');
    const fakeCategoryId = new mongoose.Types.ObjectId();
    const req7 = {
      body: {
        assetCode: `TS-FAKE-CAT-${Date.now().toString().slice(-4)}`,
        name: 'Thiết bị category ảo',
        category: fakeCategoryId,
        originalPrice: 10000000,
        purchaseDate: '2026-01-15'
      },
      user,
      ip: '127.0.0.1'
    };
    const res7 = mockRes();
    await createEquipment(req7, res7, mockNext(res7));

    console.log(`Status Code: ${res7.statusCode}`);
    console.log(`Message: ${res7.body?.message}`);
    if (res7.statusCode !== 404 || res7.body?.success !== false) {
      throw new Error(`[FAIL] TC7 Failed: Expected 404 Not Found for missing category, got ${res7.statusCode}`);
    }
    console.log('[PASS] TC7 Passed! Non-existent category ID rejected with 404 Not Found.');

    console.log('\n--- Test Case 8: Truyền mã tài sản không phải chuỗi (Type Safety 400 Bad Request) ---');
    const req8 = {
      body: {
        assetCode: 12345, // Invalid type
        name: 'Thiết bị mã số',
        category: category._id,
        originalPrice: 10000000,
        purchaseDate: '2026-01-15'
      },
      user,
      ip: '127.0.0.1'
    };
    const res8 = mockRes();
    await createEquipment(req8, res8, mockNext(res8));

    console.log(`Status Code: ${res8.statusCode}`);
    console.log(`Message: ${res8.body?.message}`);
    if (res8.statusCode !== 400 || res8.body?.success !== false) {
      throw new Error(`[FAIL] TC8 Failed: Expected 400 Bad Request for non-string assetCode, got ${res8.statusCode}`);
    }
    console.log('[PASS] TC8 Passed! Malformed assetCode rejected with 400 Bad Request without server crash.');

    // Cleanup test item
    await Equipment.deleteOne({ _id: createdEquipment._id });
    console.log('\n[UC-3.7 & QR Test] Cleaned up test item from DB.');
    console.log('\n=============================================');
    console.log('ALL 8 INTEGRATION TEST CASES PASSED SUCCESSFULLY!');
    console.log('=============================================');

  } catch (err) {
    console.error('\n[TEST FAILED]', err.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

runTests();
