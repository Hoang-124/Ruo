/**
 * Pure-JS Vietnamese Technical NLP & Feature Extraction Engine for Ruo UEMS.
 * Zero external dependencies. Handles:
 *  - Unicode NFC normalization + colloquial/abbreviation expansion
 *  - Dual-channel accented & unaccented (ASCII) tokenization for typo/no-diacritic resilience
 *  - Compound technical phrase protection (e.g. "cháy bóng đèn" != open fire "cháy")
 *  - Clause-aware Vietnamese negation scope detection ("không có khói, không cháy" -> negated)
 *  - Weighted TF / BM25 sparse vectorization & cosine similarity
 */

// Existential negation ("không có X và Y") distributes over a coordinated noun list,
// whereas predicate negation ("không mát và bốc khói") ends at the conjunction.
// Every accented/unaccented pairing is listed because input often mixes both
// ("ko co" -> "không co" after shorthand expansion).
const crossJoin = (heads, tails) => heads.flatMap((head) => tails.map((tail) => `${head}_${tail}`));
const EXISTENTIAL_NEGATION_CUES = new Set([
  ...crossJoin(['không', 'khong'], ['hề', 'he', 'có', 'co', 'bị', 'bi', 'thấy', 'thay']),
  ...crossJoin(['chưa', 'chua'], ['có', 'co', 'thấy', 'thay', 'bị', 'bi'])
]);

const NEGATION_CUES = new Set([
  'không', 'chưa', 'chẳng', 'chả', 'đừng', 'tránh', 'khỏi', 'hết',
  'ko', 'khong', 'chua',
  ...crossJoin(['không', 'khong'], ['còn', 'con']),
  ...EXISTENTIAL_NEGATION_CUES
]);

const CLAUSE_BREAKERS = new Set([
  'nhưng', 'tuy', 'tuy_nhiên', 'mà', 'song', 'lại', 'chỉ', 'ngoài_ra', 'đồng_thời', 'còn', 'khi', 'nếu', 'vì', 'do',
  'rồi', 'sau_đó', 'kèm_theo', 'thậm_chí', 'bỗng', 'bỗng_nhiên', 'đột_nhiên', 'xong'
]);

const AND_COORDINATORS = new Set(['và', 'va']);
const OR_COORDINATORS = new Set(['hay', 'hoặc', 'lẫn', 'hoac']);

// JS `\b` only understands ASCII word characters even with the `u` flag, so it never
// matches around Vietnamese letters such as "đ" or "ó". Use Unicode-aware lookarounds.
const WORD_START = '(?<![\\p{L}\\p{N}_])';
const WORD_END = '(?![\\p{L}\\p{N}_])';
const wholeWord = (body, flags = 'giu') => new RegExp(`${WORD_START}(?:${body})${WORD_END}`, flags);

// Predicates that colloquial "k" / southern "hông/hong" negate (accented + unaccented).
const NEGATABLE_PREDICATES = [
  'lên', 'len', 'bật', 'bat', 'mát', 'mat', 'lạnh', 'lanh', 'sáng', 'sang', 'chạy', 'chay',
  'nhận', 'nhan', 'mở', 'mo', 'có', 'co', 'được', 'duoc', 'đc', 'dc', 'vào', 'vao', 'ra',
  'thấy', 'thay', 'nghe', 'in', 'chiếu', 'chieu', 'quay', 'kêu', 'keu', 'ăn', 'an', 'hút', 'hut',
  'nóng', 'nong', 'hiện', 'hien', 'tắt', 'tat', 'kết', 'ket', 'phát', 'phat'
].join('|');

const STOPWORDS = new Set([
  'là', 'và', 'của', 'có', 'được', 'bị', 'ở', 'tại', 'trong', 'cho', 'với', 'các', 'những',
  'một', 'cái', 'chiếc', 'bộ', 'con', 'này', 'đó', 'kia', 'thì', 'rất', 'hơi', 'quá', 'lắm',
  'đang', 'đã', 'sẽ', 'vừa', 'mới', 'vẫn', 'cũng', 'như', 'vào', 'ra', 'lên', 'xuống', 'đi',
  'lại', 'đến', 'từ', 'trên', 'dưới', 'phía', 'bên', 'cần', 'nhờ', 'xin', 'vui', 'lòng', 'giúp'
]);

