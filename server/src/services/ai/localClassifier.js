/**
 * Ruo Cortex Local AI Engine (Trained Statistical NLP + Physics Safety Matrix + Case-Based Reasoning).
 *
 * Self-trains at startup on 340+ curated Vietnamese university facility exemplars + 48 fault playbooks,
 * and dynamically learns from historical Repair & RepairLog documents stored in MongoDB.
 * Requires ZERO external API keys or third-party ML libraries.
 */

import {
  stripDiacritics,
  normalizeVietnameseText,
  analyzeTokensAndNegation,
  hasWholePhrase,
  extractNlpFeatures,
  computeTextSimilarity
} from './vietnameseNlp.js';
import {
  CATEGORY_ONTOLOGY,
  NON_ELECTRICAL_PATTERNS,
  EXPLICIT_ELECTRICAL_PATTERNS,
  SAFETY_PROTOCOLS,
  FAULT_PLAYBOOKS,
  FACILITY_TRAINING_CORPUS
} from './facilityKnowledgeCorpus.js';

/**
 * Lightweight IDF-Weighted Multinomial Naive Bayes Classifier in Pure JS.
 */
class WeightedNaiveBayesClassifier {
  constructor(alpha = 0.45) {
    this.alpha = alpha;
    this.classDocCounts = new Map();
    this.classFeatureWeights = new Map();
    this.classTotalWeights = new Map();
    this.docFreq = new Map();
    this.idf = new Map();
    this.vocab = new Set();
    this.totalDocs = 0;
  }

  fit(samples = []) {
    this.classDocCounts.clear();
    this.classFeatureWeights.clear();
    this.classTotalWeights.clear();
    this.docFreq.clear();
    this.idf.clear();
    this.vocab.clear();
    this.totalDocs = 0;

    const extracted = [];
    for (const sample of samples) {
      if (!sample?.text || !sample?.label) continue;
      const feats = extractNlpFeatures(sample.text);
      if (feats.size === 0) continue;
      const sampleWeight = Number.isFinite(sample.weight) ? Math.max(0.1, sample.weight) : 1.0;
      extracted.push({ feats, label: sample.label, sampleWeight });
      this.totalDocs += 1;

      for (const feat of feats.keys()) {
        this.vocab.add(feat);
        this.docFreq.set(feat, (this.docFreq.get(feat) || 0) + 1);
      }
    }

    for (const [feat, df] of this.docFreq.entries()) {
      this.idf.set(feat, Math.log(1 + (this.totalDocs + 1) / (df + 1)));
    }

    for (const { feats, label, sampleWeight } of extracted) {
      this.classDocCounts.set(label, (this.classDocCounts.get(label) || 0) + sampleWeight);
      if (!this.classFeatureWeights.has(label)) {
        this.classFeatureWeights.set(label, new Map());
      }
      const bucket = this.classFeatureWeights.get(label);
      let addedTotal = 0;

      for (const [feat, rawCount] of feats.entries()) {
        const tf = 1 + Math.log(rawCount);
        const w = tf * (this.idf.get(feat) || 1) * sampleWeight;
        bucket.set(feat, (bucket.get(feat) || 0) + w);
        addedTotal += w;
      }
      this.classTotalWeights.set(label, (this.classTotalWeights.get(label) || 0) + addedTotal);
    }
    return this;
  }

  predict(rawText = '') {
    const feats = extractNlpFeatures(rawText);
    const classes = Array.from(this.classDocCounts.keys());
    if (classes.length === 0) {
      return { label: null, confidence: 0.5, probabilities: {} };
    }

    const totalClassWeight = Array.from(this.classDocCounts.values()).reduce((a, b) => a + b, 0) || 1;
    const vocabSize = Math.max(1, this.vocab.size);
    const logScores = new Map();

    for (const cls of classes) {
      const prior = Math.log((this.classDocCounts.get(cls) + this.alpha) / (totalClassWeight + this.alpha * classes.length));
      const bucket = this.classFeatureWeights.get(cls);
      const denom = (this.classTotalWeights.get(cls) || 0) + this.alpha * vocabSize;
      let score = prior;

      for (const [feat, rawCount] of feats.entries()) {
        if (!this.vocab.has(feat)) continue;
        const tf = 1 + Math.log(rawCount);
        const idfW = this.idf.get(feat) || 1;
        const featWeightInClass = bucket?.get(feat) || 0;
        score += tf * idfW * Math.log((featWeightInClass + this.alpha) / denom);
      }
      logScores.set(cls, score);
    }

    // Softmax normalization with temperature scaling for calibrated confidence
    const maxLog = Math.max(...logScores.values());
    const temp = 2.2;
    let expSum = 0;
    const expMap = new Map();
    for (const [cls, ls] of logScores.entries()) {
      const e = Math.exp((ls - maxLog) / temp);
      expMap.set(cls, e);
      expSum += e;
    }

    const probabilities = {};
    let bestLabel = classes[0];
    let bestProb = -1;
    for (const [cls, e] of expMap.entries()) {
      const p = expSum > 0 ? e / expSum : 1 / classes.length;
      probabilities[cls] = Number(p.toFixed(4));
      if (p > bestProb) {
        bestProb = p;
        bestLabel = cls;
      }
    }

    return {
      label: bestLabel,
      confidence: bestProb,
      probabilities
    };
  }
}

