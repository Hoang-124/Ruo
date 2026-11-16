import mongoose from 'mongoose';
import {
  Room,
  Equipment,
  SparePart,
  Repair,
  User,
  Category
} from '../models/index.js';
import {
  stripDiacritics,
  normalizeVietnameseText,
  hasWholePhrase
} from './ai/vietnameseNlp.js';
import {
  CATEGORY_ONTOLOGY,
  SAFETY_PROTOCOLS,
  FAULT_PLAYBOOKS
} from './ai/facilityKnowledgeCorpus.js';
import {
  classifyIncidentLocally,
  detectCriticalSafetyHazard,
  retrieveBestPlaybook
} from './ai/localClassifier.js';

/**
 * Universal Cloud LLM Connector (Google Gemini / OpenAI / Groq)
 * When an API key is present in server/.env, queries are routed to the cloud LLM
 * with full conversational understanding, semantic nuance, and live database context.
 */
export async function callCloudLlm({ systemPrompt, userMessage, chatHistory = [] }) {
  const geminiKey = (process.env.GEMINI_API_KEY || '').trim();
  const openaiKey = (process.env.OPENAI_API_KEY || '').trim();
  const groqKey = (process.env.GROQ_API_KEY || '').trim();

  // 1. Google Gemini API (gemini-3-flash-preview)
  if (geminiKey) {
    try {
      const model = (process.env.GEMINI_MODEL || '').trim() || 'gemini-3-flash-preview';
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(geminiKey)}`;

      const contents = [];
      for (const h of chatHistory.slice(-4)) {
        if (!h.content) continue;
        contents.push({
          role: h.sender_role === 'ai' ? 'model' : 'user',
          parts: [{ text: String(h.content).slice(0, 500) }]
        });
      }
      contents.push({
        role: 'user',
        parts: [{ text: userMessage }]
      });

      const res = await globalThis.fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: systemPrompt }]
          },
          contents,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1200
          }
        }),
        signal: AbortSignal.timeout(9000)
      });

      if (res.ok) {
        const body = await res.json();
        const text = body?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text && text.trim()) {
          return { text: text.trim(), provider: 'gemini' };
        }
      } else {
        const errBody = await res.text().catch(() => '');
        console.warn('Gemini API returned error status:', res.status, errBody.slice(0, 150));
      }
    } catch (err) {
      console.warn('Gemini API call failed, falling back to local engine:', err.message);
    }
  }

  // 2. OpenAI API (gpt-4o-mini / gpt-3.5-turbo)
  if (openaiKey) {
    try {
      const model = (process.env.OPENAI_MODEL || '').trim() || 'gpt-4o-mini';
      const messages = [
        { role: 'system', content: systemPrompt },
        ...chatHistory.slice(-4).map((h) => ({
          role: h.sender_role === 'ai' ? 'assistant' : 'user',
          content: String(h.content).slice(0, 500)
        })),
        { role: 'user', content: userMessage }
      ];

      const res = await globalThis.fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openaiKey}`
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: 0.7,
          max_tokens: 1200
        }),
        signal: AbortSignal.timeout(9000)
      });

      if (res.ok) {
        const body = await res.json();
        const text = body?.choices?.[0]?.message?.content;
        if (text && text.trim()) {
          return { text: text.trim(), provider: 'openai' };
        }
      }
    } catch (err) {
      console.warn('OpenAI API call failed, falling back:', err.message);
    }
  }

  // 3. Groq API (llama-3.3-70b-versatile)
  if (groqKey) {
    try {
      const model = (process.env.GROQ_MODEL || '').trim() || 'llama-3.3-70b-versatile';
      const messages = [
        { role: 'system', content: systemPrompt },
        ...chatHistory.slice(-4).map((h) => ({
          role: h.sender_role === 'ai' ? 'assistant' : 'user',
          content: String(h.content).slice(0, 500)
        })),
        { role: 'user', content: userMessage }
      ];

      const res = await globalThis.fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${groqKey}`
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: 0.7,
          max_tokens: 1200
        }),
        signal: AbortSignal.timeout(9000)
      });

      if (res.ok) {
        const body = await res.json();
        const text = body?.choices?.[0]?.message?.content;
        if (text && text.trim()) {
          return { text: text.trim(), provider: 'groq' };
        }
      }
    } catch (err) {
      console.warn('Groq API call failed, falling back:', err.message);
    }
  }

  return null;
}

// =========================================================================
// VOCABULARY & INTENT DETECTOR PATTERNS
// =========================================================================
const CHITCHAT_PATTERNS = [
  /chạy bộ|di bo|di dao|chay bo|chay tap|the duc|dap xe|gym/i,
  /an com|an trua|an toi|uong cafe|ca phe|nghi ngoi|ngu trua|buon ngu|met qua|met moi/i,
  /^(chào|xin chào|hello|hi|alo|hé lô|hey|chao ban|hi ban)\b/i,
  /bạn là ai|ban la ai|ten gi|ai tao ra|gioi thieu/i,
  /bạn (có thể )?làm (được )?(những )?(việc|gì|gì nào)|ban lam duoc gi|chức năng|tính năng|hỗ trợ được gì|hướng dẫn sử dụng|làm được gì/i,
  /bạn biết gì|bạn có thể giúp gì/i,
  /chúc|vui vẻ|khỏe không|khoe khong/i,
  /cảm ơn|cam on|thank|tuyệt vời|tot lam|hay qua/i,
  /tạm biệt|tam biet|bye|hen gap lai/i,
  /thời tiết|troi mua|troi nang|ke chuyen/i
];

const EQUIPMENT_KEYWORDS = [
  'tivi', 'tv', 'smart tivi', 'smart tv', 'máy chiếu', 'projector', 'bóng chiếu', 'thấu kính', 'màn chiếu', 'standee',
  'điều hòa', 'máy lạnh', 'cassette', 'dàn lạnh', 'dàn nóng', 'quạt thông gió', 'quạt hút', 'quạt',
  'loa', 'micro', 'mic', 'trợ giảng', 'amply', 'mixer', 'cục đẩy',
  'máy tính', 'pc', 'laptop', 'thùng máy', 'màn hình', 'bàn phím', 'chuột', 'máy chủ', 'server', 'nas',
  'wifi', 'mạng', 'switch', 'router', 'cáp mạng', 'dây mạng', 'rj45', 'aruba',
  'camera', 'cctv', 'đầu ghi', 'nvr', 'khóa từ', 'cửa từ', 'đầu đọc thẻ', 'vân tay',
  'máy in', 'máy photo', 'máy scan', 'máy hủy', 'cây nước', 'máy lọc nước',
  'đèn', 'bóng đèn', 'chấn lưu', 'aptomat', 'rcbo', 'mcb', 'ổ cắm', 'công tắc',
  'bình chữa cháy', 'vòi chữa cháy', 'chuông báo cháy',
  'bàn', 'ghế', 'rèm', 'tủ', 'kệ', 'cửa'
];

const FAULT_KEYWORDS = [
  'không lên nguồn', 'mất nguồn', 'tắt ngúm', 'không vào điện', 'không sáng', 'bật không lên', 'chết nguồn',
  'không lên hình', 'mất hình', 'màn hình đen', 'sọc màn hình', 'kẻ sọc', 'vỡ màn', 'tối màn', 'loang màu',
  'không nhận tín hiệu', 'no signal', 'mất tín hiệu', 'không kết nối',
  'đèn đỏ', 'báo đỏ', 'nhấp nháy đỏ', 'lamp đỏ', 'temp đỏ', 'quá nhiệt', 'nóng quá', 'tự tắt',
  'kẹt cuộn', 'không hạ xuống', 'không cuộn lên', 'kẹt màn',
  'không mát', 'mất lạnh', 'thổi gió nóng', 'chảy nước', 'nhỏ nước', 'rỉ nước', 'kêu to', 'kêu rít', 'hôi',
  'hú rít', 'hú', 'rè', 'mất tiếng', 'chập chờn', 'hết pin', 'chai pin', 'chai ắc quy',
  'màn hình xanh', 'bsod', 'kêu bíp', 'không vào win', 'liệt', 'kẹt phím',
  'mất wifi', 'mất mạng', 'sóng yếu', 'chậm', 'lag', 'rớt mạng',
  'kẹt giấy', 'hết mực', 'in mờ', 'sọc đen', 'không ra nước',
  'cháy bóng', 'nhấp nháy', 'nhảy aptomat', 'chập chờn', 'tụt áp',
  'gãy chân', 'sập', 'bung', 'kẹt khóa', 'không mở được', 'rách',
  'hỏng', 'bị hư', 'hư hỏng', 'trục trặc', 'báo lỗi'
];

/**
 * Intelligent Room-to-Equipment matcher
 */
export function findMatchingEquipmentInRoom(equipments, text) {
  if (!equipments || equipments.length === 0) return null;
  const lower = String(text || '').toLowerCase();
  const ascii = stripDiacritics(lower);

  // If query is a general inquiry about what's in the room, do not match single equipment
  if (/có (những |các )?thiết bị gì|có gì|danh sách|toàn bộ|tổng số|các trang thiết bị/i.test(lower)) {
    return null;
  }

  const patterns = [
    { type: 'tv', re: /\b(tivi|tv|smart tv|smart tivi|man hinh tivi)\b/i, eqRe: /tivi|tv|smart tv/i },
    { type: 'projector', re: /\b(may chieu|máy chiếu|projector|bong chieu)\b/i, eqRe: /máy chiếu|projector/i },
    { type: 'screen', re: /\b(man chieu|màn chiếu|rem chieu)\b/i, eqRe: /màn chiếu/i },
    { type: 'ac', re: /\b(dieu hoa|điều hòa|may lanh|máy lạnh|cassette|dan lanh)\b/i, eqRe: /điều hòa|máy lạnh|cassette/i },
    { type: 'audio', re: /\b(loa|am thanh|âm thanh|amply|mixer|cuc day)\b/i, eqRe: /loa|âm thanh|amply/i },
    { type: 'mic', re: /\b(micro|mic|tro giang|trợ giảng)\b/i, eqRe: /micro|mic/i },
    { type: 'pc', re: /\b(may tinh|máy tính|pc|laptop|thung may)\b/i, eqRe: /máy tính|pc|laptop/i },
    { type: 'net', re: /\b(wifi|mạng|mang|switch|router|access point|aruba)\b/i, eqRe: /wifi|switch|router|mạng/i },
    { type: 'cam', re: /\b(camera|cctv|cam dome)\b/i, eqRe: /camera/i },
    { type: 'light', re: /\b(den|đèn|chieu sang|chiếu sáng|bong den|bóng đèn)\b/i, eqRe: /đèn|led|panel/i },
    { type: 'desk', re: /\b(ban|bàn|ghe|ghế|noi that|nội thất)\b/i, eqRe: /bàn|ghế/i },
    { type: 'curtain', re: /\b(rem|rèm|man cua|màn cửa)\b/i, eqRe: /rèm/i },
    { type: 'fire', re: /\b(pccc|bao chay|báo cháy|chua chay|chữa cháy|khoi|khói)\b/i, eqRe: /báo cháy|khói|chữa cháy/i }
  ];

  for (const p of patterns) {
    if (p.re.test(lower) || p.re.test(ascii)) {
      const match = equipments.find((e) => p.eqRe.test(e.name) || p.eqRe.test(e.category_id?.name || '') || p.eqRe.test(e.code));
      if (match) return match;
    }
  }

  const STOPWORDS = new Set(['thiết', 'bị', 'phòng', 'tại', 'trong', 'đang', 'cho', 'của', 'các', 'những', 'này', 'nào', 'chung', 'toàn']);
  for (const eq of equipments) {
    const eqNameLower = (eq.name || '').toLowerCase();
    const words = eqNameLower.split(/\s+/).filter((w) => w.length >= 3 && !STOPWORDS.has(w));
    if (words.some((w) => lower.includes(w))) {
      return eq;
    }
  }

  return null;
}

/**
 * Main AI Query Handler
 */
export const processAiChatQuery = async ({ content, user, chatHistory = [] }) => {
  const rawText = String(content || '').trim();
  const lowerQ = rawText.toLowerCase();
  const normQ = normalizeVietnameseText(rawText);
  const asciiQ = stripDiacritics(normQ);

  // =========================================================================
  // PRIORITY 1: CRITICAL SAFETY HAZARD & EMERGENCY PROTOCOL
  // =========================================================================
  const hazard = detectCriticalSafetyHazard({
    rawDescription: rawText,
    effectiveCategory: 'CAT-POWER',
    effectiveIsElectrical: true,
    hasExplicitElectricalContext: true
  });

  if (hazard) {
    const proto = hazard.protocol;
    const responseText = `**[CẢNH BÁO AN TOÀN KHẨN CẤP]**\n\n` +
      `Hệ thống phát hiện dấu hiệu nguy hiểm: **${proto.label || hazard.trigger}**.\n\n` +
      `**HÀNH ĐỘNG CẦN THỰC HIỆN NGAY LẬP TỨC:**\n` +
      `1. **Cắt nguồn điện / Cô lập khu vực:** ` +
      (proto.id === 'CLASS_C_ELECTRICAL_FIRE'
        ? `Ngắt ngay cầu dao/Aptomat nhánh phòng tại tủ điện hành lang. Tuyệt đối KHÔNG chạm tay trần vào dây dẫn hoặc phích cắm đang nóng chảy.`
        : proto.id === 'WATER_FLOOD_HAZARD'
        ? `Khóa van cấp nước tổng tầng, ngắt điện các ổ cắm sàn/thiết bị thấp để tránh chập điện chéo.`
        : `Sơ tán toàn bộ sinh viên và giảng viên ra khỏi khu vực nguy hiểm.`) + `\n` +
      `2. **Biện pháp xử lý tại chỗ:** ` +
      (proto.quickChecks?.[0] || `Sử dụng bình chữa cháy khí CO2 (MT3/MT5) hoặc bình bột ABC sau khi đã ngắt điện. Tuyệt đối KHÔNG tạt nước vào thiết bị điện.`) + `\n` +
      `3. **Đường dây nóng khẩn cấp:** Báo ngay cho Tổ Kỹ Thuật Trực Ban Tòa Nhà A1 (Hotline: 028.3844.xxxx) và kích hoạt phiếu báo hỏng khẩn cấp (SLA xử lý trong 4 giờ).`;

    const cardData = {
      type: 'emergency_hazard',
      protocol_id: proto.id,
      severity: 'critical',
      quick_action: { label: 'Báo Hỏng Khẩn Cấp (SLA 4h)', tab: 'report_issue' }
    };

    return { responseText, cardData };
  }

  // =========================================================================
  // PRIORITY 2: SPECIFIC REPAIR TICKET LOOKUP (VD: "REP-MWA3ESWN-694")
  // =========================================================================
  const ticketMatch = rawText.match(/REP-[A-Z0-9-]+/i);
  if (ticketMatch) {
    const ticketCode = ticketMatch[0].toUpperCase();
    const repair = await Repair.findOne({ ticket_code: ticketCode })
      .populate('equipment_id', 'code name brand model')
      .populate('room_id', 'code name building floor')
      .populate('assigned_to', 'full_name code phone email')
      .populate('reported_by', 'full_name code');

    if (repair) {
      const statusMap = {
        reported: 'Chờ Tiếp Nhận (Mới)',
        assigned: 'Đã Phân Công KTV',
        in_progress: 'Đang Tiến Hành Sửa Chữa',
        resolved: 'Đã Sửa Xong (Chờ Nghiệm Thu)',
        closed: 'Hoàn Tất & Đóng Phiếu',
        unrepairable: 'Không Thể Sửa (Chờ Thanh Lý)'
      };

      const isOverdue = repair.deadline && new Date(repair.deadline) < new Date() && !['resolved', 'closed'].includes(repair.status);
      const deadlineStr = repair.deadline ? new Date(repair.deadline).toLocaleString('vi-VN') : 'Chưa thiết lập';

      const responseText = `**[Thông Tin Phiếu Sửa Chữa] [${repair.ticket_code}]**:\n` +
        `- **Thiết bị:** ${repair.equipment_id?.name || 'Chưa xác định'} (${repair.equipment_id?.code || ''})\n` +
        `- **Vị trí:** ${repair.room_id?.name || ''} (${repair.room_id?.code || ''}) - Tầng ${repair.room_id?.floor || 1}\n` +
        `- **Hiện tượng sự cố:** ${repair.incident_description || 'Không có mô tả'}\n` +
        `- **Mức độ:** ${repair.damage_level === 'critical' ? 'Khẩn cấp' : repair.damage_level === 'major' ? 'Hỏng nặng' : 'Hỏng nhẹ'}\n` +
        `- **Trạng thái:** **${statusMap[repair.status] || repair.status}**\n` +
        `- **Kỹ thuật viên phụ trách:** ${repair.assigned_to?.full_name ? `${repair.assigned_to.full_name} (${repair.assigned_to.code})` : 'Chưa phân công'}\n` +
        `- **Hạn chót SLA:** ${deadlineStr} ${isOverdue ? '**[QUÁ HẠN SLA!]**' : '[Đúng hạn]'}\n` +
        `- **Chi phí sửa chữa ghi nhận:** ${Number(repair.total_cost || 0).toLocaleString('vi-VN')} đ`;

      const cardData = {
        type: 'repair_detail',
        ticket_code: repair.ticket_code,
        status: repair.status,
        quick_action: { label: 'Xem Bảng Điều Phối Kanban', tab: 'tickets_kanban' }
      };

      return { responseText, cardData };
    }
  }

  // =========================================================================
  // PRIORITY 3: SPECIFIC EQUIPMENT CODE LOOKUP (VD: "EQ-209-SCRELEC-01")
  // =========================================================================
  const eqMatch = rawText.match(/EQ-[A-Z0-9-]+/i);
  if (eqMatch) {
    const eqCode = eqMatch[0].toUpperCase();
    const eq = await Equipment.findOne({ code: eqCode })
      .populate('room_id', 'code name floor')
      .populate('category_id', 'code name');

    if (eq) {
      const statusLabels = {
        in_use: 'Đang hoạt động tốt',
        broken: 'Đang báo hỏng',
        repairing: 'Đang trong ca sửa chữa',
        in_stock: 'Đang trong kho dự phòng',
        disposed: 'Đã thanh lý',
        lost: 'Thất lạc'
      };

      const repairRatio = eq.price > 0 ? Math.round(((eq.estimated_repair_cost || 0) / eq.price) * 100) : 0;

      const responseText = `**[Hồ Sơ Thiết Bị] [${eq.code}]**:\n` +
        `- **Tên thiết bị:** ${eq.name}\n` +
        `- **Phân loại:** ${eq.category_id?.name || 'Thiết bị'} • **Thương hiệu:** ${eq.brand || 'N/A'} ${eq.model || ''}\n` +
        `- **Vị trí hiện tại:** ${eq.room_id ? `${eq.room_id.name} (${eq.room_id.code})` : 'Kho dự phòng KHO-01'}\n` +
        `- **Trạng thái:** **${statusLabels[eq.status] || eq.status}**\n` +
        `- **Nguyên giá:** ${Number(eq.price || 0).toLocaleString('vi-VN')} đ • **Giá trị còn lại:** ${Number(eq.remaining_value || 0).toLocaleString('vi-VN')} đ\n` +
        `- **Số lần sửa chữa:** ${eq.repair_count || 0} lần (Chi phí tích lũy: ${Number(eq.estimated_repair_cost || 0).toLocaleString('vi-VN')} đ - Tỷ lệ hao mòn R: ${repairRatio}%)\n` +
        (repairRatio >= 60 ? `**Cảnh báo:** Tỷ lệ chi phí sửa chữa R = ${repairRatio}% ≥ 60%. Đủ điều kiện đưa vào Hội đồng thanh lý tài sản.` : `[Đúng hạn] Thiết bị đủ điều kiện tiếp tục khai thác sử dụng.`);

      const cardData = {
        type: 'equipment_detail',
        equipment_code: eq.code,
        status: eq.status,
        quick_action: { label: 'Tra Cứu Danh Mục Thiết Bị', tab: 'equipments' }
      };

      return { responseText, cardData };
    }
  }

  // =========================================================================
  // PRIORITY 4: ROOM & EQUIPMENT IN ROOM / INCIDENT IN ROOM QUERY
  // =========================================================================
  const roomPattern = rawText.match(/A1-\w+|phòng\s*(\d{3})/i);
  if (roomPattern) {
    let roomCode = '';
    if (roomPattern[0].toUpperCase().startsWith('A1-')) {
      roomCode = roomPattern[0].toUpperCase();
    } else if (roomPattern[1]) {
      roomCode = `A1-${roomPattern[1]}`;
    }

    const targetRoom = await Room.findOne({ code: new RegExp(`^${roomCode}$`, 'i') });
    if (targetRoom) {
      const roomEquipments = await Equipment.find({ room_id: targetRoom._id }).populate('category_id', 'code name');
      const brokenList = roomEquipments.filter((e) => ['broken', 'repairing'].includes(e.status));
      const inUseList = roomEquipments.filter((e) => e.status === 'in_use');

      // Check if user is reporting an incident or asking about a specific equipment in this room
      const hasFaultContext = FAULT_KEYWORDS.some((kw) => hasWholePhrase(lowerQ, kw) || hasWholePhrase(asciiQ, stripDiacritics(kw)))
        || /hỏng|hư|lỗi|cháy|chập|sự cố|mất|kẹt|không|báo hỏng|sửa|thay|khắc phục|tắt|mở|bật|yếu|rè|hú|mờ/i.test(lowerQ);

      const matchedEq = findMatchingEquipmentInRoom(roomEquipments, rawText);

      // SUB-CASE 4A: Incident report or technical troubleshooting for equipment in this room
      if (hasFaultContext || (matchedEq && (lowerQ.includes('sao') || lowerQ.includes('thế nào') || lowerQ.includes('kiểm tra')))) {
        // Check for existing open repair ticket for this equipment or room
        const openRepair = await Repair.findOne({
          room_id: targetRoom._id,
          ...(matchedEq ? { equipment_id: matchedEq._id } : {}),
          status: { $in: ['reported', 'assigned', 'in_progress'] }
        }).populate('equipment_id', 'code name').populate('assigned_to', 'full_name code phone');

        if (openRepair) {
          const statusMap = {
            reported: 'Chờ phân công KTV',
            assigned: 'Đã phân công KTV',
            in_progress: 'Đang tiến hành sửa chữa tại hiện trường'
          };
          const ktvInfo = openRepair.assigned_to?.full_name
            ? `${openRepair.assigned_to.full_name} (${openRepair.assigned_to.code || ''})`
            : 'Đang chờ phân công KTV chuyên trách';
          const deadlineText = openRepair.deadline ? new Date(openRepair.deadline).toLocaleString('vi-VN') : 'Trong ca làm việc';

          const responseText = `**[Thông Báo Tiến Độ Xử Lý Sự Cố]**\n\n` +
            `Sự cố về **${openRepair.equipment_id?.name || matchedEq?.name || 'thiết bị'}** tại phòng **${targetRoom.code} - ${targetRoom.name}** đã được ghi nhận trên hệ thống với mã phiếu **[${openRepair.ticket_code}]**.\n\n` +
            `- **Tình trạng:** **${statusMap[openRepair.status] || openRepair.status}**\n` +
            `- **Kỹ thuật viên phụ trách:** ${ktvInfo}\n` +
            `- **Thời hạn cam kết SLA:** ${deadlineText}\n` +
            `- **Hiện tượng đã ghi nhận:** ${openRepair.incident_description || 'Sự cố thiết bị'}\n\n` +
            `Đội ngũ kỹ thuật đang trong ca xử lý sự cố này, bạn không cần phải tạo thêm phiếu trùng lặp.`;

          const cardData = {
            type: 'repair_progress',
            ticket_code: openRepair.ticket_code,
            room_code: targetRoom.code,
            quick_action: { label: `Xem Phiếu [${openRepair.ticket_code}]`, tab: 'tickets_kanban' }
          };

          return { responseText, cardData };
        }

        // Try Gemini / Cloud LLM first if available
        const cloudResponse = await callCloudLlm({
          systemPrompt: `Bạn là Ruo Cortex AI Copilot — Trợ lý vận hành cơ sở vật chất Đại học tại Tòa nhà A1.
Người dùng đang phản ánh sự cố kỹ thuật của thiết bị trong phòng học.
Thông tin thực tế trích xuất từ cơ sở dữ liệu:
- Vị trí: Phòng ${targetRoom.code} - ${targetRoom.name} (Tầng ${targetRoom.floor || 1}, Sức chứa: ${targetRoom.capacity || 40} chỗ ngồi)
- Thiết bị tại phòng: ${matchedEq ? `[${matchedEq.code}] ${matchedEq.name} (Trạng thái hiện tại: ${matchedEq.status === 'in_use' ? 'Đang khai thác' : matchedEq.status})` : 'Chưa định danh thiết bị cụ thể trong danh mục phòng'}
- Nội dung phản ánh từ người dùng: "${rawText}"

Yêu cầu định dạng và nội dung:
1. Xác nhận tiếp nhận thông tin sự cố của thiết bị tại phòng ${targetRoom.code}.
2. Đưa ra 2-3 bước kiểm tra nhanh tại chỗ (Quick Checks) an toàn, dễ làm cho giảng viên/cán bộ (nguồn điện AC 220V, giắc nối cáp HDMI/tín hiệu, điều khiển remote/nút bấm).
3. Hướng dẫn nếu không khắc phục được thì nhấn nút gợi ý báo hỏng bên dưới để hệ thống tự động phân công Kỹ thuật viên đến xử lý theo cam kết SLA.
Quy tắc:
- Tuyệt đối KHÔNG dùng emoji.
- Trả lời bằng tiếng Việt chuyên nghiệp, ngắn gọn, súc tích, gạch đầu dòng rõ ràng.`,
          userMessage: rawText,
          chatHistory
        });

        if (cloudResponse) {
          const cardData = {
            type: 'incident_report_suggestion',
            room_code: targetRoom.code,
            room_id: targetRoom._id,
            equipment_code: matchedEq?.code,
            equipment_id: matchedEq?._id,
            equipment_name: matchedEq?.name,
            quick_action: {
              label: matchedEq ? `Báo Hỏng ${matchedEq.name} (${targetRoom.code})` : `Báo Hỏng Thiết Bị Phòng ${targetRoom.code}`,
              tab: 'report_issue',
              room_id: targetRoom._id,
              equipment_id: matchedEq?._id
            }
          };
          return { responseText: cloudResponse.text, cardData };
        }

        // Local high-precision fallback diagnosis
        let troubleshootingText = '';
        const eqNameLower = (matchedEq?.name || rawText).toLowerCase();

        if (/tivi|tv/i.test(eqNameLower)) {
          troubleshootingText = `**Hướng dẫn chẩn đoán & kiểm tra nhanh tại chỗ (Quick Checks):**\n` +
            `1. **Kiểm tra nguồn điện AC 220V:** Quan sát đèn LED báo nguồn ở cạnh dưới TV xem có sáng đỏ/xanh không. Kiểm tra phích cắm vào ổ điện sau lưng máy hoặc công tắc nguồn trên tường.\n` +
            `2. **Kiểm tra ngõ vào tín hiệu:** Cắm lại chắc chắn giắc cáp HDMI từ TV nối đến laptop của giảng viên trên bục giảng. Dùng Remote hoặc nút bấm cạnh TV chuyển nguồn phát tín hiệu (Input / Source) sang đúng cổng HDMI 1 hoặc HDMI 2.\n` +
            `3. **Kiểm tra điều khiển (Remote):** Thử bấm phím nguồn cứng ở cạnh đáy hoặc sau lưng TV (đề phòng remote hết pin).`;
        } else if (/máy chiếu|projector/i.test(eqNameLower)) {
          troubleshootingText = `**Hướng dẫn chẩn đoán & kiểm tra nhanh tại chỗ (Quick Checks):**\n` +
            `1. **Kiểm tra đèn chỉ báo trên máy chiếu:** Đèn LAMP đỏ (cháy/hết tuổi thọ bóng đèn), TEMP đỏ (quá nhiệt/bám bụi cảm biến), POWER nhấp nháy (đang khởi động/lỗi nguồn).\n` +
            `2. **Kiểm tra kết nối HDMI:** Rút cáp HDMI cắm lại hoặc thử đổi cổng HDMI phụ trên bàn giảng viên.\n` +
            `3. **Chờ tản nhiệt:** Nếu máy vừa tắt, hãy đợi 3–5 phút để quạt làm mát hoàn toàn rồi mới bật lại.`;
        } else if (/điều hòa|máy lạnh|cassette/i.test(eqNameLower)) {
          troubleshootingText = `**Hướng dẫn chẩn đoán & kiểm tra nhanh tại chỗ (Quick Checks):**\n` +
            `1. **Kiểm tra Remote:** Đặt chế độ COOL (biểu tượng bông tuyết), nhiệt độ 24–26°C, quạt mức vừa hoặc cao.\n` +
            `2. **Kiểm tra Aptomat:** Kiểm tra tủ điện trong phòng xem cầu dao điều hòa có bị nhảy xuống không.\n` +
            `3. **Hiện tượng chảy nước:** Tắt điều hòa ngay lập tức để tránh chập điện trần thạch cao.`;
        } else {
          troubleshootingText = `**Hướng dẫn kiểm tra sơ bộ:**\n` +
            `1. Kiểm tra nguồn cấp điện AC 220V và công tắc nguồn của thiết bị.\n` +
            `2. Kiểm tra các cổng cắm, dây cáp nối tín hiệu xem có bị lỏng hoặc đứt ngầm không.\n` +
            `3. Thử khởi động lại (restart) thiết bị sau 30 giây ngắt nguồn.`;
        }

        const responseText = `**[Tiếp Nhận Sự Cố Kỹ Thuật - Phòng ${targetRoom.code}]**\n\n` +
          `Hệ thống ghi nhận sự cố đối với **${matchedEq ? `[${matchedEq.code}] ${matchedEq.name}` : 'thiết bị'}** tại phòng **${targetRoom.code} - ${targetRoom.name}**.\n\n` +
          troubleshootingText + `\n\n` +
          `*Nếu sau khi kiểm tra thiết bị vẫn không hoạt động, bạn vui lòng nhấn nút **[Gợi ý: Báo Hỏng Thiết Bị]** bên dưới để kích hoạt phiếu kỹ thuật. Đội ngũ KTV sẽ có mặt xử lý theo khung cam kết SLA.*`;

        const cardData = {
          type: 'incident_report_suggestion',
          room_code: targetRoom.code,
          room_id: targetRoom._id,
          equipment_code: matchedEq?.code,
          equipment_id: matchedEq?._id,
          equipment_name: matchedEq?.name,
          quick_action: {
            label: matchedEq ? `Báo Hỏng ${matchedEq.name} (${targetRoom.code})` : `Báo Hỏng Thiết Bị Phòng ${targetRoom.code}`,
            tab: 'report_issue',
            room_id: targetRoom._id,
            equipment_id: matchedEq?._id
          }
        };

        return { responseText, cardData };
      }

      // SUB-CASE 4B: Specific equipment lookup inside this room (not broken, e.g. "phòng 209 có tivi không")
      if (matchedEq) {
        const statusMap = {
          in_use: 'Đang hoạt động tốt',
          broken: 'Đang báo hỏng',
          repairing: 'Đang trong ca sửa chữa',
          in_stock: 'Trong kho dự phòng',
          disposed: 'Đã thanh lý'
        };

        const responseText = `**[Thông Tin Thiết Bị Phòng ${targetRoom.code}]**\n\n` +
          `Phòng **${targetRoom.code} - ${targetRoom.name}** hiện có trang bị thiết bị sau:\n` +
          `- **Tên thiết bị:** **${matchedEq.name}**\n` +
          `- **Mã tài sản:** \`[${matchedEq.code}]\`\n` +
          `- **Phân loại:** ${matchedEq.category_id?.name || 'Trình chiếu & Hiển thị'}\n` +
          `- **Trạng thái vận hành:** **${statusMap[matchedEq.status] || matchedEq.status}**\n` +
          `- **Vị trí:** Tầng ${targetRoom.floor || 1} • Sức chứa phòng: ${targetRoom.capacity || 40} chỗ\n\n` +
          (matchedEq.status === 'in_use'
            ? `Thiết bị hiện đang sẵn sàng phục vụ công tác giảng dạy và học tập.`
            : `Thiết bị hiện đang có sự cố cần hỗ trợ kỹ thuật.`);

        const cardData = {
          type: 'room_equipment_detail',
          room_code: targetRoom.code,
          equipment_code: matchedEq.code,
          equipment_id: matchedEq._id,
          quick_action: {
            label: matchedEq.status === 'in_use' ? `Báo Hỏng ${matchedEq.name}` : `Xem Sơ Đồ Phòng ${targetRoom.code}`,
            tab: matchedEq.status === 'in_use' ? 'report_issue' : 'dashboard',
            room_id: targetRoom._id,
            equipment_id: matchedEq._id
          }
        };

        return { responseText, cardData };
      }

      // SUB-CASE 4C: Pure room overview query (e.g. "phòng 209 có gì", "thông tin phòng A1-209")
      const typeSummary = {};
      for (const eq of roomEquipments) {
        const catName = eq.category_id?.name || eq.name.split(' ')[0] || 'Thiết bị';
        typeSummary[catName] = (typeSummary[catName] || 0) + 1;
      }
      const typeText = Object.entries(typeSummary).map(([name, count]) => `• ${count}x ${name}`).join('\n');

      const responseText = `**[Thông Tin Chi Tiết Phòng] ${targetRoom.code} - ${targetRoom.name}**:\n` +
        `- **Tầng:** ${targetRoom.floor || 1} • **Sức chứa:** ${targetRoom.capacity || 40} chỗ ngồi\n` +
        `- **Tổng số thiết bị:** **${roomEquipments.length} thiết bị** (Đang hoạt động: ${inUseList.length}, Đang có sự cố: ${brokenList.length})\n\n` +
        `**Danh mục trang thiết bị trong phòng:**\n` + (typeText || '• Chưa có thiết bị nào gắn với phòng này') + `\n\n` +
        (brokenList.length > 0
          ? `**Thiết bị đang có sự cố cần khắc phục (${brokenList.length}):**\n` + brokenList.map((e) => `• [${e.code}] ${e.name} (${e.status === 'repairing' ? 'Đang sửa' : 'Báo hỏng'})`).join('\n')
          : `[Đúng hạn] Tất cả các thiết bị trong phòng đang hoạt động ổn định.`);

      const cardData = {
        type: 'room_summary',
        room_code: targetRoom.code,
        total_equipments: roomEquipments.length,
        broken_count: brokenList.length,
        quick_action: { label: 'Xem Trên Sơ Đồ Mặt Bằng', tab: 'dashboard' }
      };

      return { responseText, cardData };
    }
  }

  // =========================================================================
  // PRIORITY 5: SPECIFIC SPARE PART INVENTORY QUERY
  // =========================================================================
  const partKeywords = [
    { key: 'bóng đèn máy chiếu', code: 'PART-LAMP' },
    { key: 'bóng đèn', code: 'PART-LAMP' },
    { key: 'bình ắc quy', code: 'PART-BATT12' },
    { key: 'ắc quy', code: 'PART-BATT12' },
    { key: 'tấm lọc bụi', code: 'PART-FILT' },
    { key: 'lọc bụi', code: 'PART-FILT' },
    { key: 'điều khiển từ xa', code: 'PART-RMT' },
    { key: 'cáp hdmi', code: 'PART-HDMI' },
    { key: 'cáp mạng', code: 'PART-PATCH' },
    { key: 'hạt mạng rj45', code: 'PART-RJ45' },
    { key: 'tụ điều hòa', code: 'PART-CAP45' },
    { key: 'tụ 45uf', code: 'PART-CAP45' },
    { key: 'ram máy tính', code: 'PART-RAM8' },
    { key: 'hộp mực in', code: 'PART-TNR85A' },
    { key: 'mực in', code: 'PART-TNR85A' }
  ];

  const matchedPartKw = partKeywords.find((pk) => lowerQ.includes(pk.key) || asciiQ.includes(stripDiacritics(pk.key)));
  if (matchedPartKw && !lowerQ.includes('hỏng') && !lowerQ.includes('lỗi')) {
    const part = await SparePart.findOne({
      $or: [
        { code: matchedPartKw.code },
        { name: new RegExp(matchedPartKw.key, 'i') }
      ]
    }).populate('supplier_id', 'name phone');

    if (part) {
      const isLowStock = part.stock <= (part.min_stock || 5);
      const responseText = `**[Thông Tin Tồn Kho Linh Kiện] [${part.code}]**\n` +
        `- **Tên linh kiện:** ${part.name}\n` +
        `- **Số lượng tồn kho:** **${part.stock} ${part.unit || 'Cái'}** ${isLowStock ? `*(Dưới định mức tối thiểu ${part.min_stock} ${part.unit})*` : '[Đúng hạn] *(Đảm bảo định mức an toàn)*'}\n` +
        `- **Đơn giá xuất kho:** ${Number(part.price || 0).toLocaleString('vi-VN')} đ / ${part.unit}\n` +
        `- **Vị trí lưu kho:** Kho Linh Kiện & Vật Tư Dự Phòng KHO-01 (Tòa A1)\n` +
        `- **Nhà cung cấp:** ${part.supplier_id?.name || 'Công ty Cổ phần Công nghệ FPT'}\n\n` +
        `*Kỹ thuật viên có thể xin xuất kho linh kiện này trực tiếp từ Kênh 2 hoặc nút [Xin Linh Kiện Kho] trên thẻ nhiệm vụ.*`;

      const cardData = {
        type: 'spare_part_detail',
        part_code: part.code,
        stock: part.stock,
        is_low_stock: isLowStock,
        quick_action: { label: 'Mở Kho Linh Kiện KHO-01', tab: 'spare_parts' }
      };

      return { responseText, cardData };
    }
  }

  // =========================================================================
  // PRIORITY 6: GENERAL WAREHOUSE & SPARE PARTS OVERVIEW
  // =========================================================================
  if ((lowerQ.includes('linh kiện') || lowerQ.includes('tồn kho')) && (lowerQ.includes('thế nào') || lowerQ.includes('còn bao nhiêu') || lowerQ.includes('danh sách') || lowerQ.includes('báo cáo'))) {
    const parts = await SparePart.find().sort({ stock: 1 });
    const lowStockParts = parts.filter((p) => p.stock <= (p.min_stock || 5));
    const totalItems = parts.reduce((sum, p) => sum + (Number(p.stock) || 0), 0);

    const responseText = `**[Báo Cáo Tổng Thể Kho Vật Tư Linh Kiện KHO-01]**\n` +
      `- **Tổng số chủng loại mã:** ${parts.length} loại linh kiện\n` +
      `- **Tổng số lượng thực tồn:** ${totalItems} sản phẩm\n` +
      `- **Cảnh báo sắp hết hàng:** ${lowStockParts.length > 0 ? `**${lowStockParts.length} linh kiện dưới mức an toàn!**` : '[Đúng hạn] 100% linh kiện đạt định mức'}\n\n` +
      (lowStockParts.length > 0
        ? `**Danh sách linh kiện cần bổ sung gấp:**\n` + lowStockParts.map((p) => `• [${p.code}] ${p.name}: còn **${p.stock} ${p.unit}** (Định mức min: ${p.min_stock})`).join('\n')
        : `Hiện kho sẵn sàng đáp ứng mọi yêu cầu cấp phát phục vụ công tác sửa chữa.`);

    const cardData = {
      type: 'spare_parts_overview',
      low_stock_count: lowStockParts.length,
      quick_action: { label: 'Vào Kho Linh Kiện Dự Phòng', tab: 'spare_parts' }
    };

    return { responseText, cardData };
  }

  // =========================================================================
  // PRIORITY 7: REPAIRS, OVERDUE & SLA COMPLIANCE
  // =========================================================================
  if (lowerQ.includes('quá hạn') || lowerQ.includes('sla') || ((lowerQ.includes('phiếu') || lowerQ.includes('sửa chữa')) && (lowerQ.includes('bao nhiêu') || lowerQ.includes('tiến độ')))) {
    const activeRepairs = await Repair.find({
      status: { $in: ['reported', 'assigned', 'in_progress'] }
    })
      .populate('equipment_id', 'code name')
      .populate('room_id', 'code name')
      .populate('assigned_to', 'full_name code');

    const now = new Date();
    const overdueRepairs = activeRepairs.filter((r) => r.deadline && new Date(r.deadline) < now);

    const responseText = `**[Báo Cáo Tiến Độ Sửa Chữa & Tuân Thủ SLA Tòa A1]**\n` +
      `- **Tổng ca đang mở:** **${activeRepairs.length} nhiệm vụ**\n` +
      `  • Chờ tiếp nhận: ${activeRepairs.filter((r) => r.status === 'reported').length}\n` +
      `  • Đã phân công KTV: ${activeRepairs.filter((r) => r.status === 'assigned').length}\n` +
      `  • Đang xử lý tại hiện trường: ${activeRepairs.filter((r) => r.status === 'in_progress').length}\n` +
      `- **Ca quá hạn cam kết SLA:** ${overdueRepairs.length > 0 ? `**${overdueRepairs.length} ca quá hạn!**` : '[Đúng hạn] 0 ca (Đạt 100% SLA)'}\n\n` +
      (overdueRepairs.length > 0
        ? `**Các ca sửa chữa quá hạn SLA cần xử lý ngay:**\n` + overdueRepairs.slice(0, 4).map((r) => `• [${r.ticket_code}] ${r.equipment_id?.name || 'TB'} tại ${r.room_id?.code || ''} (KTV: ${r.assigned_to?.full_name || 'Chưa gán'})`).join('\n')
        : `Mọi nhiệm vụ hiện đều đang được kiểm soát trong khung thời gian cam kết.`);

    const cardData = {
      type: 'sla_overview',
      active_count: activeRepairs.length,
      overdue_count: overdueRepairs.length,
      quick_action: { label: 'Bảng Điều Phối Kanban', tab: 'tickets_kanban' }
    };

    return { responseText, cardData };
  }

  // =========================================================================
  // PRIORITY 8: WARRANTY, DEPRECIATION & 60% DISPOSAL RULE
  // =========================================================================
  if (lowerQ.includes('thanh lý') || lowerQ.includes('khấu hao') || lowerQ.includes('60%')) {
    const responseText = `**[Quy Chuẩn Thẩm Định Thanh Lý Tài Sản]**\n\n` +
      `**Quy Tắc Vàng Thanh Lý R ≥ 60%:**\n` +
      `Khi **Tỷ lệ chi phí sửa chữa lũy kế đạt R ≥ 60% nguyên giá** (hoặc linh kiện chính ngưng sản xuất, thiết bị hỏng nặng không thể phục hồi), hệ thống tự động đề xuất lập Hồ sơ thanh lý.\n\n` +
      `**Quy Trình 5 Bước:**\n` +
      `1. *Kỹ thuật viên:* Khảo sát hiện trường & xác nhận tình trạng không thể sửa chữa.\n` +
      `2. *Quản lý CSVC:* Lập hồ sơ thẩm định hao mòn kỹ thuật và giá trị thu hồi dự kiến.\n` +
      `3. *Ban Giám Hiệu:* Phê duyệt chủ trương và ban hành Quyết định thanh lý tài sản.\n` +
      `4. *Hội Đồng Thanh Lý:* Bán đấu giá phế liệu hoặc hủy an toàn sinh học/điện tử.\n` +
      `5. *Phòng Tài Vụ / Kế Toán:* Ghi giảm tài sản trên sổ cái kế toán.`;

    const cardData = {
      type: 'disposal_guidance',
      quick_action: { label: 'Xem Đề Xuất Thanh Lý', tab: 'disposal_propose' }
    };

    return { responseText, cardData };
  }

  // =========================================================================
  // PRIORITY 9: CASUAL CHITCHAT / OFF-TOPIC / GREETINGS
  // =========================================================================
  const isChitchat = CHITCHAT_PATTERNS.some((re) => re.test(lowerQ) || re.test(asciiQ));
  const hasAccents = /[áàảãạăắằẳẵặâấầẩẫậéèẻẽẹêếềểễệíìỉĩịóòỏõọôốồổỗộơớờởỡợúùủũụưứừửữựýỳỷỹỵđ]/i.test(rawText);

  const checkKeywordMatch = (kwList) => {
    return kwList.some((kw) => {
      if (hasAccents) {
        return hasWholePhrase(lowerQ, kw);
      }
      const cleanKw = stripDiacritics(kw);
      return cleanKw.length >= 3 && hasWholePhrase(asciiQ, cleanKw);
    });
  };

  const hasEquipmentKeyword = checkKeywordMatch(EQUIPMENT_KEYWORDS);
  const hasFaultKeyword = checkKeywordMatch(FAULT_KEYWORDS);

  // If casual talk and NOT explicitly talking about equipment breakdown:
  if (isChitchat && !hasFaultKeyword) {
    // If Cloud LLM is available, let the LLM converse with maximum charm and nuance!
    const cloudResponse = await callCloudLlm({
      systemPrompt: `Bạn là Ruo Cortex AI Copilot — Trợ lý vận hành cơ sở vật chất Đại học thông minh, thân thiện.
Người dùng đang trò chuyện tự nhiên, hỏi thăm hoặc hỏi về khả năng của bạn.
Hãy trả lời duyên dáng, thân thiện, tự nhiên bằng tiếng Việt (1-3 câu hoặc gạch đầu dòng ngắn nếu hỏi về tính năng).
Nhẹ nhàng nhắc rằng bạn luôn sẵn sàng hỗ trợ tra cứu phòng học tòa nhà A1, báo hỏng thiết bị, kiểm tra tồn kho linh kiện KHO-01 hoặc tra cứu SLA sửa chữa.`,
      userMessage: rawText,
      chatHistory
    });

    if (cloudResponse) {
      return {
        responseText: cloudResponse.text,
        cardData: { type: 'chitchat', quick_action: { label: 'Tra Cứu Phòng Học', tab: 'dashboard' } }
      };
    }

    // Dynamic, warm local chitchat responses
    let chitchatReply = '';
    if (/chạy bộ|chay bo|the duc|dap xe/i.test(lowerQ)) {
      chitchatReply = `**Chúc bạn có buổi chạy bộ thật sảng khoái và tràn đầy năng lượng!**\n\n` +
        `Rèn luyện thể thao giúp tinh thần minh mẫn hơn rất nhiều đấy. Khi nào bạn quay lại giảng đường hoặc phòng làm việc mà gặp bất kỳ sự cố thiết bị nào (máy chiếu, tivi, điều hòa, phòng học, kho linh kiện), cứ nhắn tôi nhé! `;
    } else if (/ăn cơm|an trua|an toi|uong cafe|ca phe/i.test(lowerQ)) {
      chitchatReply = `**Chúc bạn có bữa ăn ngon miệng và khoảng thời gian nghỉ ngơi thư thái!**\n\n` +
        `Khi nào tiếp tục công việc tại tòa nhà A1, nếu cần tra cứu phòng học hay trang thiết bị cơ sở vật chất, tôi luôn sẵn sàng hỗ trợ bạn. `;
    } else if (/mệt|met|buồn ngủ|buon ngu/i.test(lowerQ)) {
      chitchatReply = `**Công việc giảng dạy và vận hành rất bận rộn!** Bạn nhớ nghỉ ngơi một chút để lấy lại năng lượng nhé.\n\nMọi vấn đề về sự cố thiết bị hay phòng học, cứ để Ruo Cortex AI và đội ngũ Kỹ thuật viên hỗ trợ bạn! `;
    } else if (/cảm ơn|cam on|thank/i.test(lowerQ)) {
      chitchatReply = `Rất vui được hỗ trợ bạn!  Nếu có thêm bất kỳ thắc mắc nào về thiết bị hay phòng học, đừng ngần ngại nhắn cho tôi nhé.`;
    } else if (/bạn là ai|ten gi|gioi thieu/i.test(lowerQ)) {
      chitchatReply = `Xin chào! Tôi là **Ruo Cortex AI Copilot** — Trợ lý trí tuệ nhân tạo chuyên sâu về Quản lý Cơ sở Vật chất Đại học.\n\n` +
        `Tôi có thể giúp bạn chẩn đoán sự cố thiết bị (Tivi, Máy chiếu, Điều hòa, Micro, PC Lab), tra cứu thông tin phòng học, kiểm tra tồn kho linh kiện KHO-01 và cập nhật tiến độ sửa chữa SLA.`;
    } else {
      chitchatReply = `Xin chào **${user?.full_name || 'Cán bộ'}**! Chúc bạn một ngày làm việc và giảng dạy hiệu quả.  Tôi có thể giúp gì cho bạn về cơ sở vật chất tòa nhà A1 hôm nay?`;
    }

    return {
      responseText: chitchatReply,
      cardData: { type: 'chitchat', quick_action: { label: 'Xem Danh Sách Phòng Học', tab: 'dashboard' } }
    };
  }

  // =========================================================================
  // PRIORITY 10: ADVANCED FAULT PLAYBOOK DIAGNOSIS (45+ Playbooks)
  // =========================================================================
  const localAnalysis = classifyIncidentLocally({ description: rawText });
  const isGenuineEquipmentFault = Boolean(localAnalysis.matchedMajorPhrase) || (hasEquipmentKeyword && hasFaultKeyword);

  if (isGenuineEquipmentFault && localAnalysis.playbook) {
    const playbook = localAnalysis.playbook;

    // First try Cloud LLM (Gemini / OpenAI / Groq) if available for deep natural language generation
    const cloudDiagnosis = await callCloudLlm({
      systemPrompt: `Bạn là Chuyên gia Kỹ thuật Cơ sở Vật chất Đại học (Ruo Cortex AI).
Hãy hướng dẫn chẩn đoán sự cố thiết bị một cách chuyên nghiệp, dễ hiểu cho giảng viên và kỹ thuật viên.
Kịch bản sự cố phát hiện: "${playbook.title}".
Nguyên nhân gốc rễ gợi ý: "${playbook.rootCause}".
Quy tắc:
- Tuyệt đối KHÔNG dùng biểu tượng cảm xúc (emoji/icon) trong câu trả lời.
- Trả lời bằng tiếng Việt chuyên nghiệp, có phân mục rõ ràng: Phân loại, Nguyên nhân cốt lõi, Kiểm tra nhanh tại chỗ (Quick Checks), Quy trình xử lý (SOP).
- Đảm bảo an toàn điện. Không bịa đặt linh kiện ngoài danh mục trường.`,
      userMessage: rawText,
      chatHistory
    });

    if (cloudDiagnosis) {
      return {
        responseText: cloudDiagnosis.text,
        cardData: {
          type: 'technical_diagnosis',
          playbook_id: playbook.id,
          category_code: playbook.categoryCode,
          severity: playbook.defaultSeverity,
          quick_action: { label: 'Báo Hỏng Thiết Bị Này', tab: 'report_issue' }
        }
      };
    }

    // High-precision Local Playbook Assembly
    let availablePartsInfo = '';
    if (playbook.partCodes && playbook.partCodes.length > 0) {
      const partsInDb = await SparePart.find({ code: { $in: playbook.partCodes } });
      if (partsInDb.length > 0) {
        availablePartsInfo = `\n**Linh kiện thay thế tương thích trong kho KHO-01:**\n` +
          partsInDb.map((p) => `• [${p.code}] ${p.name} (Tồn kho: **${p.stock} ${p.unit}** - Đơn giá: ${Number(p.price || 0).toLocaleString('vi-VN')} đ)`).join('\n') + `\n`;
      }
    }

    const stepsText = playbook.steps && playbook.steps.length > 0
      ? playbook.steps.map((st, i) => `${i + 1}. ${st}`).join('\n')
      : '1. Kiểm tra an toàn nguồn cấp điện AC 220V.\n2. Kiểm tra dây cáp tín hiệu và các giắc nối.\n3. Khảo sát bo mạch điều khiển và linh kiện thay thế tương thích.';

    const quickChecksText = playbook.quickChecks && playbook.quickChecks.length > 0
      ? `**Kiểm tra nhanh tại hiện trường (Quick Checks):**\n` + playbook.quickChecks.map((qc) => `• ${qc}`).join('\n') + `\n\n`
      : '';

    const responseText = `**[Hướng Dẫn Chẩn Đoán Kỹ Thuật]: ${playbook.title}**\n\n` +
      `**Phân loại:** ${CATEGORY_ONTOLOGY[playbook.categoryCode]?.label || playbook.categoryCode} • **Mức độ sự cố:** ${playbook.defaultSeverity === 'critical' ? 'Khẩn cấp' : playbook.defaultSeverity === 'major' ? 'Hỏng nặng' : 'Hỏng nhẹ'}\n\n` +
      `**Nguyên nhân kỹ thuật cốt lõi (Root Cause):**\n` +
      `${playbook.rootCause || 'Lỗi phát sinh do hao mòn linh kiện cơ điện tử, mất nguồn cấp hoặc suy giảm chất lượng vật liệu sau thời gian vận hành dài.'}\n\n` +
      quickChecksText +
      `**Quy trình kiểm tra & xử lý từng bước (SOP):**\n` +
      stepsText + `\n` +
      availablePartsInfo +
      (playbook.safetyWarning ? `\n*Lưu ý an toàn:* ${playbook.safetyWarning}\n` : '');

    const cardData = {
      type: 'technical_diagnosis',
      playbook_id: playbook.id,
      category_code: playbook.categoryCode,
      severity: playbook.defaultSeverity,
      quick_action: { label: 'Báo Hỏng Thiết Bị Này', tab: 'report_issue' }
    };

    return { responseText, cardData };
  }

  // =========================================================================
  // PRIORITY 11: GENERAL QUERY / FALLBACK
  // =========================================================================
  // If cloud LLM is active, let it handle general queries naturally:
  const generalCloudResponse = await callCloudLlm({
    systemPrompt: `Bạn là Ruo Cortex AI Copilot — Trợ lý vận hành cơ sở vật chất Đại học (tòa nhà A1).
Hãy trả lời câu hỏi của người dùng một cách chính xác, thân thiện, súc tích bằng tiếng Việt.
Nếu câu hỏi nằm ngoài phạm vi cơ sở vật chất, hãy trả lời ngắn gọn và hướng dẫn người dùng quay lại chủ đề phòng học, thiết bị, linh kiện kho.`,
    userMessage: rawText,
    chatHistory
  });

  if (generalCloudResponse) {
    return {
      responseText: generalCloudResponse.text,
      cardData: { type: 'general_info', quick_action: { label: 'Xem Danh Mục Phòng Học', tab: 'dashboard' } }
    };
  }

  const responseText = `Xin chào **${user?.full_name || 'Cán bộ'}**! Tôi là **Ruo Cortex AI Copilot** — Trợ lý vận hành cơ sở vật chất Đại học.\n\n` +
    `Tôi có thể hỗ trợ bạn các nhóm tác vụ chuyên sâu sau:\n` +
    `1. **Chẩn đoán sự cố thiết bị:** Hỏi về lỗi Tivi ("tivi không lên nguồn"), Máy chiếu ("báo đèn đỏ"), Điều hòa ("không mát, chảy nước"), Micro ("bị hú rít"), PC ("màn hình xanh").\n` +
    `2. **Tra cứu phòng học:** Hỏi "Phòng A1-101 có thiết bị gì?", "Phòng A1-209", "Sức chứa phòng lab".\n` +
    `3. **Kiểm tra kho linh kiện:** Hỏi "Bóng đèn máy chiếu còn mấy cái?", "Tồn kho bình ắc quy", "Linh kiện nào sắp hết?".\n` +
    `4. **Tiến độ sửa chữa & SLA:** Hỏi "Có bao nhiêu phiếu quá hạn SLA?", "Tra cứu phiếu REP-...".\n` +
    `5. **Chính sách & Quy trình:** Hỏi về "Quy tắc thanh lý 60%", "Cách báo hỏng thiết bị", "Quy trình xin cấp linh kiện kho".\n\n` +
    `Bạn vui lòng đặt câu hỏi cụ thể để tôi tra cứu dữ liệu chính xác cho bạn!`;

  const cardData = {
    type: 'help_suggestions',
    quick_action: { label: 'Xem Danh Mục Phòng Học', tab: 'dashboard' }
  };

  return { responseText, cardData };
};

export default {
  callCloudLlm,
  processAiChatQuery
};