// Colloquial & shorthand expansions common in lecturer/student/technician reports
const SHORTHAND_RULES = [
  [wholeWord('ko|khg|hông'), 'không'],
  // "k"/"hong" + predicate = negation ("hong mat" = "không mát") ...
  [new RegExp(`${WORD_START}(?:k|hong)\\s+(?=(?:${NEGATABLE_PREDICATES})${WORD_END})`, 'giu'), 'không '],
  // ... otherwise unaccented "hong" means "hỏng" ("bi hong", "hong boc khoi").
  [wholeWord('hong'), 'hỏng'],
  [wholeWord('dc|đc'), 'được'],
  [wholeWord('bt'), 'bình thường'],
  [wholeWord('gv'), 'giảng viên'],
  [wholeWord('sv'), 'sinh viên'],
  [wholeWord('ktv'), 'kỹ thuật viên'],
  [wholeWord('csvc'), 'cơ sở vật chất'],
  [wholeWord('pccc'), 'phòng cháy chữa cháy'],
  [wholeWord('mcb'), 'aptomat'],
  [wholeWord('rcbo'), 'aptomat chống giật'],
  [wholeWord('đh'), 'điều hòa'],
  [wholeWord('mc'), 'máy chiếu'],
  [wholeWord('bsod'), 'màn hình xanh']
];

const MULTIWORD_CUE_RULES = [
  [new RegExp(`${WORD_START}(không|khong)\\s+(hề|có|bị|thấy|còn|he|co|bi|thay|con)${WORD_END}`, 'gu'), '$1_$2'],
  [new RegExp(`${WORD_START}(chưa|chua)\\s+(có|thấy|bị|co|thay|bi)${WORD_END}`, 'gu'), '$1_$2'],
  [wholeWord('tuy\\s+nhiên', 'gu'), 'tuy_nhiên'],
  [wholeWord('ngoài\\s+ra', 'gu'), 'ngoài_ra'],
  [wholeWord('đồng\\s+thời', 'gu'), 'đồng_thời'],
  [wholeWord('sau\\s+đó', 'gu'), 'sau_đó'],
  [wholeWord('kèm\\s+theo', 'gu'), 'kèm_theo'],
  [wholeWord('thậm\\s+chí', 'gu'), 'thậm_chí'],
  [wholeWord('bỗng\\s+nhiên', 'gu'), 'bỗng_nhiên'],
  [wholeWord('đột\\s+nhiên', 'gu'), 'đột_nhiên']
];

const joinMultiwordCues = (clause) =>
  MULTIWORD_CUE_RULES.reduce((text, [pattern, replacement]) => text.replace(pattern, replacement), clause);

/**
 * Clause-local negation state machine shared by the feature and hazard passes.
 * Negation covers up to 3 content words; "hay/hoặc" extend it, "và" extends it only
 * for existential negation and otherwise closes it so later hazards stay affirmed.
 */
const scanNegation = (words, coordinatorWindow) => {
  let remaining = 0;
  let existential = false;
  return words.map((word) => {
    if (CLAUSE_BREAKERS.has(word)) {
      remaining = 0;
      return { word, negated: false };
    }
    if (NEGATION_CUES.has(word)) {
      remaining = 3;
      existential = EXISTENTIAL_NEGATION_CUES.has(word);
      return { word, negated: false, isNegCue: true };
    }
    if (remaining > 0 && AND_COORDINATORS.has(word) && !existential) {
      remaining = 0;
      return { word, negated: false };
    }
    const negated = remaining > 0;
    if (negated) {
      if (OR_COORDINATORS.has(word) || AND_COORDINATORS.has(word)) remaining = Math.max(remaining, coordinatorWindow);
      else if (!STOPWORDS.has(word)) remaining -= 1;
    }
    return { word, negated };
  });
};

const clauseWords = (clause) => joinMultiwordCues(clause).match(/[\p{L}\p{N}_]+/gu) || [];

/**
 * Non-fire compound phrases containing "cháy" or "nổ" that indicate component burnout,
 * optical/display artifacts, or audio pops rather than actual open flames or explosions.
 */
