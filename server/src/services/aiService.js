import { BUSINESS_HOURS, DAMAGE_LEVELS } from '../config/constants.js';
import { computeDeadline } from './slaReactor.js';
import {
  stripRefinedPrefix,
  computeTextSimilarity,
  normalizeVietnameseText,
  stripDiacritics
} from './ai/vietnameseNlp.js';
import {
  CATEGORY_ONTOLOGY,
  SAFETY_PROTOCOLS
} from './ai/facilityKnowledgeCorpus.js';
import {
  getLocalAiTrainingStats,
  inferCategoryFromEquipment,
  classifyIncidentLocally,
  learnFromSystemHistory
} from './ai/localClassifier.js';

const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_TIMEOUT_MS = 8000;

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

const CATEGORY_PART_KEYWORDS = {
  'CAT-DISPLAY': ['bóng đèn', 'lamp', 'lọc bụi', 'hdmi', 'vga', 'điều khiển', 'remote', 'nguồn', 'cầu chì'],
  'CAT-HVAC': ['tụ', 'gas', 'cảm biến', 'sensor', 'điều khiển', 'remote', 'aptomat', 'mcb', 'quạt'],
  'CAT-AUDIO': ['ắc quy', 'pin', 'micro', 'củ mic', 'dây loa', 'jack', 'nguồn', 'điều khiển'],
  'CAT-IT': ['nguồn', 'psu', 'ram', 'ssd', 'ổ cứng', 'cáp mạng', 'rj45', 'patch', 'aptomat', 'màn hình'],
  'CAT-NET': ['cáp mạng', 'patch', 'rj45', 'hdmi', 'nguồn', 'poe', 'switch', 'wifi'],
  'CAT-SEC': ['cáp mạng', 'patch', 'rj45', 'ắc quy', 'nguồn', 'ổ cứng'],
  'CAT-OFFICE': ['mực', 'toner', 'lõi lọc', 'ro', 'cáp mạng', 'patch', 'aptomat', 'rcbo'],
  'CAT-POWER': ['chấn lưu', 'driver', 'led', 'tuýp', 'aptomat', 'rcbo', 'mcb', 'ổ cắm', 'ắc quy'],
  'CAT-FIRE': ['bình chữa cháy', 'vòi', 'ắc quy', 'báo khói', 'chốt'],
  'CAT-FURN': ['bánh xe', 'bản lề', 'ổ khóa', 'ốc vít', 'bulông', 'piston', 'dây rèm', 'mặt bàn', 'chân ghế'],
  'CAT-SPEC': ['ắc quy', 'pin', 'điện cực', 'vòng bít', 'bánh xe', 'khóa']
};