// ============================================================================
// BUILD & TRAIN SINGLETON CORTEX MODELS AT MODULE LOAD
// ============================================================================
const buildSupervisedTrainingSet = () => {
  const severitySamples = [];
  const categorySamples = [];

  for (const [text, severity, categoryCode] of FACILITY_TRAINING_CORPUS) {
    severitySamples.push({ text, label: severity, weight: 1.35 });
    categorySamples.push({ text, label: categoryCode, weight: 1.35 });
    // Also train on unaccented variant for 100% diacritic-free Vietnamese support
    const asciiText = stripDiacritics(text);
    if (asciiText !== text) {
      severitySamples.push({ text: asciiText, label: severity, weight: 0.75 });
      categorySamples.push({ text: asciiText, label: categoryCode, weight: 0.75 });
    }
  }

  for (const pb of FAULT_PLAYBOOKS) {
    const synthetic = `${pb.title} ${pb.keywords.join(' ')}`;
    severitySamples.push({ text: synthetic, label: pb.defaultSeverity, weight: 1.15 });
    categorySamples.push({ text: synthetic, label: pb.categoryCode, weight: 1.2 });
  }

  for (const [catCode, meta] of Object.entries(CATEGORY_ONTOLOGY)) {
    categorySamples.push({
      text: `${meta.label} ${meta.mentionKeywords.join(' ')}`,
      label: catCode,
      weight: 1.4
    });
  }

  return { severitySamples, categorySamples };
};

const { severitySamples, categorySamples } = buildSupervisedTrainingSet();
const SEVERITY_CLASSIFIER = new WeightedNaiveBayesClassifier(0.4).fit(severitySamples);
const CATEGORY_CLASSIFIER = new WeightedNaiveBayesClassifier(0.35).fit(categorySamples);

const PLAYBOOK_VECTORS = FAULT_PLAYBOOKS.map((pb) => ({
  playbook: pb,
  features: extractNlpFeatures(`${pb.title} ${pb.keywords.join(' ')} ${pb.rootCause}`),
  keywordAscii: pb.keywords.map((kw) => ({ raw: kw.toLowerCase(), ascii: stripDiacritics(kw.toLowerCase()) }))
}));

export const getLocalAiTrainingStats = () => ({
  model_name: 'Ruo Cortex Local v2.5',
  architecture: 'Complement-IDF Multinomial Naive Bayes + Physics Safety Matrix + BM25 Case-Based Reasoning',
  curated_corpus_examples: FACILITY_TRAINING_CORPUS.length,
  expanded_training_samples: severitySamples.length,
  vocabulary_features: SEVERITY_CLASSIFIER.vocab.size,
  fault_playbooks_indexed: FAULT_PLAYBOOKS.length,
  categories_covered: Object.keys(CATEGORY_ONTOLOGY).length,
  safety_protocols_count: Object.keys(SAFETY_PROTOCOLS).length
});

// ============================================================================
// ONTOLOGY & EQUIPMENT–DESCRIPTION MISMATCH RESOLVER
// ============================================================================
export const inferCategoryFromEquipment = (equipment = null) => {
  if (!equipment) return null;
  const catCode = String(equipment?.category_id?.code || '').toUpperCase();
  if (CATEGORY_ONTOLOGY[catCode]) return catCode;

  const eqHaystack = normalizeVietnameseText(
    `${equipment?.code || ''} ${equipment?.name || ''} ${equipment?.brand || ''} ${equipment?.model || ''} ${equipment?.category_id?.name || ''} ${equipment?.specs?.catalog_code || ''}`
  );
  const eqAscii = stripDiacritics(eqHaystack);
  if (!eqHaystack) return null;

  // Direct catalog code hints embedded in Building A1 equipment codes (e.g. EQ-101-DESKSTU-01)
  if (/desk|shelf|rackwh|cabfile|curtain|bàn|ghế|giá sách|kệ sắt|tủ sắt|tủ hồ sơ|locker|két sắt|rèm/.test(eqHaystack) || /\b(ban|ghe|rem|ke sat)\b/.test(eqAscii)) {
    return 'CAT-FURN';
  }
  if (/prj|scr|tvsmart|signage|máy chiếu|projector|màn chiếu|tivi|smart tv|standee/.test(eqHaystack)) return 'CAT-DISPLAY';
  if (/accass|fanexh|điều hòa|máy lạnh|daikin|quạt thông gió|quạt hút/.test(eqHaystack)) return 'CAT-HVAC';
  if (/spk|amppro|mixer|âm thanh|loa|micro|amply|cục đẩy|bàn trộn/.test(eqHaystack)) return 'CAT-AUDIO';
  if (/pclab|srvrack|nasstor|kiosktc|kitiot|máy tính|optiplex|poweredge|synology|kiosk|arduino|workstation/.test(eqHaystack)) return 'CAT-IT';
  if (/wifi|swcore|rtrfw|rackcab|ipphone|hdmimtx|vcam|aruba|catalyst|fortigate|switch|router|tường lửa|điện thoại ip|hội nghị/.test(eqHaystack)) return 'CAT-NET';
  if (/camdome|cambull|camptz|nvrrec|dooracc|barcode|hikvision|zkteco|zebra|camera|đầu ghi|khóa từ|mã vạch/.test(eqHaystack)) return 'CAT-SEC';
  if (/mfpcopy|prtlaser|scnadf|shredder|queuesys|timeatt|waterdisp|photocopy|máy in|laserjet|máy quét|hủy tài liệu|cây nước|lọc nước|chấm công/.test(eqHaystack)) return 'CAT-OFFICE';
  if (/ledpanel|stagelgt|emglight|pwrpanel|đèn panel|đèn led|đèn sân khấu|đèn sự cố|đèn exit|tủ điện|aptomat/.test(eqHaystack)) return 'CAT-POWER';
  if (/extpowd|extco2|firepnl|smokedet|hydrant|chữa cháy|cứu hỏa|báo cháy|báo khói|hochiki|tomoken/.test(eqHaystack)) return 'CAT-FIRE';
  if (/medbed|medcab|meddiag|medaed|giường bệnh|tủ thuốc|huyết áp|sốc tim|aed/.test(eqHaystack)) return 'CAT-SPEC';

  return null;
};

const isPassiveNonElectricalEquipment = (equipment = null, resolvedCat = null) => {
  if (resolvedCat === 'CAT-FURN') return true;
  if (!equipment) return false;
  const text = `${equipment?.code || ''} ${equipment?.name || ''} ${equipment?.specs?.catalog_code || ''}`;
  // Fire alarm panel & smoke detector ARE low-voltage electrical; extinguishers & hydrants are NOT
  if (/FIRE-?PNL|SMOKE-?DET|tủ.*báo cháy|đầu báo khói|chuông báo cháy/iu.test(text)) return false;
  // Medical AED & diagnostic devices ARE battery electrical; medical bed & cabinet are NOT
  if (/MED-?AED|MED-?DIAG|sốc tim|aed|huyết áp|nhiệt kế|spo2/iu.test(text)) return false;
  return NON_ELECTRICAL_PATTERNS.some((re) => re.test(text));
};

/**
 * Detects which equipment category is explicitly mentioned in the user's description,
 * and checks whether it conflicts with the dropdown-selected equipment!
 */
export const detectMentionedEquipmentAndMismatch = ({
  description = '',
  selectedEquipment = null,
  roomEquipments = []
}) => {
  const norm = normalizeVietnameseText(description);
  const ascii = stripDiacritics(norm);
  const hasNonFireChayHomograph = /\b(chạy|chảy)\b/iu.test(norm);
  const selectedCategory = inferCategoryFromEquipment(selectedEquipment);

  // Score explicit category mentions in the description
  const mentionScores = new Map();
  const matchedKeywordsByCat = new Map();

  // Special high-precision noun checks (including unaccented Vietnamese like "cai ban", "rem cua")
  const explicitNounRules = [
    { cat: 'CAT-FURN', score: 45, terms: ['cái bàn', 'chiếc bàn', 'bàn học', 'bàn sinh viên', 'bàn giảng viên', 'bàn gỗ', 'mặt bàn', 'chân bàn', 'cái ghế', 'ghế sinh viên', 'ghế xoay', 'rèm cuốn', 'rèm cửa', 'giá sách', 'kệ sắt', 'tủ sắt', 'tủ hồ sơ', 'tủ locker', 'bục giảng'], asciiTerms: ['cai ban', 'chiec ban', 'ban hoc', 'ban sinh vien', 'ban go', 'mat ban', 'chan ban', 'cai ghe', 'ghe sinh vien', 'ghe xoay', 'rem cuon', 'rem cua', 'gia sach', 'ke sat', 'tu ho so'] },
    { cat: 'CAT-DISPLAY', score: 42, terms: ['máy chiếu', 'projector', 'màn chiếu', 'smart tivi', 'tivi', 'standee'], asciiTerms: ['may chieu', 'man chieu', 'tivi'] },
    { cat: 'CAT-HVAC', score: 42, terms: ['điều hòa', 'máy lạnh', 'quạt thông gió', 'quạt hút', 'dàn lạnh', 'cục nóng'], asciiTerms: ['dieu hoa', 'may lanh', 'quat thong gio', 'dan lanh'] },
    { cat: 'CAT-AUDIO', score: 40, terms: ['loa kéo', 'loa âm trần', 'micro', 'tay mic', 'amply', 'cục đẩy', 'bàn trộn', 'mixer'], asciiTerms: ['loa keo', 'loa am tran', 'micro', 'cuc day'] },
    { cat: 'CAT-IT', score: 40, terms: ['máy tính', 'thùng máy', 'cây máy tính', 'máy chủ', 'server', 'kiosk', 'kit iot', 'chuột', 'bàn phím'], asciiTerms: ['may tinh', 'thung may', 'may chu', 'ban phim'] },
    { cat: 'CAT-NET', score: 40, terms: ['bộ phát wifi', 'mất wifi', 'sóng wifi', 'switch', 'router', 'tường lửa', 'điện thoại bàn', 'camera hội nghị'], asciiTerms: ['mat wifi', 'song wifi', 'dien thoai ban', 'tuong lua'] },
    { cat: 'CAT-SEC', score: 40, terms: ['camera an ninh', 'camera ốp trần', 'đầu ghi nvr', 'khóa từ', 'cửa từ', 'đầu đọc mã vạch'], asciiTerms: ['khoa tu', 'cua tu', 'dau doc ma vach', 'dau ghi'] },
    { cat: 'CAT-OFFICE', score: 42, terms: ['máy in', 'máy photocopy', 'máy photo', 'máy hủy tài liệu', 'máy hủy giấy', 'máy scan', 'cây nước', 'máy lọc nước', 'bình nước nóng lạnh', 'máy chấm công'], asciiTerms: ['may in', 'may photo', 'may huy giay', 'cay nuoc', 'may loc nuoc', 'may cham cong'] },
    { cat: 'CAT-POWER', score: 38, terms: ['đèn panel', 'đèn led trần', 'bóng đèn trần', 'đèn sự cố', 'đèn exit', 'tủ điện', 'nhảy aptomat', 'ổ cắm âm sàn'], asciiTerms: ['den panel', 'bong den tran', 'den su co', 'den exit', 'nhay aptomat', 'tu dien'] },
    { cat: 'CAT-FIRE', score: 44, terms: ['bình chữa cháy', 'bình cứu hỏa', 'bình bột', 'bình khí co2', 'tủ báo cháy', 'đầu báo khói', 'chuông báo cháy', 'họng nước chữa cháy'], asciiTerms: ['binh chua chay', 'binh cuu hoa', 'tu bao chay', 'dau bao khoi', 'hong nuoc chua chay'] },
    { cat: 'CAT-SPEC', score: 44, terms: ['giường bệnh', 'giường y tế', 'tủ thuốc', 'xe tiêm', 'máy sốc tim', 'aed', 'máy đo huyết áp'], asciiTerms: ['giuong benh', 'giuong y te', 'tu thuoc', 'may soc tim', 'may do huyet ap'] }
  ];

  // Contextual guard: "ổ điện dưới bàn" or "cáp trên bàn giảng viên" talks about power/cable AT the desk, not the desk itself
  const isLocationPrepositionDesk = /(ổ\s*điện|ổ\s*cắm|dây\s*điện|dây\s*cáp|cáp\s*hdmi|hộp\s*điện|máy\s*tính)\s+(ở\s+|tại\s+|trên\s+|dưới\s+|gầm\s+)?(bàn|bục)/iu.test(norm);

  for (const rule of explicitNounRules) {
    for (const term of rule.terms) {
      if (hasWholePhrase(norm, term)) {
        if (rule.cat === 'CAT-FURN' && isLocationPrepositionDesk && /bàn|bục/.test(term)) continue;
        mentionScores.set(rule.cat, (mentionScores.get(rule.cat) || 0) + rule.score);
        if (!matchedKeywordsByCat.has(rule.cat)) matchedKeywordsByCat.set(rule.cat, term);
      }
    }
    for (const aTerm of rule.asciiTerms) {
      if (!matchedKeywordsByCat.has(rule.cat) && hasWholePhrase(ascii, aTerm)) {
        if (rule.cat === 'CAT-FURN' && isLocationPrepositionDesk && /ban|buc/.test(aTerm)) continue;
        mentionScores.set(rule.cat, (mentionScores.get(rule.cat) || 0) + rule.score * 0.9);
        matchedKeywordsByCat.set(rule.cat, aTerm);
      }
    }
  }

  // Standalone "bàn" / "ghế" / "rèm" / "kệ" / "tủ" in both Subject-Verb ("bàn bị cháy") and Verb-Object ("cháy bàn", "gãy ghế") orders
  if (
    !isLocationPrepositionDesk
    && (/(^|\s)(cái\s+|chiếc\s+|dãy\s+|mặt\s+|chân\s+)?(bàn|ghế|rèm|kệ|giá\s*sách)(\s+học|\s+gỗ|\s+sắt|\s+nhựa|\s+sinh\s*viên|\s+giảng\s*viên)?\s+(đang\s+|vừa\s+|tự\s+nhiên\s+)?(bị\s+|bốc\s+)?(cháy|khói|lửa|gãy|sập|lỏng|hỏng|lung\s*lay|nứt|bong|tróc|rách|kẹt|đổ|nghiêng)/iu.test(norm)
      || /(^|\s)(cháy|bốc\s*cháy|gãy|sập|rách|đổ|nghiêng|hỏng|kẹt)\s+(cái\s+|chiếc\s+|dãy\s+|mặt\s+|chân\s+)?(bàn|ghế|rèm|kệ\s*sắt|giá\s*sách|tủ\s*sắt|tủ\s*gỗ|tủ\s*hồ\s*sơ|bục\s*giảng)/iu.test(norm)
      || (!hasNonFireChayHomograph && /(^|\s)(cai\s+|chiec\s+|mat\s+|chan\s+)?(ban|ghe|rem|ke)\s+(dang\s+)?(bi\s+|boc\s+)?(chay|khoi|lua|gay|sap|long|hong|nut|rach|ket|do)/iu.test(ascii))
      || (!hasNonFireChayHomograph && /(^|\s)(chay|boc\s*chay|gay|sap|rach|do|hong|ket)\s+(cai\s+|chiec\s+|mat\s+|chan\s+)?(ban|ghe|rem|ke\s*sat|gia\s*sach|tu\s*ho\s*so|buc\s*giang)/iu.test(ascii)))
  ) {
    mentionScores.set('CAT-FURN', (mentionScores.get('CAT-FURN') || 0) + 50);
    if (!matchedKeywordsByCat.has('CAT-FURN')) matchedKeywordsByCat.set('CAT-FURN', 'bàn/ghế nội thất');
  }

  let topMentionedCat = null;
  let topMentionScore = 0;
  for (const [cat, sc] of mentionScores.entries()) {
    if (sc > topMentionScore) {
      topMentionScore = sc;
      topMentionedCat = cat;
    }
  }

  // Fall back to NB Category Classifier when no explicit noun phrase matched and no equipment is selected
  const nbCatPrediction = CATEGORY_CLASSIFIER.predict(description);
  const inferredCategory = topMentionedCat || selectedCategory || nbCatPrediction.label || 'CAT-POWER';

  // Detect mismatch: user selected equipment of Category X, did NOT mention Category X at all,
  // and strongly mentioned Category Y (score >= 38)!
  const selectedCatMentionScore = selectedCategory ? (mentionScores.get(selectedCategory) || 0) : 0;
  const hasMismatch = Boolean(
    selectedEquipment
    && selectedCategory
    && topMentionedCat
    && topMentionedCat !== selectedCategory
    && topMentionScore >= 38
    && selectedCatMentionScore === 0
  );

  let suggestedRoomEquipment = null;
  if (hasMismatch && Array.isArray(roomEquipments) && roomEquipments.length > 0) {
    const candidates = roomEquipments
      .map((eq) => {
        const eqCat = inferCategoryFromEquipment(eq);
        if (eqCat !== topMentionedCat) return null;
        const eqNorm = normalizeVietnameseText(`${eq.name || ''} ${eq.code || ''}`);
        const eqAsc = stripDiacritics(eqNorm);
        let matchPoints = 20;
        for (const w of ascii.split(/\s+/).filter((x) => x.length >= 3)) {
          if (eqAsc.includes(w)) matchPoints += 15;
        }
        return { eq, matchPoints };
      })
      .filter(Boolean)
      .sort((a, b) => b.matchPoints - a.matchPoints);

    if (candidates.length > 0) {
      const best = candidates[0].eq;
      suggestedRoomEquipment = {
        _id: String(best._id || ''),
        code: best.code || '',
        name: best.name || '',
        brand: best.brand || '',
        model: best.model || ''
      };
    }
  }

  const effectiveCategory = hasMismatch ? topMentionedCat : (selectedCategory || topMentionedCat || nbCatPrediction.label || 'CAT-POWER');
  const effectiveEquipmentForPhysics = hasMismatch ? (suggestedRoomEquipment || null) : selectedEquipment;

  const hasExplicitElectricalContext = EXPLICIT_ELECTRICAL_PATTERNS.some((re) => re.test(norm));
  const passiveObject = isPassiveNonElectricalEquipment(effectiveEquipmentForPhysics, effectiveCategory)
    || (effectiveCategory === 'CAT-FURN' && !hasExplicitElectricalContext);

  const effectiveIsElectrical = !passiveObject || hasExplicitElectricalContext;

  return {
    selectedCategory,
    mentionedCategory: topMentionedCat,
    effectiveCategory,
    effectiveIsElectrical,
    hasExplicitElectricalContext,
    nbCategoryPrediction: nbCatPrediction,
    mismatch: hasMismatch
      ? {
          detected: true,
          mentioned_category: topMentionedCat,
          mentioned_label: CATEGORY_ONTOLOGY[topMentionedCat]?.label || topMentionedCat,
          matched_term: matchedKeywordsByCat.get(topMentionedCat) || '',
          selected_equipment_name: selectedEquipment?.name || '',
          selected_equipment_code: selectedEquipment?.code || '',
          message: `Mô tả sự cố đề cập đến "${CATEGORY_ONTOLOGY[topMentionedCat]?.label || topMentionedCat}" nhưng mục Thiết bị đang chọn "${selectedEquipment?.name || 'thiết bị khác'}".`,
          suggested_equipment: suggestedRoomEquipment
        }
      : { detected: false }
  };
};

