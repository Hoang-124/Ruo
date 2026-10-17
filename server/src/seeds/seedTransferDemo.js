import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { Category } from '../models/Category.js';
import { Equipment } from '../models/Equipment.js';
import { Room } from '../models/Room.js';
import { EQUIPMENT_STATUSES, ROOM_STATUSES, ROOM_TYPES } from '../config/constants.js';

dotenv.config();

const ROOM_NAMES = [
  'Phòng demo điều chuyển 1',
  'Phòng demo điều chuyển 2'
];

const EQUIPMENT_FIXTURES = [
  {
    code: 'DEMO-MOVE-001',
    qr_code: 'QR-DEMO-MOVE-001',
    name: 'Máy chiếu demo điều chuyển 1',
    serial_number: 'DEMO-SERIAL-MOVE-001',
    brand: 'Demo',
    model: 'TRANSFER-001',
    price: 12000000,
    status: EQUIPMENT_STATUSES.IN_USE
  },
  {
    code: 'DEMO-MOVE-002',
    qr_code: 'QR-DEMO-MOVE-002',
    name: 'Máy chiếu demo điều chuyển 2',
    serial_number: 'DEMO-SERIAL-MOVE-002',
    brand: 'Demo',
    model: 'TRANSFER-002',
    price: 12000000,
    status: EQUIPMENT_STATUSES.IN_USE
  }
];

const getOrCreateDemoRooms = async () => {
  const rooms = [];
  for (const name of ROOM_NAMES) {
    let room = await Room.findOne({ name });
    if (!room) {
      const occupiedCodes = new Set((await Room.find().select('code').lean()).map(item => item.code));
      const availableCode = Array.from({ length: 40 }, (_, index) => {
        const floor = Math.floor(index / 8) + 1;
        const roomNumber = (index % 8) + 1;
        return `P${floor}0${roomNumber}`;
      }).find(code => !occupiedCodes.has(code));

      if (!availableCode) {
        throw new Error('Không còn mã phòng hợp lệ để tạo phòng demo (P101–P508).');
      }

      const floor = Number(availableCode[1]);
      room = await Room.create({
        code: availableCode,
        name,
        building: 'A1',
        floor,
        room_type: ROOM_TYPES.LECTURE,
        capacity: 30,
        area: 45,
        department: 'Dữ liệu demo điều chuyển',
        status: ROOM_STATUSES.AVAILABLE
      });
      console.log(`[Transfer demo] Created room ${room.code} (${room.name}).`);
    }
    rooms.push(room);
  }
  return rooms;
};

const seedTransferDemo = async () => {
  const mongoURI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ruo_db';
  await mongoose.connect(mongoURI, { serverSelectionTimeoutMS: 5000 });
  console.log(`[Transfer demo] Connected to database ${mongoose.connection.name}.`);

  const equipmentCollection = Equipment.collection;
  const equipmentIndexes = await equipmentCollection.indexes();
  for (const legacyIndexName of ['assetCode_1', 'qrCodeData_1']) {
    if (equipmentIndexes.some(index => index.name === legacyIndexName)) {
      try {
        await equipmentCollection.dropIndex(legacyIndexName);
        console.log(`[Transfer demo] Removed obsolete equipment index ${legacyIndexName}.`);
      } catch (error) {
        if (error.code !== 27) throw error;
      }
    }
  }

  let category = await Category.findOne({ code: 'DEMO-TR-CAT' });
  if (!category) {
    category = await Category.create({
      code: 'DEMO-TR-CAT',
      name: 'Máy chiếu demo điều chuyển',
      description: 'Danh mục mẫu dùng để kiểm thử quy trình điều chuyển.'
    });
    console.log('[Transfer demo] Created a demo equipment category.');
  }

  const rooms = await getOrCreateDemoRooms();
  for (const [index, fixture] of EQUIPMENT_FIXTURES.entries()) {
    let equipment = await Equipment.findOne({ code: fixture.code });
    if (!equipment) {
      equipment = await Equipment.create({
        ...fixture,
        category_id: category._id,
        room_id: rooms[index]._id
      });
      console.log(`[Transfer demo] Created equipment ${equipment.code} in room ${rooms[index].code}.`);
    } else {
      console.log(`[Transfer demo] Equipment ${equipment.code} already exists; left unchanged.`);
    }
  }

  console.log('[Transfer demo] Ready to test transfers between the two demo rooms.');
};

seedTransferDemo()
  .catch(error => {
    console.error('[Transfer demo] Failed to seed demo data:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });
