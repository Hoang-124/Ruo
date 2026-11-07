/**
 * Pure-JS Vietnamese Technical NLP & Feature Extraction Engine for Ruo UEMS.
 * Zero external dependencies. Handles:
 *  - Unicode NFC normalization + colloquial/abbreviation expansion
 *  - Dual-channel accented & unaccented (ASCII) tokenization for typo/no-diacritic resilience
 *  - Compound technical phrase protection (e.g. "cháy bóng đèn" != open fire "cháy")
 *  - Clause-aware Vietnamese negation scope detection ("không có khói, không cháy" -> negated)
 *  - Weighted TF / BM25 sparse vectorization & cosine similarity
 */

const NEGATION_CUES = new Set([
  'không', 'chưa', 'chẳng', 'chả', 'đừng', 'tránh', 'khỏi', 'hết', 'không_hề', 'không_có', 'không_bị', 'chưa_có', 'chưa_thấy'
]);

const CLAUSE_BREAKERS = new Set([
  'nhưng', 'tuy', 'tuy_nhiên', 'mà', 'song', 'lại', 'chỉ', 'ngoài_ra', 'đồng_thời', 'còn', 'khi', 'nếu', 'vì', 'do'
]);

const STOPWORDS = new Set([
  'là', 'và', 'của', 'có', 'được', 'bị', 'ở', 'tại', 'trong', 'cho', 'với', 'các', 'những',
  'một', 'cái', 'chiếc', 'bộ', 'con', 'này', 'đó', 'kia', 'thì', 'rất', 'hơi', 'quá', 'lắm',
  'đang', 'đã', 'sẽ', 'vừa', 'mới', 'vẫn', 'cũng', 'như', 'vào', 'ra', 'lên', 'xuống', 'đi',
  'lại', 'đến', 'từ', 'trên', 'dưới', 'phía', 'bên', 'cần', 'nhờ', 'xin', 'vui', 'lòng', 'giúp'
]);

// Colloquial & shorthand expansions common in lecturer/student/technician reports
const SHORTHAND_RULES = [
  [/\b(ko|khg|hong|hông)\b/giu, 'không'],
  [/\bk\s+(?=lên|bật|mát|lạnh|sáng|chạy|nhận|mở|có|được|dc|đc|vào|ra|thấy|nghe|in|chiếu|quay|kêu|ăn|hút|nóng)\b/giu, 'không '],
  [/\b(dc|đc)\b/giu, 'được'],
  [/\bbt\b/giu, 'bình thường'],
  [/\bgv\b/giu, 'giảng viên'],
  [/\bsv\b/giu, 'sinh viên'],
  [/\bktv\b/giu, 'kỹ thuật viên'],
  [/\bcsvc\b/giu, 'cơ sở vật chất'],
  [/\bpccc\b/giu, 'phòng cháy chữa cháy'],
  [/\bmcb\b/giu, 'aptomat'],
  [/\brcbo\b/giu, 'aptomat chống giật'],
  [/\bđh\b/giu, 'điều hòa'],
  [/\bmc\b/giu, 'máy chiếu'],
  [/\bbsod\b/giu, 'màn hình xanh']
];

/**
 * Non-fire compound phrases containing "cháy" or "nổ" that indicate component burnout,
 * optical/display artifacts, or audio pops rather than actual open flames or explosions.
 */
const COMPONENT_BURNOUT_PATTERNS = [
  /cháy\s+(bóng|đèn|tuýp|led|cầu\s*chì|điểm\s*ảnh|hình|sáng|nét|màu|côn\s*loa|tụ|ic|chip|adapter|nguồn\s*led|chấn\s*lưu|mực)/gu,
  /bóng\s+(đèn\s+)?(bị\s+)?cháy/gu,
  /cầu\s*chì\s+(bị\s+)?cháy/gu,
  /đèn\s+(chiếu\s+|led\s+|tuýp\s+|báo\s+)?(bị\s+)?cháy\s+bóng/gu,
  /chay\s+(bong|den|tuyp|led|cau\s*chi|diem\s*anh|hinh|sang|con\s*loa)/gu,
  /bong\s+(den\s+)?(bi\s+)?chay/gu,
  /(loa|âm\s*thanh|am\s*thanh|mic|micro)\s+[^.,;]{0,20}nổ\s+(lụp\s*bụp|bụp|lẹt\s*đẹt|lách\s*tách|rè)/gu,
  /nổ\s+(lụp\s*bụp|lẹt\s*đẹt|bụp\s*bụp)/gu
];

export const stripDiacritics = (input = '') =>
  String(input || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');

export const normalizeVietnameseText = (raw = '') => {
  let text = String(raw || '')
    .normalize('NFC')
    .replace(/[\u0000-\u001F]+/g, ' ')
    .toLowerCase();

  for (const [pattern, replacement] of SHORTHAND_RULES) {
    text = text.replace(pattern, replacement);
  }

  return text.replace(/\s+/g, ' ').trim();
};

/**
 * Strips previously generated "[ROOM - EQ] Equipment Name:" prefixes so re-triaging
 * an AI-refined description remains idempotent and clean.
 */
export const stripRefinedPrefix = (raw = '') => {
  let text = String(raw || '').trim();
  // Strip leading "[A1-101 - EQ-...] Name (Brand): " if present
  text = text.replace(/^\[[^\]\n]{1,60}\]\s*[^:\n]{2,90}:\s*/u, '');
  // Strip trailing "(Đính kèm N ảnh hiện trường)." if present
  text = text.replace(/\s*\(Đính kèm \d+ ảnh hiện trường\)\.?$/iu, '');
  return text.trim();
};

/**
 * Splits normalized text into clauses and annotates tokens with negation scope.
 */
export const analyzeTokensAndNegation = (rawText = '') => {
  const normalized = normalizeVietnameseText(rawText);
  const asciiNormalized = stripDiacritics(normalized);

  // Mask component-burnout compounds before checking open-fire hazards
  let maskedForHazards = normalized;
  let asciiMaskedForHazards = asciiNormalized;
  const detectedBurnouts = [];

  for (const pattern of COMPONENT_BURNOUT_PATTERNS) {
    maskedForHazards = maskedForHazards.replace(pattern, (match) => {
      detectedBurnouts.push(match.trim());
      return ' linh_kien_dut_bong ';
    });
    asciiMaskedForHazards = asciiMaskedForHazards.replace(pattern, (match) => {
      detectedBurnouts.push(match.trim());
      return ' linh_kien_dut_bong ';
    });
  }

  // Split into clauses on punctuation so negation doesn't bleed across clauses
  const rawClauses = normalized.split(/[.,;!?()\n]+/u).map((c) => c.trim()).filter(Boolean);
  const maskClauses = maskedForHazards.split(/[.,;!?()\n]+/u).map((c) => c.trim()).filter(Boolean);

  const tokens = [];
  const affirmedClauses = [];
  const negatedTerms = new Set();

  for (const clause of rawClauses) {
    // Pre-join key two-word negation cues
    const prepped = clause
      .replace(/\bkhông\s+(hề|có|bị|thấy|còn)\b/gu, 'không_$1')
      .replace(/\bchưa\s+(có|thấy|bị)\b/gu, 'chưa_$1')
      .replace(/\btuy\s+nhiên\b/gu, 'tuy_nhiên')
      .replace(/\bngoài\s+ra\b/gu, 'ngoài_ra')
      .replace(/\bđồng\s+thời\b/gu, 'đồng_thời');

    const words = prepped.match(/[\p{L}\p{N}_]+/gu) || [];
    let negRemaining = 0;

    for (let i = 0; i < words.length; i += 1) {
      const w = words[i];
      if (CLAUSE_BREAKERS.has(w)) {
        negRemaining = 0;
        tokens.push({ word: w, ascii: stripDiacritics(w), negated: false });
        continue;
      }
      if (NEGATION_CUES.has(w) || (w === 'ko' || w === 'chua' || w === 'khong')) {
        negRemaining = 3;
        tokens.push({ word: w, ascii: stripDiacritics(w), negated: false, isNegCue: true });
        continue;
      }

      const isNegated = negRemaining > 0;
      if (negRemaining > 0 && (w === 'hay' || w === 'hoặc' || w === 'lẫn' || w === 'hoac')) {
        negRemaining = Math.max(negRemaining, 2);
      } else if (negRemaining > 0 && !STOPWORDS.has(w)) {
        negRemaining -= 1;
      }
      if (isNegated) {
        negatedTerms.add(w);
        negatedTerms.add(stripDiacritics(w));
        if (i + 1 < words.length) {
          const phrase2 = `${w} ${words[i + 1]}`;
          negatedTerms.add(phrase2);
          negatedTerms.add(stripDiacritics(phrase2));
        }
      }
      tokens.push({ word: w, ascii: stripDiacritics(w), negated: isNegated });
    }
  }

  // Build affirmed hazard text directly from clause-aware negation state machine on maskClauses
  for (const clause of maskClauses) {
    const prepped = clause
      .replace(/(^|[^\p{L}\p{N}])không\s+(hề|có|bị|thấy|còn)(?=$|[^\p{L}\p{N}])/gu, '$1không_$2')
      .replace(/(^|[^\p{L}\p{N}])chưa\s+(có|thấy|bị)(?=$|[^\p{L}\p{N}])/gu, '$1chưa_$2')
      .replace(/(^|[^\p{L}\p{N}])tuy\s+nhiên(?=$|[^\p{L}\p{N}])/gu, '$1tuy_nhiên')
      .replace(/(^|[^\p{L}\p{N}])ngoài\s+ra(?=$|[^\p{L}\p{N}])/gu, '$1ngoài_ra')
      .replace(/(^|[^\p{L}\p{N}])đồng\s+thời(?=$|[^\p{L}\p{N}])/gu, '$1đồng_thời');

    const words = prepped.match(/[\p{L}\p{N}_]+/gu) || [];
    let negRem = 0;
    const kept = [];
    for (const w of words) {
      if (CLAUSE_BREAKERS.has(w)) {
        negRem = 0;
        kept.push(w);
        continue;
      }
      if (NEGATION_CUES.has(w) || w === 'ko' || w === 'chua' || w === 'khong') {
        negRem = 3;
        continue;
      }
      if (negRem > 0) {
        if (w === 'hay' || w === 'hoặc' || w === 'lẫn' || w === 'hoac') {
          negRem = Math.max(negRem, 3);
        } else if (!STOPWORDS.has(w)) {
          negRem -= 1;
        }
        continue;
      }
      kept.push(w);
    }
    if (kept.length > 0) {
      affirmedClauses.push(kept.join(' '));
    }
  }

  const affirmedHazardText = affirmedClauses.join(' . ');
  const affirmedHazardAscii = stripDiacritics(affirmedHazardText);

  return {
    normalized,
    asciiNormalized,
    affirmedHazardText,
    affirmedHazardAscii,
    tokens,
    negatedTerms,
    detectedBurnouts
  };
};

