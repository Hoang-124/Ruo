import { beforeEach, afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  callGeminiJson, buildIncidentTriage, buildRepairCopilot,
  buildInventoryDiscrepancyAnalysis, buildAuditAnomalyAnalysis
} from '../src/services/aiService.js';

const originalKey = process.env.GEMINI_API_KEY;
const originalFetch = globalThis.fetch;
beforeEach(() => { delete process.env.GEMINI_API_KEY; });
afterEach(() => {
  if (originalKey === undefined) delete process.env.GEMINI_API_KEY;
  else process.env.GEMINI_API_KEY = originalKey;
  globalThis.fetch = originalFetch;
});

const mockGemini = (value) => {
  process.env.GEMINI_API_KEY = 'test-key';
  globalThis.fetch = async () => ({ ok: true, json: async () => ({
    candidates: [{ content: { parts: [{ text: JSON.stringify(value) }] } }]
  }) });
};

test('Gemini rejects arrays and falls back on HTTP, network and malformed JSON errors', async () => {
  mockGemini([]);
  assert.equal(await callGeminiJson('test', {}), null);
  for (const fetcher of [
    async () => ({ ok: false }),
    async () => { throw new Error('offline'); },
    async () => ({ ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: '{broken' }] } }] }) })
  ]) {
    globalThis.fetch = fetcher;
    assert.equal(await callGeminiJson('test', {}), null);
  }
});

test('triage keeps critical safety guidance and reasoning when Gemini attempts a downgrade', async () => {
  mockGemini({ suggested_damage_level: 'minor', reasoning: 'Sự cố nhẹ không đáng lo.', quick_checks: ['Bật lại thiết bị để thử.'] });
  const result = await buildIncidentTriage({ description: 'Máy chiếu bốc khói và chập điện' });
  assert.equal(result.suggested_damage_level, 'critical');
  assert.match(result.reasoning, /mất an toàn/);
  assert.ok(result.quick_checks.some((text) => /CẢNH BÁO AN TOÀN/.test(text)));
  assert.ok(result.quick_checks.every((text) => !/Bật lại/.test(text)));
});

test('triage adds critical safety guidance when the model escalates severity', async () => {
  mockGemini({ suggested_damage_level: 'critical' });
  const result = await buildIncidentTriage({ description: 'Máy chiếu hoạt động bất thường' });
  assert.ok(result.quick_checks.some((text) => /CẢNH BÁO AN TOÀN/.test(text)));
  assert.match(result.sla_label, /8 giờ/);
});

test('triage checks safety evidence beyond the shortened prompt and uses whole keyword matches', async () => {
  const result = await buildIncidentTriage({ description: `${'Máy hoạt động chập chờn. '.repeat(70)}Có khói và tia lửa` });
  assert.equal(result.suggested_damage_level, 'critical');
  const reapplied = await buildIncidentTriage({ description: result.refined_description });
  assert.equal(reapplied.suggested_damage_level, 'critical');
  const normal = await buildIncidentTriage({ description: 'Màn hình nổi sọc mờ' });
  assert.notEqual(normal.suggested_damage_level, 'critical');
});

test('invalid model fields preserve usable domain recommendations and engine provenance', async () => {
  mockGemini({ quick_checks: [null, {}, 12, '   '] });
  const result = await buildIncidentTriage({ description: 'Máy chiếu không hiển thị' });
  assert.equal(result.engine, 'domain_heuristic');
  assert.ok(result.quick_checks.every((text) => text.trim() && !/object Object|^null$|^12$/.test(text)));
});

test('repair economics uses cumulative cost once and original price, preserving zero remaining value', async () => {
  const result = await buildRepairCopilot({ repair: {
    total_cost: 2_000_000, equipment_id: { price: 10_000_000, computed_remaining_value: 0, estimated_repair_cost: 4_000_000, repair_count: 1 }
  } });
  assert.equal(result.disposal_advisory.cumulative_repair_cost, 4_000_000);
  assert.equal(result.disposal_advisory.remaining_value, 0);
  assert.equal(result.disposal_advisory.r_ratio, 40);
  assert.equal(result.disposal_advisory.should_consider_disposal, false);
});

test('repair advice never declares an unverified repair outcome even above disposal threshold', async () => {
  mockGemini({ suggested_outcome_notes: 'Đã sửa xong và vận hành thử tải thành công.' });
  const result = await buildRepairCopilot({ repair: {
    equipment_id: { price: 10_000_000, estimated_repair_cost: 8_000_000, repair_count: 4 }
  } });
  assert.equal(result.disposal_advisory.should_consider_disposal, true);
  assert.equal(result.diagnosis.suggested_outcome, null);
  assert.doesNotMatch(result.diagnosis.suggested_outcome_notes, /Đã sửa xong|Đã khắc phục triệt để/);
  assert.doesNotMatch(result.disposal_advisory.recommendation, /khuyến nghị kết luận "Không thể khắc phục"/);
});

