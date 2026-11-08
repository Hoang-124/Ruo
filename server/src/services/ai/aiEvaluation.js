/**
 * Offline evaluation harness for Ruo Cortex Local AI triage.
 *
 * Measures the local classifier against a hand-labelled golden set that is kept
 * strictly separate from FACILITY_TRAINING_CORPUS, so the numbers reflect
 * generalisation rather than memorisation. Pure functions only: callers own I/O.
 */
import { classifyIncidentLocally } from './localClassifier.js';
import { FACILITY_TRAINING_CORPUS, CATEGORY_ONTOLOGY } from './facilityKnowledgeCorpus.js';
import { normalizeVietnameseText, stripDiacritics } from './vietnameseNlp.js';

export const SEVERITIES = ['minor', 'major', 'critical'];

// Representative dropdown selection per category, mirroring how a lecturer reports.
const SAMPLE_EQUIPMENT_NAMES = {
  'CAT-DISPLAY': 'Máy chiếu Epson',
  'CAT-HVAC': 'Điều hòa âm trần Daikin',
  'CAT-AUDIO': 'Loa hội trường JBL',
  'CAT-IT': 'Máy tính Dell Optiplex',
  'CAT-NET': 'Bộ phát Wifi Aruba',
  'CAT-SEC': 'Camera an ninh Hikvision',
  'CAT-OFFICE': 'Máy in HP LaserJet',
  'CAT-POWER': 'Đèn LED panel âm trần',
  'CAT-FIRE': 'Bình chữa cháy CO2 5kg',
  'CAT-FURN': 'Bàn ghế sinh viên',
  'CAT-SPEC': 'Thiết bị phòng y tế'
};

/** Text identity used for leakage checks: case, diacritics and punctuation insensitive. */
export const canonicalText = (text = '') =>
  stripDiacritics(normalizeVietnameseText(text))
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** Parses and validates JSONL golden cases; throws with the offending line number. */
export const parseGoldenSet = (raw = '') => {
  const cases = [];
  const ids = new Set();
  String(raw).split(/\r?\n/).forEach((line, index) => {
    if (!line.trim()) return;
    const where = `golden set line ${index + 1}`;
    let item;
    try {
      item = JSON.parse(line);
    } catch {
      throw new Error(`${where}: invalid JSON`);
    }
    if (typeof item.id !== 'string' || !item.id) throw new Error(`${where}: missing id`);
    if (ids.has(item.id)) throw new Error(`${where}: duplicate id ${item.id}`);
    if (typeof item.text !== 'string' || !item.text.trim()) throw new Error(`${where}: missing text`);
    if (!SEVERITIES.includes(item.expected_severity)) throw new Error(`${where}: invalid expected_severity`);
    if (item.category !== null && item.category !== undefined && !CATEGORY_ONTOLOGY[item.category]) {
      throw new Error(`${where}: unknown category ${item.category}`);
    }
    if (!Array.isArray(item.tags) || item.tags.some((tag) => typeof tag !== 'string')) {
      throw new Error(`${where}: tags must be a string array`);
    }
    ids.add(item.id);
    cases.push({ ...item, category: item.category || null });
  });
  return cases;
};

/** Returns ids of golden cases whose text also appears in the training corpus. */
export const findTrainingLeaks = (cases = []) => {
  const training = new Set(FACILITY_TRAINING_CORPUS.map(([text]) => canonicalText(text)));
  return cases.filter((item) => training.has(canonicalText(item.text))).map((item) => item.id);
};

const toEquipment = (category) => (category
  ? { code: `EQ-GOLD-${category}`, name: SAMPLE_EQUIPMENT_NAMES[category], category_id: { code: category } }
  : null);

const ratio = (part, whole) => (whole > 0 ? Number((part / whole).toFixed(4)) : null);

/**
 * Runs the classifier over every case and aggregates safety and quality metrics.
 * "Hazard" means a case labelled critical: the triage must return critical so the
 * safety protocol is shown. Missing one is a safety failure, not an accuracy blip.
 */
