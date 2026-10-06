import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { User, Equipment, Transfer, Repair, Disposal, AuditLog, Room } from '../models/index.js';
import { USER_ROLES, EQUIPMENT_STATUSES, TRANSFER_STATUSES, DISPOSAL_STATUSES } from '../config/constants.js';
import { assertTransition } from '../domain/stateMachines.js';

dotenv.config();

const runVerification = async () => {
  console.log('====================================================');
  console.log('🧪 RUO UEMS BACKEND PHASE 1 INTEGRATION VERIFICATION');
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
    // TEST 1: Canonical Users & Password Check
    console.log('--- TEST 1: Canonical 3-Role Users ---');
    const admin = await User.findOne({ role: USER_ROLES.ADMIN });
    const manager = await User.findOne({ role: USER_ROLES.MANAGER });
    const staff = await User.findOne({ role: USER_ROLES.STAFF });

    assert(admin && admin.code === 'AD000001', 'Admin account AD000001 exists with canonical role "admin"');
    assert(manager && manager.code === 'QL000001', 'Manager account QL000001 exists with canonical role "manager"');
    assert(staff && staff.code === 'NV000001', 'Staff account NV000001 exists with canonical role "staff"');

    const pwValid = await admin.comparePassword('Ruo@2026');
    assert(pwValid, 'Bcrypt password verification succeeds for Ruo@2026');

    // TEST 2: Equipment Retrieval & QR Lookup with Real Schema Paths
    console.log('\n--- TEST 2: Equipment Real Paths & QR Lookup ---');
    const eq = await Equipment.findOne({ qr_code: 'RUO-EQ-PRJ-101' });
    assert(eq !== null, 'Equipment found via real schema path `qr_code`');
    assert(eq && eq.code === 'EQ-PRJ-101', 'Equipment code matches EQ-PRJ-101');
    assert(typeof eq.rRatio === 'number', `Live calculated rRatio exists: ${eq.rRatio}%`);

    // TEST 3: State Machine Role Guarding & Illegal State Rejection
    console.log('\n--- TEST 3: State Machine Role Guards & Transitions ---');
    let caughtStaffApprove = false;
    try {
      // Staff cannot approve transfer (Manager only)
      assertTransition('TRANSFER', TRANSFER_STATUSES.PENDING, TRANSFER_STATUSES.APPROVED, USER_ROLES.STAFF);
    } catch (err) {
      caughtStaffApprove = err.statusCode === 403;
    }
    assert(caughtStaffApprove, 'State Machine blocks Staff from approving Transfer with 403 Forbidden');

    let validManagerApprove = false;
    try {
      // Manager can approve transfer
      assertTransition('TRANSFER', TRANSFER_STATUSES.PENDING, TRANSFER_STATUSES.APPROVED, USER_ROLES.MANAGER);
      validManagerApprove = true;
    } catch (err) {}
    assert(validManagerApprove, 'State Machine permits Manager to approve Transfer');

    let caughtInvalidState = false;
    try {
      // Cannot jump from PENDING directly to COMPLETED
      assertTransition('TRANSFER', TRANSFER_STATUSES.PENDING, TRANSFER_STATUSES.COMPLETED, USER_ROLES.MANAGER);
    } catch (err) {
      caughtInvalidState = err.statusCode === 409;
    }
    assert(caughtInvalidState, 'State Machine rejects invalid state jump (pending -> completed) with 409 Conflict');

    // TEST 4: Transfer Workflow End-to-End
    console.log('\n--- TEST 4: Transfer Workflow Real DB Execution ---');
    const roomA = await Room.findOne({ code: 'A1-101' });
    const roomB = await Room.findOne({ code: 'A1-201' });
    const targetEq = await Equipment.findOne({ code: 'EQ-TV-201' });

    // Create transfer proposal
    const testTransfer = await Transfer.create({
      equipment_id: targetEq._id,
      from_room_id: roomA._id,
      to_room_id: roomB._id,
      requested_by: staff._id,
      reason: 'Điều chuyển thử nghiệm kiểm thử tự động',
      status: TRANSFER_STATUSES.PENDING
    });
    assert(testTransfer.status === TRANSFER_STATUSES.PENDING, 'Transfer created in PENDING state');

    // Manager approves
    assertTransition('TRANSFER', testTransfer.status, TRANSFER_STATUSES.APPROVED, manager.role);
    testTransfer.status = TRANSFER_STATUSES.APPROVED;
    testTransfer.approved_by = manager._id;
    testTransfer.approved_at = new Date();
    await testTransfer.save();
    assert(testTransfer.status === TRANSFER_STATUSES.APPROVED, 'Manager successfully approved Transfer');

    // Staff completes
    assertTransition('TRANSFER', testTransfer.status, TRANSFER_STATUSES.COMPLETED, staff.role);
    testTransfer.status = TRANSFER_STATUSES.COMPLETED;
    testTransfer.completed_by = staff._id;
    testTransfer.completed_at = new Date();
    await testTransfer.save();

    targetEq.room_id = roomB._id;
    await targetEq.save();
    assert(testTransfer.status === TRANSFER_STATUSES.COMPLETED, 'Staff successfully completed Transfer');
    assert(targetEq.room_id.toString() === roomB._id.toString(), 'Equipment location updated to room B');

    // TEST 5: RACI 5-Step Disposal Workflow
    console.log('\n--- TEST 5: RACI 5-Step Disposal Workflow ---');
    // Step 1: Staff proposes
    const testDisposal = await Disposal.create({
      equipment_id: targetEq._id,
      proposed_by: staff._id,
      reason: 'Thiết bị khấu hao và hỏng hóc nặng',
      current_step: 1,
      status: DISPOSAL_STATUSES.PROPOSED
    });
    assert(testDisposal.current_step === 1 && testDisposal.status === DISPOSAL_STATUSES.PROPOSED, 'Step 1: Staff proposed disposal');

    // Step 2: Manager HC Approves
    assertTransition('DISPOSAL', testDisposal.status, DISPOSAL_STATUSES.HC_APPROVED, manager.role);
    testDisposal.status = DISPOSAL_STATUSES.HC_APPROVED;
    testDisposal.current_step = 2;
    testDisposal.manager_approved_by = manager._id;
    await testDisposal.save();
    assert(testDisposal.current_step === 2 && testDisposal.status === DISPOSAL_STATUSES.HC_APPROVED, 'Step 2: Manager HC approved');

    // Step 3: Admin BGH Approves (Staff/Manager must fail)
    let caughtBghGuard = false;
    try {
      assertTransition('DISPOSAL', testDisposal.status, DISPOSAL_STATUSES.BGH_APPROVED, manager.role);
    } catch (e) {
      caughtBghGuard = e.statusCode === 403;
    }
    assert(caughtBghGuard, 'Step 3: State Machine enforces BGH/Admin ONLY for Step 3');

    assertTransition('DISPOSAL', testDisposal.status, DISPOSAL_STATUSES.BGH_APPROVED, admin.role);
    testDisposal.status = DISPOSAL_STATUSES.BGH_APPROVED;
    testDisposal.current_step = 3;
    testDisposal.admin_approved_by = admin._id;
    await testDisposal.save();
    assert(testDisposal.current_step === 3 && testDisposal.status === DISPOSAL_STATUSES.BGH_APPROVED, 'Step 3: BGH Admin approved with formal decision');

    // Step 4: Manager Procures
    assertTransition('DISPOSAL', testDisposal.status, DISPOSAL_STATUSES.PROCURING, manager.role);
    testDisposal.status = DISPOSAL_STATUSES.PROCURING;
    testDisposal.current_step = 4;
    testDisposal.procurement_plan = 'Dự toán mua mới Smart TV 75 inch';
    await testDisposal.save();
    assert(testDisposal.current_step === 4 && testDisposal.status === DISPOSAL_STATUSES.PROCURING, 'Step 4: Manager entered procurement plan');

    // Step 5: Staff Receives & Finalizes
    assertTransition('DISPOSAL', testDisposal.status, DISPOSAL_STATUSES.RECEIVED, staff.role);
    testDisposal.status = DISPOSAL_STATUSES.RECEIVED;
    testDisposal.current_step = 5;
    testDisposal.received_by = staff._id;
    await testDisposal.save();
    assert(testDisposal.current_step === 5 && testDisposal.status === DISPOSAL_STATUSES.RECEIVED, 'Step 5: Staff confirmed replacement receipt & completed disposal');

    // Clean up test disposal & transfer
    await Disposal.findByIdAndDelete(testDisposal._id);
    await Transfer.findByIdAndDelete(testTransfer._id);

    // TEST 6: Cryptographic SHA-256 Tamper Detection
    console.log('\n--- TEST 6: SHA-256 Audit Log Tamper Evident Verification ---');
    const initialVerify = await AuditLog.verifyIntegrity();
    assert(initialVerify.isValid, `Initial Audit Log chain is mathematically intact (${initialVerify.totalLogs} blocks verified)`);

    // Add a new audit log
    const testLog = await AuditLog.logAction({
      user_id: staff._id,
      user_display: staff.full_name,
      action: 'TEST_TAMPER_AUDIT',
      target_table: 'test',
      entity_id: 'TEST_ID_01',
      new_value: { legit: true }
    });

    const verifyAfterAdd = await AuditLog.verifyIntegrity();
    assert(verifyAfterAdd.isValid, 'Audit chain remains valid after new block appended');

    // Artificially tamper with the DB record
    console.log('🚨 Injecting artificial tamper into MongoDB (modifying action without re-hashing)...');
    await AuditLog.collection.updateOne(
      { _id: testLog._id },
      { $set: { action: 'MALICIOUS_UNAUTHORIZED_MUTATION' } }
    );

    const tamperResult = await AuditLog.verifyIntegrity();
    assert(!tamperResult.isValid && tamperResult.reason === 'HASH_MISMATCH', `Tamper successfully detected! Reason: ${tamperResult.reason} at seq=${tamperResult.brokenAt}`);

    // Remove the tampered test log to restore cleanliness
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