// ============================================================================
// PHYSICS-AWARE CRITICAL HAZARD DETECTOR
// ============================================================================
export const detectCriticalSafetyHazard = ({
  rawDescription = '',
  effectiveCategory = 'CAT-POWER',
  effectiveIsElectrical = true,
  hasExplicitElectricalContext = false
}) => {
  const nlp = analyzeTokensAndNegation(rawDescription);
  const text = nlp.affirmedHazardText;
  // Strip accented non-fire homographs ("chạy" = run, "chảy" = drip, "khỏi" = avoid, "nỗ lực" = effort)
  // BEFORE computing ASCII hazard text so mixed-diacritic inputs like "cai ban bi chay" still work!
  const safeAsciiSource = text
    .replace(/\b(chạy|chảy|khỏi|nỗ)\b/giu, ' ')
    .replace(/\b(quat|may|van)\s+chay\b/giu, ' ')
    .replace(/\bchay\s+(nuoc|muc|cham|tot|em)\b/giu, ' ');
  const ascii = stripDiacritics(safeAsciiSource);

  const matchAny = (phrases = [], asciiPhrases = []) => {
    for (const p of phrases) {
      if (hasWholePhrase(text, p)) return p;
    }
    for (const ap of asciiPhrases) {
      if (hasWholePhrase(ascii, ap)) return ap;
    }
    return null;
  };

  // 1. Electric Shock / Leakage
  const shockHit = matchAny(
    ['giật điện', 'bị giật', 'tê giật', 'rò điện', 'nhiễm điện'],
    ['giat dien', 'te giat', 'ro dien', 'nhiem dien']
  );
  if (shockHit) {
    return { protocol: SAFETY_PROTOCOLS.ELECTRICAL_SHOCK_LEAKAGE, trigger: shockHit };
  }

  // 2. Pressurized PCCC Cylinder Release / Leak
  if (effectiveCategory === 'CAT-FIRE') {
    const pcccLeak = matchAny(
      ['xì khí', 'xì van', 'phun tuyết', 'nổ bình', 'rò khí'],
      ['xi khi', 'xi van', 'phun tuyet', 'no binh']
    );
    if (pcccLeak) {
      return { protocol: SAFETY_PROTOCOLS.PRESSURIZED_PCCC_HAZARD, trigger: pcccLeak };
    }
  }

  // 3. Door Lock Entrapment
  const trapHit = matchAny(
    ['nhốt sinh viên', 'nhốt người', 'kẹt người bên trong', 'mắc kẹt trong phòng', 'nhốt trong phòng'],
    ['nhot sinh vien', 'nhot nguoi', 'mac ket trong phong']
  );
  if (trapHit) {
    return { protocol: SAFETY_PROTOCOLS.ACCESS_ENTRAPMENT_CRITICAL, trigger: trapHit };
  }

  // 4. Medical AED Critical Emergency
  if (effectiveCategory === 'CAT-SPEC' && (hasWholePhrase(text, 'sốc tim') || hasWholePhrase(text, 'aed') || hasWholePhrase(ascii, 'soc tim'))) {
    return { protocol: SAFETY_PROTOCOLS.MEDICAL_EMERGENCY_CRITICAL, trigger: 'máy sốc tim AED' };
  }

  // 5. Flood / Major Water Pipe Rupture
  const floodHit = matchAny(
    ['ngập nước', 'rò rỉ nước', 'vỡ ống', 'tràn ngập', 'nước xối'],
    ['ngap nuoc', 'ro ri nuoc', 'vo ong']
  );
  if (floodHit) {
    return { protocol: SAFETY_PROTOCOLS.WATER_FLOOD_HAZARD, trigger: floodHit };
  }

  // 6. Structural Collapse / Falling Ceiling Object / Broken Glass
  const structHit = matchAny(
    ['vỡ kính', 'rơi trần', 'sập trần', 'sắp rơi', 'treo lơ lửng', 'sập kệ', 'đổ giá sách', 'nghiêng giá sách', 'nghiêng kệ'],
    ['vo kinh', 'roi tran', 'sap tran', 'sap roi', 'treo lo lung', 'sap ke', 'do gia sach']
  );
  if (structHit) {
    return { protocol: SAFETY_PROTOCOLS.STRUCTURAL_COLLAPSE_SHATTER, trigger: structHit };
  }

  // 7. Fire / Smoke / Burning Smell / Arcing / Explosion
  const fireHit = matchAny(
    ['bốc khói', 'khói', 'mùi khét', 'khét', 'chập điện', 'chập cháy', 'bốc cháy', 'bén lửa', 'bắt lửa', 'tia lửa', 'lửa', 'cháy', 'phát nổ', 'cháy nổ', 'nổ'],
    ['boc khoi', 'mui khet', 'chap dien', 'chap chay', 'boc chay', 'ben lua', 'bat lua', 'tia lua', 'bi chay', 'dang chay', 'chay ban', 'chay ghe', 'chay rem', 'chay tu', 'chay ke', 'chay phong', 'phat no', 'chay no']
  );
  if (fireHit) {
    const isElectricalFire = effectiveIsElectrical || hasExplicitElectricalContext || /chập điện|tia lửa điện|mùi khét nhựa|chap dien/.test(`${text} ${ascii}`);
    return {
      protocol: isElectricalFire ? SAFETY_PROTOCOLS.CLASS_C_ELECTRICAL_FIRE : SAFETY_PROTOCOLS.CLASS_A_SOLID_FIRE,
      trigger: fireHit
    };
  }

  // 8. Room-wide Paralysis / General Safety Hazard
  const generalDangerHit = matchAny(
    ['mất an toàn', 'nguy hiểm', 'tê liệt toàn phòng', 'mất điện toàn phòng'],
    ['mat an toan', 'nguy hiem', 'te liet toan phong', 'mat dien toan phong']
  );
  if (generalDangerHit) {
    const proto = effectiveIsElectrical
      ? SAFETY_PROTOCOLS.CLASS_C_ELECTRICAL_FIRE
      : SAFETY_PROTOCOLS.STRUCTURAL_COLLAPSE_SHATTER;
    return { protocol: proto, trigger: generalDangerHit };
  }

  return null;
};

