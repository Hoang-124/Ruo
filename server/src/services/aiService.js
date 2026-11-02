import { BUSINESS_HOURS, DAMAGE_LEVELS } from '../config/constants.js';
import { computeDeadline } from './slaReactor.js';

const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_TIMEOUT_MS = 8000;

const CRITICAL_KEYWORDS = [
  'bốc khói', 'khói', 'mùi khét', 'khét', 'chập điện', 'chập cháy', 'cháy',
  'tia lửa', 'lửa', 'giật điện', 'rò điện', 'rò rỉ nước', 'ngập nước', 'nổ',
  'vỡ kính', 'rơi trần', 'mất an toàn', 'nguy hiểm', 'tê liệt toàn phòng', 'mất điện toàn phòng'
];

const MAJOR_KEYWORDS = [
  'không lên nguồn', 'mất nguồn', 'không bật được', 'tắt ngúm', 'hỏng hoàn toàn',
  'không lên hình', 'mất hình', 'đèn đỏ', 'báo lỗi đỏ', 'không mát', 'mất lạnh',
  'thổi gió nóng', 'chảy nước', 'không khởi động', 'màn hình xanh', 'bsod',
  'mất mạng', 'đứt cáp', 'hỏng bóng', 'cháy bóng', 'gián đoạn giảng dạy', 'không chiếu được'
];

const SENSITIVE_AUDIT_ACTIONS = new Set([
  'RBAC_UPDATE',
  'UPDATE_ROLE',
  'UPDATE_ROLE_PERMISSIONS',
  'BATCH_UPDATE_ROLE_PERMISSIONS',
  'RESET_ROLE_PERMISSIONS_DEFAULT',
  'DISABLE_MODULE',
  'ENABLE_MODULE',
  'EQUIPMENT_DELETE',
  'EQUIPMENT_DISPOSE',
  'DISPOSAL_RECEIPT',
  'ADMIN_RESET_PASSWORD',
  'USER_ACCOUNT_TEMP_LOCKED',
  'TEMPLATE_RESET_ALL',
  'ROOM_DEACTIVATED',
  'DELETE_SPARE_PART',
  'lock'
]);

const RBAC_ACTIONS = new Set([
  'RBAC_UPDATE',
  'UPDATE_ROLE',
  'UPDATE_ROLE_PERMISSIONS',
  'BATCH_UPDATE_ROLE_PERMISSIONS',
  'RESET_ROLE_PERMISSIONS_DEFAULT',
  'DISABLE_MODULE',
  'ENABLE_MODULE'
]);

const LOCKOUT_ACTIONS = new Set([
  'USER_ACCOUNT_TEMP_LOCKED',
  'ADMIN_RESET_PASSWORD',
  'lock'
]);

const DESTRUCTIVE_ASSET_ACTIONS = new Set([
  'EQUIPMENT_DELETE',
  'EQUIPMENT_DISPOSE',
  'DELETE_SPARE_PART',
  'ROOM_DEACTIVATED',
  'TEMPLATE_RESET_ALL'
]);

