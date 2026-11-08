import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildIncidentTriage,
  buildRepairCopilot,
  getLocalAiTrainingStats
} from '../src/services/aiService.js';

const FORBIDDEN_ELECTRICAL_ADVICE = /rút phích|phích cắm|cầu dao|aptomat|rò điện|dây nguồn|cáp nguồn|tắt nguồn thiết bị/i;

describe('Ruo Cortex Local AI — Trained NLP, Physics Guardrails & Historical Learning', () => {
  test('trains local statistical model at startup across all 11 Building A1 categories with zero external API', () => {
    const stats = getLocalAiTrainingStats();
    assert.equal(stats.categories_covered, 11);
    assert.ok(stats.curated_corpus_examples >= 140);
    assert.ok(stats.expanded_training_samples >= 280);
    assert.ok(stats.vocabulary_features >= 400);
    assert.ok(stats.fault_playbooks_indexed >= 30);
    assert.equal(stats.safety_protocols_count, 8);
  });

  test('burning desk ("cái bàn bị cháy") uses Class-A solid fire protocol and NEVER tells user to unplug power cord', async () => {
    const desk = {
      _id: '507f1f77bcf86cd799439021',
      code: 'EQ-101-DESKSTU-01',
      name: 'Bàn ghế sinh viên liền dãy 2 chỗ',
      brand: 'Hòa Phát',
      model: 'BSV102',
      category_id: { code: 'CAT-FURN', name: 'Nội thất & Bàn ghế phòng học' }
    };
    const room = { _id: '507f1f77bcf86cd799439001', code: 'A1-101', name: 'Phòng lý thuyết 101', floor: 1 };

    const triage = await buildIncidentTriage({
      description: 'cái bàn bị cháy ở cuối lớp học',
      equipment: desk,
      room
    });

    assert.equal(triage.suggested_damage_level, 'critical');
    assert.equal(triage.fault_classification.category_code, 'CAT-FURN');
    assert.equal(triage.fault_classification.is_electrical, false);
    assert.equal(triage.fault_classification.hazard_protocol, 'CLASS_A_SOLID_FIRE');
    assert.match(triage.quick_checks.join(' '), /bình bột ABC|sơ tán/i);
    assert.doesNotMatch(triage.quick_checks.join(' '), FORBIDDEN_ELECTRICAL_ADVICE);
    assert.doesNotMatch(triage.reasoning, FORBIDDEN_ELECTRICAL_ADVICE);
  });

  test('detects equipment-description mismatch when dropdown is left on Projector but user reports "cái bàn bị cháy"', async () => {
    const projector = {
      _id: '507f1f77bcf86cd799439011',
      code: 'EQ-101-PRJ-01',
      name: 'Máy chiếu Laser Full HD',
      brand: 'Epson',
      model: 'EB-L200F',
      category_id: { code: 'CAT-DISPLAY', name: 'Thiết bị trình chiếu & Hiển thị' }
    };
    const desk = {
      _id: '507f1f77bcf86cd799439021',
      code: 'EQ-101-DESKSTU-01',
      name: 'Bàn ghế sinh viên liền dãy 2 chỗ',
      brand: 'Hòa Phát',
      model: 'BSV102',
      category_id: { code: 'CAT-FURN', name: 'Nội thất & Bàn ghế phòng học' }
    };
    const room = { _id: '507f1f77bcf86cd799439001', code: 'A1-101', name: 'Phòng lý thuyết 101', floor: 1 };

    const triage = await buildIncidentTriage({
      description: 'cái bàn bị cháy',
      equipment: projector,
      room,
      roomEquipments: [projector, desk]
    });

    assert.equal(triage.suggested_damage_level, 'critical');
    assert.equal(triage.equipment_mismatch.detected, true);
    assert.equal(triage.equipment_mismatch.mentioned_category, 'CAT-FURN');
    assert.equal(triage.equipment_mismatch.suggested_equipment.code, 'EQ-101-DESKSTU-01');
    assert.equal(triage.fault_classification.is_electrical, false);
    assert.equal(triage.fault_classification.hazard_protocol, 'CLASS_A_SOLID_FIRE');
    assert.match(triage.refined_description, /EQ-101-DESKSTU-01/);
    assert.doesNotMatch(triage.quick_checks.join(' '), FORBIDDEN_ELECTRICAL_ADVICE);
  });

  test('understands unaccented Vietnamese ("cai ban bi chay") and verb-first order ("cháy bàn") vs electrical outlet under desk', async () => {
    const noAccent = await buildIncidentTriage({
      description: 'cai ban bi chay co khoi bốc len'
    });
    assert.equal(noAccent.suggested_damage_level, 'critical');
    assert.equal(noAccent.fault_classification.is_electrical, false);
    assert.equal(noAccent.fault_classification.hazard_protocol, 'CLASS_A_SOLID_FIRE');
    assert.doesNotMatch(noAccent.quick_checks.join(' '), FORBIDDEN_ELECTRICAL_ADVICE);

    const verbFirst = await buildIncidentTriage({
      description: 'cháy bàn học cuối dãy'
    });
    assert.equal(verbFirst.suggested_damage_level, 'critical');
    assert.equal(verbFirst.fault_classification.is_electrical, false);
    assert.equal(verbFirst.fault_classification.hazard_protocol, 'CLASS_A_SOLID_FIRE');

    const socketUnderDesk = await buildIncidentTriage({
      description: 'ổ điện âm dưới gầm bàn giảng viên bị chập điện tóe tia lửa'
    });
    assert.equal(socketUnderDesk.suggested_damage_level, 'critical');
    assert.equal(socketUnderDesk.fault_classification.is_electrical, true);
    assert.equal(socketUnderDesk.fault_classification.hazard_protocol, 'CLASS_C_ELECTRICAL_FIRE');
    assert.match(socketUnderDesk.quick_checks.join(' '), /aptomat|CO2|KHÔNG hất nước/i);
  });

  test('distinguishes component burnout ("cháy bóng đèn", "loa nổ lụp bụp") and negated hazards ("không cháy") from real emergencies', async () => {
    const burntLamp = await buildIncidentTriage({
      description: 'Máy chiếu bị cháy bóng đèn không lên hình, quạt vẫn chạy',
      equipment: { code: 'EQ-201-PRJ-01', name: 'Máy chiếu Epson', category_id: { code: 'CAT-DISPLAY' } }
    });
    assert.equal(burntLamp.suggested_damage_level, 'major');
    assert.equal(burntLamp.fault_classification.playbook_id, 'DISPLAY_LAMP_BURNOUT');
    assert.equal(burntLamp.fault_classification.hazard_protocol, null);

    const speakerPop = await buildIncidentTriage({
      description: 'Loa hội trường bị nổ lụp bụp rè nhẹ khi mở âm lượng lớn',
      equipment: { code: 'EQ-418-SPK-01', name: 'Loa hội trường JBL', category_id: { code: 'CAT-AUDIO' } }
    });
    assert.notEqual(speakerPop.suggested_damage_level, 'critical');
    assert.equal(speakerPop.fault_classification.hazard_protocol, null);

    const negatedFire = await buildIncidentTriage({
      description: 'Mặt bàn sinh viên bị tróc sơn nhẹ ở góc, không cháy, không có khói hay mùi khét',
      equipment: { code: 'EQ-102-DESKSTU-02', name: 'Bàn sinh viên', category_id: { code: 'CAT-FURN' } }
    });
    assert.equal(negatedFire.suggested_damage_level, 'minor');
    assert.equal(negatedFire.fault_classification.hazard_protocol, null);

    const shorthandHvac = await buildIncidentTriage({
      description: 'đh ko mát chỉ thổi gió nóng gv báo kiểm tra',
      equipment: { code: 'EQ-301-ACCASS-01', name: 'Điều hòa âm trần Daikin', category_id: { code: 'CAT-HVAC' } }
    });
    assert.equal(shorthandHvac.suggested_damage_level, 'major');
    assert.equal(shorthandHvac.fault_classification.playbook_id, 'HVAC_NO_COOLING');
  });

  test('repair copilot enforces non-electrical parts filter for furniture and learns benchmarks from MongoDB history', async () => {
    const spareParts = [
      { _id: 'p1', code: 'PART-LAMP', name: 'Bóng đèn cao áp máy chiếu', stock: 5, unit: 'Bóng', price: 1850000 },
      { _id: 'p2', code: 'PART-MCB', name: 'Aptomat chống giật RCBO 32A', stock: 10, unit: 'Cái', price: 380000 },
      { _id: 'p3', code: 'PART-HDMI', name: 'Cáp tín hiệu HDMI 2.0 15m', stock: 8, unit: 'Sợi', price: 420000 },
      { _id: 'p4', code: 'PART-HINGE', name: 'Bộ bản lề và bulông gia cố mặt bàn', stock: 20, unit: 'Bộ', price: 65000 }
    ];

    const deskCopilot = await buildRepairCopilot({
      repair: {
        ticket_code: 'REP-FURN-01',
        damage_level: 'major',
        incident_description: 'Bàn học sinh viên bị gãy chân sắt và bung mối hàn khung bàn',
        room_id: { code: 'A1-202', name: 'Phòng học 202' },
        equipment_id: {
          _id: 'eq-desk-202',
          code: 'EQ-202-DESKSTU-03',
          name: 'Bàn ghế sinh viên liền dãy',
          price: 2200000,
          estimated_repair_cost: 200000,
          repair_count: 3,
          category_id: { _id: 'cat-furn', code: 'CAT-FURN', name: 'Nội thất' }
        }
      },
      equipmentHistory: [
        { ticket_code: 'REP-OLD-A', incident_description: 'Bàn sinh viên lung lay mối hàn chân sắt' },
        { ticket_code: 'REP-OLD-B', incident_description: 'Gãy thanh giằng chân bàn học' }
      ],
      logs: [{ action: 'Đã tháo khảo sát khung chân bàn' }],
      spareParts,
      resolvedRepairs: [
        {
          ticket_code: 'REP-SOLVED-1',
          incident_description: 'Bàn ghế sinh viên bị gãy chân sắt bung mối hàn',
          outcome: 'repaired',
          total_cost: 180000,
          created_at: '2026-10-01T08:00:00.000Z',
          resolved_at: '2026-10-01T11:30:00.000Z',
          equipment_id: { code: 'EQ-101-DESKSTU-01', name: 'Bàn sinh viên', category_id: { code: 'CAT-FURN' } }
        }
      ]
    });

    assert.equal(deskCopilot.diagnosis.is_electrical, false);
    assert.equal(deskCopilot.diagnosis.category_code, 'CAT-FURN');
    assert.doesNotMatch(deskCopilot.diagnosis.root_cause, /nguồn điện|bo mạch|cầu dao/i);
    assert.equal(deskCopilot.recommended_parts.some((p) => ['PART-LAMP', 'PART-MCB', 'PART-HDMI'].includes(p.code)), false);
    assert.equal(deskCopilot.recommended_parts[0].code, 'PART-HINGE');
    assert.equal(deskCopilot.historical_insights.chronic_pattern.recurring_same_symptom, true);
    assert.equal(deskCopilot.historical_insights.learned_benchmarks.matched_cases_count, 1);
    assert.equal(deskCopilot.historical_insights.learned_benchmarks.avg_mttr_hours, 3.5);
    assert.equal(deskCopilot.historical_insights.learned_benchmarks.avg_repair_cost_vnd, 180000);
    assert.match(deskCopilot.diagnosis.suggested_log_action, /Xử lý kỹ thuật & thay thế vật tư/);
  });

  test('RUO_AI_LOCAL_ONLY=true guarantees zero external network calls even if GEMINI_API_KEY is configured', async (t) => {
    const prevKey = process.env.GEMINI_API_KEY;
    const prevLocalOnly = process.env.RUO_AI_LOCAL_ONLY;
    const prevFetch = globalThis.fetch;
    let fetchCalled = false;

    process.env.GEMINI_API_KEY = 'dummy-key-should-not-be-called';
    process.env.RUO_AI_LOCAL_ONLY = 'true';
    globalThis.fetch = async () => {
      fetchCalled = true;
      throw new Error('External API should not be invoked when RUO_AI_LOCAL_ONLY=true');
    };

    t.after(() => {
      if (prevKey === undefined) delete process.env.GEMINI_API_KEY;
      else process.env.GEMINI_API_KEY = prevKey;
      if (prevLocalOnly === undefined) delete process.env.RUO_AI_LOCAL_ONLY;
      else process.env.RUO_AI_LOCAL_ONLY = prevLocalOnly;
      globalThis.fetch = prevFetch;
    });

    const triage = await buildIncidentTriage({ description: 'Máy in bị kẹt giấy liên tục ở khay 2' });
    assert.equal(fetchCalled, false);
    assert.equal(triage.engine, 'domain_heuristic');
    assert.equal(triage.fault_classification.playbook_id, 'OFFICE_PRINTER_COPIER_TONER_JAM');
  });
});