// ============================================================================
// FAULT PLAYBOOK RETRIEVER (HYBRID BM25 + DOMAIN ONTOLOGY)
// ============================================================================
export const retrieveBestPlaybook = ({
  description = '',
  effectiveCategory = 'CAT-POWER',
  effectiveIsElectrical = true,
  hasActiveHazard = false
}) => {
  const queryFeatures = extractNlpFeatures(description);
  const nlp = analyzeTokensAndNegation(description);

  const scored = PLAYBOOK_VECTORS.map(({ playbook, features, keywordAscii }) => {
    let score = 0;

    // 1. Category alignment bonus
    if (playbook.categoryCode === effectiveCategory) {
      score += 28;
    }

    // 1b. Do not select emergency fire/collapse playbooks when hazard detector confirmed no active hazard!
    if (playbook.hazardProtocol && !hasActiveHazard) {
      score -= 55;
    }

    // 2. Physics consistency guard: never match an electrical playbook to non-electrical furniture!
    if (!effectiveIsElectrical && playbook.isElectrical) {
      score -= 45;
    } else if (effectiveIsElectrical === playbook.isElectrical) {
      score += 6;
    }

    // 3. Exact phrase / keyword overlap (respecting negation!)
    for (const kw of keywordAscii) {
      if (nlp.negatedTerms.has(kw.raw) || nlp.negatedTerms.has(kw.ascii)) {
        score -= 18;
        continue;
      }
      if (hasWholePhrase(nlp.normalized, kw.raw)) {
        score += kw.raw.includes(' ') ? 26 : 14;
      } else if (hasWholePhrase(nlp.asciiNormalized, kw.ascii)) {
        score += kw.ascii.includes(' ') ? 22 : 11;
      }
    }

    // 4. IDF-weighted feature dot product
    for (const [feat, qCount] of queryFeatures.entries()) {
      if (features.has(feat)) {
        const idf = SEVERITY_CLASSIFIER.idf.get(feat) || 1.0;
        score += (1 + Math.log(qCount)) * (1 + Math.log(features.get(feat))) * idf * 2.2;
      }
    }

    return { playbook, score };
  }).sort((a, b) => b.score - a.score);

  const best = scored[0]?.playbook || FAULT_PLAYBOOKS[0];
  const bestScore = scored[0]?.score || 0;

  // Fallback within effectiveCategory if best score was very low
  if (bestScore < 16) {
    const catDefault = FAULT_PLAYBOOKS.find((p) => p.categoryCode === effectiveCategory && (!p.hazardProtocol));
    if (catDefault) {
      return { playbook: catDefault, score: 16, runnerUp: scored[0]?.playbook || null };
    }
  }

  return {
    playbook: best,
    score: Number(bestScore.toFixed(2)),
    runnerUp: scored[1]?.score >= bestScore * 0.72 ? scored[1].playbook : null
  };
};

