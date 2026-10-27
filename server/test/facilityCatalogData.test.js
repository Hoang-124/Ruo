import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { FLOOR_PLAN_ROOMS } from '../src/seeds/floorPlanRooms.js';
import {
  CATALOG_CATEGORIES,
  CATALOG_SUPPLIERS,
  CATALOG_SPARE_PARTS,
  EQUIPMENT_TEMPLATES,
  ROOM_EQUIPMENT_PLAN,
  buildBuildingCatalogDataset
} from '../src/seeds/facilityCatalogData.js';

const REMOVED_TEMPLATE_CODES = [
  'PRJ-LASER', 'SCR-MAN', 'SCR-TRIPOD', 'IFP-TOUCH', 'LED-WALL', 'DOC-CAM', 'WRLS-CAST',
  'AC-WALL', 'AC-FLOOR', 'FAN-CEIL', 'FAN-WALL', 'FAN-STAND', 'AIR-CURT', 'DEHUMID', 'AIR-PURI',
  'SPK-WALL', 'SPK-HALL', 'AMP-CLASS', 'MIC-WRLS', 'MIC-DESK', 'STD-MIC', 'STD-CARD', 'STD-MON',
  'PC-AIO', 'PC-WORK', 'LAP-ADM',
  'LIB-GATE', 'MONEY-CNT',
  'UPS-SMALL', 'UPS-ONLINE', 'SMART-POD',
  'RESCUE-KIT',
  'DESK-LAB', 'CHAIR-HALL', 'BOARD-CER',
  'MED-WHEEL', 'GYM-RUN', 'GYM-MULTI', 'GYM-PONG', 'SAN-DRYER', 'SAN-SCRUB'
];

const REMOVED_PART_CODES = [
  'PART-GAS', 'PART-CAPA', 'PART-RAM', 'PART-SSD', 'PART-KBMS',
  'PART-PSU', 'PART-MICBAT', 'PART-FUSE', 'PART-CMOS'
];

test('curated catalog honors user deletions and populates all 91 Building A1 rooms', () => {
  assert.equal(CATALOG_CATEGORIES.length, 11);
  assert.equal(CATALOG_SPARE_PARTS.length, 10);
  assert.equal(Object.keys(EQUIPMENT_TEMPLATES).length, 55);

  for (const deleted of REMOVED_TEMPLATE_CODES) {
    assert.equal(EQUIPMENT_TEMPLATES[deleted], undefined, `Deleted template ${deleted} must not exist`);
  }
  const partCodes = new Set(CATALOG_SPARE_PARTS.map((p) => p.code));
  for (const deletedPart of REMOVED_PART_CODES) {
    assert.equal(partCodes.has(deletedPart), false, `Deleted spare part ${deletedPart} must not exist`);
  }
  assert.equal(partCodes.has('PART-HDMI'), true, 'PART-HDMI must exist for TV/Projector video connection');

  // Spec-only templates must not invent fake manufacturer brands
  for (const specOnly of ['STAGE-LGT', 'HYDRANT', 'CURTAIN', 'MED-BED', 'MED-CAB']) {
    assert.equal(EQUIPMENT_TEMPLATES[specOnly].brand, '');
  }

  // Every retained template must be placed in at least one room
  const usedTemplates = new Set();
  for (const plan of Object.values(ROOM_EQUIPMENT_PLAN)) {
    for (const [tplCode] of plan.items) {
      usedTemplates.add(tplCode);
    }
  }
  for (const tplCode of Object.keys(EQUIPMENT_TEMPLATES)) {
    assert.equal(usedTemplates.has(tplCode), true, `Retained template ${tplCode} was not placed in any room`);
  }

  // Build synthetic ObjectId maps for all 91 rooms
  const categoriesByCode = new Map(
    CATALOG_CATEGORIES.map((c) => [c.code, { ...c, _id: new mongoose.Types.ObjectId() }])
  );
  const suppliersByCode = new Map(
    CATALOG_SUPPLIERS.map((s) => [s.code, { ...s, _id: new mongoose.Types.ObjectId() }])
  );
  const allRoomCodes = ['KHO-01', 'A1-101', 'A1-201', ...FLOOR_PLAN_ROOMS.map((r) => r.code)];
  assert.equal(allRoomCodes.length, 91);

  const roomsByCode = new Map(
    allRoomCodes.map((code) => [code.toUpperCase(), { code, _id: new mongoose.Types.ObjectId() }])
  );

  const { equipmentDocs, roomUpdates } = buildBuildingCatalogDataset({
    categoriesByCode,
    roomsByCode,
    suppliersByCode
  });

  assert.equal(roomUpdates.length, 91, 'All 91 rooms must receive catalog updates');
  assert.ok(equipmentDocs.length > 1000, 'Expected full building equipment coverage');

  const codes = new Set();
  const qrs = new Set();
  const countByRoomId = new Map();

  for (const eq of equipmentDocs) {
    assert.equal(codes.has(eq.code), false, `Duplicate equipment code: ${eq.code}`);
    assert.equal(qrs.has(eq.qr_code), false, `Duplicate QR code: ${eq.qr_code}`);
    codes.add(eq.code);
    qrs.add(eq.qr_code);

    const rid = eq.room_id.toString();
    countByRoomId.set(rid, (countByRoomId.get(rid) || 0) + 1);
  }

  // Every single CAD floor-plan room must have >= 2 equipments and 0 broken items by default
  const room101Id = roomsByCode.get('A1-101')._id.toString();
  for (const [code, roomObj] of roomsByCode.entries()) {
    const rid = roomObj._id.toString();
    assert.ok((countByRoomId.get(rid) || 0) >= 2, `Room ${code} has fewer than 2 equipments`);
    if (rid !== room101Id) {
      const brokenInRoom = equipmentDocs.filter(
        (eq) => eq.room_id.toString() === rid && (eq.status === 'broken' || eq.status === 'repairing')
      );
      assert.equal(brokenInRoom.length, 0, `Blueprint room ${code} should not have default broken alerts`);
    }
  }
});