export const evaluateGoldenSet = (cases = [], classify = classifyIncidentLocally) => {
  const confusion = Object.fromEntries(SEVERITIES.map((e) => [e, Object.fromEntries(SEVERITIES.map((p) => [p, 0]))]));
  const tags = new Map();
  const results = [];
  let correct = 0;
  let categoryTotal = 0;
  let categoryCorrect = 0;

  for (const item of cases) {
    const outcome = classify({ description: item.text, equipment: toEquipment(item.category) });
    const predicted = SEVERITIES.includes(outcome?.severity) ? outcome.severity : 'minor';
    const predictedCategory = outcome?.entityInfo?.effectiveCategory || null;
    const hit = predicted === item.expected_severity;
    confusion[item.expected_severity][predicted] += 1;
    if (hit) correct += 1;
    if (item.category) {
      categoryTotal += 1;
      if (predictedCategory === item.category) categoryCorrect += 1;
    }
    for (const tag of item.tags) {
      const bucket = tags.get(tag) || { total: 0, correct: 0 };
      bucket.total += 1;
      if (hit) bucket.correct += 1;
      tags.set(tag, bucket);
    }
    results.push({ id: item.id, text: item.text, expected: item.expected_severity, predicted, hazard_trigger: outcome?.hazard?.trigger || null, hit });
  }

  const perClass = Object.fromEntries(SEVERITIES.map((cls) => {
    const truePositive = confusion[cls][cls];
    const predictedCount = SEVERITIES.reduce((sum, e) => sum + confusion[e][cls], 0);
    const actualCount = SEVERITIES.reduce((sum, p) => sum + confusion[cls][p], 0);
    return [cls, { support: actualCount, precision: ratio(truePositive, predictedCount), recall: ratio(truePositive, actualCount) }];
  }));

  const hazardCases = results.filter((r) => r.expected === 'critical');
  const safeCases = results.filter((r) => r.expected !== 'critical');
  const missedHazards = hazardCases.filter((r) => r.predicted !== 'critical');
  const falseCriticals = safeCases.filter((r) => r.predicted === 'critical');

  return {
    total: results.length,
    severity_accuracy: ratio(correct, results.length),
    category_accuracy: ratio(categoryCorrect, categoryTotal),
    hazard_recall: ratio(hazardCases.length - missedHazards.length, hazardCases.length),
    false_critical_rate: ratio(falseCriticals.length, safeCases.length),
    missed_hazards: missedHazards.map(({ id, text }) => ({ id, text })),
    false_criticals: falseCriticals.map(({ id, text, hazard_trigger }) => ({ id, text, hazard_trigger })),
    per_class: perClass,
    confusion,
    by_tag: Object.fromEntries([...tags.entries()].sort().map(([tag, { total, correct: ok }]) => [tag, { total, accuracy: ratio(ok, total) }])),
    results
  };
};

/** Quality metrics that may only improve; lists every one that dropped beyond tolerance. */
export const RATCHET_METRICS = ['severity_accuracy', 'category_accuracy'];

export const findRegressions = (metrics, baseline, tolerance = 0.01) => {
  if (!baseline) return [];
  const regressions = [];
  for (const key of RATCHET_METRICS) {
    if (typeof baseline[key] === 'number' && typeof metrics[key] === 'number' && metrics[key] < baseline[key] - tolerance) {
      regressions.push(`${key}: ${metrics[key]} < baseline ${baseline[key]}`);
    }
  }
  for (const [tag, { accuracy }] of Object.entries(baseline.by_tag || {})) {
    const current = metrics.by_tag?.[tag]?.accuracy;
    if (typeof accuracy === 'number' && typeof current === 'number' && current < accuracy - tolerance) {
      regressions.push(`tag ${tag}: ${current} < baseline ${accuracy}`);
    }
  }
  return regressions;
};

/** Compact, diff-friendly snapshot stored as the committed baseline. */
export const toBaseline = (metrics) => ({
  total: metrics.total,
  severity_accuracy: metrics.severity_accuracy,
  category_accuracy: metrics.category_accuracy,
  hazard_recall: metrics.hazard_recall,
  false_critical_rate: metrics.false_critical_rate,
  by_tag: Object.fromEntries(Object.entries(metrics.by_tag).map(([tag, { accuracy }]) => [tag, { accuracy }]))
});