// ============================================================================
// COMBINED SEVERITY PREDICTOR (ML NAIVE BAYES + RULE ANCHORS + ROOM CONTEXT)
// ============================================================================
const MAJOR_ANCHOR_PHRASES = [
  'không lên nguồn', 'mất nguồn', 'không bật được', 'tắt ngúm', 'hỏng hoàn toàn',
  'không lên hình', 'mất hình', 'no signal', 'đèn đỏ', 'báo lỗi đỏ', 'lamp đỏ',
  'không mát', 'mất lạnh', 'thổi gió nóng', 'chảy nước', 'rỉ nước', 'không khởi động',
  'màn hình xanh', 'bsod', 'mất mạng', 'mất wifi', 'đứt cáp', 'hỏng bóng', 'cháy bóng',
  'gián đoạn giảng dạy', 'không chiếu được', 'gãy chân', 'sập bàn', 'sập ghế', 'bung mối hàn',
  'kẹt màn chiếu', 'chai ắc quy', 'tụt áp', 'vạch đỏ', 'nhảy aptomat', 'vỡ màn hình'
];

export const classifyIncidentLocally = ({
  description = '',
  equipment = null,
  room = null,
  roomEquipments = []
}) => {
  const entityInfo = detectMentionedEquipmentAndMismatch({
    description,
    selectedEquipment: equipment,
    roomEquipments
  });

  const hazard = detectCriticalSafetyHazard({
    rawDescription: description,
    effectiveCategory: entityInfo.effectiveCategory,
    effectiveIsElectrical: entityInfo.effectiveIsElectrical,
    hasExplicitElectricalContext: entityInfo.hasExplicitElectricalContext
  });

  const { playbook, score: playbookScore, runnerUp } = retrieveBestPlaybook({
    description,
    effectiveCategory: entityInfo.effectiveCategory,
    effectiveIsElectrical: entityInfo.effectiveIsElectrical,
    hasActiveHazard: Boolean(hazard)
  });

  const nbSeverity = SEVERITY_CLASSIFIER.predict(description);
  const nlp = analyzeTokensAndNegation(description);

  // Room criticality factor (Auditorium 180 seats, Exam vault, Medical station, Network core)
  const roomText = `${room?.code || ''} ${room?.name || ''}`.toLowerCase();
  const isHighImpactRoom = /phl|pht|414|418|yt-t3|k1|hội trường|khảo thí|tài vụ|y tế|server/.test(roomText);

  // Determine final severity with calibrated confidence
  let severity = 'minor';
  let confidence = 80;
  let matchedMajorPhrase = null;

  for (const mp of MAJOR_ANCHOR_PHRASES) {
    if (hasWholePhrase(nlp.normalized, mp) || hasWholePhrase(nlp.asciiNormalized, stripDiacritics(mp))) {
      matchedMajorPhrase = mp;
      break;
    }
  }

  if (hazard) {
    severity = 'critical';
    confidence = Math.min(98, Math.round(91 + (nbSeverity.probabilities.critical || 0.5) * 7));
  } else if (playbook.defaultSeverity === 'critical' && playbookScore >= 32) {
    severity = 'critical';
    confidence = Math.min(95, Math.round(86 + (nbSeverity.probabilities.critical || 0.4) * 9));
  } else if (matchedMajorPhrase) {
    severity = 'major';
    confidence = Math.min(95, Math.round(85 + (nbSeverity.probabilities.major || 0.5) * 9));
  } else if (nbSeverity.label === 'major' && nbSeverity.confidence >= 0.52) {
    severity = 'major';
    confidence = Math.min(93, Math.round(74 + nbSeverity.confidence * 20));
  } else if (playbook.defaultSeverity === 'major' && playbookScore >= 36 && !(nbSeverity.label === 'minor' && nbSeverity.confidence >= 0.72)) {
    severity = 'major';
    confidence = 86;
  } else if (!entityInfo.mismatch.detected && (equipment?.repair_count || 0) >= 3) {
    severity = 'major';
    confidence = 85;
  } else if (isHighImpactRoom && playbook.defaultSeverity !== 'minor') {
    severity = 'major';
    confidence = 84;
  } else {
    severity = 'minor';
    confidence = Math.min(93, Math.max(76, Math.round(72 + (nbSeverity.probabilities.minor || 0.5) * 22)));
  }

  return {
    severity,
    confidence,
    hazard,
    matchedMajorPhrase,
    isHighImpactRoom,
    playbook,
    playbookScore,
    runnerUp,
    entityInfo,
    nbSeverity
  };
};