const sanitizePromptText = (text = '', maxLen = 1200) =>
  String(text || '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, ' ')
    .trim()
    .slice(0, maxLen);

const toIdStr = (val) => {
  if (!val) return '';
  if (typeof val === 'object' && val._id) return String(val._id);
  return String(val);
};

/**
 * Calls Google Gemini JSON endpoint via Node native fetch when GEMINI_API_KEY is configured.
 * Returns null cleanly on missing key, network failure, timeout, or invalid JSON so callers
 * seamlessly fall back to deterministic domain intelligence.
 */
export async function callGeminiJson(systemInstruction, userPayload) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !String(apiKey).trim() || typeof globalThis.fetch !== 'function') {
    return null;
  }

  const model = (process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL).trim();
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey.trim())}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);
  timer.unref?.();

  try {
    const response = await globalThis.fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemInstruction }]
        },
        contents: [
          {
            role: 'user',
            parts: [{ text: JSON.stringify(userPayload) }]
          }
        ],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: 'application/json'
        }
      })
    });

    if (!response || !response.ok) return null;
    const body = await response.json();
    const rawText = body?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) return null;

    const cleaned = String(rawText)
      .replace(/^```json\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim();
    const parsed = JSON.parse(cleaned);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch (_) {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

const inferEquipmentDomainProfile = (equipment = {}, description = '') => {
  const haystack = `${equipment?.name || ''} ${equipment?.category_id?.name || ''} ${description}`.toLowerCase();

  if (/máy chiếu|projector|epson|sony|viewsonic|benq/.test(haystack)) {
    return {
      domain: 'projector',
      partKeywords: ['bóng đèn', 'lamp', 'nguồn', 'hdmi', 'vga', 'quạt', 'lọc bụi', 'cầu chì'],
      deptKeywords: ['nghe nhìn', 'điện tử', 'cntt', 'kỹ thuật'],
      rootCause: 'Nghi suy hao bóng đèn cao áp, lỗi bo nguồn cấp hoặc quá nhiệt cụm tản nhiệt thấu kính.',
      steps: [
        'Kiểm tra mã nháy đèn cảnh báo (LAMP / TEMP) và nguồn AC đầu vào tại ổ trần.',
        'Tháo vệ sinh lưới lọc bụi, kiểm tra quạt làm mát và đo thông mạch cầu chì nguồn.',
        'Kiểm tra số giờ sử dụng bóng chiếu; thay thế cụm bóng đèn hoặc cáp tín hiệu HDMI nếu suy hao.'
      ],
      quickChecks: [
        'Thử rút cáp HDMI/nguồn chờ 60 giây rồi bật lại để loại trừ treo nhiệt tạm thời.',
        'Quan sát màu đèn báo (Đỏ liên tục = lỗi nguồn/bóng, Cam nhấp nháy = quá nhiệt).'
      ]
    };
  }

  if (/điều hòa|máy lạnh|daikin|panasonic|casper|lg/.test(haystack)) {
    return {
      domain: 'hvac',
      partKeywords: ['tụ', 'gas', 'cảm biến', 'sensor', 'quạt', 'bo mạch', 'ống đồng', 'remote'],
      deptKeywords: ['điện lạnh', 'nhiệt lạnh', 'điện', 'cơ điện'],
      rootCause: 'Nghi tụ đề lốc nén suy giảm, thiếu môi chất lạnh (gas) hoặc tắc nghẽn đường thoát nước ngưng.',
      steps: [
        'Đo dòng làm việc của dàn nóng, kiểm tra tụ khởi động máy nén và quạt dàn lạnh.',
        'Đo áp suất gas lạnh và thông rửa máng nước ngưng + lưới lọc bụi dàn lạnh.',
        'Kiểm tra cảm biến nhiệt độ phòng (thermistor) và tín hiệu điều khiển từ bo mạch.'
      ],
      quickChecks: [
        'Đảm bảo điều khiển đang ở chế độ COOL (biểu tượng bông tuyết) ở mức 22–24°C.',
        'Nếu dàn lạnh chảy nước vào thiết bị điện bên dưới, ngắt aptomat nhánh điều hòa ngay.'
      ]
    };
  }

  if (/máy tính|pc|workstation|màn hình|switch|wifi|router|mạng|dell|hp|lenovo/.test(haystack)) {
    return {
      domain: 'it',
      partKeywords: ['nguồn', 'psu', 'ram', 'ssd', 'ổ cứng', 'cáp mạng', 'rj45', 'màn hình', 'adapter'],
      deptKeywords: ['cntt', 'công nghệ thông tin', 'mạng', 'máy tính'],
      rootCause: 'Nghi lỗi bộ nguồn PSU, tiếp xúc thanh RAM/ổ SSD hoặc suy hao đầu bấm mạng RJ45 tại bàn máy.',
      steps: [
        'Kiểm tra nguồn cấp ATX/Adapter, đèn tín hiệu NIC và thử khởi động tối thiểu (POST).',
        'Vệ sinh khe cắm RAM, kiểm tra S.M.A.R.T ổ đĩa SSD và cáp hiển thị DisplayPort/HDMI.',
        'Đo thông mạch cáp mạng âm tường và cấu hình VLAN tại tủ rack tầng.'
      ],
      quickChecks: [
        'Kiểm tra dây nguồn và cáp màn hình phía sau thùng máy có bị lỏng do va chạm không.',
        'Ghi lại mã lỗi hoặc tiếng bíp BIOS (nếu có) để KTV mang sẵn linh kiện thay thế.'
      ]
    };
  }

  if (/âm thanh|loa|micro|mic|amply|mixer/.test(haystack)) {
    return {
      domain: 'audio',
      partKeywords: ['micro', 'pin', 'củ mic', 'dây loa', 'jack', 'amply', 'nguồn'],
      deptKeywords: ['nghe nhìn', 'âm thanh', 'điện tử'],
      rootCause: 'Nghi hết pin/lỗi tần số thu phát UHF của micro không dây hoặc đứt ngầm jack tín hiệu Amply.',
      steps: [
        'Kiểm tra dung lượng pin micro, đồng bộ lại kênh tần số IR giữa tay mic và đầu thu.',
        'Kiểm tra chiết áp âm lượng, cầu chì bảo vệ loa và jack kết nối trên tủ âm thanh giảng đường.',
        'Thử nghiệm độ hú (feedback) và cân chỉnh gain đầu vào.'
      ],
      quickChecks: [
        'Kiểm tra pin tiểu trong micro không dây và công tắc nguồn tủ âm thanh bục giảng.',
        'Hạ nhỏ âm lượng Master trước khi bật/tắt tránh xung điện gây bụp loa.'
      ]
    };
  }

  return {
    domain: 'general',
    partKeywords: ['ốc', 'bản lề', 'cầu chì', 'dây nguồn', 'công tắc', 'bóng đèn'],
    deptKeywords: ['kỹ thuật', 'csvc', 'bảo trì'],
    rootCause: 'Hao mòn cơ khí hoặc lỗi tiếp xúc điện qua tần suất khai thác cao tại phòng học.',
    steps: [
      'Kiểm tra hiện trường thực tế, đánh giá mức độ hư hỏng cơ học và an toàn điện.',
      'Thay thế vật tư hao mòn tương ứng và gia cố lại vị trí lắp đặt cố định.',
      'Vận hành thử tải 15 phút trước khi bàn giao lại cho phòng học.'
    ],
    quickChecks: [
      'Tạm ngưng sử dụng thiết bị đang gặp trục trặc để tránh phát sinh hư hỏng lan rộng.',
      'Ghi chú vị trí chính xác trong phòng để Kỹ thuật viên tiếp cận nhanh.'
    ]
  };
};

// ============================================================================
// FEATURE #1A: AI INCIDENT TRIAGE (LECTURER REPORT ISSUE COPILOT)
// ============================================================================
export async function buildIncidentTriage({ description, images = [], equipment = null, room = null, openRepairs = [] }) {
  const cleanDesc = sanitizePromptText(description, 1000);
  const lower = cleanDesc.toLowerCase();

  let suggestedLevel = DAMAGE_LEVELS.MINOR;
  let confidence = 82;
  let reasoning = 'Sự cố cục bộ mức nhẹ, ít gây gián đoạn hoàn toàn tiết học; xử lý theo khung SLA 48 giờ hành chính.';

  const matchedCritical = CRITICAL_KEYWORDS.find((kw) => lower.includes(kw));
  const matchedMajor = MAJOR_KEYWORDS.find((kw) => lower.includes(kw));

  if (matchedCritical) {
    suggestedLevel = DAMAGE_LEVELS.CRITICAL;
    confidence = 95;
    reasoning = `Phát hiện dấu hiệu mất an toàn khẩn cấp ("${matchedCritical}"), cần cô lập nguồn điện/hiện trường và điều động KTV tức thời (SLA khẩn cấp 8 giờ 24/7).`;
  } else if (matchedMajor) {
    suggestedLevel = DAMAGE_LEVELS.MAJOR;
    confidence = 89;
    reasoning = `Sự cố làm gián đoạn trực tiếp chức năng thiết bị giảng dạy ("${matchedMajor}"), khuyến nghị mức Hỏng Nặng (Major - SLA 24 giờ hành chính).`;
  } else if ((equipment?.repair_count || 0) >= 3) {
    suggestedLevel = DAMAGE_LEVELS.MAJOR;
    confidence = 84;
    reasoning = `Thiết bị đã từng hỏng ${equipment.repair_count} lần trước đó (nguy cơ tái phát cao), nâng mức ưu tiên lên Major (SLA 24 giờ hành chính).`;
  }

  const profile = inferEquipmentDomainProfile(equipment, cleanDesc);
  const eqIdStr = toIdStr(equipment);
  const roomIdStr = toIdStr(room);

  const duplicateTickets = (Array.isArray(openRepairs) ? openRepairs : []).map((rep) => {
    const repEqId = toIdStr(rep.equipment_id);
    const repRoomId = toIdStr(rep.room_id);
    const isExactEquipment = Boolean(eqIdStr && repEqId && eqIdStr === repEqId);
    return {
      _id: toIdStr(rep._id),
      ticket_code: rep.ticket_code || 'REP-OPEN',
      status: rep.status,
      damage_level: rep.damage_level,
      equipment_code: rep.equipment_id?.code || '',
      equipment_name: rep.equipment_id?.name || '',
      incident_description: rep.incident_description || '',
      match_type: isExactEquipment ? 'exact_equipment' : (roomIdStr && repRoomId === roomIdStr ? 'same_room' : 'related')
    };
  });

  const hasExactDuplicate = duplicateTickets.some((t) => t.match_type === 'exact_equipment');

  const prefixParts = [];
  if (room?.code) prefixParts.push(room.code);
  if (equipment?.code) prefixParts.push(equipment.code);
  const prefix = prefixParts.length > 0 ? `[${prefixParts.join(' - ')}] ` : '';
  const eqLabel = equipment?.name ? `${equipment.name}${equipment.brand ? ` (${equipment.brand})` : ''}` : 'Thiết bị phòng học';

  let refinedDescription = `${prefix}${eqLabel}: ${cleanDesc.charAt(0).toUpperCase() + cleanDesc.slice(1)}`;
  if (!/[.!?]$/.test(refinedDescription)) refinedDescription += '.';
  if (images.length > 0) {
    refinedDescription += ` (Đính kèm ${images.length} ảnh hiện trường).`;
  }

  let quickChecks = suggestedLevel === DAMAGE_LEVELS.CRITICAL
    ? [
        'CẢNH BÁO AN TOÀN: Ngắt ngay cầu dao/aptomat nhánh thiết bị, tuyệt đối không chạm tay vào vùng chập khói/rò điện.',
        'Sơ tán sinh viên khỏi khu vực nguy hiểm và giữ nguyên hiện trường chờ Kỹ thuật viên CSVC tiếp ứng.'
      ]
    : profile.quickChecks;

  const estimatedDeadline = computeDeadline(suggestedLevel, new Date());
  const slaLabelMap = {
    critical: 'Khẩn cấp 8 giờ (24/7)',
    major: '24 giờ hành chính',
    minor: '48 giờ hành chính'
  };

  let engine = 'domain_heuristic';
  const llm = await callGeminiJson(
    'Bạn là AI Điều phối Sự cố CSVC Đại học (Ruo UEMS). Phân tích mô tả sự cố của giảng viên và trả về JSON gồm: suggested_damage_level ("minor"|"major"|"critical"), refined_description (tiếng Việt chuyên nghiệp, ngắn gọn, có mã phòng/mã thiết bị nếu có), reasoning (1 câu giải thích tiếng Việt), quick_checks (mảng 2 hướng dẫn kiểm tra an toàn ngắn gọn tiếng Việt). Không bịa mã phiếu.',
    {
      room: room ? { code: room.code, name: room.name, floor: room.floor } : null,
      equipment: equipment ? { code: equipment.code, name: equipment.name, brand: equipment.brand, model: equipment.model, repair_count: equipment.repair_count } : null,
      raw_description: cleanDesc,
      image_count: images.length,
      baseline_level: suggestedLevel
    }
  );

  if (llm) {
    engine = 'gemini';
    if (['minor', 'major', 'critical'].includes(llm.suggested_damage_level)) {
      // Never downgrade a safety-critical keyword match!
      if (!(matchedCritical && llm.suggested_damage_level !== 'critical')) {
        suggestedLevel = llm.suggested_damage_level;
      }
    }
    if (typeof llm.refined_description === 'string' && llm.refined_description.trim().length > 10) {
      refinedDescription = llm.refined_description.trim();
    }
    if (typeof llm.reasoning === 'string' && llm.reasoning.trim().length > 5) {
      reasoning = llm.reasoning.trim();
    }
    if (Array.isArray(llm.quick_checks) && llm.quick_checks.length > 0) {
      quickChecks = llm.quick_checks.slice(0, 3).map((s) => String(s));
    }
  }

  const finalDeadline = computeDeadline(suggestedLevel, new Date());

  return {
    engine,
    suggested_damage_level: suggestedLevel,
    confidence,
    sla_label: slaLabelMap[suggestedLevel] || slaLabelMap.minor,
    estimated_deadline: finalDeadline.toISOString(),
    refined_description: refinedDescription,
    reasoning,
    quick_checks: quickChecks,
    has_exact_duplicate: hasExactDuplicate,
    duplicate_tickets: duplicateTickets
  };
}

// ============================================================================
// FEATURE #1B: AI REPAIR DISPATCH & TECHNICIAN DIAGNOSIS COPILOT
// ============================================================================
export async function buildRepairCopilot({
  repair,
  equipmentHistory = [],
  logs = [],
  spareParts = [],
  spareEquipments = [],
  technicians = [],
  openRepairs = [],
  resolvedRepairs = []
}) {
  const equipment = repair?.equipment_id || {};
  const room = repair?.room_id || {};
  const desc = sanitizePromptText(repair?.incident_description || repair?.description || '', 1200);
  const profile = inferEquipmentDomainProfile(equipment, desc);

  // 1. Disposal vs Repair Economics (R-ratio check)
  const price = Number(equipment?.price || 0);
  const remainingValue = Number(equipment?.computed_remaining_value || equipment?.remaining_value || (price > 0 ? price * 0.5 : 0));
  const cumulativeRepairCost = Number(equipment?.estimated_repair_cost || 0) + Number(repair?.total_cost || 0);
  const rRatio = remainingValue > 0
    ? Math.round((cumulativeRepairCost / remainingValue) * 100)
    : (typeof equipment?.rRatio === 'number' ? Math.round(equipment.rRatio) : 0);
  const repairCount = Number(equipment?.repair_count || equipmentHistory.length || 0);
  const shouldConsiderDisposal = rRatio >= 60 || repairCount >= 4;

  const disposalAdvisory = {
    should_consider_disposal: shouldConsiderDisposal,
    r_ratio: rRatio,
    repair_count: repairCount,
    cumulative_repair_cost: cumulativeRepairCost,
    remaining_value: remainingValue,
    recommendation: shouldConsiderDisposal
      ? `Cảnh báo kinh tế kỹ thuật: Tỷ lệ chi phí sửa / giá trị còn lại R = ${rRatio}% (ngưỡng thanh lý >= 60%), thiết bị đã hỏng ${repairCount} lần. Nếu chi phí linh kiện phát sinh cao, khuyến nghị kết luận "Không thể khắc phục" (unrepairable) để chuyển đề xuất Thanh lý RACI.`
      : `Chỉ số kinh tế an toàn (R = ${rRatio}% < 60%, số lần sửa: ${repairCount}). Ưu tiên sửa chữa khôi phục tại chỗ.`
  };

  // 2. Match Spare Parts in Warehouse
  const lowerDesc = `${desc} ${equipment?.name || ''}`.toLowerCase();
  const scoredParts = (Array.isArray(spareParts) ? spareParts : []).map((sp) => {
    const partText = `${sp.name || ''} ${sp.code || ''}`.toLowerCase();
    let score = 0;
    for (const kw of profile.partKeywords) {
      if (partText.includes(kw)) score += 30;
      if (lowerDesc.includes(kw) && partText.includes(kw)) score += 25;
    }
    const eqWords = String(equipment?.name || '').toLowerCase().split(/\s+/).filter((w) => w.length >= 3);
    for (const w of eqWords) {
      if (partText.includes(w)) score += 15;
    }
    if ((sp.stock || 0) > 0) score += 5;
    return {
      _id: toIdStr(sp._id),
      code: sp.code,
      name: sp.name,
      stock: Number(sp.stock || 0),
      min_stock: Number(sp.min_stock || 5),
      price: Number(sp.price || 0),
      unit: sp.unit || 'Cái',
      in_stock: Number(sp.stock || 0) > 0,
      relevance_score: score
    };
  });

  const recommendedParts = scoredParts
    .filter((p) => p.relevance_score > 10)
    .sort((a, b) => b.relevance_score - a.relevance_score)
    .slice(0, 4);

  // 3. Rank Technicians for Dispatch
  const now = Date.now();
  const targetCatId = toIdStr(equipment?.category_id);

  const rankedTechnicians = (Array.isArray(technicians) ? technicians : []).map((tech) => {
    const techId = toIdStr(tech._id);
    const activeForTech = (Array.isArray(openRepairs) ? openRepairs : []).filter(
      (r) => toIdStr(r.assigned_to) === techId
    );
    const overdueForTech = activeForTech.filter(
      (r) => r.deadline && new Date(r.deadline).getTime() < now
    );
    const similarResolved = (Array.isArray(resolvedRepairs) ? resolvedRepairs : []).filter((r) => {
      if (toIdStr(r.assigned_to) !== techId) return false;
      const rCat = toIdStr(r.equipment_id?.category_id);
      return targetCatId && rCat && targetCatId === rCat;
    }).length;

    const deptLower = String(tech.department || '').toLowerCase();
    const deptMatch = profile.deptKeywords.some((kw) => deptLower.includes(kw));

    // Score out of 100: penalize active & overdue load, reward category experience & department match
    const rawScore = 85 - activeForTech.length * 14 - overdueForTech.length * 20 + Math.min(15, similarResolved * 5) + (deptMatch ? 8 : 0);
    const score = Math.max(10, Math.min(99, rawScore));

    const reasons = [];
    reasons.push(`Đang xử lý ${activeForTech.length} phiếu`);
    if (overdueForTech.length > 0) reasons.push(`${overdueForTech.length} phiếu quá hạn SLA`);
    else reasons.push('0 quá hạn SLA');
    if (similarResolved > 0) reasons.push(`đã xử lý ${similarResolved} ca cùng nhóm thiết bị`);
    else if (deptMatch) reasons.push(`phù hợp chuyên môn (${tech.department})`);

    return {
      _id: techId,
      full_name: tech.full_name,
      code: tech.code,
      department: tech.department || 'Tổ Kỹ Thuật CSVC',
      active_tasks: activeForTech.length,
      overdue_tasks: overdueForTech.length,
      past_similar_repairs: similarResolved,
      score,
      reason: reasons.join(' • ')
    };
  }).sort((a, b) => b.score - a.score);

  // 4. Match Replacement Spare Equipment in Warehouse (KHO-01)
  const eqNameWords = String(equipment?.name || '').toLowerCase().split(/\s+/).filter((w) => w.length >= 3);
  const scoredReplacements = (Array.isArray(spareEquipments) ? spareEquipments : []).map((spEq) => {
    let matchScore = 0;
    if (targetCatId && toIdStr(spEq.category_id) === targetCatId) matchScore += 50;
    const spName = String(spEq.name || '').toLowerCase();
    for (const w of eqNameWords) {
      if (spName.includes(w)) matchScore += 15;
    }
    return {
      _id: toIdStr(spEq._id),
      code: spEq.code,
      name: spEq.name,
      brand: spEq.brand || '',
      model: spEq.model || '',
      match_score: matchScore
    };
  }).sort((a, b) => b.match_score - a.match_score);

  const bestReplacement = scoredReplacements.find((r) => r.match_score > 0) || null;
  const suggestedDamageLevel = repair?.damage_level || DAMAGE_LEVELS.MINOR;
  const suggestedDeadline = (repair?.deadline ? new Date(repair.deadline) : computeDeadline(suggestedDamageLevel, new Date())).toISOString();

  let rootCause = profile.rootCause;
  let troubleshootingSteps = profile.steps;
  let suggestedLogAction = `Kiểm tra chẩn đoán & xử lý sự cố ${equipment?.name || 'thiết bị'}`;
  let suggestedLogNotes = `${profile.steps[0]} Đã đối chiếu thông số vận hành tại phòng ${room?.code || 'hiện trường'}.`;
  const suggestedOutcome = shouldConsiderDisposal ? 'unrepairable' : 'repaired';
  let suggestedOutcomeNotes = shouldConsiderDisposal
    ? `Thiết bị ${equipment?.code || ''} hư hỏng nặng lặp lại (${repairCount} lần, chỉ số R = ${rRatio}% >= 60%), chi phí khắc phục vượt ngưỡng kinh tế; đề xuất chuyển quy trình Thanh lý RACI.`
    : `Đã khắc phục triệt để sự cố trên ${equipment?.name || 'thiết bị'} (${equipment?.code || ''}), vận hành thử tải ổn định và đủ điều kiện bàn giao giảng dạy.`;

  let engine = 'domain_heuristic';
  const llm = await callGeminiJson(
    'Bạn là Kỹ sư Trưởng CSVC Đại học (Ruo UEMS). Dựa trên thông tin phiếu sửa chữa và lịch sử thiết bị, trả về JSON gồm: root_cause (1-2 câu chẩn đoán nguyên nhân gốc bằng tiếng Việt), troubleshooting_steps (mảng 3 bước kiểm tra/sửa chữa thực tế bằng tiếng Việt), suggested_log_action (tiêu đề ngắn ghi nhật ký tiến độ), suggested_log_notes (ghi chú tiến độ kỹ thuật), suggested_outcome_notes (ghi chú nghiệm thu kết quả). Không thay đổi số liệu tài chính.',
    {
      ticket_code: repair?.ticket_code,
      damage_level: suggestedDamageLevel,
      incident_description: desc,
      room: { code: room?.code, name: room?.name },
      equipment: { code: equipment?.code, name: equipment?.name, brand: equipment?.brand, model: equipment?.model, repair_count: repairCount, r_ratio: rRatio },
      recent_history_count: equipmentHistory.length,
      recent_logs_count: logs.length,
      should_consider_disposal: shouldConsiderDisposal
    }
  );

  if (llm) {
    engine = 'gemini';
    if (typeof llm.root_cause === 'string' && llm.root_cause.trim().length > 8) rootCause = llm.root_cause.trim();
    if (Array.isArray(llm.troubleshooting_steps) && llm.troubleshooting_steps.length >= 2) {
      troubleshootingSteps = llm.troubleshooting_steps.slice(0, 4).map((s) => String(s));
    }
    if (typeof llm.suggested_log_action === 'string' && llm.suggested_log_action.trim()) {
      suggestedLogAction = llm.suggested_log_action.trim();
    }
    if (typeof llm.suggested_log_notes === 'string' && llm.suggested_log_notes.trim()) {
      suggestedLogNotes = llm.suggested_log_notes.trim();
    }
    if (typeof llm.suggested_outcome_notes === 'string' && llm.suggested_outcome_notes.trim()) {
      suggestedOutcomeNotes = llm.suggested_outcome_notes.trim();
    }
  }

  return {
    engine,
    diagnosis: {
      root_cause: rootCause,
      troubleshooting_steps: troubleshootingSteps,
      suggested_log_action: suggestedLogAction,
      suggested_log_notes: suggestedLogNotes,
      suggested_outcome: suggestedOutcome,
      suggested_outcome_notes: suggestedOutcomeNotes
    },
    recommended_parts: recommendedParts,
    dispatch_recommendation: {
      recommended_technician: rankedTechnicians[0] || null,
      ranked_technicians: rankedTechnicians,
      recommended_replacement: bestReplacement,
      suggested_damage_level: suggestedDamageLevel,
      suggested_deadline: suggestedDeadline
    },
    disposal_advisory: disposalAdvisory
  };
}

// ============================================================================
// FEATURE #4A: AI INVENTORY DISCREPANCY ANALYST
// ============================================================================
export async function buildInventoryDiscrepancyAnalysis({
  session,
  logs = [],
  unscannedEquipments = [],
  expectedCount = 0
}) {
  const safeLogs = Array.isArray(logs) ? logs : [];
  const safeUnscanned = Array.isArray(unscannedEquipments) ? unscannedEquipments : [];

  const matchedLogs = safeLogs.filter((l) => l.status === 'matched');
  const wrongLocLogs = safeLogs.filter((l) => l.status === 'wrong_location');
  const missingLogs = safeLogs.filter((l) => l.status === 'missing');
  const damagedLogs = safeLogs.filter((l) => l.status === 'damaged');

  // Detect Zombie Disposed Assets
  const zombieAssets = safeLogs
    .filter((l) => {
      const eqStatus = l.equipment_id?.status;
      const note = String(l.note || '');
      return eqStatus === 'disposed' || note.includes('ĐÃ THANH LÝ') || note.includes('DISPOSED');
    })
    .map((l) => ({
      code: l.equipment_id?.code || 'N/A',
      name: l.equipment_id?.name || 'Thiết bị',
      scanned_room: l.scanned_room_id?.code || 'N/A',
      price: Number(l.equipment_id?.price || 0),
      note: l.note || ''
    }));

  const missingValueVnd = missingLogs.reduce((sum, l) => sum + Number(l.equipment_id?.price || 0), 0);
  const wrongLocValueVnd = wrongLocLogs.reduce((sum, l) => sum + Number(l.equipment_id?.price || 0), 0);
  const damagedValueVnd = damagedLogs.reduce((sum, l) => sum + Number(l.equipment_id?.price || 0), 0);

  // Aggregate Hotspots by Room
  const roomStatsMap = new Map();
  const touchRoom = (roomObj) => {
    const code = roomObj?.code || 'KHO-01';
    if (!roomStatsMap.has(code)) {
      roomStatsMap.set(code, {
        room_code: code,
        room_name: roomObj?.name || 'Kho / Chưa gán',
        floor: roomObj?.floor || null,
        missing: 0,
        wrong_location: 0,
        damaged: 0,
        total_anomalies: 0,
        exposure_vnd: 0
      });
    }
    return roomStatsMap.get(code);
  };

  for (const l of missingLogs) {
    const bucket = touchRoom(l.equipment_id?.room_id || l.scanned_room_id);
    bucket.missing += 1;
    bucket.total_anomalies += 1;
    bucket.exposure_vnd += Number(l.equipment_id?.price || 0);
  }
  for (const l of wrongLocLogs) {
    const bucket = touchRoom(l.scanned_room_id || l.equipment_id?.room_id);
    bucket.wrong_location += 1;
    bucket.total_anomalies += 1;
    bucket.exposure_vnd += Number(l.equipment_id?.price || 0);
  }
  for (const l of damagedLogs) {
    const bucket = touchRoom(l.scanned_room_id || l.equipment_id?.room_id);
    bucket.damaged += 1;
    bucket.total_anomalies += 1;
    bucket.exposure_vnd += Number(l.equipment_id?.price || 0);
  }

  const hotspotsByRoom = Array.from(roomStatsMap.values())
    .filter((r) => r.total_anomalies > 0)
    .sort((a, b) => b.total_anomalies - a.total_anomalies || b.exposure_vnd - a.exposure_vnd)
    .slice(0, 5);

  // Detect Wrong-Location Drift Flows (e.g., Kho dự phòng -> Classroom without transfer order)
  const wrongLocationFlows = wrongLocLogs.slice(0, 6).map((l) => ({
    code: l.equipment_id?.code || 'N/A',
    name: l.equipment_id?.name || 'Thiết bị',
    from_room: l.equipment_id?.room_id?.code || 'KHO-01 (Kho dự phòng)',
    to_room: l.scanned_room_id?.code || 'N/A',
    is_zombie: l.equipment_id?.status === 'disposed' || String(l.note || '').includes('ĐÃ THANH LÝ')
  }));

  const findings = [];
  if (zombieAssets.length > 0) {
    findings.push({
      severity: 'critical',
      title: `Phát hiện ${zombieAssets.length} "Tài sản Bóng ma" (Zombie Disposed Asset)`,
      detail: `Thiết bị đã có quyết định Thanh lý trên sổ sách nhưng vẫn được quét thấy ngoài thực địa (${zombieAssets.map((z) => `${z.code} tại ${z.scanned_room}`).join(', ')}). Nguy cơ sai lệch hồ sơ thanh lý RACI.`,
      affected_codes: zombieAssets.map((z) => z.code)
    });
  }

  if (missingLogs.length > 0) {
    findings.push({
      severity: missingValueVnd >= 10_000_000 || missingLogs.length >= 3 ? 'high' : 'medium',
      title: `${missingLogs.length} tài sản vắng mặt / thất lạc (${missingValueVnd.toLocaleString('vi-VN')} đ)`,
      detail: `Tổng nguyên giá tài sản chưa tìm thấy đạt ${missingValueVnd.toLocaleString('vi-VN')} VNĐ. Tập trung kiểm tra biên bản bàn giao hoặc lệnh điều chuyển chưa xác nhận.`,
      affected_codes: missingLogs.slice(0, 6).map((l) => l.equipment_id?.code).filter(Boolean)
    });
  }

  const nonZombieWrong = wrongLocationFlows.filter((f) => !f.is_zombie);
  if (nonZombieWrong.length > 0) {
    findings.push({
      severity: 'medium',
      title: `${nonZombieWrong.length} thiết bị di chuyển tự phát sai phòng sổ sách`,
      detail: `Phát hiện dịch chuyển thực tế chưa cập nhật phiếu điều chuyển (VD: ${nonZombieWrong.slice(0, 3).map((f) => `${f.code}: ${f.from_room} → ${f.to_room}`).join('; ')}).`,
      affected_codes: nonZombieWrong.map((f) => f.code)
    });
  }

  if (damagedLogs.length > 0) {
    findings.push({
      severity: 'medium',
      title: `${damagedLogs.length} thiết bị phát hiện hư hỏng tại thực địa`,
      detail: `Hệ thống đã tự động mở/liên kết phiếu sửa chữa kỹ thuật để KTV khắc phục theo SLA.`,
      affected_codes: damagedLogs.slice(0, 6).map((l) => l.equipment_id?.code).filter(Boolean)
    });
  }

  if (safeUnscanned.length > 0 && session?.status !== 'reconciled') {
    findings.push({
      severity: 'low',
      title: `Còn ${safeUnscanned.length} thiết bị sổ sách chưa quét QR`,
      detail: `Nếu bấm "Chốt Số Liệu Đối Soát" ngay lúc này, toàn bộ ${safeUnscanned.length} thiết bị chưa quét sẽ tự động bị ghi nhận là THẤT LẠC (Missing).`,
      affected_codes: safeUnscanned.slice(0, 6).map((e) => e.code).filter(Boolean)
    });
  }

  let riskLevel = 'low';
  if (zombieAssets.length > 0 || missingValueVnd >= 30_000_000) {
    riskLevel = 'critical';
  } else if (missingLogs.length >= 2 || missingValueVnd >= 5_000_000) {
    riskLevel = 'high';
  } else if (wrongLocLogs.length > 0 || damagedLogs.length > 0 || missingLogs.length > 0) {
    riskLevel = 'medium';
  }

  const totalBase = Math.max(1, expectedCount || safeLogs.length);
  const penalty = zombieAssets.length * 35 + missingLogs.length * 15 + wrongLocLogs.length * 8 + damagedLogs.length * 5;
  const healthScore = Math.max(5, Math.min(100, Math.round(100 - (penalty / Math.max(1, Math.sqrt(totalBase))) * 2)));

  let recommendations = [];
  if (zombieAssets.length > 0) {
    recommendations.push(`Kiểm tra ngay hồ sơ thanh lý và biên bản thu hồi đối với ${zombieAssets.map((z) => z.code).join(', ')} đang xuất hiện tại phòng học.`);
  }
  if (nonZombieWrong.length > 0) {
    recommendations.push(`Lập lệnh Điều chuyển hợp thức hóa vị trí hoặc thu hồi về phòng gốc cho ${nonZombieWrong.length} thiết bị lệch phòng.`);
  }
  if (missingLogs.length > 0) {
    recommendations.push(`Rà soát lịch sử mượn/di chuyển tại ${hotspotsByRoom[0]?.room_code || 'các phòng trọng điểm'} trước khi trình BGH ký biên bản thất lạc.`);
  }
  if (safeUnscanned.length > 0 && session?.status !== 'reconciled') {
    recommendations.push(`Hoàn tất quét QR ${safeUnscanned.length} thiết bị còn lại trong tab "Danh Sách Sổ Sách Chưa Quét" trước khi chốt sổ SHA-256.`);
  }
  if (recommendations.length === 0) {
    recommendations.push('Số liệu kiểm kê khớp 100% với sổ sách, đủ điều kiện chốt đối soát và xuất biên bản ký số SHA-256.');
  }

  let executiveSummary = zombieAssets.length > 0
    ? `Cảnh báo kiểm toán mức KHẨN CẤP trên đợt "${session?.name || ''}": Phát hiện ${zombieAssets.length} tài sản đã thanh lý vẫn tồn tại thực địa và ${missingLogs.length} tài sản thất lạc (rủi ro ${missingValueVnd.toLocaleString('vi-VN')} VNĐ).`
    : missingLogs.length > 0 || wrongLocLogs.length > 0 || damagedLogs.length > 0
      ? `Đợt kiểm kê "${session?.name || ''}" ghi nhận ${matchedLogs.length} khớp chuẩn, ${wrongLocLogs.length} sai phòng, ${missingLogs.length} thất lạc (${missingValueVnd.toLocaleString('vi-VN')} VNĐ) và ${damagedLogs.length} hỏng hóc cần xử lý trước khi ký số.`
      : `Đợt kiểm kê "${session?.name || ''}" đạt độ khớp sổ sách tối ưu (${matchedLogs.length} tài sản khớp chuẩn, không phát hiện bất thường trọng yếu).`;

  let engine = 'domain_heuristic';
  const llm = await callGeminiJson(
    'Bạn là Kiểm toán viên Nội bộ CSVC Đại học (Ruo UEMS). Dựa trên thống kê đợt kiểm kê Tòa A1, trả về JSON gồm: executive_summary (2 câu tóm tắt điều hành tiếng Việt sắc bén cho Quản lý CSVC & BGH), recommendations (mảng 3 hành động xử lý cụ thể bằng tiếng Việt). Tuyệt đối giữ đúng con số thống kê.',
    {
      session_name: session?.name,
      status: session?.status,
      counts: {
        matched: matchedLogs.length,
        wrong_location: wrongLocLogs.length,
        missing: missingLogs.length,
        damaged: damagedLogs.length,
        unscanned: safeUnscanned.length,
        zombie: zombieAssets.length
      },
      missing_value_vnd: missingValueVnd,
      top_hotspots: hotspotsByRoom.slice(0, 3)
    }
  );

  if (llm) {
    engine = 'gemini';
    if (typeof llm.executive_summary === 'string' && llm.executive_summary.trim().length > 15) {
      executiveSummary = llm.executive_summary.trim();
    }
    if (Array.isArray(llm.recommendations) && llm.recommendations.length >= 2) {
      recommendations = llm.recommendations.slice(0, 4).map((r) => String(r));
    }
  }

  return {
    engine,
    risk_level: riskLevel,
    health_score: healthScore,
    executive_summary: executiveSummary,
    metrics: {
      total_logged: safeLogs.length,
      matched: matchedLogs.length,
      wrong_location: wrongLocLogs.length,
      missing: missingLogs.length,
      damaged: damagedLogs.length,
      unscanned: safeUnscanned.length,
      zombie_count: zombieAssets.length,
      missing_value_vnd: missingValueVnd,
      wrong_location_value_vnd: wrongLocValueVnd,
      damaged_value_vnd: damagedValueVnd
    },
    zombie_assets: zombieAssets,
    hotspots_by_room: hotspotsByRoom,
    wrong_location_flows: wrongLocationFlows,
    findings,
    recommendations
  };
}

// ============================================================================
// FEATURE #4B: AI AUDIT LEDGER SHA-256 ANOMALY & SECURITY ANALYST
// ============================================================================
const isOffHoursVietnam = (dateInput) => {
  if (!dateInput) return false;
  const d = new Date(dateInput);
  if (Number.isNaN(d.getTime())) return false;
  // Convert UTC timestamp to UTC+7 (Asia/Ho_Chi_Minh) deterministically
  const vnTime = new Date(d.getTime() + 7 * 60 * 60 * 1000);
  const vnDay = vnTime.getUTCDay(); // 0=Sun..6=Sat
  if (!BUSINESS_HOURS.WORKING_DAYS.includes(vnDay)) return true;
  const totalMin = vnTime.getUTCHours() * 60 + vnTime.getUTCMinutes();
  const startMin = BUSINESS_HOURS.START_HOUR * 60 + BUSINESS_HOURS.START_MINUTE;
  const endMin = BUSINESS_HOURS.END_HOUR * 60 + BUSINESS_HOURS.END_MINUTE;
  return totalMin < startMin || totalMin > endMin;
};

export async function buildAuditAnomalyAnalysis({ verification, logs = [] }) {
  const safeLogs = Array.isArray(logs) ? logs : [];
  const chainValid = Boolean(verification?.isValid);

  const anomalies = [];

  // 1. Cryptographic SHA-256 Chain Tamper Check
  if (!chainValid) {
    anomalies.push({
      severity: 'critical',
      category: 'CHAIN_TAMPER',
      title: `Vi phạm toàn vẹn mật mã chuỗi SHA-256 (${verification?.reason || 'TAMPER_DETECTED'})`,
      detail: verification?.message || `Phát hiện đứt gãy liên kết băm tại khối seq=#${verification?.brokenAt}. Sổ cái có dấu hiệu bị can thiệp trực tiếp ở tầng cơ sở dữ liệu.`,
      seq_refs: verification?.brokenAt ? [verification.brokenAt] : []
    });
  }

  // 2. RBAC & Role Policy Mutations
  const rbacLogs = safeLogs.filter((l) => RBAC_ACTIONS.has(l.action) || l.target_table === 'roles');
  if (rbacLogs.length > 0) {
    anomalies.push({
      severity: rbacLogs.length >= 3 ? 'high' : 'medium',
      category: 'RBAC_MUTATION',
      title: `${rbacLogs.length} thao tác thay đổi Ma trận Phân quyền RBAC`,
      detail: `Ghi nhận chỉnh sửa quyền hạn vai trò bởi ${Array.from(new Set(rbacLogs.map((l) => l.user_display || 'Admin'))).join(', ')}. Cần đối chiếu quy chế phân quyền RACI.`,
      seq_refs: rbacLogs.slice(0, 6).map((l) => l.seq).filter(Boolean)
    });
  }

  // 3. Account Lockouts & Admin Password Resets
  const lockoutLogs = safeLogs.filter((l) => LOCKOUT_ACTIONS.has(l.action));
  if (lockoutLogs.length > 0) {
    anomalies.push({
      severity: lockoutLogs.length >= 2 ? 'high' : 'medium',
      category: 'AUTH_LOCKOUT',
      title: `${lockoutLogs.length} sự kiện khóa tài khoản / đặt lại mật khẩu nhạy cảm`,
      detail: `Phát hiện sự kiện bảo mật xác thực (${lockoutLogs.map((l) => l.action).slice(0, 3).join(', ')}) từ IP ${Array.from(new Set(lockoutLogs.map((l) => l.ip_address).filter(Boolean))).join(', ') || 'nội bộ'}.`,
      seq_refs: lockoutLogs.slice(0, 6).map((l) => l.seq).filter(Boolean)
    });
  }

  // 4. High-Impact Asset Deletion / Disposal / Bulk Template Resets
  const destructiveLogs = safeLogs.filter((l) => DESTRUCTIVE_ASSET_ACTIONS.has(l.action));
  if (destructiveLogs.length > 0) {
    anomalies.push({
      severity: destructiveLogs.length >= 3 ? 'high' : 'medium',
      category: 'DESTRUCTIVE_MUTATION',
      title: `${destructiveLogs.length} tác vụ xóa / thanh lý tài sản hoặc reset cấu hình hệ thống`,
      detail: `Các bản ghi tác động vĩnh viễn trạng thái tài sản/cấu hình (${Array.from(new Set(destructiveLogs.map((l) => l.action))).join(', ')}).`,
      seq_refs: destructiveLogs.slice(0, 6).map((l) => l.seq).filter(Boolean)
    });
  }

  // 5. Off-Hours Sensitive Operations (outside 07:30-17:00 Mon-Fri UTC+7)
  const offHoursSensitive = safeLogs.filter(
    (l) => SENSITIVE_AUDIT_ACTIONS.has(l.action) && isOffHoursVietnam(l.hashed_at || l.created_at)
  );
  if (offHoursSensitive.length > 0) {
    anomalies.push({
      severity: 'medium',
      category: 'OFF_HOURS_SENSITIVE',
      title: `${offHoursSensitive.length} thao tác quản trị nhạy cảm ngoài giờ hành chính`,
      detail: `Thực hiện ngoài khung 07:30–17:00 (Thứ 2–Thứ 6) bởi ${Array.from(new Set(offHoursSensitive.map((l) => l.user_display || 'Hệ Thống'))).join(', ')}.`,
      seq_refs: offHoursSensitive.slice(0, 6).map((l) => l.seq).filter(Boolean)
    });
  }

  // 6. Actor Burst / High-Velocity Concentration
  const actorCounts = new Map();
  for (const l of safeLogs) {
    if (!SENSITIVE_AUDIT_ACTIONS.has(l.action)) continue;
    const actor = l.user_display || 'Hệ Thống';
    actorCounts.set(actor, (actorCounts.get(actor) || 0) + 1);
  }
  for (const [actor, count] of actorCounts.entries()) {
    if (count >= 5) {
      anomalies.push({
        severity: 'medium',
        category: 'ACTOR_BURST',
        title: `Tần suất thao tác nhạy cảm cao từ "${actor}" (${count} lệnh)`,
        detail: `Tài khoản "${actor}" thực hiện liên tiếp ${count} thay đổi trọng yếu trong tập nhật ký đang rà soát.`,
        seq_refs: safeLogs.filter((l) => (l.user_display || 'Hệ Thống') === actor && SENSITIVE_AUDIT_ACTIONS.has(l.action)).slice(0, 6).map((l) => l.seq)
      });
    }
  }

  let riskLevel = 'low';
  if (!chainValid) {
    riskLevel = 'critical';
  } else if (anomalies.some((a) => a.severity === 'high')) {
    riskLevel = 'high';
  } else if (anomalies.length > 0) {
    riskLevel = 'medium';
  }

  const rawScore = !chainValid
    ? 12
    : 100 - rbacLogs.length * 6 - lockoutLogs.length * 8 - offHoursSensitive.length * 5 - destructiveLogs.length * 4;
  const securityScore = Math.max(5, Math.min(100, rawScore));

  let recommendations = [];
  if (!chainValid) {
    recommendations.push(`CÔ LẬP NGAY bản ghi seq=#${verification?.brokenAt}, xuất bản sao CSV đối chứng và kiểm tra quyền truy cập trực tiếp MongoDB.`);
  }
  if (rbacLogs.length > 0) {
    recommendations.push('Rà soát lại Diff (Old Value vs New Value) của các khối cập nhật RBAC để đảm bảo không cấp thừa quyền vượt ma trận RACI.');
  }
  if (lockoutLogs.length > 0) {
    recommendations.push('Kiểm tra địa chỉ IP nguồn của các sự kiện khóa tài khoản / đặt lại mật khẩu để loại trừ dò mật khẩu trái phép.');
  }
  if (offHoursSensitive.length > 0) {
    recommendations.push('Xác minh phiếu yêu cầu thay đổi (Change Request) đối với các thao tác cấu hình/thanh lý thực hiện ngoài giờ hành chính.');
  }
  if (recommendations.length === 0) {
    recommendations.push('Chuỗi băm mật mã SHA-256 nguyên vẹn 100% và chưa ghi nhận mẫu hành vi bất thường; duy trì xuất lưu trữ CSV định kỳ hàng tuần.');
  }

  let executiveSummary = !chainValid
    ? `BÁO ĐỘNG ĐỎ: Chuỗi sổ cái SHA-256 bị phá vỡ tính toàn vẹn tại khối #${verification?.brokenAt} (${verification?.reason}). Phát hiện đồng thời ${anomalies.length} dấu hiệu rủi ro bảo mật cần điều tra khẩn cấp.`
    : anomalies.length > 0
      ? `Chuỗi mật mã SHA-256 nguyên vẹn trên ${verification?.totalLogs ?? safeLogs.length} khối (Tamper-Free), tuy nhiên AI ghi nhận ${anomalies.length} nhóm thao tác nhạy cảm (${rbacLogs.length} thay đổi RBAC, ${lockoutLogs.length} sự kiện khóa/mật khẩu, ${offHoursSensitive.length} lệnh ngoài giờ) cần Quản trị viên lưu tâm.`
      : `Chuỗi kiểm toán SHA-256 hoàn toàn nguyên vẹn (${verification?.totalLogs ?? safeLogs.length} khối hợp lệ) và không phát hiện mẫu hành vi xâm nhập hay lạm quyền bất thường.`;

  let engine = 'domain_heuristic';
  const llm = await callGeminiJson(
    'Bạn là Giám đốc An toàn Thông tin (CSO) kiểm toán sổ cái mật mã SHA-256 của hệ thống CSVC Đại học (Ruo UEMS). Trả về JSON gồm: executive_summary (2 câu nhận định bảo mật súc tích bằng tiếng Việt), recommendations (mảng 3 khuyến nghị hành động cụ thể bằng tiếng Việt). Không được phủ nhận lỗi nếu chain_valid = false.',
    {
      chain_valid: chainValid,
      broken_at: verification?.brokenAt || null,
      reason: verification?.reason || null,
      logs_analyzed: safeLogs.length,
      counts: {
        rbac_mutations: rbacLogs.length,
        auth_lockouts: lockoutLogs.length,
        destructive_mutations: destructiveLogs.length,
        off_hours_sensitive: offHoursSensitive.length
      }
    }
  );

  if (llm) {
    engine = 'gemini';
    if (typeof llm.executive_summary === 'string' && llm.executive_summary.trim().length > 15) {
      executiveSummary = llm.executive_summary.trim();
    }
    if (Array.isArray(llm.recommendations) && llm.recommendations.length >= 2) {
      recommendations = llm.recommendations.slice(0, 4).map((r) => String(r));
    }
  }

  return {
    engine,
    risk_level: riskLevel,
    security_score: securityScore,
    executive_summary: executiveSummary,
    chain_integrity: {
      isValid: chainValid,
      totalLogs: verification?.totalLogs ?? safeLogs.length,
      brokenAt: verification?.brokenAt || null,
      reason: verification?.reason || null,
      message: verification?.message || ''
    },
    stats: {
      logs_analyzed: safeLogs.length,
      rbac_mutations: rbacLogs.length,
      auth_lockouts: lockoutLogs.length,
      destructive_mutations: destructiveLogs.length,
      off_hours_sensitive: offHoursSensitive.length
    },
    anomalies,
    recommendations
  };
}

export default {
  callGeminiJson,
  buildIncidentTriage,
  buildRepairCopilot,
  buildInventoryDiscrepancyAnalysis,
  buildAuditAnomalyAnalysis
};