const COMPONENT_BURNOUT_PATTERNS = [
  /cháy\s+(bóng|đèn|tuýp|led|cầu\s*chì|điểm\s*ảnh|hình|sáng|nét|màu|côn\s*loa|tụ|ic|chip|adapter|nguồn\s*led|chấn\s*lưu|mực)/gu,
  /bóng\s+(đèn\s+)?(bị\s+)?cháy/gu,
  /cầu\s*chì(\s+[\p{L}\p{N}]+){0,3}?\s+(bị\s+)?cháy/gu,
  /đèn\s+(chiếu\s+|led\s+|tuýp\s+|báo\s+)?(bị\s+)?cháy\s+bóng/gu,
  /chay\s+(bong|den|tuyp|led|cau\s*chi|diem\s*anh|hinh|sang|con\s*loa)/gu,
  /bong\s+(den\s+)?(bi\s+)?chay/gu,
  /cau\s*chi(\s+[a-z0-9]+){0,3}?\s+(bi\s+)?chay/gu,
  /(loa|âm\s*thanh|am\s*thanh|mic|micro)\s+[^.,;]{0,20}nổ\s+(lụp\s*bụp|bụp|lẹt\s*đẹt|lách\s*tách|rè)/gu,
  /nổ\s+(lụp\s*bụp|lẹt\s*đẹt|bụp\s*bụp)/gu
];

/**
 * Fire-safety equipment names contain "cháy"/"khói" ("bình chữa cháy", "đầu báo khói")
 * without describing a fire. Only masked after an equipment noun so a bare
 * "báo cháy phòng 301" (reporting a fire) still triggers the hazard detector.
 */
const SAFETY_EQUIPMENT_NAME_PATTERNS = [
  /(bình|tủ|chuông|đầu|nút|còi|đèn|hệ\s*thống|thiết\s*bị|trung\s*tâm)\s+(chữa|báo|cứu)\s+(cháy|hỏa|khói)/gu,
  /phòng\s+cháy\s+chữa\s+cháy/gu,
  /(binh|tu|chuong|dau|nut|coi|den|he\s*thong|thiet\s*bi|trung\s*tam)\s+(chua|bao|cuu)\s+(chay|hoa|khoi)/gu,
  /phong\s+chay\s+chua\s+chay/gu
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
  for (const pattern of SAFETY_EQUIPMENT_NAME_PATTERNS) {
    maskedForHazards = maskedForHazards.replace(pattern, ' thiet_bi_pccc ');
    asciiMaskedForHazards = asciiMaskedForHazards.replace(pattern, ' thiet_bi_pccc ');
  }

  // Split into clauses on punctuation so negation doesn't bleed across clauses
  const rawClauses = normalized.split(/[.,;!?()\n]+/u).map((c) => c.trim()).filter(Boolean);
  const maskClauses = maskedForHazards.split(/[.,;!?()\n]+/u).map((c) => c.trim()).filter(Boolean);

  const tokens = [];
  const affirmedClauses = [];
  const negatedTerms = new Set();

  for (const clause of rawClauses) {
    const words = clauseWords(clause);
    const scanned = scanNegation(words, 2);

    for (let i = 0; i < scanned.length; i += 1) {
      const { word: w, negated, isNegCue } = scanned[i];
      if (negated) {
        negatedTerms.add(w);
        negatedTerms.add(stripDiacritics(w));
        if (i + 1 < words.length) {
          const phrase2 = `${w} ${words[i + 1]}`;
          negatedTerms.add(phrase2);
          negatedTerms.add(stripDiacritics(phrase2));
        }
      }
      tokens.push(isNegCue
        ? { word: w, ascii: stripDiacritics(w), negated: false, isNegCue: true }
        : { word: w, ascii: stripDiacritics(w), negated });
    }
  }

  // Build affirmed hazard text directly from clause-aware negation state machine on maskClauses
  for (const clause of maskClauses) {
    const kept = scanNegation(clauseWords(clause), 3)
      .filter(({ negated, isNegCue }) => !negated && !isNegCue)
      .map(({ word }) => word);
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