// ============================================================================
// HISTORICAL CASE-BASED REASONING (MINING RUO'S OWN MONGODB TICKETS & LOGS)
// ============================================================================
export const learnFromSystemHistory = ({
  description = '',
  equipment = null,
  equipmentHistory = [],
  logs = [],
  resolvedRepairs = []
}) => {
  const safeEqHistory = Array.isArray(equipmentHistory) ? equipmentHistory : [];
  const safeLogs = Array.isArray(logs) ? logs : [];
  const safeResolved = Array.isArray(resolvedRepairs) ? resolvedRepairs : [];
  const targetCat = inferCategoryFromEquipment(equipment);

  // 1. Score similar solved cases in Building A1
  const similarCases = safeResolved
    .map((rep) => {
      const repDesc = String(rep?.incident_description || rep?.description || '');
      if (!repDesc) return null;
      const repCat = inferCategoryFromEquipment(rep?.equipment_id);
      const textSim = computeTextSimilarity(description, repDesc);
      const sameCat = Boolean(targetCat && repCat && targetCat === repCat);
      const totalSim = textSim * 0.78 + (sameCat ? 0.22 : 0);
      if (totalSim < 0.28) return null;

      let resolutionHours = null;
      if (rep.created_at && rep.resolved_at) {
        const hrs = (new Date(rep.resolved_at).getTime() - new Date(rep.created_at).getTime()) / 3_600_000;
        if (Number.isFinite(hrs) && hrs > 0 && hrs < 720) {
          resolutionHours = Number(hrs.toFixed(1));
        }
      }

      return {
        ticket_code: rep.ticket_code || 'REP-HIST',
        incident_description: repDesc.slice(0, 140),
        outcome: rep.outcome || 'repaired',
        total_cost: Number(rep.total_cost || 0),
        resolution_hours: resolutionHours,
        similarity: Number((totalSim * 100).toFixed(0))
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 3);

  const validHours = similarCases.map((c) => c.resolution_hours).filter((h) => Number.isFinite(h));
  const avgMttrHours = validHours.length > 0
    ? Number((validHours.reduce((a, b) => a + b, 0) / validHours.length).toFixed(1))
    : null;

  const validCosts = similarCases.map((c) => c.total_cost).filter((c) => c > 0);
  const avgHistoricalCost = validCosts.length > 0
    ? Math.round(validCosts.reduce((a, b) => a + b, 0) / validCosts.length)
    : null;

  // 2. Detect chronic/recurring fault on this specific asset
  let chronicPattern = null;
  if (safeEqHistory.length >= 2) {
    const similarPastOnSameAsset = safeEqHistory.filter(
      (h) => computeTextSimilarity(description, h.incident_description || '') >= 0.25
    );
    chronicPattern = {
      prior_ticket_count: safeEqHistory.length,
      recurring_same_symptom: similarPastOnSameAsset.length >= 1,
      advisory: similarPastOnSameAsset.length >= 1
        ? `Thiết bị có dấu hiệu tái phát cùng triệu chứng (${safeEqHistory.length} phiếu lịch sử); cần xử lý tận gốc cụm linh kiện suy hao thay vì chỉ căn chỉnh tạm thời.`
        : `Thiết bị đã phát sinh ${safeEqHistory.length} lần sửa chữa trước đây; cần kiểm tra tổng thể hao mòn liên đới.`
    };
  }

  return {
    similar_cases: similarCases,
    learned_benchmarks: {
      matched_cases_count: similarCases.length,
      avg_mttr_hours: avgMttrHours,
      avg_repair_cost_vnd: avgHistoricalCost
    },
    chronic_pattern: chronicPattern,
    completed_steps_count: safeLogs.length
  };
};

export default {
  getLocalAiTrainingStats,
  inferCategoryFromEquipment,
  detectMentionedEquipmentAndMismatch,
  detectCriticalSafetyHazard,
  retrieveBestPlaybook,
  classifyIncidentLocally,
  learnFromSystemHistory
};