test('replacement equipment must be available, distinct and in the same category', async () => {
  const result = await buildRepairCopilot({
    repair: { equipment_id: { _id: 'broken', category_id: 'projector', name: 'Máy chiếu' } },
    spareEquipments: [
      { _id: 'printer', category_id: 'printer', name: 'Máy in', status: 'in_stock' },
      { _id: 'busy', category_id: 'projector', name: 'Máy chiếu', status: 'in_use' },
      { _id: 'broken', category_id: 'projector', name: 'Máy chiếu', status: 'in_stock' }
    ]
  });
  assert.equal(result.dispatch_recommendation.recommended_replacement, null);
});

test('inventory reports all wrong-location assets while bounding only displayed flow samples', async () => {
  const result = await buildInventoryDiscrepancyAnalysis({ session: {}, logs: Array.from({ length: 9 }, (_, i) => ({
    status: 'wrong_location', equipment_id: { _id: `eq-${i}`, code: `EQ-${i}`, status: 'in_use' }
  })) });
  assert.equal(result.metrics.wrong_location, 9);
  assert.equal(result.wrong_location_flows.length, 6);
  assert.ok(result.findings.some((finding) => /9 thiết bị di chuyển/.test(finding.title)));
  assert.ok(result.recommendations.some((text) => /9 thiết bị lệch phòng/.test(text)));
});

test('incomplete or damaged-only inventory does not claim complete reconciliation', async () => {
  const incomplete = await buildInventoryDiscrepancyAnalysis({
    session: { status: 'in_progress' }, expectedCount: 3,
    logs: [{ status: 'matched' }], unscannedEquipments: [{ code: 'EQ-2' }, { code: 'EQ-3' }]
  });
  assert.match(incomplete.executive_summary, /2.*chưa quét/);
  assert.equal(incomplete.metrics.completion_percent, 33);
  const damaged = await buildInventoryDiscrepancyAnalysis({ session: {}, logs: [{ status: 'damaged' }] });
  assert.ok(damaged.recommendations.some((text) => /sửa chữa|hư hỏng/.test(text)));
  assert.ok(damaged.recommendations.every((text) => !/khớp 100%/.test(text)));
});

test('a missing record for an asset disposed later is not a physically scanned zombie', async () => {
  const result = await buildInventoryDiscrepancyAnalysis({ session: {}, logs: [{
    status: 'missing', equipment_id: { status: 'disposed' }
  }] });
  assert.equal(result.metrics.zombie_count, 0);
});

test('historical inventory uses disposal evidence recorded at scan time', async () => {
  const result = await buildInventoryDiscrepancyAnalysis({ session: { status: 'reconciled' }, logs: [
    { status: 'matched', equipment_id: { status: 'disposed' } },
    { status: 'wrong_location', note: '[CẢNH BÁO KIỂM TOÁN: Tài sản ĐÃ THANH LÝ (DISPOSED) nhưng vẫn xuất hiện thực tế tại phòng]', equipment_id: { status: 'disposed' } }
  ] });
  assert.equal(result.metrics.zombie_count, 1);
});

test('audit bursts require the same actor within a short time window', async () => {
  const logs = Array.from({ length: 5 }, (_, i) => ({
    user_id: { _id: 'admin-1' }, user_display: 'Admin', action: 'EQUIPMENT_DELETE',
    seq: i + 1, hashed_at: new Date(Date.UTC(2026, 10, 2 + i, 3))
  }));
  const spread = await buildAuditAnomalyAnalysis({ verification: { isValid: true }, logs });
  assert.ok(!spread.anomalies.some((a) => a.category === 'ACTOR_BURST'));
  const frequent = logs.map((log, i) => ({ ...log, hashed_at: new Date(Date.UTC(2026, 10, 2, 3, i)) }));
  const burst = await buildAuditAnomalyAnalysis({ verification: { isValid: true }, logs: frequent });
  assert.ok(burst.anomalies.some((a) => a.category === 'ACTOR_BURST'));
  const distinct = frequent.map((log, i) => ({ ...log, user_id: { _id: `admin-${i}` } }));
  const differentActors = await buildAuditAnomalyAnalysis({ verification: { isValid: true }, logs: distinct });
  assert.ok(!differentActors.anomalies.some((a) => a.category === 'ACTOR_BURST'));
});

test('audit destructive-only anomalies receive actionable recommendations', async () => {
  const result = await buildAuditAnomalyAnalysis({ verification: { isValid: true }, logs: [{
    action: 'EQUIPMENT_DELETE', hashed_at: '2026-11-02T03:00:00Z'
  }] });
  assert.ok(result.recommendations.some((text) => /xóa|thanh lý/.test(text)));
  assert.ok(result.recommendations.every((text) => !/chưa ghi nhận mẫu hành vi bất thường/.test(text)));
});