const WHOLE_PHRASE_REGEX_CACHE = new Map();

/**
 * Checks whole-phrase match on Unicode/ASCII text safely in O(N) with pre-filter + RegExp cache.
 */
export const hasWholePhrase = (text, phrase) => {
  if (!text || !phrase) return false;
  const lowerPhrase = String(phrase).toLowerCase();
  if (!String(text).toLowerCase().includes(lowerPhrase)) return false;

  let re = WHOLE_PHRASE_REGEX_CACHE.get(lowerPhrase);
  if (!re) {
    const escaped = lowerPhrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    re = new RegExp(`(^|[^\\p{L}\\p{N}])${escaped}($|[^\\p{L}\\p{N}])`, 'iu');
    if (WHOLE_PHRASE_REGEX_CACHE.size < 2000) {
      WHOLE_PHRASE_REGEX_CACHE.set(lowerPhrase, re);
    }
  }
  return re.test(text);
};

/**
 * Extracts sparse n-gram + negation + ASCII fallback feature counts for ML classification & BM25.
 */
export const extractNlpFeatures = (rawText = '') => {
  const { tokens, detectedBurnouts } = analyzeTokensAndNegation(rawText);
  const features = new Map();

  const bump = (feat, weight = 1) => {
    if (!feat || feat.length < 2) return;
    features.set(feat, (features.get(feat) || 0) + weight);
  };

  if (detectedBurnouts.length > 0) {
    bump('CONCEPT_COMPONENT_BURNOUT', 2.2);
  }

  const meaningful = tokens.filter((t) => !t.isNegCue && (!STOPWORDS.has(t.word) || t.negated));

  for (let i = 0; i < meaningful.length; i += 1) {
    const cur = meaningful[i];
    if (cur.negated) {
      bump(`NEG_${cur.word}`, 1.6);
      bump(`NEG_A_${cur.ascii}`, 1.2);
    } else {
      bump(cur.word, 1.0);
      if (cur.ascii !== cur.word) {
        bump(`A_${cur.ascii}`, 0.65);
      }
      if (i + 1 < meaningful.length && !meaningful[i + 1].negated) {
        const nxt = meaningful[i + 1];
        bump(`${cur.word}_${nxt.word}`, 1.45);
        bump(`A_${cur.ascii}_${nxt.ascii}`, 0.9);
      }
    }
  }

  // Also add raw adjacent bigrams including "không_*" patterns (critical for "không_lên", "không_mát", "mất_nguồn")
  for (let i = 0; i < tokens.length - 1; i += 1) {
    const a = tokens[i];
    const b = tokens[i + 1];
    const rawBg = `${a.word.replace(/^không_.+$/, 'không')}_${b.word}`;
    bump(`BG_${rawBg}`, 1.35);
    bump(`BGA_${stripDiacritics(rawBg)}`, 0.85);
  }

  return features;
};

/**
 * Sublinear TF Cosine Similarity between two Vietnamese texts (0..1).
 */
export const computeTextSimilarity = (textA = '', textB = '') => {
  const fA = extractNlpFeatures(textA);
  const fB = extractNlpFeatures(textB);
  if (fA.size === 0 || fB.size === 0) return 0;

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (const [k, v] of fA.entries()) {
    const wA = 1 + Math.log(v);
    normA += wA * wA;
    if (fB.has(k)) {
      const wB = 1 + Math.log(fB.get(k));
      dot += wA * wB;
    }
  }
  for (const v of fB.values()) {
    const wB = 1 + Math.log(v);
    normB += wB * wB;
  }

  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom > 0 ? dot / denom : 0;
};

export default {
  stripDiacritics,
  normalizeVietnameseText,
  stripRefinedPrefix,
  analyzeTokensAndNegation,
  hasWholePhrase,
  extractNlpFeatures,
  computeTextSimilarity
};
