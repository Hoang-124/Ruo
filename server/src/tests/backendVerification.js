import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { 
  User, 
  Equipment, 
  EquipmentMovement, 
  Repair, 
  Disposal, 
  AuditLog, 
  Room 
} from '../models/index.js';
import { 
  USER_ROLES, 
  EQUIPMENT_STATUSES, 
  MOVEMENT_TYPES,
  MOVEMENT_STATUSES, 
  REPAIR_STATUSES,
  DISPOSAL_STATUSES 
} from '../config/constants.js';
import { assertTransition } from '../domain/stateMachines.js';

dotenv.config();

const runVerification = async () => {
  console.log('====================================================');
  console.log('🧪 RUO UEMS BACKEND VERIFICATION (4 CANONICAL ROLES)');
  console.log('====================================================\n');

  const mongoURI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ruo_db';
  await mongoose.connect(mongoURI);

  let passed = 0;
  let failed = 0;

  const assert = (condition, title) => {
    if (condition) {
      console.log(`✅ [PASS] ${title}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${title}`);
      failed++;
    }
  };

  try {
    // TEST 1: Canonical 4-Role Users & Password Check
    console.log('--- TEST 1: Canonical 4-Role Users ---');
    const admin = await User.findOne({ role: USER_ROLES.ADMIN });
    const fm = await User.findOne({ role: USER_ROLES.FACILITY_MANAGER });
    const tech = await User.findOne({ role: USER_ROLES.TECHNICIAN });
    const lecturer = await User.findOne({ role: USER_ROLES.LECTURER });

    assert(admin && admin.code === 'AD001', 'Admin account AD001 exists with canonical role "admin"');
    assert(fm && fm.code === 'QL001', 'Facility Manager account QL001 exists with canonical role "facility_manager"');
    assert(tech && tech.code === 'KT001', 'Technician account KT001 exists with canonical role "technician"');
    assert(lecturer && lecturer.code === 'GV001', 'Lecturer account GV001 exists with canonical role "lecturer"');

    const pwValid = await admin.comparePassword('Ruo@2026');
    assert(pwValid, 'Bcrypt password verification succeeds for Ruo@2026');

    // TEST 2: Equipment Retrieval & QR Lookup with Real Schema Paths
    console.log('\n--- TEST 2: Equipment Real Paths & QR Lookup ---');
    const eq = await Equipment.findOne({ code: 'EQ-PRJ-101' });
    assert(eq !== null, 'Equipment found via code EQ-PRJ-101');
    assert(eq && eq.qr_code.includes('QR-EQ-PRJ-101'), 'Equipment matches QR code path');
    assert(typeof eq.rRatio === 'number', `Live calculated rRatio exists: ${eq.rRatio}%`);

    // TEST 3: State Machine Role Guarding & Illegal State Rejection
    console.log('\n--- TEST 3: State Machine Role Guards & Transitions ---');
    let caughtTechClose = false;
    try {
      // Technician cannot close a repair ticket (Facility Manager only)
      assertTransition('REPAIR', REPAIR_STATUSES.RESOLVED, REPAIR_STATUSES.CLOSED, USER_ROLES.TECHNICIAN);
    } catch (err) {
      caughtTechClose = err.statusCode === 403;
    }
    assert(caughtTechClose, 'State Machine blocks Technician from closing Repair Ticket with 403 Forbidden');

    let validFMClose = false;
    try {
      // Facility Manager can close resolved repair
      assertTransition('REPAIR', REPAIR_STATUSES.RESOLVED, REPAIR_STATUSES.CLOSED, USER_ROLES.FACILITY_MANAGER);
      validFMClose = true;
    } catch (err) {}
    assert(validFMClose, 'State Machine permits Facility Manager to close Repair Ticket');

    let caughtInvalidState = false;
    try {
      // Cannot jump from REPORTED directly to CLOSED
      assertTransition('REPAIR', REPAIR_STATUSES.REPORTED, REPAIR_STATUSES.CLOSED, USER_ROLES.FACILITY_MANAGER);
    } catch (err) {
      caughtInvalidState = err.statusCode === 409;
    }
    let caughtAdminAccept = false;
    try {
      assertTransition('REPAIR', REPAIR_STATUSES.ASSIGNED, REPAIR_STATUSES.IN_PROGRESS, USER_ROLES.ADMIN);
    } catch (err) {
      caughtAdminAccept = err.statusCode === 403;
    }
    assert(caughtAdminAccept, 'State Machine blocks Admin from accepting repair task (Technician only)');

    let caughtTechApproveParts = false;
    try {
      assertTransition('PARTS_REQUEST', 'pending', 'approved', USER_ROLES.TECHNICIAN);
    } catch (err) {
      caughtTechApproveParts = err.statusCode === 403;
    }
    assert(caughtTechApproveParts, 'State Machine blocks Technician from approving parts request (FM only)');

    // TEST 4: Equipment Movement Workflow (FM orders -> Technician confirms)
    console.log('\n--- TEST 4: Equipment Movement Workflow Execution ---');
    const roomA = await Room.findOne({ code: 'A1-101' });
    const roomB = await Room.findOne({ code: 'A1-201' });
    const targetEq = await Equipment.findOne({ code: 'EQ-PRJ-KHO-01' });

    // FM orders movement
    const testMovement = await EquipmentMovement.create({
      equipment_id: targetEq._id,
      type: MOVEMENT_TYPES.TRANSFER,
      from_room_id: targetEq.room_id,
      to_room_id: roomA._id,
      ordered_by: fm._id,
      reason: 'Điều chuyển thiết bị phục vụ kiểm thử',
      status: MOVEMENT_STATUSES.PENDING
    });
    assert(testMovement.status === MOVEMENT_STATUSES.PENDING, 'EquipmentMovement created in PENDING state');

    // Technician confirms movement
    assertTransition('MOVEMENT', testMovement.status, MOVEMENT_STATUSES.COMPLETED, tech.role);
    testMovement.status = MOVEMENT_STATUSES.COMPLETED;
    testMovement.performed_by = tech._id;
    testMovement.completed_at = new Date();
    await testMovement.save();

    targetEq.room_id = roomA._id;
    targetEq.status = EQUIPMENT_STATUSES.IN_USE;
    await targetEq.save();

    assert(testMovement.status === MOVEMENT_STATUSES.COMPLETED, 'Technician successfully confirmed Movement');
    assert(targetEq.room_id.toString() === roomA._id.toString(), 'Equipment location updated to room A');

    // TEST 5: Disposal Workflow (FM proposes -> Admin approves)
    console.log('\n--- TEST 5: Disposal Workflow (FM proposes -> Admin approves) ---');
    const testDisposal = await Disposal.create({
      equipment_id: targetEq._id,
      proposed_by: fm._id,
      reason: 'Thiết bị hỏng hoàn toàn không thể khắc phục',
      status: DISPOSAL_STATUSES.PROPOSED
    });
    assert(testDisposal.status === DISPOSAL_STATUSES.PROPOSED, 'FM successfully proposed disposal');

    // Technician/FM cannot approve disposal (Admin only)
    let caughtFmApprove = false;
    try {
      assertTransition('DISPOSAL', testDisposal.status, DISPOSAL_STATUSES.APPROVED, fm.role);
    } catch (e) {
      caughtFmApprove = e.statusCode === 403;
    }
    assert(caughtFmApprove, 'State Machine blocks FM from approving Disposal (Admin only)');

    // Admin approves with decision number
    assertTransition('DISPOSAL', testDisposal.status, DISPOSAL_STATUSES.APPROVED, admin.role);
    testDisposal.status = DISPOSAL_STATUSES.APPROVED;
    testDisposal.approved_by = admin._id;
    testDisposal.approved_at = new Date();
    testDisposal.decision_number = 'QD-TL-2026-001';
    await testDisposal.save();
    assert(testDisposal.status === DISPOSAL_STATUSES.APPROVED, 'Admin successfully approved disposal with decision number');

    // Clean up test disposal & movement
    await Disposal.findByIdAndDelete(testDisposal._id);
    await EquipmentMovement.findByIdAndDelete(testMovement._id);

    // TEST 6: Cryptographic SHA-256 Tamper Detection
    console.log('\n--- TEST 6: SHA-256 Audit Log Tamper Evident Verification ---');
    const initialVerify = await AuditLog.verifyIntegrity();
    assert(initialVerify.isValid, `Initial Audit Log chain is mathematically intact (${initialVerify.totalLogs} blocks verified)`);

    const testLog = await AuditLog.logAction({
      user_id: tech._id,
      user_display: tech.full_name,
      action: 'TEST_TAMPER_AUDIT',
      target_table: 'test',
      entity_id: 'TEST_ID_01',
      new_value: { legit: true }
    });

    const verifyAfterAdd = await AuditLog.verifyIntegrity();
    assert(verifyAfterAdd.isValid, 'Audit chain remains valid after new block appended');

    // Artificially tamper with MongoDB record
    console.log('🚨 Injecting artificial tamper into MongoDB (modifying action without re-hashing)...');
    await AuditLog.collection.updateOne(
      { _id: testLog._id },
      { $set: { action: 'MALICIOUS_UNAUTHORIZED_MUTATION' } }
    );

    const tamperResult = await AuditLog.verifyIntegrity();
    assert(!tamperResult.isValid && tamperResult.reason === 'HASH_MISMATCH', `Tamper successfully detected! Reason: ${tamperResult.reason} at seq=${tamperResult.brokenAt}`);

    await AuditLog.findByIdAndDelete(testLog._id);
    console.log('🧹 Cleaned up test audit log block.');

    console.log('\n====================================================');
    console.log(`🎉 TEST SUMMARY: ${passed} PASSED / ${failed} FAILED`);
    console.log('====================================================');

    await mongoose.disconnect();
    process.exit(failed > 0 ? 1 : 0);
  } catch (error) {
    console.error('Fatal test error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
};

runVerification();