const sanitizePromptText = (text = '', maxLen = 1200) =>
  String(text || '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, ' ')
    .trim()
    .slice(0, maxLen);

const aiText = (value, minLength = 1, maxLength = 1200) => {
  if (typeof value !== 'string') return null;
  const text = sanitizePromptText(value, maxLength);
  return text.length >= minLength ? text : null;
};

const aiList = (value, minItems = 1, maxItems = 4) => {
  if (!Array.isArray(value)) return null;
  const items = value.map((item) => aiText(item, 1, 600)).filter(Boolean).slice(0, maxItems);
  return items.length >= minItems ? items : null;
};

const nonNegativeNumber = (value) => Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : 0;

const toIdStr = (val) => {
  if (!val) return '';
  if (typeof val === 'object' && val._id) return String(val._id);
  return String(val);
};

/**
 * Optional external Gemini JSON connector (disabled automatically when GEMINI_API_KEY is unset
 * or when RUO_AI_LOCAL_ONLY=true). Returns null cleanly on any failure so Ruo's self-contained
 * Local Cortex AI handles 100% of operations offline/locally.
 */
export async function callGeminiJson(systemInstruction, userPayload) {
  if (String(process.env.RUO_AI_LOCAL_ONLY || '').toLowerCase() === 'true') {
    return null;
  }
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !String(apiKey).trim() || typeof globalThis.fetch !== 'function') {
    return null;
  }

  const model = (process.env.GEMINI_MODEL || '').trim() || DEFAULT_GEMINI_MODEL;
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
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
  } catch (_) {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export { getLocalAiTrainingStats };

// ============================================================================
// FEATURE #1A: AI INCIDENT TRIAGE (LECTURER REPORT ISSUE COPILOT)
// ============================================================================
export async function buildIncidentTriage({
  description,
  images = [],
  equipment = null,
  room = null,
  openRepairs = [],
  roomEquipments = []
}) {
  const unprefixedRaw = stripRefinedPrefix(description);
  const cleanDesc = sanitizePromptText(unprefixedRaw || description, 1000);

  // Run Ruo Local Cortex Classifier across the FULL input so hazards past char 1000 are still caught
  const localAnalysis = classifyIncidentLocally({
    description: unprefixedRaw || description,
    equipment,
    room,
    roomEquipments
  });

  const {
    playbook,
    hazard,
    matchedMajorPhrase,
    isHighImpactRoom,
    entityInfo
  } = localAnalysis;

  let suggestedLevel = localAnalysis.severity;
  let confidence = localAnalysis.confidence;

  // Determine the accurate target asset label (using matched/mentioned asset when dropdown is mismatched!)
  const mismatchInfo = entityInfo.mismatch;
  const effectiveEquipment = mismatchInfo.detected
    ? (mismatchInfo.suggested_equipment || null)
    : equipment;

  const targetAssetLabel = effectiveEquipment?.name
    ? `${effectiveEquipment.name}${effectiveEquipment.brand ? ` (${effectiveEquipment.brand})` : ''}`
    : (mismatchInfo.detected
      ? mismatchInfo.mentioned_label
      : (CATEGORY_ONTOLOGY[entityInfo.effectiveCategory]?.label || 'Thiết bị phòng học'));

  // Build context-rich, physics-verified reasoning
  let reasoning = '';
  if (hazard) {
    reasoning = hazard.protocol.buildReasoning(targetAssetLabel, hazard.trigger);
  } else if (suggestedLevel === DAMAGE_LEVELS.CRITICAL) {
    reasoning = `Sự cố mức nghiêm trọng trên ${targetAssetLabel} (${playbook.title.toLowerCase()}) có nguy cơ gây mất an toàn hoặc tê liệt vận hành, cần điều động KTV khẩn cấp (SLA 8 giờ 24/7).`;
  } else if (suggestedLevel === DAMAGE_LEVELS.MAJOR) {
    if (!mismatchInfo.detected && (equipment?.repair_count || 0) >= 3 && !matchedMajorPhrase) {
      reasoning = `${targetAssetLabel} đã từng hỏng ${equipment.repair_count} lần trước đó (nguy cơ tái phát mạn tính — ${playbook.title.toLowerCase()}), tự động nâng mức ưu tiên lên Major (SLA 24 giờ hành chính).`;
    } else {
      const phraseNote = matchedMajorPhrase ? ` ("${matchedMajorPhrase}")` : '';
      const roomNote = isHighImpactRoom && room?.code ? ` tại phòng trọng điểm ${room.code}` : '';
      reasoning = `Nhận diện lỗi "${playbook.title}"${phraseNote}${roomNote} làm gián đoạn trực tiếp công năng phục vụ giảng dạy; khuyến nghị mức Hỏng Nặng (Major - SLA 24 giờ hành chính).`;
    }
  } else {
    reasoning = `Nhận diện "${playbook.title}" ở mức độ cục bộ trên ${targetAssetLabel}, chưa gây mất an toàn hay đình trệ hoàn toàn lớp học; xếp lịch xử lý chuẩn SLA 48 giờ hành chính.`;
  }

  // Evaluate duplicate / related open tickets with semantic similarity
  const effectiveEqIdStr = toIdStr(effectiveEquipment);
  const roomIdStr = toIdStr(room);

  const duplicateTickets = (Array.isArray(openRepairs) ? openRepairs : []).map((rep) => {
    const repEqId = toIdStr(rep.equipment_id);
    const repRoomId = toIdStr(rep.room_id);
    const isExactEquipment = Boolean(effectiveEqIdStr && repEqId && effectiveEqIdStr === repEqId);
    const semanticSim = Math.round(computeTextSimilarity(cleanDesc, rep.incident_description || '') * 100);
    return {
      _id: toIdStr(rep._id),
      ticket_code: rep.ticket_code || 'REP-OPEN',
      status: rep.status,
      damage_level: rep.damage_level,
      equipment_code: rep.equipment_id?.code || '',
      equipment_name: rep.equipment_id?.name || '',
      incident_description: rep.incident_description || '',
      similarity_percent: semanticSim,
      match_type: isExactEquipment ? 'exact_equipment' : (roomIdStr && repRoomId === roomIdStr ? 'same_room' : 'related')
    };
  });

  const hasExactDuplicate = duplicateTickets.some((t) => t.match_type === 'exact_equipment');

  // Build standardized refined description without duplicating prefixes
  const prefixParts = [];
  if (room?.code) prefixParts.push(room.code);
  if (effectiveEquipment?.code) prefixParts.push(effectiveEquipment.code);
  const prefix = prefixParts.length > 0 ? `[${prefixParts.join(' - ')}] ` : '';

  const sourceDescription = hazard ? sanitizePromptText(unprefixedRaw || description, 10000) : cleanDesc;
  const formattedSymptom = sourceDescription.charAt(0).toUpperCase() + sourceDescription.slice(1);
  let refinedDescription = `${prefix}${targetAssetLabel}: ${formattedSymptom}`;
  if (!/[.!?]$/.test(refinedDescription)) refinedDescription += '.';
  if (!hazard && playbook?.title && cleanDesc.length < 45) {
    refinedDescription += ` (Chẩn đoán sơ bộ: ${playbook.title}).`;
  }
  if (images.length > 0) {
    refinedDescription += ` (Đính kèm ${images.length} ảnh hiện trường).`;
  }

  let quickChecks = hazard ? [...hazard.protocol.quickChecks] : [...playbook.quickChecks];

  const slaLabelMap = {
    critical: 'Khẩn cấp 8 giờ (24/7)',
    major: '24 giờ hành chính',
    minor: '48 giờ hành chính'
  };

  let engine = 'domain_heuristic';
  const llm = await callGeminiJson(
    'Bạn là AI Điều phối Sự cố CSVC Đại học (Ruo UEMS). Phân tích mô tả sự cố và trả về JSON gồm: suggested_damage_level ("minor"|"major"|"critical"), refined_description (tiếng Việt chuyên nghiệp, ngắn gọn, có mã phòng/mã thiết bị nếu có), reasoning (1 câu giải thích tiếng Việt), quick_checks (mảng 2 hướng dẫn kiểm tra an toàn ngắn gọn tiếng Việt). LƯU Ý VẬT LÝ: Nếu đối tượng là bàn ghế, tủ kệ, rèm cửa, bình chữa cháy (is_electrical=false), TUYỆT ĐỐI KHÔNG bảo rút phích cắm điện hay tắt cầu dao thiết bị. Không bịa mã phiếu.',
    {
      room: room ? { code: room.code, name: room.name, floor: room.floor } : null,
      equipment: effectiveEquipment ? { code: effectiveEquipment.code, name: effectiveEquipment.name, brand: effectiveEquipment.brand, model: effectiveEquipment.model } : null,
      is_electrical: entityInfo.effectiveIsElectrical,
      detected_category: entityInfo.effectiveCategory,
      raw_description: cleanDesc,
      image_count: images.length,
      baseline_level: suggestedLevel
    }
  );

  if (llm) {
    if (['minor', 'major', 'critical'].includes(llm.suggested_damage_level)) {
      // Never downgrade a locally detected safety-critical hazard!
      if (!(hazard && llm.suggested_damage_level !== 'critical')) {
        suggestedLevel = llm.suggested_damage_level;
        engine = 'gemini';
      }
    }
    if (!hazard && aiText(llm.refined_description, 11)) {
      refinedDescription = aiText(llm.refined_description, 11);
      engine = 'gemini';
    }
    if (!hazard && aiText(llm.reasoning, 6)) {
      reasoning = aiText(llm.reasoning, 6);
      engine = 'gemini';
    }
    if (suggestedLevel !== DAMAGE_LEVELS.CRITICAL && aiList(llm.quick_checks, 1, 3)) {
      const candidateChecks = aiList(llm.quick_checks, 1, 3);
      // Physics guardrail: reject LLM quick_checks that mention electrical plugs/breakers for passive furniture!
      const violatesPhysics = !entityInfo.effectiveIsElectrical
        && candidateChecks.some((c) => /phích cắm|cầu dao|aptomat|nguồn điện|dây nguồn/iu.test(c));
      if (!violatesPhysics) {
        quickChecks = candidateChecks;
        engine = 'gemini';
      }
    }
  }

  // Guarantee critical safety guidance even when escalated externally
  if (suggestedLevel === DAMAGE_LEVELS.CRITICAL) {
    const activeProtocol = hazard?.protocol
      || (entityInfo.effectiveIsElectrical ? SAFETY_PROTOCOLS.CLASS_C_ELECTRICAL_FIRE : SAFETY_PROTOCOLS.CLASS_A_SOLID_FIRE);
    quickChecks = [...activeProtocol.quickChecks];
    if (!hazard) {
      reasoning = entityInfo.effectiveIsElectrical
        ? `AI nhận định sự cố trên ${targetAssetLabel} có nguy cơ mất an toàn điện/vận hành; ngừng sử dụng và yêu cầu kỹ thuật viên xác minh khẩn cấp (SLA 8 giờ 24/7).`
        : `AI nhận định sự cố trên ${targetAssetLabel} có nguy cơ mất an toàn hiện trường; phong tỏa vị trí và yêu cầu kỹ thuật viên xử lý khẩn cấp (SLA 8 giờ 24/7).`;
    }
  }

  const finalDeadline = computeDeadline(suggestedLevel, new Date());

  return {
    engine,
    engine_label: engine === 'gemini' ? 'Gemini Hybrid + Ruo Physics Guard' : 'Ruo Cortex Local AI v2.5',
    suggested_damage_level: suggestedLevel,
    confidence,
    sla_label: slaLabelMap[suggestedLevel] || slaLabelMap.minor,
    estimated_deadline: finalDeadline.toISOString(),
    refined_description: refinedDescription,
    reasoning,
    quick_checks: quickChecks,
    has_exact_duplicate: hasExactDuplicate,
    duplicate_tickets: duplicateTickets,
    equipment_mismatch: mismatchInfo,
    fault_classification: {
      category_code: entityInfo.effectiveCategory,
      category_label: CATEGORY_ONTOLOGY[entityInfo.effectiveCategory]?.label || 'Thiết bị CSVC',
      playbook_id: playbook.id,
      playbook_title: playbook.title,
      is_electrical: entityInfo.effectiveIsElectrical,
      hazard_protocol: hazard?.protocol?.id || null
    }
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

  const localAnalysis = classifyIncidentLocally({
    description: desc,
    equipment: Object.keys(equipment).length > 0 ? equipment : null,
    room
  });
  const { playbook, entityInfo } = localAnalysis;
  const effectiveCategory = inferCategoryFromEquipment(equipment) || entityInfo.effectiveCategory;
  const catMeta = CATEGORY_ONTOLOGY[effectiveCategory] || CATEGORY_ONTOLOGY['CAT-POWER'];

  // Mine historical cases & chronic recurrence from Ruo's own MongoDB records
  const historicalInsights = learnFromSystemHistory({
    description: desc,
    equipment,
    equipmentHistory,
    logs,
    resolvedRepairs
  });

  // 1. Disposal vs Repair Economics (R-ratio check)
  const price = nonNegativeNumber(equipment?.price);
  const computedValue = equipment?.computed_remaining_value;
  const remainingValue = nonNegativeNumber(Number.isFinite(computedValue) ? computedValue : equipment?.remaining_value);
  // Equipment already accumulates this ticket's labor and spare-part costs.
  const cumulativeRepairCost = nonNegativeNumber(equipment?.estimated_repair_cost ?? repair?.total_cost);
  // Match the disposal workflow: cost / original price, not depreciated value.
  const rawRatio = price > 0 ? (cumulativeRepairCost / price) * 100 : 0;
  const rRatio = Number(rawRatio.toFixed(2));
  const repairCount = nonNegativeNumber(equipment?.repair_count ?? equipmentHistory.length);
  const shouldConsiderDisposal = rawRatio >= 60 || repair?.outcome === 'unrepairable';

  const disposalAdvisory = {
    should_consider_disposal: shouldConsiderDisposal,
    r_ratio: rRatio,
    repair_count: repairCount,
    cumulative_repair_cost: cumulativeRepairCost,
    remaining_value: remainingValue,
    original_value: price,
    ratio_basis: 'original_price',
    recommendation: shouldConsiderDisposal
      ? `Đề nghị đánh giá phương án thanh lý: chi phí sửa / nguyên giá R = ${rRatio}%, số lần sửa ${repairCount}${repair?.outcome === 'unrepairable' ? ', đã có kết luận không thể sửa chữa' : ', đạt ngưỡng kinh tế 60%'}. Kỹ thuật viên cần xác minh tình trạng thực tế; phê duyệt theo quy trình RACI.`
      : price > 0
        ? `Chi phí sửa / nguyên giá R = ${rRatio}% (< 60%), số lần sửa ${repairCount}. Tiếp tục chẩn đoán trước khi xác nhận phương án xử lý.`
        : 'Chưa có nguyên giá hợp lệ để đánh giá tỷ lệ chi phí sửa chữa; cần bổ sung dữ liệu và kiểm tra thực tế.'
  };

  // 2. Physics-Consistent Spare Parts Matching in Warehouse
  const allowedPartKeywords = CATEGORY_PART_KEYWORDS[effectiveCategory] || [];
  const playbookPartCodes = new Set(playbook.partCodes || []);
  const normDesc = normalizeVietnameseText(`${desc} ${equipment?.name || ''}`);
  const asciiDesc = stripDiacritics(normDesc);

  const scoredParts = (Array.isArray(spareParts) ? spareParts : []).map((sp) => {
    const partCodeUpper = String(sp.code || '').toUpperCase();
    const partText = normalizeVietnameseText(`${sp.name || ''} ${sp.code || ''}`);
    const partAscii = stripDiacritics(partText);
    let score = 0;

    // Guard against suggesting electronic/electrical parts for passive non-electrical furniture/items
    if (!entityInfo.effectiveIsElectrical && /bóng đèn|lamp|hdmi|patch|rj45|chấn lưu|led|aptomat|mcb|rcbo|mực|toner|lõi lọc|ắc quy|pin|điều khiển|remote/iu.test(partText)) {
      score -= 80;
    }

    if (playbookPartCodes.has(partCodeUpper)) {
      score += 60;
    }

    for (const kw of allowedPartKeywords) {
      const kwAsc = stripDiacritics(kw);
      if (partText.includes(kw) || partAscii.includes(kwAsc)) {
        if (normDesc.includes(kw) || asciiDesc.includes(kwAsc)) {
          score += 36;
        } else if (playbookPartCodes.size === 0) {
          score += 22;
        } else {
          score += 8;
        }
      }
    }

    for (const pkw of playbook.keywords) {
      if (pkw.length >= 4 && partText.includes(pkw)) {
        score += 18;
      }
    }

    const eqWords = normalizeVietnameseText(equipment?.name || '')
      .split(/\s+/)
      .filter((w) => w.length >= 4 && !['thiết', 'phòng', 'giảng', 'đường', 'sinh', 'viên', 'bình', 'máy', 'cụm', 'thống', 'điện', 'tường', 'trần'].includes(w));
    for (const w of eqWords) {
      if (partText.includes(w)) score += 12;
    }

    if (score > 0 && (sp.stock || 0) > 0) score += 5;

    return {
      _id: toIdStr(sp._id),
      code: sp.code,
      name: sp.name,
      stock: Number(sp.stock || 0),
      min_stock: Number(sp.min_stock ?? 5),
      price: Number(sp.price || 0),
      unit: sp.unit || 'Cái',
      in_stock: Number(sp.stock || 0) > 0,
      relevance_score: score
    };
  });

  const recommendedParts = scoredParts
    .filter((p) => p.relevance_score >= 20)
    .sort((a, b) => b.relevance_score - a.relevance_score)
    .slice(0, 4);

  // 3. Rank Technicians for Dispatch (Workload + SLA Breaches + Category Mastery + Specialty)
  const now = Date.now();
  const targetCatId = toIdStr(equipment?.category_id);
  const isCriticalTicket = (repair?.damage_level || localAnalysis.severity) === DAMAGE_LEVELS.CRITICAL;

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

    const deptLower = normalizeVietnameseText(tech.department || '');
    const deptMatch = catMeta.deptKeywords.some((kw) => deptLower.includes(kw));

    const activePenalty = isCriticalTicket ? activeForTech.length * 18 : activeForTech.length * 14;
    const rawScore = 85 - activePenalty - overdueForTech.length * 22 + Math.min(16, similarResolved * 5) + (deptMatch ? 9 : 0);
    const score = Math.max(10, Math.min(99, rawScore));

    const reasons = [];
    reasons.push(`Đang xử lý ${activeForTech.length} phiếu`);
    if (overdueForTech.length > 0) reasons.push(`${overdueForTech.length} phiếu quá hạn SLA`);
    else reasons.push('0 quá hạn SLA');
    if (similarResolved > 0) reasons.push(`đã xử lý ${similarResolved} ca cùng nhóm thiết bị`);
    else if (deptMatch) reasons.push(`đúng chuyên môn (${tech.department})`);

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
  const eqNameWords = normalizeVietnameseText(equipment?.name || '').split(/\s+/).filter((w) => w.length >= 3);
  const scoredReplacements = (Array.isArray(spareEquipments) ? spareEquipments : []).filter((spEq) =>
    spEq.status === 'in_stock' && toIdStr(spEq._id) !== toIdStr(equipment._id)
    && targetCatId && toIdStr(spEq.category_id) === targetCatId
  ).map((spEq) => {
    let matchScore = 50;
    const spName = normalizeVietnameseText(spEq.name || '');
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
  const suggestedDamageLevel = repair?.damage_level || localAnalysis.severity || DAMAGE_LEVELS.MINOR;
  const suggestedDeadline = (repair?.deadline ? new Date(repair.deadline) : computeDeadline(suggestedDamageLevel, new Date())).toISOString();

  // 5. Progressive Step-Aware Log Drafting (adapts to existing RepairLogs on this ticket!)
  let rootCause = playbook.rootCause;
  if (historicalInsights.chronic_pattern?.recurring_same_symptom) {
    rootCause += ` (Lưu ý lịch sử: Đã tái phát lỗi tương tự trên tài sản này — cần xử lý triệt để nguyên nhân gốc).`;
  }
  let troubleshootingSteps = [...playbook.steps];

  const stepIdx = Math.min(troubleshootingSteps.length - 1, historicalInsights.completed_steps_count);
  const currentFocusStep = troubleshootingSteps[stepIdx] || troubleshootingSteps[0];
  const stepStageLabel = historicalInsights.completed_steps_count === 0
    ? 'Khảo sát & đo kiểm bước đầu'
    : historicalInsights.completed_steps_count === 1
      ? 'Xử lý kỹ thuật & thay thế vật tư'
      : 'Kiểm tra ổn định trước nghiệm thu';

  let suggestedLogAction = `${stepStageLabel}: ${playbook.title}`;
  if (suggestedLogAction.length > 180) {
    suggestedLogAction = suggestedLogAction.slice(0, 180);
  }
  let suggestedLogNotes = `Kế hoạch thực hiện tại ${room?.code || 'hiện trường'}: ${currentFocusStep} Ghi nhận thông số thực tế trước khi lưu nhật ký.`;
  const suggestedOutcome = repair?.outcome || null;
  const suggestedOutcomeNotes = `Cần xác nhận kết quả khắc phục "${playbook.title}" của ${equipment?.name || 'thiết bị'}${equipment?.code ? ` (${equipment.code})` : ''} tại thực địa trước khi nghiệm thu.${shouldConsiderDisposal ? ' Đối chiếu chi phí sửa chữa và đánh giá phương án thanh lý theo quy trình RACI.' : ''}`;

  let engine = 'domain_heuristic';
  const llm = await callGeminiJson(
    'Bạn là Kỹ sư Trưởng CSVC Đại học (Ruo UEMS). Trả về JSON gồm: root_cause (giả thuyết nguyên nhân, cần xác minh), troubleshooting_steps (mảng 3 bước kiểm tra an toàn), suggested_log_action (tiêu đề kế hoạch kiểm tra), suggested_log_notes (gợi ý thông tin cần ghi nhận). LƯU Ý VẬT LÝ: Nếu is_electrical=false (bàn ghế, tủ kệ, rèm, bình PCCC), tuyệt đối không chẩn đoán lỗi nguồn điện/bo mạch. Không khẳng định đã sửa xong hay không thể sửa khi chưa có bằng chứng. Không thay đổi số liệu tài chính.',
    {
      ticket_code: repair?.ticket_code,
      damage_level: suggestedDamageLevel,
      incident_description: desc,
      is_electrical: entityInfo.effectiveIsElectrical,
      category: effectiveCategory,
      room: { code: room?.code, name: room?.name },
      equipment: { code: equipment?.code, name: equipment?.name, brand: equipment?.brand, model: equipment?.model, repair_count: repairCount, r_ratio: rRatio },
      recent_history_count: equipmentHistory.length,
      recent_logs_count: logs.length,
      should_consider_disposal: shouldConsiderDisposal
    }
  );

  if (llm) {
    const llmViolatesPhysics = !entityInfo.effectiveIsElectrical
      && /nguồn điện|cầu dao|aptomat|bo mạch|phích cắm/iu.test(`${llm.root_cause || ''} ${(llm.troubleshooting_steps || []).join(' ')}`);

    if (!llmViolatesPhysics) {
      if (aiText(llm.root_cause, 9)) {
        rootCause = aiText(llm.root_cause, 9);
        engine = 'gemini';
      }
      if (aiList(llm.troubleshooting_steps, 2)) {
        troubleshootingSteps = aiList(llm.troubleshooting_steps, 2);
        engine = 'gemini';
      }
      if (aiText(llm.suggested_log_action, 1, 200)) {
        suggestedLogAction = aiText(llm.suggested_log_action, 1, 200);
        engine = 'gemini';
      }
      if (aiText(llm.suggested_log_notes)) {
        suggestedLogNotes = `Gợi ý cần xác minh trước khi ghi nhận: ${aiText(llm.suggested_log_notes)}`;
        engine = 'gemini';
      }
    }
  }

  return {
    engine,
    engine_label: engine === 'gemini' ? 'Gemini Hybrid + Ruo Physics Guard' : 'Ruo Cortex Local AI v2.5',
    diagnosis: {
      playbook_id: playbook.id,
      playbook_title: playbook.title,
      category_code: effectiveCategory,
      is_electrical: entityInfo.effectiveIsElectrical,
      root_cause: rootCause,
      troubleshooting_steps: troubleshootingSteps,
      suggested_log_action: suggestedLogAction,
      suggested_log_notes: suggestedLogNotes,
      suggested_outcome: suggestedOutcome,
      suggested_outcome_notes: suggestedOutcomeNotes
    },
    historical_insights: historicalInsights,
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
  const isZombie = (log) => {
    if (log.status === 'missing') return false;
    const note = String(log.note || '');
    return note.includes('ĐÃ THANH LÝ') || note.includes('DISPOSED');
  };

  // Detect Zombie Disposed Assets
  const zombieAssets = safeLogs
    .filter(isZombie)
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

  const allWrongLocationFlows = wrongLocLogs.map((l) => ({
    code: l.equipment_id?.code || 'N/A',
    name: l.equipment_id?.name || 'Thiết bị',
    from_room: l.equipment_id?.room_id?.code || 'KHO-01 (Kho dự phòng)',
    to_room: l.scanned_room_id?.code || 'N/A',
    is_zombie: isZombie(l)
  }));
  const wrongLocationFlows = allWrongLocationFlows.slice(0, 6);

  // Detect anomalous missing fixed-installation assets (ceiling AC, wall cabinet, server, access door)
  const fixedMountMissing = missingLogs.filter((l) =>
    /điều hòa|cassette|tủ điện|tủ báo cháy|khóa từ|server|máy chiếu|camera ốp trần|họng nước/iu.test(l.equipment_id?.name || '')
  );

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
      severity: missingValueVnd >= 10_000_000 || missingLogs.length >= 3 || fixedMountMissing.length > 0 ? 'high' : 'medium',
      title: `${missingLogs.length} tài sản vắng mặt / thất lạc (${missingValueVnd.toLocaleString('vi-VN')} đ)`,
      detail: `Tổng nguyên giá tài sản chưa tìm thấy đạt ${missingValueVnd.toLocaleString('vi-VN')} VNĐ.${fixedMountMissing.length > 0 ? ` Đáng chú ý có ${fixedMountMissing.length} thiết bị lắp cố định trần/tường bị báo thiếu — cần kiểm tra phiếu tháo dỡ bảo hành.` : ' Tập trung kiểm tra biên bản bàn giao hoặc lệnh điều chuyển chưa xác nhận.'}`,
      affected_codes: missingLogs.slice(0, 6).map((l) => l.equipment_id?.code).filter(Boolean)
    });
  }

  const nonZombieWrong = allWrongLocationFlows.filter((f) => !f.is_zombie);
  if (nonZombieWrong.length > 0) {
    findings.push({
      severity: 'medium',
      title: `${nonZombieWrong.length} thiết bị di chuyển tự phát sai phòng sổ sách`,
      detail: `Phát hiện dịch chuyển thực tế chưa cập nhật phiếu điều chuyển (VD: ${nonZombieWrong.slice(0, 3).map((f) => `${f.code}: ${f.from_room} → ${f.to_room}`).join('; ')}).`,
      affected_codes: nonZombieWrong.slice(0, 6).map((f) => f.code)
    });
  }

  if (damagedLogs.length > 0) {
    findings.push({
      severity: 'medium',
      title: `${damagedLogs.length} thiết bị phát hiện hư hỏng tại thực địa`,
      detail: 'Kiểm tra phiếu sửa chữa liên kết và phân công kỹ thuật viên khắc phục theo SLA.',
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
  } else if (missingLogs.length >= 2 || missingValueVnd >= 5_000_000 || fixedMountMissing.length > 0) {
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
    recommendations.push(`Rà soát lịch sử mượn/tháo sửa chữa tại ${hotspotsByRoom[0]?.room_code || 'các phòng trọng điểm'} trước khi trình BGH ký biên bản thất lạc.`);
  }
  if (damagedLogs.length > 0) {
    recommendations.push(`Đối chiếu phiếu sửa chữa cho ${damagedLogs.length} thiết bị hư hỏng và theo dõi tiến độ xử lý theo SLA.`);
  }
  if (safeUnscanned.length > 0 && session?.status !== 'reconciled') {
    recommendations.push(`Hoàn tất quét QR ${safeUnscanned.length} thiết bị còn lại trong tab "Danh Sách Sổ Sách Chưa Quét" trước khi chốt sổ SHA-256.`);
  }
  if (recommendations.length === 0) {
    recommendations.push(safeLogs.length > 0
      ? 'Chưa ghi nhận sai lệch trong dữ liệu đã kiểm tra; đối chiếu phạm vi kiểm kê trước khi chốt biên bản.'
      : 'Chưa có bản ghi kiểm kê; kiểm tra phạm vi và thực hiện quét QR trước khi đánh giá kết quả.');
  }

  let executiveSummary = zombieAssets.length > 0
    ? `Cảnh báo kiểm toán mức KHẨN CẤP trên đợt "${session?.name || ''}": Phát hiện ${zombieAssets.length} tài sản đã thanh lý vẫn tồn tại thực địa và ${missingLogs.length} tài sản thất lạc (rủi ro ${missingValueVnd.toLocaleString('vi-VN')} VNĐ).`
    : missingLogs.length > 0 || wrongLocLogs.length > 0 || damagedLogs.length > 0
      ? `Đợt kiểm kê "${session?.name || ''}" ghi nhận ${matchedLogs.length} khớp chuẩn, ${wrongLocLogs.length} sai phòng, ${missingLogs.length} thất lạc (${missingValueVnd.toLocaleString('vi-VN')} VNĐ) và ${damagedLogs.length} hỏng hóc cần xử lý trước khi ký số.`
      : safeUnscanned.length > 0
        ? `Đợt kiểm kê "${session?.name || ''}" có ${matchedLogs.length} tài sản khớp chuẩn, còn ${safeUnscanned.length} thiết bị chưa quét; chưa đủ dữ liệu để kết luận hoàn tất đối soát.`
        : safeLogs.length > 0
          ? `Đợt kiểm kê "${session?.name || ''}" ghi nhận ${matchedLogs.length} tài sản khớp chuẩn, chưa phát hiện sai lệch trong dữ liệu đã kiểm tra.`
          : `Đợt kiểm kê "${session?.name || ''}" chưa có bản ghi quét để đánh giá.`;

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
    if (safeUnscanned.length === 0 && zombieAssets.length === 0 && aiText(llm.executive_summary, 16)) {
      executiveSummary = aiText(llm.executive_summary, 16);
      engine = 'gemini';
    }
    if (aiList(llm.recommendations, 2)) {
      recommendations = [...new Set([...recommendations, ...aiList(llm.recommendations, 2)])].slice(0, 7);
      engine = 'gemini';
    }
  }

  return {
    engine,
    engine_label: engine === 'gemini' ? 'Gemini Hybrid + Ruo Auditor' : 'Ruo Cortex Local AI v2.5',
    risk_level: riskLevel,
    health_score: healthScore,
    executive_summary: executiveSummary,
    metrics: {
      expected_count: expectedCount,
      completion_percent: expectedCount > 0
        ? Math.max(0, Math.min(100, Math.round(((expectedCount - safeUnscanned.length) / expectedCount) * 100)))
        : 0,
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
  const vnTime = new Date(d.getTime() + 7 * 60 * 60 * 1000);
  const vnDay = vnTime.getUTCDay();
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

  // 5. Privilege Escalation + Destructive Action Correlation
  if (rbacLogs.length > 0 && destructiveLogs.length > 0) {
    const rbacActors = new Set(rbacLogs.map((l) => toIdStr(l.user_id) || l.user_display).filter(Boolean));
    const correlated = destructiveLogs.filter((d) => rbacActors.has(toIdStr(d.user_id) || d.user_display));
    if (correlated.length > 0) {
      anomalies.push({
        severity: 'high',
        category: 'PRIVILEGE_CHAIN',
        title: 'Chuỗi thao tác kết hợp: Sửa quyền RBAC đi kèm Xóa/Thanh lý tài sản',
        detail: 'Cùng một tác nhân thực hiện thay đổi cấu hình quyền hạn và tác vụ xóa/thanh lý tài sản trong cùng phiên kiểm toán; cần xác minh chéo độc lập.',
        seq_refs: [...rbacLogs.slice(0, 2), ...correlated.slice(0, 3)].map((l) => l.seq).filter(Boolean)
      });
    }
  }

  // 6. Off-Hours Sensitive Operations (outside 07:30-17:00 Mon-Fri UTC+7)
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

  // 7. Actor Burst / High-Velocity Concentration
  const actorLogs = new Map();
  for (const l of safeLogs) {
    if (!SENSITIVE_AUDIT_ACTIONS.has(l.action)) continue;
    const timestamp = new Date(l.hashed_at || l.created_at).getTime();
    if (!Number.isFinite(timestamp)) continue;
    const actorKey = toIdStr(l.user_id) || `display:${l.user_display || 'Hệ Thống'}`;
    if (!actorLogs.has(actorKey)) actorLogs.set(actorKey, []);
    actorLogs.get(actorKey).push({ log: l, timestamp });
  }
  for (const entries of actorLogs.values()) {
    entries.sort((a, b) => a.timestamp - b.timestamp);
    let start = 0;
    let peak = [];
    for (let end = 0; end < entries.length; end += 1) {
      while (entries[end].timestamp - entries[start].timestamp > 5 * 60 * 1000) start += 1;
      if (end - start + 1 > peak.length) peak = entries.slice(start, end + 1);
    }
    if (peak.length >= 5) {
      const actor = peak[0].log.user_display || peak[0].log.user_id?.full_name || 'Hệ Thống';
      anomalies.push({
        severity: 'medium',
        category: 'ACTOR_BURST',
        title: `Tần suất thao tác nhạy cảm cao từ "${actor}" (${peak.length} lệnh / 5 phút)`,
        detail: `Tài khoản "${actor}" thực hiện ${peak.length} thay đổi trọng yếu trong vòng 5 phút; cần đối chiếu hoạt động được phê duyệt.`,
        seq_refs: peak.slice(0, 6).map(({ log }) => log.seq).filter(Boolean)
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
  if (destructiveLogs.length > 0) {
    recommendations.push('Đối chiếu hồ sơ phê duyệt và dữ liệu trước/sau của các thao tác xóa, thanh lý hoặc đặt lại cấu hình.');
  }
  if (anomalies.some((anomaly) => anomaly.category === 'ACTOR_BURST')) {
    recommendations.push('Xác minh các thao tác tập trung trong 5 phút có thuộc một đợt xử lý được phê duyệt hay không.');
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
    if (chainValid && aiText(llm.executive_summary, 16)) {
      executiveSummary = aiText(llm.executive_summary, 16);
      engine = 'gemini';
    }
    if (aiList(llm.recommendations, 2)) {
      recommendations = [...new Set([...recommendations, ...aiList(llm.recommendations, 2)])].slice(0, 7);
      engine = 'gemini';
    }
  }

  return {
    engine,
    engine_label: engine === 'gemini' ? 'Gemini Hybrid + Ruo CSO' : 'Ruo Cortex Local AI v2.5',
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
  getLocalAiTrainingStats,
  buildIncidentTriage,
  buildRepairCopilot,
  buildInventoryDiscrepancyAnalysis,
  buildAuditAnomalyAnalysis
};
