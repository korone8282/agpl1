const Product = require('../models/productModel');
const Data = require('../models/dataModel');
const ProductionOrder = require('../models/productionOrderModel');
const BuyerOrder = require('../models/buyerOrderModel');
const RawMaterial = require('../models/rawMaterialModel');
const StockLedger = require('../models/stockLedgerModel');
const Recipe = require('../models/recipeModel');
const Container = require('../models/containerModel');
const MaterialIssue = require('../models/materialIssueModel');
const AiMemory = require('../models/aiMemoryModel');
const KitchenVariance = require('../models/kitchenVarianceModel');
const UniversalPouch = require('../models/universalPouchModel');

const stopWords = new Set([
  'raw', 'material', 'materials', 'stock', 'pouch', 'pouches', 'plan', 'plans', 'order', 'orders',
  'show', 'list', 'what', 'whats', 'wht', 'how', 'much', 'many', 'status', 'created', 'produced', 'cooked',
  'made', 'today', 'tomorrow', 'yesterday', 'yesterdays', 'week', 'weeks', 'month', 'months', 'day', 'days',
  'remaining', 'left', 'yield', 'container', 'containers', 'manifest', 'manifests', 'recipe', 'recipes', 'bom',
  'total', 'worker', 'workers', 'count', 'packed', 'filled', 'dispatched', 'costing', 'cost', 'costs',
  'last', 'past', 'previous', 'this', 'for', 'the', 'was', 'were', 'are', 'in', 'of', 'on', 'from', 'to',
  'jan', 'january', 'feb', 'february', 'mar', 'march', 'apr', 'april', 'may', 'jun', 'june',
  'jul', 'july', 'aug', 'august', 'sep', 'sept', 'september', 'oct', 'october', 'nov', 'november', 'dec', 'december',
  'shift', 'shifts', 'kitchen', 'filling', 'dispatch', 'data', 'tell', 'ask', 'like', 'stuff'
]);

// Helper: fuzzy search product name & buyer in list (e.g. "rgg butter garlic rice", "butter garlic")
function findBestProductMatch(query, products) {
  const q = query.toLowerCase();

  // 1. Check if both buyer AND product name appear in query
  let buyerAndNameMatch = products.find(
    p =>
      p.name &&
      p.name.length > 3 &&
      q.includes(p.name.toLowerCase()) &&
      p.buyer &&
      q.includes(p.buyer.toLowerCase())
  );
  if (buyerAndNameMatch) return buyerAndNameMatch;

  // 2. Direct product name inclusion
  let matched = products.find(p => p.name && p.name.length > 3 && q.includes(p.name.toLowerCase()));
  if (matched) return matched;

  // 3. Key token matching without stop-words (e.g. "rgg butter garlic rice", "basmati", "ancient grain")
  const tokens = q.replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(t => t.length >= 2 && !stopWords.has(t) && !/^\d+$/.test(t));
  if (tokens.length === 0) return null;

  let bestScore = 0;
  let bestProd = null;

  for (const prod of products) {
    const pTokens = (prod.name || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(t => t.length >= 2);
    const bTokens = (prod.buyer || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(t => t.length >= 2);
    let nameScore = 0;
    let buyerScore = 0;

    for (const t of tokens) {
      if (pTokens.some(pt => pt === t || (t.length > 3 && (pt.includes(t) || t.includes(pt))))) {
        nameScore += 2;
      }
      if (bTokens.some(bt => bt === t)) {
        buyerScore += 1.5;
      }
    }

    const totalScore = nameScore > 0 ? nameScore + buyerScore : 0;
    if (totalScore > bestScore) {
      bestScore = totalScore;
      bestProd = prod;
    }
  }

  return bestScore >= 2 ? bestProd : null;
}

// Helper: extract explicit buyer filter if mentioned in query (e.g. "RGG", "HLA")
function findBuyerMatch(query, products) {
  const qTokens = query.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
  const distinctBuyers = [...new Set(products.map(p => (p.buyer || '').trim()).filter(Boolean))];
  for (const buyer of distinctBuyers) {
    const bLower = buyer.toLowerCase();
    if (qTokens.includes(bLower) || (bLower.length > 3 && query.toLowerCase().includes(bLower))) {
      return buyer;
    }
  }
  return null;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const MONTH_PATTERNS = [
  { idx: 0, regex: /\bjan(?:uary)?\b/i },
  { idx: 1, regex: /\bfeb(?:ruary)?\b/i },
  { idx: 2, regex: /\bmar(?:ch)?\b/i },
  { idx: 3, regex: /\bapr(?:il)?\b/i },
  { idx: 4, regex: /\b(?:in\s+may|for\s+may|may\s+month|may\s+202\d)\b/i },
  { idx: 5, regex: /\bjun(?:e)?\b/i },
  { idx: 6, regex: /\bjul(?:y)?\b/i },
  { idx: 7, regex: /\baug(?:ust)?\b/i },
  { idx: 8, regex: /\bsep(?:t(?:ember)?)?\b/i },
  { idx: 9, regex: /\boct(?:ober)?\b/i },
  { idx: 10, regex: /\bnov(?:ember)?\b/i },
  { idx: 11, regex: /\bdec(?:ember)?\b/i }
];

// Helper: parse date ranges (supports today, yesterday, last N days, last week, named months like Sept, specific dates)
function parseTimeframe(text) {
  const now = new Date();
  const currentYear = 2026;
  const lower = text.toLowerCase();

  if (lower.includes('tomorrow')) {
    const start = new Date(now);
    start.setDate(start.getDate() + 1);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setHours(23, 59, 59, 999);
    return { label: 'Tomorrow', start, end, isTomorrow: true, hasExplicitTimeframe: true };
  }

  if (lower.includes('today')) {
    const start = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0));
    const end = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999));
    return { label: 'Today', start, end, isToday: true, hasExplicitTimeframe: true };
  }

  if (lower.includes('yesterday')) {
    const yest = new Date(now);
    yest.setDate(yest.getDate() - 1);
    const start = new Date(Date.UTC(yest.getFullYear(), yest.getMonth(), yest.getDate(), 0, 0, 0, 0));
    const end = new Date(Date.UTC(yest.getFullYear(), yest.getMonth(), yest.getDate(), 23, 59, 59, 999));
    const dLabel = `${yest.getDate()} ${MONTH_NAMES[yest.getMonth()].slice(0, 3)} ${yest.getFullYear()}`;
    return { label: `Yesterday (${dLabel})`, start, end, isYesterday: true, hasExplicitTimeframe: true };
  }

  // Dynamic "last N days" / "past N days" (e.g. "last 4 days", "past 10 days")
  const nDaysMatch = lower.match(/\b(?:last|past|previous|in\s+last)\s+(\d+)\s+days?\b/i);
  if (nDaysMatch) {
    const n = Math.max(1, parseInt(nDaysMatch[1], 10));
    const startDay = new Date(now);
    startDay.setDate(startDay.getDate() - n);
    const start = new Date(Date.UTC(startDay.getFullYear(), startDay.getMonth(), startDay.getDate(), 0, 0, 0, 0));
    const end = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999));
    return { label: `Last ${n} Days`, start, end, hasExplicitTimeframe: true };
  }

  if (lower.includes('last week') || lower.includes('past week') || lower.includes('previous week')) {
    const startDay = new Date(now);
    startDay.setDate(startDay.getDate() - 7);
    const start = new Date(Date.UTC(startDay.getFullYear(), startDay.getMonth(), startDay.getDate(), 0, 0, 0, 0));
    const end = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999));
    return { label: 'Last Week (Past 7 Days)', start, end, hasExplicitTimeframe: true };
  }

  if (lower.includes('this week')) {
    const startDay = new Date(now);
    const day = startDay.getDay() || 7;
    startDay.setDate(startDay.getDate() - day + 1);
    const start = new Date(Date.UTC(startDay.getFullYear(), startDay.getMonth(), startDay.getDate(), 0, 0, 0, 0));
    const end = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999));
    return { label: 'This Week', start, end, hasExplicitTimeframe: true };
  }

  if (lower.includes('this month')) {
    const start = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0));
    const end = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999));
    return { label: `This Month (${MONTH_NAMES[now.getMonth()]} ${now.getFullYear()})`, start, end, monthIndex: now.getMonth(), hasExplicitTimeframe: true };
  }

  if (lower.includes('last month') || lower.includes('previous month')) {
    const m = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
    const y = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
    const start = new Date(Date.UTC(y, m, 1, 0, 0, 0, 0));
    const end = new Date(Date.UTC(y, m + 1, 0, 23, 59, 59, 999));
    return { label: `Last Month (${MONTH_NAMES[m]} ${y})`, start, end, monthIndex: m, hasExplicitTimeframe: true };
  }

  // Specific ISO date YYYY-MM-DD
  const isoMatch = lower.match(/\b(202\d)-(\d{1,2})-(\d{1,2})\b/);
  if (isoMatch) {
    const y = Number(isoMatch[1]);
    const m = Number(isoMatch[2]) - 1;
    const d = Number(isoMatch[3]);
    const start = new Date(Date.UTC(y, m, d, 0, 0, 0, 0));
    const end = new Date(Date.UTC(y, m, d, 23, 59, 59, 999));
    return { label: `${d} ${MONTH_NAMES[m] || ''} ${y}`, start, end, hasExplicitTimeframe: true };
  }

  // Specific date with month name (e.g. "17th oct", "17 oct", "oct 17")
  const specificDayMonth =
    lower.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b/i) ||
    lower.match(/\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{1,2})(?:st|nd|rd|th)?\b/i);

  if (specificDayMonth) {
    const isDayFirst = /^\d/.test(specificDayMonth[1]);
    const dayNum = parseInt(isDayFirst ? specificDayMonth[1] : specificDayMonth[2], 10);
    const mToken = (isDayFirst ? specificDayMonth[2] : specificDayMonth[1]).toLowerCase();
    const mIdx = MONTH_NAMES.findIndex(mn => mn.toLowerCase().startsWith(mToken.slice(0, 3)));
    if (mIdx !== -1 && dayNum >= 1 && dayNum <= 31) {
      const start = new Date(Date.UTC(currentYear, mIdx, dayNum, 0, 0, 0, 0));
      const end = new Date(Date.UTC(currentYear, mIdx, dayNum, 23, 59, 59, 999));
      return { label: `${dayNum} ${MONTH_NAMES[mIdx]} ${currentYear}`, start, end, hasExplicitTimeframe: true };
    }
  }

  // Specific Month by Name (e.g. "sept month", "for september", "in october", "aug")
  for (const mp of MONTH_PATTERNS) {
    if (mp.regex.test(lower)) {
      const yearMatch = lower.match(/\b(202\d)\b/);
      const y = yearMatch ? Number(yearMatch[1]) : currentYear;
      const start = new Date(Date.UTC(y, mp.idx, 1, 0, 0, 0, 0));
      const end = new Date(Date.UTC(y, mp.idx + 1, 0, 23, 59, 59, 999));
      return {
        label: `${MONTH_NAMES[mp.idx]} ${y}`,
        start,
        end,
        monthIndex: mp.idx,
        hasExplicitTimeframe: true
      };
    }
  }

  // Default past 30 days
  const defaultStart = new Date(now);
  defaultStart.setDate(defaultStart.getDate() - 30);
  return { label: 'Past 30 Days', start: defaultStart, end: now, hasExplicitTimeframe: false };
}

// Number and quantity formatting engine (supports up to 4 decimals by default)
function formatNum(value, maxDecimals = 4) {
  const num = Number(value);
  if (isNaN(num)) return '0';
  if (Number.isInteger(num)) return num.toLocaleString();
  const fixed = num.toFixed(maxDecimals);
  const clean = parseFloat(fixed);
  return clean.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxDecimals
  });
}

function formatPouch(value) {
  const num = Math.round(Number(value) || 0);
  return num.toLocaleString();
}

function isNonStdUnit(unit) {
  if (!unit) return false;
  const u = String(unit).trim().toLowerCase();
  if (!u) return false;
  return !['kg', 'kgs', 'g', 'gm', 'gms', 'l', 'ltr', 'ml'].includes(u);
}

function getRmVariants(rm) {
  if (!rm) return [];
  const arr = Array.isArray(rm.unitWeightVariants)
    ? rm.unitWeightVariants.map(Number).filter(n => !isNaN(n) && n > 0)
    : [];
  if (arr.length === 0 && rm.unitWeightKg && Number(rm.unitWeightKg) > 0) {
    arr.push(Number(rm.unitWeightKg));
  }
  return arr;
}

function normalizePackSizeKg(val) {
  const num = Number(val) || 0;
  if (num <= 0) return 0;
  return num > 10 ? parseFloat((num / 1000).toFixed(4)) : parseFloat(num.toFixed(4));
}

function getRecipeStandardYieldKg(rec) {
  if (!rec) return 100;
  if (Number(rec.batchCookedWeightKg) > 0) return Number(rec.batchCookedWeightKg);
  if (Number(rec.cookedBatchWeight) > 0) return Number(rec.cookedBatchWeight);
  if (Array.isArray(rec.ingredients) && rec.ingredients.length > 0) {
    const sumKg = rec.ingredients.reduce((acc, ing) => {
      const u = String(ing.unit || 'kg').trim().toLowerCase();
      const mult = u === 'g' || u === 'gm' || u === 'ml' ? 0.001 : 1;
      return acc + (Number(ing.edibleQuantity) || 0) * mult;
    }, 0);
    if (sumKg > 0) return parseFloat(sumKg.toFixed(4));
  }
  return 100;
}

// Extract active user preferences and formatting rules from memory
function extractLearnedPreferences(activeRules = []) {
  let decimalPlaces = 4; // Default 4 decimals for BOM, recipes, batches & weights
  let varianceThreshold = 8.0;
  let maxPouchPerShift = 25000;
  let maxYieldKgPerBatch = 800;
  const customPackSizes = {};

  activeRules.forEach(r => {
    if (r.metadata?.paramType === 'DECIMAL_PLACES' || r.topic === 'DECIMAL_PRECISION') {
      const match = (r.rule || '').match(/(\d+)\s*decimal/i);
      if (match) decimalPlaces = parseInt(match[1], 10);
    }

    const text = (r.rule || '').toLowerCase();
    
    // Decimal precision matching: e.g. "keep it till 3-4 digits", "3-4 decimals", "max 2 decimal places"
    const decMatch = text.match(/(?:keep|show|round|format|limit|use|set|restrict)[^\d]*(\d+)\s*(?:-|to)?\s*(\d+)?\s*(?:decimal|decimals|digits|places)/i) ||
                     text.match(/(\d+)\s*(?:-|to)?\s*(\d+)?\s*(?:decimal|decimals|digits|places)/i);
    if (decMatch) {
      const digits = parseInt(decMatch[2] || decMatch[1], 10);
      if (!isNaN(digits)) {
        decimalPlaces = Math.max(0, Math.min(6, digits));
      }
    }

    const varMatch = text.match(/variance[^\d]*(\d+(?:\.\d+)?)/i);
    if (varMatch) varianceThreshold = parseFloat(varMatch[1]);

    const pouchMatch = text.match(/pouch (?:threshold|limit|per shift)[^\d]*(\d+)/i);
    if (pouchMatch) maxPouchPerShift = parseInt(pouchMatch[1], 10);
  });

  return {
    decimalPlaces,
    varianceThreshold,
    maxPouchPerShift,
    maxYieldKgPerBatch,
    customPackSizes
  };
}

// Detect if query is a user instruction, correction, or teaching prompt
function detectCorrectionOrRule(text) {
  const lower = text.toLowerCase().trim();

  // 1. Decimal precision instructions (e.g. "keep it till 3-4 digits", "round to 3 decimals")
  if (
    lower.includes('decimal') ||
    lower.includes('decimals') ||
    lower.includes('digit') ||
    lower.includes('digits') ||
    lower.includes('round to') ||
    lower.includes('places')
  ) {
    const match = lower.match(/(?:keep|show|round|format|limit|restrict|use|set|till|to)\s*(?:all\s*)?(?:the\s*)?(?:it\s*)?(?:decimal|decimals|digits|numbers|places)?\s*(?:places|digits)?\s*(?:till|to|at|up to|within|around)?\s*(\d+)(?:\s*-\s*(\d+))?\s*(?:decimal|decimals|digits|places)?/i) ||
                  lower.match(/(\d+)\s*(?:-|to)?\s*(\d+)?\s*(?:decimal|decimals|digits|places)/i);
    if (match) {
      const digits = parseInt(match[2] || match[1], 10);
      const validDigits = Math.max(0, Math.min(6, digits));
      return {
        isCorrection: true,
        topic: 'DECIMAL_PRECISION',
        rule: `Format all numerical calculations and batch quantities to max ${validDigits} decimal places`,
        targetValue: validDigits,
        paramType: 'DECIMAL_PLACES'
      };
    }
  }

  // 2. Variance tolerance instructions
  if (lower.includes('variance') && (lower.includes('threshold') || lower.includes('tolerance') || lower.includes('limit') || lower.includes('accept') || lower.includes('allow') || lower.includes('%'))) {
    const varMatch = lower.match(/(\d+(?:\.\d+)?)\s*%/i) || lower.match(/(\d+(?:\.\d+)?)/i);
    if (varMatch) {
      const val = parseFloat(varMatch[1]);
      return {
        isCorrection: true,
        topic: 'VARIANCE_TOLERANCE',
        rule: `Accept kitchen cooking variance up to ±${val}%`,
        targetValue: val,
        paramType: 'VARIANCE_PERCENT'
      };
    }
  }

  // 3. Pack size rule
  const packMatch = lower.match(/pack\s*size\s*(?:for|of)\s*([a-z0-9\s]+?)\s*(?:is|should be|must be|=)\s*(\d+(?:\.\d+)?)/i);
  if (packMatch) {
    const prodName = packMatch[1].trim();
    const size = parseFloat(packMatch[2]);
    return {
      isCorrection: true,
      topic: prodName,
      rule: `Pack size for ${prodName} is ${size} kg`,
      targetValue: size,
      paramType: 'PACK_SIZE'
    };
  }

  // 4. General corrections & explicit teaching
  const correctionPrefixes = [
    'no,', 'no ', 'actually,', 'actually ', 'that is wrong', "that's wrong",
    'wrong answer', 'you are wrong', 'not correct', 'incorrect', 'mistake',
    'remember that', 'remember:', 'note that', 'note:', 'from now on',
    'always calculate', 'always remember', 'learn that', 'learn this:',
    'the correct answer', 'correct it to', 'it should be', 'it must be',
    'i want you to', 'you should', 'please make sure', 'keep in mind'
  ];

  for (const prefix of correctionPrefixes) {
    if (lower.startsWith(prefix) || lower.includes(prefix)) {
      return {
        isCorrection: true,
        topic: 'OPERATIONS_RULE',
        rule: text.trim(),
        prefix
      };
    }
  }

  return { isCorrection: false };
}

// 1. DATA AUDIT: Check Filling logs, Kitchen yields, Costing, Variance for typos & anomalies
async function auditDataAnomalies(activeRules = []) {
  let maxVarianceAllowed = 8.0; // percent
  let maxPouchPerShift = 25000;
  let maxYieldKgPerBatch = 800; // typical single cooked batch is 150-450 kg

  activeRules.forEach(r => {
    const text = (r.rule || '').toLowerCase();
    const varMatch = text.match(/variance (?:threshold|limit|tolerance|up to) (?:is )?(\d+(?:\.\d+)?)/);
    if (varMatch) maxVarianceAllowed = parseFloat(varMatch[1]);
    const pouchMatch = text.match(/pouch (?:threshold|limit|per shift) (?:is )?(\d+)/);
    if (pouchMatch) maxPouchPerShift = parseInt(pouchMatch[1], 10);
    const yieldMatch = text.match(/yield (?:threshold|limit|per cooker) (?:is )?(\d+)/);
    if (yieldMatch) maxYieldKgPerBatch = parseInt(yieldMatch[1], 10);
  });

  const anomalies = {
    packSizeTypos: [],
    pouchCountTypos: [],
    yieldAnomalies: [],
    kitchenVariances: [],
    costingAnomalies: [],
    negativeStocks: [],
    thresholdsUsed: { maxVarianceAllowed, maxPouchPerShift, maxYieldKgPerBatch }
  };

  // Scan Data collection for pack size typos, excessive pouches, extreme cooked yields
  const anomalousDocs = await Data.find({
    $or: [
      { 'dataList.packSize': { $gt: 2 } },
      { 'dataList.pouchQuantity': { $gt: maxPouchPerShift } },
      { 'dataList.filled': { $gt: maxPouchPerShift } },
      { 'dataList.yield': { $gt: maxYieldKgPerBatch } }
    ]
  }).sort({ createdAt: -1 }).limit(60);

  anomalousDocs.forEach(doc => {
    const sec = doc.sectionMain || 'Shift';
    const dateStr = doc.createdAt ? new Date(doc.createdAt).toLocaleDateString('en-GB') : 'Unknown';

    (doc.dataList || []).forEach(item => {
      const ps = Number(item.packSize);
      if (ps && (ps >= 5 || ps > 2)) {
        anomalies.packSizeTypos.push({
          date: dateStr,
          section: sec,
          product: item.productName || 'Unknown',
          buyer: item.buyerName || 'General',
          currentValue: `${ps} kg`,
          likelyIntended: ps >= 100 ? `${(ps / 1000).toFixed(3)} kg` : `${(ps / 100).toFixed(2)} kg`,
          issue: `Pack size entered as ${ps} (likely meant ${ps >= 100 ? ps / 1000 : ps / 100} kg)`,
          docId: doc._id
        });
      }

      const pq = Number(item.pouchQuantity || item.filled);
      if (pq && pq > maxPouchPerShift) {
        anomalies.pouchCountTypos.push({
          date: dateStr,
          section: sec,
          product: item.productName || 'Unknown',
          buyer: item.buyerName || 'General',
          currentValue: pq.toLocaleString(),
          likelyIntended: pq % 10 === 0 && pq > 50000 ? Math.round(pq / 10).toLocaleString() : 'Typo / Multi-day sum',
          issue: `Abnormally high pouch count (${pq.toLocaleString()}) logged in a single shift`,
          docId: doc._id
        });
      }

      const y = Number(item.yield);
      const bQty = Number(item.batchQuantity) || 1;
      if (sec === 'Kitchen' && y && y > maxYieldKgPerBatch) {
        anomalies.yieldAnomalies.push({
          date: dateStr,
          product: item.productName || 'Unknown',
          buyer: item.buyerName || 'General',
          currentYield: `${y} kg`,
          batchQty: bQty,
          issue: `Cooked yield of ${y} kg is exceptionally high for typical 150-400 kg cookers`,
          docId: doc._id
        });
      }
    });
  });

  // Scan KitchenVariance for variance percentage > maxVarianceAllowed
  const highVariances = await KitchenVariance.find({
    $or: [
      { variancePercent: { $gt: maxVarianceAllowed } },
      { variancePercent: { $lt: -maxVarianceAllowed } }
    ]
  }).sort({ productionDate: -1 }).limit(10);

  highVariances.forEach(kv => {
    anomalies.kitchenVariances.push({
      issueNumber: kv.issueNumber || 'N/A',
      product: kv.productName,
      buyer: kv.buyerName || 'General',
      date: kv.productionDate ? new Date(kv.productionDate).toLocaleDateString('en-GB') : 'Unknown',
      issuedKg: kv.issuedQuantityKg,
      yieldKg: kv.totalYieldKg,
      varianceKg: kv.varianceKg,
      variancePercent: kv.variancePercent
    });
  });

  // Scan RawMaterial for negative stocks & costing/rate typos
  const badRMs = await RawMaterial.find({
    $or: [
      { currentStock: { $lt: 0 } },
      { averagePurchaseRate: { $lte: 0 } },
      { lastPurchaseRate: { $lte: 0 } }
    ]
  }).sort({ currentStock: 1 }).limit(15);

  badRMs.forEach(rm => {
    if (rm.currentStock < 0) {
      anomalies.negativeStocks.push({
        material: rm.name,
        currentStock: `${rm.currentStock} ${rm.baseUnit}`,
        supplier: rm.preferredSupplier || '—',
        issue: `Negative inventory balance indicates untracked inward GRN or double issue`
      });
    }
    if ((rm.averagePurchaseRate <= 0 || rm.lastPurchaseRate <= 0)) {
      anomalies.costingAnomalies.push({
        material: rm.name,
        currentStock: `${rm.currentStock} ${rm.baseUnit}`,
        avgRate: `₹${rm.averagePurchaseRate || 0}`,
        lastRate: `₹${rm.lastPurchaseRate || 0}`,
        issue: `Zero or missing purchase rate corrupts batch costing calculations`
      });
    }
  });

  return anomalies;
}

// 2. PRODUCTION ORDER FEASIBILITY: Evaluates PO readiness, pouch stock, and BOM raw materials
async function checkProductionOrderFeasibility(orderQuery, activeRules = []) {
  const cleanQ = orderQuery.replace(/[^a-zA-Z0-9\s-]/g, ' ');
  const poMatch = cleanQ.match(/po[-\s]?(\w+)/i) || cleanQ.match(/\b(\d{4,6})\b/);
  const orderTarget = poMatch ? poMatch[1] : null;

  let order = null;
  if (orderTarget) {
    order = await ProductionOrder.findOne({
      orderNumber: new RegExp(orderTarget, 'i')
    }).populate('items.recipe');
  }

  if (!order) {
    const allProds = await Product.find({}, 'name buyer');
    const matchedP = findBestProductMatch(orderQuery, allProds);
    if (matchedP) {
      order = await ProductionOrder.findOne({
        'items.productName': new RegExp(matchedP.name, 'i')
      }).sort({ productionDate: -1 }).populate('items.recipe');
    }
  }

  if (!order) {
    const recentOrders = await ProductionOrder.find({}).sort({ productionDate: -1 }).limit(5);
    return {
      found: false,
      searchedFor: orderTarget || orderQuery,
      availableOrders: recentOrders.map(o => ({
        orderNumber: o.orderNumber,
        buyer: o.buyerName,
        products: (o.items || []).map(i => i.productName).join(', '),
        date: o.productionDate ? new Date(o.productionDate).toLocaleDateString('en-GB') : 'N/A'
      }))
    };
  }

  const currentMonth = new Date().getMonth() + 1;
  const itemsEvaluation = [];
  let totalPouchesNeeded = 0;
  let totalPouchesAvailable = 0;
  let hasShortage = false;
  const rawMaterialRequirements = new Map();

  for (const item of order.items) {
    const pName = item.productName;
    const targetP = Number(item.targetPouches) || 0;
    const batches = Number(item.batches) || (item.recipe ? targetP / (item.recipe.nominalBatchYieldPouches || 250) : 1);
    totalPouchesNeeded += targetP;

    // Check Product pouch inventory
    const allP = await Product.find({}, 'name buyer pouches');
    const matchedP = findBestProductMatch(pName, allP);
    let pouchAvailable = 0;
    if (matchedP && matchedP.pouches && matchedP.pouches[currentMonth - 1]) {
      pouchAvailable = Number(matchedP.pouches[currentMonth - 1].remain) || 0;
    }
    totalPouchesAvailable += pouchAvailable;

    const pouchShortage = Math.max(0, targetP - pouchAvailable);
    if (pouchShortage > 0) hasShortage = true;

    // Check Recipe & Ingredients BOM
    let recipeDoc = item.recipe;
    if (!recipeDoc || !recipeDoc.ingredients || recipeDoc.ingredients.length === 0) {
      recipeDoc = await Recipe.findOne({ productName: new RegExp(`^${pName}$`, 'i') }) || await Recipe.findOne({ productName: new RegExp(pName, 'i') });
    }

    const ingredientsList = [];
    if (recipeDoc && recipeDoc.ingredients) {
      for (const ing of recipeDoc.ingredients) {
        const grossNeeded = Number(ing.edibleQuantity || 0) * Number(ing.lossFactor || 1.0) * batches;
        const matName = ing.materialName;

        let rmDoc = null;
        if (ing.rawMaterial) {
          rmDoc = await RawMaterial.findById(ing.rawMaterial);
        }
        if (!rmDoc) {
          rmDoc = await RawMaterial.findOne({ name: new RegExp(`^${matName}$`, 'i') });
        }

        const currentStock = rmDoc ? Number(rmDoc.currentStock) || 0 : 0;
        const baseUnit = rmDoc?.baseUnit || ing.unit || 'kg';
        const variants = getRmVariants(rmDoc);
        const isNonStd = isNonStdUnit(baseUnit) && variants.length > 0;
        const primaryVariantKg = isNonStd ? variants[0] : 0;
        const currentStockKg = isNonStd ? parseFloat((currentStock * primaryVariantKg).toFixed(4)) : currentStock;
        const rmShortage = Math.max(0, grossNeeded - currentStockKg);
        if (rmShortage > 0) hasShortage = true;

        const ingEval = {
          materialName: matName,
          grossNeeded: parseFloat(grossNeeded.toFixed(4)),
          unit: 'kg',
          stockUnit: baseUnit,
          isNonStd,
          variants,
          primaryVariantKg,
          currentStock,
          currentStockKg,
          shortage: parseFloat(rmShortage.toFixed(4)),
          isSufficient: rmShortage === 0,
          leadTimeDays: rmDoc?.leadTimeDays || 1,
          preferredSupplier: rmDoc?.preferredSupplier || 'Local Vendor',
          rate: rmDoc?.averagePurchaseRate || rmDoc?.lastPurchaseRate || 0
        };
        ingredientsList.push(ingEval);

        if (!rawMaterialRequirements.has(matName)) {
          rawMaterialRequirements.set(matName, { ...ingEval });
        } else {
          const existing = rawMaterialRequirements.get(matName);
          existing.grossNeeded = parseFloat((existing.grossNeeded + ingEval.grossNeeded).toFixed(4));
          existing.shortage = parseFloat(Math.max(0, existing.grossNeeded - existing.currentStockKg).toFixed(4));
          if (existing.shortage > 0) existing.isSufficient = false;
        }
      }
    }

    itemsEvaluation.push({
      productName: pName,
      targetPouches: targetP,
      batches: parseFloat(batches.toFixed(4)),
      pouchAvailable,
      pouchShortage,
      pouchSufficient: pouchShortage === 0,
      recipeFound: Boolean(recipeDoc),
      ingredients: ingredientsList
    });
  }

  return {
    found: true,
    order: {
      orderNumber: order.orderNumber,
      buyerName: order.buyerName || 'General',
      productionDate: order.productionDate ? new Date(order.productionDate).toLocaleDateString('en-GB') : 'N/A',
      status: order.status,
      priority: order.priority
    },
    totalPouchesNeeded,
    totalPouchesAvailable,
    hasShortage,
    itemsEvaluation,
    aggregateMaterials: Array.from(rawMaterialRequirements.values())
  };
}

// 3. MASTER BUYER ORDER ADEQUACY: Aggregates finished pouches & BOM raw materials across all line items
async function checkBuyerOrderAdequacy(orderQuery, activeRules = []) {
  const cleanQ = orderQuery.replace(/[^a-zA-Z0-9\s-]/g, ' ');
  const boMatch = cleanQ.match(/bo[-\s]?(\w+)/i) || cleanQ.match(/\b(\d{4,6})\b/);
  const orderTarget = boMatch ? boMatch[1] : null;

  let order = null;
  if (orderTarget) {
    order = await BuyerOrder.findOne({
      orderNumber: new RegExp(orderTarget, 'i')
    }).populate('items.recipe');
  }

  if (!order) {
    order = await BuyerOrder.findOne({
      $or: [
        { buyerName: new RegExp(orderQuery.trim(), 'i') },
        { 'items.productName': new RegExp(orderQuery.trim(), 'i') }
      ]
    }).sort({ orderDate: -1 }).populate('items.recipe');
  }

  if (!order) {
    const recentBuyerOrders = await BuyerOrder.find({}).sort({ orderDate: -1 }).limit(5);
    return {
      found: false,
      searchedFor: orderTarget || orderQuery,
      availableOrders: recentBuyerOrders.map(b => ({
        orderNumber: b.orderNumber,
        buyer: b.buyerName,
        products: (b.items || []).map(i => i.productName).join(', '),
        date: b.orderDate ? new Date(b.orderDate).toLocaleDateString('en-GB') : 'N/A'
      }))
    };
  }

  const currentMonth = new Date().getMonth() + 1;
  const itemsEvaluation = [];
  let totalPouchesNeeded = 0;
  let totalPouchesAvailable = 0;
  let hasShortage = false;
  const aggregateMaterials = new Map();

  for (const item of order.items) {
    const pName = item.productName;
    const targetP = Number(item.targetPouches) || 0;
    totalPouchesNeeded += targetP;

    // Finished pouch stock
    const allP = await Product.find({}, 'name buyer pouches');
    const matchedP = findBestProductMatch(pName, allP);
    let pouchAvailable = 0;
    if (matchedP && matchedP.pouches && matchedP.pouches[currentMonth - 1]) {
      pouchAvailable = Number(matchedP.pouches[currentMonth - 1].remain) || 0;
    }
    totalPouchesAvailable += pouchAvailable;

    const pouchShortage = Math.max(0, targetP - pouchAvailable);
    if (pouchShortage > 0) hasShortage = true;

    // Recipe & Ingredients
    let recipeDoc = item.recipe;
    if (!recipeDoc || !recipeDoc.ingredients || recipeDoc.ingredients.length === 0) {
      recipeDoc = await Recipe.findOne({ productName: new RegExp(`^${pName}$`, 'i') }) || await Recipe.findOne({ productName: new RegExp(pName, 'i') });
    }

    const nominalYield = recipeDoc?.nominalBatchYieldPouches || 250;
    const batchesNeeded = targetP / nominalYield;

    const ingredientsList = [];
    if (recipeDoc && recipeDoc.ingredients) {
      for (const ing of recipeDoc.ingredients) {
        const grossNeeded = Number(ing.edibleQuantity || 0) * Number(ing.lossFactor || 1.0) * batchesNeeded;
        const matName = ing.materialName;

        let rmDoc = null;
        if (ing.rawMaterial) {
          rmDoc = await RawMaterial.findById(ing.rawMaterial);
        }
        if (!rmDoc) {
          rmDoc = await RawMaterial.findOne({ name: new RegExp(`^${matName}$`, 'i') });
        }

        const currentStock = rmDoc ? Number(rmDoc.currentStock) || 0 : 0;
        const baseUnit = rmDoc?.baseUnit || ing.unit || 'kg';
        const variants = getRmVariants(rmDoc);
        const isNonStd = isNonStdUnit(baseUnit) && variants.length > 0;
        const primaryVariantKg = isNonStd ? variants[0] : 0;
        const currentStockKg = isNonStd ? parseFloat((currentStock * primaryVariantKg).toFixed(4)) : currentStock;
        const rmShortage = Math.max(0, grossNeeded - currentStockKg);
        if (rmShortage > 0) hasShortage = true;

        const ingEval = {
          materialName: matName,
          grossNeeded: parseFloat(grossNeeded.toFixed(4)),
          unit: 'kg',
          stockUnit: baseUnit,
          isNonStd,
          variants,
          primaryVariantKg,
          currentStock,
          currentStockKg,
          shortage: parseFloat(rmShortage.toFixed(4)),
          isSufficient: rmShortage === 0,
          leadTimeDays: rmDoc?.leadTimeDays || 1,
          preferredSupplier: rmDoc?.preferredSupplier || 'Local Vendor'
        };
        ingredientsList.push(ingEval);

        if (!aggregateMaterials.has(matName)) {
          aggregateMaterials.set(matName, { ...ingEval });
        } else {
          const existing = aggregateMaterials.get(matName);
          existing.grossNeeded = parseFloat((existing.grossNeeded + ingEval.grossNeeded).toFixed(4));
          existing.shortage = parseFloat(Math.max(0, existing.grossNeeded - existing.currentStockKg).toFixed(4));
          if (existing.shortage > 0) existing.isSufficient = false;
        }
      }
    }

    itemsEvaluation.push({
      productName: pName,
      targetPouches: targetP,
      packSize: item.packSize || 0.25,
      pouchAvailable,
      pouchShortage,
      pouchSufficient: pouchShortage === 0,
      batchesNeeded: parseFloat(batchesNeeded.toFixed(4)),
      recipeFound: Boolean(recipeDoc),
      ingredients: ingredientsList
    });
  }

  return {
    found: true,
    order: {
      orderNumber: order.orderNumber,
      buyerName: order.buyerName || 'General',
      orderDate: order.orderDate ? new Date(order.orderDate).toLocaleDateString('en-GB') : 'N/A',
      deliveryDate: order.deliveryDate ? new Date(order.deliveryDate).toLocaleDateString('en-GB') : 'N/A',
      status: order.status
    },
    totalPouchesNeeded,
    totalPouchesAvailable,
    hasShortage,
    itemsEvaluation,
    aggregateMaterials: Array.from(aggregateMaterials.values())
  };
}

// 4. KITCHEN ISSUE / RECIPE CALCULATOR BY YIELD OR BY BATCH (with 4-decimal precision & non-standard unit variants)
async function calculateRecipeByYieldOrBatch(query, allProducts, decimalPlaces = 4) {
  const qLower = query.toLowerCase();
  const allRecipes = await Recipe.find({});
  const allMaterials = await RawMaterial.find({});

  // Match recipe by product name or buyer
  let matchedRecipe = null;
  const matchedProd = findBestProductMatch(qLower, allProducts);
  if (matchedProd) {
    matchedRecipe =
      allRecipes.find(
        r =>
          r.productName.toLowerCase() === matchedProd.name.toLowerCase() &&
          (!matchedProd.buyer || (r.buyerName || '').toLowerCase() === matchedProd.buyer.toLowerCase())
      ) ||
      allRecipes.find(r => r.productName.toLowerCase().includes(matchedProd.name.toLowerCase()));
  }

  if (!matchedRecipe) {
    matchedRecipe = allRecipes.find(r => qLower.includes(r.productName.toLowerCase()));
  }

  if (!matchedRecipe) {
    const tokens = qLower.replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(t => t.length >= 3 && !stopWords.has(t) && !/^\d+$/.test(t));
    let bestScore = 0;
    for (const r of allRecipes) {
      const rTokens = (r.productName || '').toLowerCase().split(/\s+/);
      let score = 0;
      tokens.forEach(t => {
        if (rTokens.some(rt => rt.includes(t) || t.includes(rt))) score += 2;
      });
      if (score > bestScore) {
        bestScore = score;
        matchedRecipe = r;
      }
    }
  }

  if (!matchedRecipe) {
    return {
      found: false,
      sampleRecipes: allRecipes.slice(0, 6).map(r => ({
        productName: r.productName,
        buyerName: r.buyerName || 'General',
        recipeYieldKg: getRecipeStandardYieldKg(r),
        ingredientCount: r.ingredients?.length || 0
      }))
    };
  }

  const recipeYieldKg = getRecipeStandardYieldKg(matchedRecipe);

  // Detect if user asked for calculation by yield (e.g. "for 150 kg yield", "yield 120 kg", "given yield 85", "for 200 kg")
  // or by batch (e.g. "for 2.5 batches", "3 batches", "0.5 batch")
  let calcBasis = 'BATCH';
  let batches = 1;
  let givenYieldKg = recipeYieldKg;

  const yieldMatch =
    qLower.match(/(?:given\s*yield|target\s*yield|yield\s*(?:of|is|=)?)\s*(\d+(?:\.\d+)?)\s*(?:kg|kgs)?/i) ||
    qLower.match(/(\d+(?:\.\d+)?)\s*(?:kg|kgs)\s*(?:yield|cooked|batch|output)?/i);
  const batchMatch = qLower.match(/(\d+(?:\.\d+)?)\s*(?:batch|batches|\bb\b)/i);

  if (batchMatch && (!qLower.includes('yield') || qLower.indexOf('batch') < qLower.indexOf('yield'))) {
    calcBasis = 'BATCH';
    batches = parseFloat(batchMatch[1]) || 1;
    givenYieldKg = parseFloat((recipeYieldKg * batches).toFixed(4));
  } else if (yieldMatch || qLower.includes('by yield')) {
    calcBasis = 'YIELD';
    givenYieldKg = yieldMatch ? parseFloat(yieldMatch[1]) : recipeYieldKg;
    batches = recipeYieldKg > 0 ? parseFloat((givenYieldKg / recipeYieldKg).toFixed(4)) : 1;
  }

  const multiplier = calcBasis === 'YIELD' ? (recipeYieldKg > 0 ? givenYieldKg / recipeYieldKg : 1) : batches;

  const calculatedIngredients = (matchedRecipe.ingredients || []).map((ing, idx) => {
    const u = String(ing.unit || 'kg').trim().toLowerCase();
    const unitMult = u === 'g' || u === 'gm' || u === 'ml' ? 0.001 : 1;
    const baseEdibleKg = Number(ing.edibleQuantity || 0) * unitMult;
    const lossFactor = Number(ing.lossFactor) || 1.0;
    const baseGrossKg = baseEdibleKg * lossFactor;

    // Formula:
    // By Yield: Ingredient A = (Qty of A / Recipe Yield) * Given Yield = Qty of A * (Given Yield / Recipe Yield)
    // By Batch: Ingredient A = Qty of A * Batches
    const edibleKg =
      calcBasis === 'YIELD'
        ? parseFloat(((baseEdibleKg / recipeYieldKg) * givenYieldKg).toFixed(4))
        : parseFloat((baseEdibleKg * batches).toFixed(4));
    const grossKg =
      calcBasis === 'YIELD'
        ? parseFloat(((baseGrossKg / recipeYieldKg) * givenYieldKg).toFixed(4))
        : parseFloat((baseGrossKg * batches).toFixed(4));

    const rmDoc = allMaterials.find(
      rm =>
        (ing.rawMaterial && String(rm._id) === String(ing.rawMaterial)) ||
        rm.name.trim().toLowerCase() === (ing.materialName || '').trim().toLowerCase()
    );

    const stockUnit = rmDoc ? rmDoc.baseUnit : 'kg';
    const availStockUnits = rmDoc ? Number(rmDoc.currentStock) || 0 : 0;
    const variants = getRmVariants(rmDoc);
    const isNonStd = isNonStdUnit(stockUnit) && variants.length > 0;
    const primaryVariantKg = isNonStd ? variants[0] : 0;
    const availStockKg = isNonStd ? parseFloat((availStockUnits * primaryVariantKg).toFixed(4)) : availStockUnits;
    const variantConversions = isNonStd
      ? variants.map(v => ({
          variantKg: v,
          unitsNeeded: parseFloat((grossKg / v).toFixed(4)),
          wholeUnitsNeeded: Math.ceil(grossKg / v)
        }))
      : [];

    const deficitKg = Math.max(0, parseFloat((grossKg - availStockKg).toFixed(4)));

    return {
      index: idx + 1,
      materialName: ing.materialName,
      baseEdibleKg: parseFloat(baseEdibleKg.toFixed(4)),
      lossFactor: parseFloat(lossFactor.toFixed(4)),
      baseGrossKg: parseFloat(baseGrossKg.toFixed(4)),
      edibleKg,
      grossKg,
      stockUnit,
      isNonStd,
      variants,
      primaryVariantKg,
      availStockUnits,
      availStockKg,
      variantConversions,
      deficitKg,
      isSufficient: deficitKg === 0
    };
  });

  const totalEdibleKg = parseFloat(calculatedIngredients.reduce((s, i) => s + i.edibleKg, 0).toFixed(4));
  const totalGrossKg = parseFloat(calculatedIngredients.reduce((s, i) => s + i.grossKg, 0).toFixed(4));

  return {
    found: true,
    recipe: {
      productName: matchedRecipe.productName,
      buyerName: matchedRecipe.buyerName || 'General',
      recipeYieldKg,
      nominalBatchYieldPouches: matchedRecipe.nominalBatchYieldPouches || 250,
      packSizes: matchedRecipe.packSizes || []
    },
    calcBasis,
    batches,
    givenYieldKg,
    multiplier: parseFloat(multiplier.toFixed(4)),
    totalEdibleKg,
    totalGrossKg,
    calculatedIngredients
  };
}

// 5. PO POUCH TRACKER & PROGRESSIVE POUCH ALLOCATION (Universal vs Exclusive Pouches)
async function calculatePoPouchTrackerSummary(query, allProducts) {
  const currentMonth = new Date().getMonth() + 1;
  const [buyerOrders, universalPouches, fullProducts] = await Promise.all([
    BuyerOrder.find({}).sort({ orderDate: 1, createdAt: 1 }),
    UniversalPouch.find({}),
    Product.find({})
  ]);

  const getProductStock = (buyerName, productName) => {
    const bNorm = (buyerName || '').trim().toLowerCase();
    const pNorm = (productName || '').trim().toLowerCase();
    const matched =
      fullProducts.find(
        p => (p.name || '').trim().toLowerCase() === pNorm && (p.buyer || '').trim().toLowerCase() === bNorm
      ) || fullProducts.find(p => (p.name || '').trim().toLowerCase() === pNorm);
    if (!matched || !Array.isArray(matched.pouches)) return 0;
    const mEntry = matched.pouches[currentMonth - 1];
    return mEntry ? Number(mEntry.remain) || 0 : 0;
  };

  const getUniversalStock = (packSizeVal) => {
    const psKg = normalizePackSizeKg(packSizeVal);
    if (psKg <= 0) return 0;
    const pool = universalPouches.find(u => Math.abs((Number(u.packSizeKg) || 0) - psKg) < 0.0005);
    if (!pool || !Array.isArray(pool.pouches)) return 0;
    const mEntry = pool.pouches[currentMonth - 1];
    return mEntry ? Number(mEntry.remain) || 0 : 0;
  };

  const resolvePouchMode = (buyerName, productName, itemPouchMode) => {
    if (itemPouchMode === 'UNIVERSAL' || itemPouchMode === 'EXCLUSIVE') return itemPouchMode;
    const bNorm = (buyerName || '').trim().toLowerCase();
    const pNorm = (productName || '').trim().toLowerCase();
    const matched =
      fullProducts.find(
        p => (p.name || '').trim().toLowerCase() === pNorm && (p.buyer || '').trim().toLowerCase() === bNorm
      ) || fullProducts.find(p => (p.name || '').trim().toLowerCase() === pNorm);
    return matched?.pouchType === 'UNIVERSAL' ? 'UNIVERSAL' : 'EXCLUSIVE';
  };

  const runningConsumedByPool = new Map();
  const trackerRows = [];

  buyerOrders.forEach(order => {
    (order.items || []).forEach((item, idx) => {
      const buyer = order.buyerName || 'General';
      const prod = item.productName || 'Unknown';
      const psKg = normalizePackSizeKg(item.packSize || 0.25);
      const mode = resolvePouchMode(buyer, prod, item.pouchMode);
      const poolKey =
        mode === 'UNIVERSAL'
          ? `UNIV:::${psKg}`
          : `EXCL:::${buyer.trim().toLowerCase()}|||${prod.trim().toLowerCase()}`;

      const initialPoolStock =
        mode === 'UNIVERSAL' ? getUniversalStock(psKg) : getProductStock(buyer, prod);
      const consumedBefore = runningConsumedByPool.get(poolKey) || 0;
      const openingPouchStock = initialPoolStock - consumedBefore;
      const requiredPouches = Number(item.targetPouches) || 0;
      const dueAfter = openingPouchStock - requiredPouches;
      runningConsumedByPool.set(poolKey, consumedBefore + requiredPouches);

      trackerRows.push({
        orderNumber: order.orderNumber,
        buyerName: buyer,
        productName: prod,
        packSizeKg: psKg,
        pouchMode: mode,
        poolKey,
        initialPoolStock,
        openingPouchStock,
        requiredPouches,
        dueAfter,
        pouchOrderLotSize: Number(item.pouchOrderLotSize) || 0,
        status: dueAfter >= 0 ? 'POUCH AVAILABLE' : 'ORDER POUCHES'
      });
    });
  });

  const universalPoolsSummary = universalPouches.map(u => {
    const mEntry = Array.isArray(u.pouches) ? u.pouches[currentMonth - 1] : null;
    return {
      packSizeKg: u.packSizeKg,
      label: u.label || `${Math.round(u.packSizeKg * 1000)}g Universal Pouch`,
      stockIn: Number(mEntry?.stock) || 0,
      filled: Number(mEntry?.filled) || 0,
      wastage: Number(mEntry?.wastage) || 0,
      remain: Number(mEntry?.remain) || 0
    };
  });

  return {
    currentMonth,
    totalTrackerRows: trackerRows.length,
    trackerRows,
    universalPoolsSummary
  };
}

// Generate context-aware, interaction-based dynamic suggestions
async function generateContextualSuggestions(lastIntent, lastMatchedProduct, previousQuery) {
  try {
    const suggestions = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Contextual based on last matched product
    if (lastMatchedProduct) {
      const pName = lastMatchedProduct.name;
      suggestions.push(`Calculate kitchen issue for 150 kg yield of ${pName}`);
      suggestions.push(`How many pouches remaining for ${pName}?`);
      suggestions.push(`Show recipe BOM & 4-decimal quantities for ${pName}`);
    }

    // Dynamic suggestions based on specialized intents
    if (lastIntent === 'ORDER_FEASIBILITY') {
      suggestions.push(`Show PO Pouch Tracker & progressive pouch balance`);
      suggestions.push(`In master buyer order - 15274 are there enough material for all of their order?`);
      suggestions.push(`Show Universal vs Exclusive pouch stock`);
    } else if (lastIntent === 'BUYER_ORDER_CHECK' || lastIntent === 'PO_POUCH_TRACKER') {
      suggestions.push(`Show PO Pouch Tracker & progressive pouch balance`);
      suggestions.push(`Show Universal vs Exclusive pouch stock`);
      suggestions.push(`For PO-55863 are there enough pouches and raw material?`);
    } else if (lastIntent === 'KITCHEN_ISSUE_CALC' || lastIntent === 'RECIPES') {
      suggestions.push(`Show PO Pouch Tracker & progressive pouch balance`);
      suggestions.push(`Show raw materials with unit variants (tins / kg)`);
      suggestions.push(`Audit factory data for typos, pack sizes & variance`);
    } else if (lastIntent === 'DATA_AUDIT') {
      suggestions.push(`Show PO Pouch Tracker & progressive pouch balance`);
      suggestions.push(`In master buyer order - 15274 are there enough material for all of their order?`);
      suggestions.push(`Show low stock raw materials`);
    }

    // Live alert-based suggestions
    const [lowStockCount, samplePO, sampleBO, recentContainers] = await Promise.all([
      RawMaterial.countDocuments({ $expr: { $lte: ['$currentStock', '$minSafetyStock'] } }),
      ProductionOrder.findOne({ status: { $in: ['PLANNED', 'IN_PROGRESS'] } }).sort({ productionDate: -1 }),
      BuyerOrder.findOne({}).sort({ orderDate: -1 }),
      Container.find({}).sort({ priority: 1 }).limit(1)
    ]);

    if (samplePO && !suggestions.some(s => s.includes('PO-'))) {
      suggestions.push(`For ${samplePO.orderNumber} are there enough pouches and raw material?`);
    }

    if (!suggestions.some(s => s.toLowerCase().includes('audit'))) {
      suggestions.push(`Audit factory data for typos, pack sizes & variance`);
    }

    if (sampleBO && !suggestions.some(s => s.includes('buyer order'))) {
      suggestions.push(`In master buyer order - ${sampleBO.orderNumber} are there enough material for all of their order?`);
    }

    if (lowStockCount > 0 && !suggestions.some(s => s.toLowerCase().includes('shortage alerts'))) {
      suggestions.push(`Show ${lowStockCount} raw materials with shortage alerts`);
    }

    if (recentContainers.length > 0 && !suggestions.some(s => s.includes('container'))) {
      suggestions.push(`Status of export container ${recentContainers[0].name}`);
    }

    const rulesCount = await AiMemory.countDocuments({ active: true });
    if (rulesCount > 0 && !suggestions.some(s => s.includes('learned'))) {
      suggestions.push(`What instructions have you learned so far?`);
    }

    return [...new Set(suggestions)].slice(0, 6);
  } catch (err) {
    console.error('Error generating dynamic suggestions:', err);
    return [
      "For PO-55863 are there enough pouches and raw material?",
      "Audit factory data for typos, pack sizes & variance",
      "What's the production plan for tomorrow?"
    ];
  }
}

// Call optional Gemini API with learned instructions injected
async function callGeminiIfAvailable(userQuery, retrievedContext, learnedRules) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) return null;

  try {
    const rulesSection = learnedRules && learnedRules.length > 0
      ? `=== USER-LEARNED INSTRUCTIONS & CORRECTIONS (MUST STRICTLY FOLLOW) ===\n${learnedRules.map((r, i) => `${i + 1}. [${r.topic || 'RULE'}]: ${r.rule}`).join('\n')}\n\n`
      : '';

    const systemPrompt = `You are the AGPL Factory Copilot & Operations AI Assistant.
You have real-time live access to the AGPL factory databases (production orders, cooking yields, filling logs, pouch inventory, recipes, raw material stock, and containers).
${rulesSection}
Answer the user's questions clearly, concisely, and professionally using GitHub-flavored Markdown (bolding, tables, bullet points, numbers).
Always base your factual answers on the provided live database context and adhere strictly to any user-learned instructions. If data is not found, state what was searched and suggest next steps.`;

    const promptPayload = {
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `${systemPrompt}\n\n=== LIVE FACTORY DATA CONTEXT ===\n${JSON.stringify(retrievedContext, null, 2)}\n\n=== USER QUESTION ===\n${userQuery}`
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 1000
      }
    };

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(promptPayload)
    });

    if (res.ok) {
      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) return text;
    }
  } catch (err) {
    console.error("Gemini API call failed, falling back to built-in generator:", err.message);
  }
  return null;
}

exports.chatWithAi = async (req, res) => {
  try {
    const { query, history } = req.body;
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ success: false, message: 'Query is required' });
    }

    const q = query.trim();
    const qLower = q.toLowerCase();

    // 0. CHECK FOR MEMORY INSPECTION OR CLEAR COMMANDS
    if (
      qLower.includes('what have you learned') ||
      qLower.includes('show learned') ||
      qLower.includes('show memory') ||
      qLower.includes('view instructions') ||
      qLower.includes('list instructions')
    ) {
      const storedRules = await AiMemory.find({ active: true }).sort({ createdAt: -1 });
      let memAnswer = `### 🧠 Learned Instructions & Memory Repository\n\n`;
      if (storedRules.length === 0) {
        memAnswer += `I currently have no custom instructions recorded. You can teach me anytime by giving instructions such as:\n`;
        memAnswer += `- *"Remember that pack size for ancient grain is 0.2kg"* \n`;
        memAnswer += `- *"Always format batch numbers with 2 decimals"* \n`;
        memAnswer += `- *"No, Cilantro Rice refers to Organic Cilantro Lime Rice"*`;
      } else {
        memAnswer += `I have learned **${storedRules.length}** custom rule(s) from our interactions:\n\n`;
        memAnswer += `| # | Topic | Learned Instruction | Applied Count | Learned Date |\n`;
        memAnswer += `| :---: | :--- | :--- | :---: | :--- |\n`;
        storedRules.forEach((r, idx) => {
          const dStr = new Date(r.createdAt).toLocaleDateString('en-GB');
          memAnswer += `| ${idx + 1} | \`${r.topic}\` | **${r.rule}** | ${r.usageCount || 0} times | ${dStr} |\n`;
        });
        memAnswer += `\n💡 *To correct or update any rule, simply provide new instructions in chat.*`;
      }

      const nextSuggestions = await generateContextualSuggestions('MEMORY', null, q);
      return res.status(200).json({
        success: true,
        answer: memAnswer,
        intent: 'MEMORY_VIEW',
        suggestions: nextSuggestions
      });
    }

    if (qLower.includes('clear memory') || qLower.includes('reset instructions') || qLower.includes('forget instructions')) {
      await AiMemory.updateMany({ active: true }, { active: false });
      const nextSuggestions = await generateContextualSuggestions('MEMORY', null, q);
      return res.status(200).json({
        success: true,
        answer: `🧹 **Memory Cleared**: All custom learned rules and user-defined instructions have been archived and reset. I am now using base factory defaults.`,
        intent: 'MEMORY_RESET',
        suggestions: nextSuggestions
      });
    }

    // 1. DETECT DYNAMIC USER CORRECTION OR INSTRUCTION
    const correctionCheck = detectCorrectionOrRule(q);
    let justLearned = null;

    if (correctionCheck.isCorrection) {
      // Find what entity or topic this refers to from current query or previous history
      const allProds = await Product.find({}, 'name buyer');
      const matchedInCorrection = findBestProductMatch(q, allProds);
      const topic = correctionCheck.topic || (matchedInCorrection ? matchedInCorrection.name : 'OPERATIONS_RULE');

      // Archive previous conflicting rule for system-wide parameters (like decimal precision or variance tolerance)
      if (['DECIMAL_PRECISION', 'VARIANCE_TOLERANCE'].includes(topic)) {
        await AiMemory.updateMany({ topic }, { active: false });
      }

      // Save into memory
      justLearned = await AiMemory.create({
        type: 'CORRECTION',
        topic,
        rule: correctionCheck.rule || q,
        metadata: {
          paramType: correctionCheck.paramType,
          targetValue: correctionCheck.targetValue
        },
        triggerKeywords: qLower.replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length > 2 && !stopWords.has(w)),
        originalQuery: history && history.length ? history[history.length - 1].content : '',
        correctedBy: 'User',
        active: true
      });
    }

    // Retrieve active learned rules AFTER saving the new rule
    const activeRules = await AiMemory.find({ active: true });
    const prefs = extractLearnedPreferences(activeRules);

    // Update usage count for relevant rules
    if (activeRules.length > 0) {
      const matchedRules = activeRules.filter(r =>
        (r.triggerKeywords || []).some(k => qLower.includes(k)) ||
        (r.topic && qLower.includes(r.topic.toLowerCase()))
      );
      if (matchedRules.length > 0) {
        await AiMemory.updateMany(
          { _id: { $in: matchedRules.map(r => r._id) } },
          { $inc: { usageCount: 1 }, updatedAt: new Date() }
        );
      }
    }

    const timeframe = parseTimeframe(qLower);
    const allProducts = await Product.find({}, 'name buyer pouches dispatched');
    const matchedProduct = findBestProductMatch(qLower, allProducts);

    let answer = '';
    let intent = 'GENERAL';
    let contextData = {};

    // 2. PRODUCTION ORDER FEASIBILITY CHECK (Pouches & Raw Material BOM)
    const isOrderFeasibility =
      /po[-\s]?\d+/i.test(qLower) ||
      qLower.includes('for po') ||
      qLower.includes('po feasibility') ||
      qLower.includes('enough pouches and raw material') ||
      (qLower.includes('production order') && (qLower.includes('enough') || qLower.includes('material') || qLower.includes('pouch') || qLower.includes('check')));

    // 3. MASTER BUYER ORDER MATERIAL ADEQUACY CHECK
    const isBuyerOrderCheck =
      /bo[-\s]?\d+/i.test(qLower) ||
      qLower.includes('master buyer order') ||
      qLower.includes('buyer order') ||
      qLower.includes('for bo') ||
      (qLower.includes('master buyer') && (qLower.includes('enough') || qLower.includes('material') || qLower.includes('order')));

    // 4. DATA SANITY, ANOMALY & TYPO AUDIT
    const isDataAudit =
      qLower.includes('audit') ||
      qLower.includes('typo') ||
      qLower.includes('typos') ||
      qLower.includes('data off') ||
      qLower.includes('excessive') ||
      qLower.includes('sanity') ||
      qLower.includes('check data') ||
      qLower.includes('variance is very high') ||
      qLower.includes('high variance') ||
      qLower.includes('costing error') ||
      (qLower.includes('check') && (qLower.includes('filling') || qLower.includes('kitchen') || qLower.includes('costing') || qLower.includes('variance') || qLower.includes('pack size') || qLower.includes('pouch count')));

    if (isOrderFeasibility) {
      intent = 'ORDER_FEASIBILITY';
      const poEval = await checkProductionOrderFeasibility(q, activeRules);
      contextData = { query: q, poEval };

      const geminiAns = await callGeminiIfAvailable(q, contextData, activeRules);
      if (geminiAns) {
        const suggestions = await generateContextualSuggestions(intent, matchedProduct, q);
        return res.status(200).json({ success: true, answer: geminiAns, intent, context: contextData, suggestions });
      }

      if (!poEval.found) {
        answer = `### 📋 Production Order Feasibility Check\n\n`;
        answer += `Could not locate Production Order \`${poEval.searchedFor}\` in the schedule database.\n\n`;
        if (poEval.availableOrders && poEval.availableOrders.length > 0) {
          answer += `**Recently Scheduled Production Orders:**\n\n`;
          answer += `| Order Number | Buyer | Products | Scheduled Date |\n`;
          answer += `| :--- | :--- | :--- | :--- |\n`;
          poEval.availableOrders.forEach(o => {
            answer += `| **${o.orderNumber}** | ${o.buyer || 'General'} | ${o.products} | ${o.date} |\n`;
          });
          answer += `\n💡 *Try asking: "For ${poEval.availableOrders[0].orderNumber} are there enough pouches and raw material?"*`;
        } else {
          answer += `No active or planned production orders currently in the system. Go to **[Schedule Production Orders](/production-goal)** to create one.`;
        }
      } else {
        const { order, itemsEvaluation, aggregateMaterials, totalPouchesNeeded, hasShortage } = poEval;
        const shortMaterials = aggregateMaterials.filter(m => !m.isSufficient);

        answer = `### 🏭 Production Order Feasibility: **${order.orderNumber}**\n\n`;
        answer += `**Buyer:** \`${order.buyerName}\` | **Scheduled Date:** ${order.productionDate} | **Status:** \`${order.status}\` | **Priority:** \`${order.priority || 'NORMAL'}\`\n\n`;

        // Packaging Pouch Analysis
        answer += `#### 📦 1. Finished Packaging Pouches Check\n\n`;
        answer += `| Product Name | Batches | Target Pouches | Available in Stock | Pouch Shortage | Status |\n`;
        answer += `| :--- | :---: | :---: | :---: | :---: | :---: |\n`;
        itemsEvaluation.forEach(it => {
          const pouchBadge = it.pouchSufficient ? '🟢 Sufficient' : `🔴 Deficit (-${formatPouch(it.pouchShortage)})`;
          answer += `| **${it.productName}** | ${formatNum(it.batches, prefs.decimalPlaces)} | ${formatPouch(it.targetPouches)} | ${formatPouch(it.pouchAvailable)} | ${it.pouchShortage ? `-${formatPouch(it.pouchShortage)}` : '0'} | ${pouchBadge} |\n`;
        });

        // Raw Material BOM Requirements
        answer += `\n#### 🌾 2. Raw Material BOM Requirements & Stock Matrix\n\n`;
        if (aggregateMaterials.length === 0) {
          answer += `*No BOM recipe ingredients configured for the items in this production order. Please check [Recipe Master](/recipe-master).*\n\n`;
        } else {
          answer += `| Material Name | Gross Required | Current Stock | Net Shortage | Unit | Lead Time | Preferred Supplier | Status |\n`;
          answer += `| :--- | :---: | :---: | :---: | :---: | :---: | :--- | :---: |\n`;
          aggregateMaterials.forEach(m => {
            const rmBadge = m.isSufficient ? '🟢 In Stock' : `🚨 Shortage (-${formatNum(m.shortage, prefs.decimalPlaces)})`;
            answer += `| **${m.materialName}** | ${formatNum(m.grossNeeded, prefs.decimalPlaces)} | ${formatNum(m.currentStock, prefs.decimalPlaces)} | ${m.shortage > 0 ? `-${formatNum(m.shortage, prefs.decimalPlaces)}` : '0.00'} | ${m.unit} | ${m.leadTimeDays}d | ${m.preferredSupplier || '—'} | ${rmBadge} |\n`;
          });
        }

        // Summary Verdict Box
        answer += `\n---\n`;
        if (!hasShortage && aggregateMaterials.length > 0) {
          answer += `> 🟢 **FEASIBILITY VERDICT: READY FOR PRODUCTION**\n`;
          answer += `> All ${formatPouch(totalPouchesNeeded)} packaging pouches and ${aggregateMaterials.length} raw material BOM ingredients are available in inventory.\n`;
          answer += `> Ready to issue to kitchen: **[Create Kitchen Store Issue](/material-issue)**.`;
        } else {
          const reasons = [];
          const pouchDeficitTotal = itemsEvaluation.reduce((sum, it) => sum + it.pouchShortage, 0);
          if (pouchDeficitTotal > 0) reasons.push(`${pouchDeficitTotal.toLocaleString()} packaging pouches deficit`);
          if (shortMaterials.length > 0) reasons.push(`${shortMaterials.length} raw material ingredients short`);

          answer += `> 🔴 **FEASIBILITY VERDICT: SHORTAGES DETECTED — CANNOT COMMENCE FULL PRODUCTION**\n`;
          answer += `> **Deficits Identified:** ${reasons.join(', ')}.\n`;
          if (shortMaterials.length > 0) {
            const maxLeadTime = Math.max(...shortMaterials.map(m => m.leadTimeDays || 1));
            answer += `> **Procurement Impact:** Estimated lead time to restock all materials is **${maxLeadTime} day(s)**.\n`;
          }
          answer += `> 💡 *Take action now: **[Open Purchase Planner](/purchase-planner)** to generate purchase orders.*`;
        }
      }
    } else if (isBuyerOrderCheck) {
      intent = 'BUYER_ORDER_CHECK';
      const boEval = await checkBuyerOrderAdequacy(q, activeRules);
      contextData = { query: q, boEval };

      const geminiAns = await callGeminiIfAvailable(q, contextData, activeRules);
      if (geminiAns) {
        const suggestions = await generateContextualSuggestions(intent, matchedProduct, q);
        return res.status(200).json({ success: true, answer: geminiAns, intent, context: contextData, suggestions });
      }

      if (!boEval.found) {
        answer = `### 📦 Master Buyer Order Material Adequacy Check\n\n`;
        answer += `Could not locate Master Buyer Order \`${boEval.searchedFor}\` in the database.\n\n`;
        if (boEval.availableOrders && boEval.availableOrders.length > 0) {
          answer += `**Recent Master Buyer Orders:**\n\n`;
          answer += `| Order Number | Buyer | Products | Order Date |\n`;
          answer += `| :--- | :--- | :--- | :--- |\n`;
          boEval.availableOrders.forEach(o => {
            answer += `| **${o.orderNumber}** | ${o.buyer || 'General'} | ${o.products} | ${o.date} |\n`;
          });
          answer += `\n💡 *Try asking: "In master buyer order - ${boEval.availableOrders[0].orderNumber} are there enough material for all of their order?"*`;
        } else {
          answer += `No master buyer orders found. Create orders in **[Schedule Production Batches](/production-goal)**.`;
        }
      } else {
        const { order, itemsEvaluation, aggregateMaterials, totalPouchesNeeded, hasShortage } = boEval;
        const shortMaterials = aggregateMaterials.filter(m => !m.isSufficient);

        answer = `### 📦 Master Buyer Order Fulfillment Audit: **${order.orderNumber}**\n\n`;
        answer += `**Buyer:** \`${order.buyerName}\` | **Order Date:** ${order.orderDate} | **Target Delivery:** ${order.deliveryDate} | **Status:** \`${order.status}\`\n\n`;

        // Line items table
        answer += `#### 📋 1. Ordered Line Items & Batch Requirements\n\n`;
        answer += `| Product Name | Pack Size | Target Pouches | Batches Req | Available Stock | Pouch Shortage |\n`;
        answer += `| :--- | :---: | :---: | :---: | :---: | :---: |\n`;
        itemsEvaluation.forEach(it => {
          answer += `| **${it.productName}** | ${it.packSize} kg | ${formatPouch(it.targetPouches)} | **${formatNum(it.batchesNeeded, prefs.decimalPlaces)}** | ${formatPouch(it.pouchAvailable)} | ${it.pouchShortage > 0 ? `-${formatPouch(it.pouchShortage)}` : '0'} |\n`;
        });

        // Consolidated Raw Materials BOM
        answer += `\n#### 🌾 2. Consolidated Raw Materials Required Across All Line Items\n\n`;
        if (aggregateMaterials.length === 0) {
          answer += `*No BOM recipe ingredients configured for products in this buyer order. Verify in [Recipe Master](/recipe-master).*\n\n`;
        } else {
          answer += `| Material Name | Aggregated Gross | Current Stock | Net Shortage | Unit | Lead Time | Supplier | Status |\n`;
          answer += `| :--- | :---: | :---: | :---: | :---: | :---: | :--- | :---: |\n`;
          aggregateMaterials.forEach(m => {
            const rmBadge = m.isSufficient ? '🟢 Ready' : `🚨 Shortage (-${formatNum(m.shortage, prefs.decimalPlaces)})`;
            answer += `| **${m.materialName}** | ${formatNum(m.grossNeeded, prefs.decimalPlaces)} | ${formatNum(m.currentStock, prefs.decimalPlaces)} | ${m.shortage > 0 ? `-${formatNum(m.shortage, prefs.decimalPlaces)}` : '0.00'} | ${m.unit} | ${m.leadTimeDays}d | ${m.preferredSupplier || '—'} | ${rmBadge} |\n`;
          });
        }

        // Summary verdict
        answer += `\n---\n`;
        if (!hasShortage && aggregateMaterials.length > 0) {
          answer += `> 🟢 **ORDER FULFILLMENT VERDICT: FULLY FEASIBLE**\n`;
          answer += `> All materials and packaging inventory exist to fulfill the total **${formatPouch(totalPouchesNeeded)} pouches** for buyer **${order.buyerName}**.\n`;
          answer += `> Next Step: **[Schedule Batches](/production-goal)** to allocate to kitchen production lines.`;
        } else {
          const pouchDeficitTotal = itemsEvaluation.reduce((sum, it) => sum + it.pouchShortage, 0);
          answer += `> 🔴 **ORDER FULFILLMENT VERDICT: MATERIAL DEFICIT DETECTED**\n`;
          answer += `> Cannot fulfill all line items from current inventory. **${shortMaterials.length}** raw material(s) and **${pouchDeficitTotal.toLocaleString()}** empty pouch(es) must be procured before scheduling.\n`;
          answer += `> 💡 *Next Step: Go to **[Purchase Planner](/purchase-planner)** to generate purchase orders with vendors.*`;
        }
      }
    } else if (isDataAudit) {
      intent = 'DATA_AUDIT';
      const auditRes = await auditDataAnomalies(activeRules);
      contextData = { query: q, auditRes };

      const geminiAns = await callGeminiIfAvailable(q, contextData, activeRules);
      if (geminiAns) {
        const suggestions = await generateContextualSuggestions(intent, matchedProduct, q);
        return res.status(200).json({ success: true, answer: geminiAns, intent, context: contextData, suggestions });
      }

      const totalAnomalies =
        auditRes.packSizeTypos.length +
        auditRes.pouchCountTypos.length +
        auditRes.yieldAnomalies.length +
        auditRes.kitchenVariances.length +
        auditRes.costingAnomalies.length +
        auditRes.negativeStocks.length;

      answer = `### 🔍 Factory Data Integrity & Anomaly Audit Report\n\n`;
      answer += `Scanned live records across **Filling Logs**, **Kitchen Cooked Batches**, **Kitchen Variance**, and **Raw Material Costing/Stock**.\n`;
      answer += `Active Audit Parameters: *Variance Tolerance: ±${auditRes.thresholdsUsed.maxVarianceAllowed}%, Shift Pouch Max: ${auditRes.thresholdsUsed.maxPouchPerShift.toLocaleString()}, Cooker Max: ${auditRes.thresholdsUsed.maxYieldKgPerBatch} kg*.\n\n`;

      if (totalAnomalies === 0) {
        answer += `> 🟢 **ALL SYSTEMS HEALTHY — ZERO ANOMALIES DETECTED**\n`;
        answer += `> No pack size typos, excessive pouch counts, yield spikes, high variances, or costing anomalies were found in the scanned datasets.`;
      } else {
        answer += `Found **${totalAnomalies}** total data anomaly/typo flag(s) requiring supervisor review:\n\n`;

        // 1. Pack Size Typos
        if (auditRes.packSizeTypos.length > 0) {
          answer += `#### 🔴 1. Pack Size Typo Errors (Entered in Grams or > 2 kg)\n`;
          answer += `| Date | Section | Product | Buyer | Logged Value | Likely Intended | Issue / Correction |\n`;
          answer += `| :--- | :--- | :--- | :--- | :---: | :---: | :--- |\n`;
          auditRes.packSizeTypos.slice(0, 8).forEach(t => {
            answer += `| ${t.date} | \`${t.section}\` | **${t.product}** | ${t.buyer} | \`${t.currentValue}\` | **${t.likelyIntended}** | ${t.issue} |\n`;
          });
          answer += `\n`;
        }

        // 2. Excessive Pouch Counts
        if (auditRes.pouchCountTypos.length > 0) {
          answer += `#### ⚠️ 2. Excessive Pouch Counts in Single Shift (> ${auditRes.thresholdsUsed.maxPouchPerShift.toLocaleString()})\n`;
          answer += `| Date | Section | Product | Buyer | Logged Pouches | Likely Intended | Issue / Correction |\n`;
          answer += `| :--- | :--- | :--- | :--- | :---: | :---: | :--- |\n`;
          auditRes.pouchCountTypos.slice(0, 8).forEach(t => {
            answer += `| ${t.date} | \`${t.section}\` | **${t.product}** | ${t.buyer} | \`${t.currentValue}\` | **${t.likelyIntended}** | ${t.issue} |\n`;
          });
          answer += `\n`;
        }

        // 3. Kitchen Cooked Yield Anomalies
        if (auditRes.yieldAnomalies.length > 0) {
          answer += `#### 🍳 3. Cooked Yield Spikes (> ${auditRes.thresholdsUsed.maxYieldKgPerBatch} kg / Cooker Batch)\n`;
          answer += `| Date | Product | Buyer | Logged Yield | Batches | Issue / Outlier Detail |\n`;
          answer += `| :--- | :--- | :--- | :---: | :---: | :--- |\n`;
          auditRes.yieldAnomalies.slice(0, 8).forEach(y => {
            answer += `| ${y.date} | **${y.product}** | ${y.buyer} | \`${y.currentYield}\` | ${y.batchQty} | ${y.issue} |\n`;
          });
          answer += `\n`;
        }

        // 4. Kitchen Cooking Variances
        if (auditRes.kitchenVariances.length > 0) {
          answer += `#### 🟡 4. High Kitchen Cooking Variances (> ±${auditRes.thresholdsUsed.maxVarianceAllowed}%)\n`;
          answer += `| Issue # | Product | Buyer | Date | Issued (kg) | Yield (kg) | Variance (%) | Status |\n`;
          answer += `| :--- | :--- | :--- | :--- | :---: | :---: | :---: | :---: |\n`;
          auditRes.kitchenVariances.slice(0, 8).forEach(v => {
            const status = v.variancePercent > 0 ? 'Surplus' : 'Deficit';
            answer += `| **${v.issueNumber}** | ${v.product} | ${v.buyer} | ${v.date} | ${v.issuedKg} kg | ${v.yieldKg} kg | **${v.variancePercent.toFixed(1)}%** | \`${status}\` |\n`;
          });
          answer += `\n`;
        }

        // 5. Costing & Stock Anomalies
        if (auditRes.costingAnomalies.length > 0 || auditRes.negativeStocks.length > 0) {
          answer += `#### 🟠 5. Raw Material Costing & Stock Ledger Anomalies\n`;
          answer += `| Material Name | Current Stock | Avg Purchase Rate | Issue Detail |\n`;
          answer += `| :--- | :---: | :---: | :--- |\n`;
          auditRes.negativeStocks.slice(0, 5).forEach(ns => {
            answer += `| **${ns.material}** | \`${ns.currentStock}\` | — | 🚨 Negative stock balance |\n`;
          });
          auditRes.costingAnomalies.slice(0, 5).forEach(ca => {
            answer += `| **${ca.material}** | ${ca.currentStock} | \`${ca.avgRate}\` | ⚠️ Missing / zero purchase rate |\n`;
          });
          answer += `\n`;
        }

        answer += `---\n`;
        answer += `💡 **Recommended Supervisor Actions:**\n`;
        answer += `1. Review and edit shift entries in **[Kitchen Section](/today-kitchen)** and **[Filling Section](/today-filling)**.\n`;
        answer += `2. Update purchase rates and stock counts in **[Raw Material Ledger](/raw-materials)**.\n`;
        answer += `3. You can teach the AI custom tolerances anytime (e.g. *"Accept variance up to 12%"* or *"Max pouches per shift is 30000"*).`;
      }
    }

    // 5. PRODUCTION PLAN / SCHEDULE
    else if (
      qLower.includes('production plan') ||
      qLower.includes('plan for tomorrow') ||
      qLower.includes('plan for today') ||
      qLower.includes('scheduled') ||
      (qLower.includes('plan') && (qLower.includes('tomorrow') || qLower.includes('today') || qLower.includes('batch')))
    ) {
      intent = 'PRODUCTION_PLAN';
      const targetDate = timeframe.isTomorrow
        ? timeframe.start
        : timeframe.isToday
        ? timeframe.start
        : null;

      let orders = [];
      if (targetDate) {
        const nextDay = new Date(targetDate);
        nextDay.setDate(nextDay.getDate() + 1);
        orders = await ProductionOrder.find({
          productionDate: { $gte: targetDate, $lt: nextDay }
        }).populate('items.recipe', 'productName buyerName nominalYield cookedBatchWeight');
      }

      if (!orders.length) {
        // Fallback: check upcoming planned orders or recent
        orders = await ProductionOrder.find({
          status: { $in: ['PLANNED', 'IN_PROGRESS'] }
        })
          .sort({ productionDate: 1 })
          .limit(5)
          .populate('items.recipe', 'productName buyerName nominalYield cookedBatchWeight');
      }

      contextData = { queryTimeframe: timeframe.label, ordersCount: orders.length, orders };

      const geminiAns = await callGeminiIfAvailable(q, contextData, activeRules);
      if (geminiAns) {
        const suggestions = await generateContextualSuggestions(intent, matchedProduct, q);
        return res.status(200).json({ success: true, answer: geminiAns, intent, context: contextData, suggestions });
      }

      if (orders.length > 0) {
        answer = `### 📋 Production Plan (${timeframe.label})\n\n`;
        answer += `Found **${orders.length}** planned production batch order(s):\n\n`;
        answer += `| Order # | Scheduled Date | Buyer | Product / Recipe | Batches | Target Pouches | Est. Cooked Weight | Status |\n`;
        answer += `| :--- | :--- | :--- | :--- | :---: | :---: | :---: | :--- |\n`;

        let totalBatches = 0;
        let totalPouches = 0;
        let totalEstCookedKg = 0;

        orders.forEach(ord => {
          const dateStr = ord.productionDate ? new Date(ord.productionDate).toLocaleDateString('en-GB') : 'N/A';
          (ord.items || []).forEach(it => {
            const batchNum = Number(it.batches) || 0;
            const pouchNum = Math.round(Number(it.targetPouches) || 0);
            const cookedWt = Number(it.recipe?.cookedBatchWeight) || (Number(it.recipe?.batchCookedWeightKg) || 100);
            const estKg = batchNum * cookedWt;

            totalBatches += batchNum;
            totalPouches += pouchNum;
            totalEstCookedKg += estKg;

            answer += `| **${ord.orderNumber}** | ${dateStr} | ${ord.buyerName || it.recipe?.buyerName || 'General'} | ${it.productName} | **${formatNum(batchNum, prefs.decimalPlaces)}** | **${formatPouch(pouchNum)}** | ${formatNum(estKg, Math.min(2, prefs.decimalPlaces))} kg | \`${ord.status}\` |\n`;
          });
        });

        answer += `\n**📊 Operational Analysis & Totals:**\n`;
        answer += `- 🎯 **Total Batches Scheduled:** **${formatNum(totalBatches, prefs.decimalPlaces)} batches**\n`;
        answer += `- 📦 **Total Target Pouches:** **${formatPouch(totalPouches)} pouches**\n`;
        answer += `- 🍳 **Estimated Cooked Output:** **${formatNum(totalEstCookedKg, Math.min(2, prefs.decimalPlaces))} kg**\n`;
        answer += `- ⏱️ **Estimated Filling Runtime:** ~${formatNum(totalPouches / 2000, 1)} hours *(at nominal 2,000 pouches/hr line speed)*\n\n`;
        answer += `💡 *Next Steps: Check materials in **[Kitchen Store Issue](/material-issue)** or plan new lines in **[Schedule Production Orders](/production-goal)**.*`;
      } else {
        answer = `### 📋 Production Plan (${timeframe.label})\n\n`;
        answer += `No scheduled production orders found specifically for **${timeframe.label}**.\n\n`;
        answer += `**What you can do:**\n`;
        answer += `1. Go to **[Schedule Production Batches](/production-goal)** to plan recipes and target pouches for tomorrow.\n`;
        answer += `2. Select a Buyer and choose a Product from the master catalog.\n`;
        answer += `3. Specify pack sizes and target batches to auto-generate the requirement matrix.`;
      }
    }

    // 3A. COSTING ANALYSIS (YESTERDAY'S COSTING / DATE OR MONTH COSTING)
    else if (
      qLower.includes('costing') ||
      qLower.includes('cost per pouch') ||
      qLower.includes('labour cost') ||
      qLower.includes('labor cost') ||
      qLower.includes('worker cost') ||
      qLower.includes('shift cost') ||
      qLower.includes('production cost') ||
      (qLower.includes('cost') && !qLower.includes('raw material') && (timeframe.hasExplicitTimeframe || qLower.includes('yesterday') || qLower.includes('today') || qLower.includes('month') || qLower.includes('week')))
    ) {
      intent = 'COSTING_ANALYSIS';
      const matchedBuyer = findBuyerMatch(qLower, allProducts);
      let startDate = timeframe.start;
      let endDate = timeframe.end;
      let effectiveLabel = timeframe.label;
      let usedFallbackDate = false;

      let docs = await Data.find({
        createdAt: { $gte: startDate, $lte: endDate }
      }).sort({ createdAt: 1 });

      // If no records exist for the requested date (e.g. Yesterday had no shift logged), fallback to the latest recorded day
      if (docs.length === 0) {
        const latestDoc = await Data.findOne({}).sort({ createdAt: -1 });
        if (latestDoc && latestDoc.createdAt) {
          const d = new Date(latestDoc.createdAt);
          const fStart = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
          const fEnd = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999));
          docs = await Data.find({ createdAt: { $gte: fStart, $lte: fEnd } }).sort({ createdAt: 1 });
          usedFallbackDate = true;
          effectiveLabel = `${d.getUTCDate()} ${MONTH_NAMES[d.getUTCMonth()].slice(0, 3)} ${d.getUTCFullYear()}`;
        }
      }

      // Build shift & product costing rows (same exact formula as Costing.js)
      const shiftMeta = new Map();
      const rowMap = new Map();

      const getPackSizeKgLocal = (val) => {
        const n = Number(val) || 0;
        if (n <= 0) return 0.25;
        if (n > 5) return n / 1000;
        return n;
      };

      const getMeta = (dKey, shift) => {
        const k = `${dKey}|||${shift}`;
        if (!shiftMeta.has(k)) {
          shiftMeta.set(k, {
            dateKey: dKey,
            shift,
            kitchenWorkers: null,
            fillingWorkers: null,
            dispatchWorkers: null,
            pouchesProduced: 0
          });
        }
        return shiftMeta.get(k);
      };

      const getRow = (dKey, buyerName, productName, shift) => {
        const k = `${dKey}|||${buyerName}|||${productName}|||${shift}`;
        if (!rowMap.has(k)) {
          rowMap.set(k, {
            dateKey: dKey,
            buyerName: buyerName || 'General',
            productName: productName || 'Unknown',
            shift,
            productionQty: 0,
            pouchesProduced: 0,
            wastagePouches: 0,
            wastageKg: 0,
            filledPouchWeightKg: 0,
            pouchPacked: 0
          });
        }
        return rowMap.get(k);
      };

      docs.forEach(doc => {
        const list = doc.dataList || [];
        if (!list.length) return;
        const dKey = doc.createdAt ? new Date(doc.createdAt).toISOString().slice(0, 10) : 'Unknown';
        const shift = String(doc.dayTime || 'Day').trim().toLowerCase() === 'night' ? 'Night' : 'Day';
        const meta = getMeta(dKey, shift);
        const first = list[0];
        const sec = doc.sectionMain;

        if (sec === 'Kitchen') {
          if (meta.kitchenWorkers === null) meta.kitchenWorkers = Number(first.workersQuantity) || 0;
          list.forEach(it => {
            const r = getRow(dKey, it.buyerName, it.productName, shift);
            r.productionQty += (Number(it.yield) || 0) * (Number(it.batchQuantity) || 0);
          });
        } else if (sec === 'Filling') {
          if (meta.fillingWorkers === null) meta.fillingWorkers = Number(first.workersQuantity) || 0;
          list.forEach(it => {
            const r = getRow(dKey, it.buyerName, it.productName, shift);
            const pouches = Number(it.pouchQuantity) || 0;
            const ps = getPackSizeKgLocal(it.packSize);
            r.pouchesProduced += pouches;
            meta.pouchesProduced += pouches;
            r.wastagePouches += Number(it.empty) || 0;
            r.wastageKg += Number(it.filled) || 0;
            r.filledPouchWeightKg += pouches * (ps + 0.005);
          });
        }
      });

      docs.forEach(doc => {
        const list = doc.dataList || [];
        if (!list.length) return;
        const dKey = doc.createdAt ? new Date(doc.createdAt).toISOString().slice(0, 10) : 'Unknown';
        const shift = String(doc.dayTime || 'Day').trim().toLowerCase() === 'night' ? 'Night' : 'Day';
        const meta = getMeta(dKey, shift);
        const first = list[0];
        if (doc.sectionMain === 'Dispatch') {
          if (meta.dispatchWorkers === null) meta.dispatchWorkers = Number(first.workersQuantity) || 0;
          list.forEach(it => {
            const k = `${dKey}|||${it.buyerName || 'General'}|||${it.productName || 'Unknown'}|||${shift}`;
            if (rowMap.has(k)) {
              rowMap.get(k).pouchPacked += Number(it.pouchPacked) || 0;
            }
          });
        }
      });

      let costingRows = Array.from(rowMap.values()).map(r => {
        const meta = getMeta(r.dateKey, r.shift);
        const kWorkers = meta.kitchenWorkers ?? 0;
        const fWorkers = meta.fillingWorkers ?? 0;
        const dWorkers = meta.dispatchWorkers ?? 0;
        const kCost = kWorkers * 900;
        const fCost = fWorkers * 900;
        const dCost = dWorkers * 900;
        const costPerPouch = meta.pouchesProduced > 0 ? (kCost + fCost) / meta.pouchesProduced : 0;
        const prodQtyKg = r.filledPouchWeightKg + r.wastageKg;
        const variance = r.productionQty - prodQtyKg;
        return {
          ...r,
          kitchenWorkers: kWorkers,
          fillingWorkers: fWorkers,
          dispatchWorkers: dWorkers,
          kitchenCost: kCost,
          fillingCost: fCost,
          dispatchCost: dCost,
          costPerPouch,
          prodQtyKg,
          variance
        };
      });

      if (matchedProduct) {
        costingRows = costingRows.filter(
          r =>
            r.productName.toLowerCase().includes(matchedProduct.name.toLowerCase()) ||
            matchedProduct.name.toLowerCase().includes(r.productName.toLowerCase())
        );
      }
      if (matchedBuyer) {
        costingRows = costingRows.filter(r => r.buyerName.toLowerCase() === matchedBuyer.toLowerCase());
      }

      // Compute shift-level totals (without double-counting shared shift workers)
      const seenShifts = new Set();
      let totalKWorkers = 0;
      let totalFWorkers = 0;
      let totalDWorkers = 0;
      let totalKCost = 0;
      let totalFCost = 0;
      let totalDCost = 0;
      let totalPouches = 0;
      let totalCookedKg = 0;
      let totalProdKg = 0;
      let totalPacked = 0;

      costingRows.forEach(r => {
        const sKey = `${r.dateKey}|||${r.shift}`;
        if (!seenShifts.has(sKey)) {
          seenShifts.add(sKey);
          totalKWorkers += r.kitchenWorkers;
          totalFWorkers += r.fillingWorkers;
          totalDWorkers += r.dispatchWorkers;
          totalKCost += r.kitchenCost;
          totalFCost += r.fillingCost;
          totalDCost += r.dispatchCost;
        }
        totalPouches += r.pouchesProduced;
        totalCookedKg += r.productionQty;
        totalProdKg += r.prodQtyKg;
        totalPacked += r.pouchPacked;
      });

      const overallCostPerPouch = totalPouches > 0 ? (totalKCost + totalFCost) / totalPouches : 0;
      const totalLabourCost = totalKCost + totalFCost + totalDCost;

      contextData = {
        requestedTimeframe: timeframe.label,
        effectiveLabel,
        usedFallbackDate,
        totalPouches,
        totalCookedKg,
        totalKWorkers,
        totalFWorkers,
        totalDWorkers,
        totalKCost,
        totalFCost,
        totalDCost,
        totalLabourCost,
        overallCostPerPouch,
        rowsCount: costingRows.length,
        sampleRows: costingRows.slice(0, 15)
      };

      const geminiAns = await callGeminiIfAvailable(q, contextData, activeRules);
      if (geminiAns) {
        const suggestions = await generateContextualSuggestions(intent, matchedProduct, q);
        return res.status(200).json({ success: true, answer: geminiAns, intent, context: contextData, suggestions });
      }

      answer = `### 💰 Factory Costing & Labour Analysis (${usedFallbackDate ? `Latest Logged: ${effectiveLabel}` : timeframe.label})\n\n`;
      if (usedFallbackDate) {
        answer += `> ℹ️ *No shift logs were recorded on **${timeframe.label}**. Showing costing for the most recent logged production date (**${effectiveLabel}**).*\n\n`;
      }

      if (costingRows.length === 0) {
        answer += `No shift costing records found for **${timeframe.label}**.\n`;
      } else {
        answer += `| Date | Shift | Buyer | Product | Cooked (Kg) | Pouches Filled | Kitchen Cost | Filling Cost | Dispatch Cost | **Cost / Pouch** |\n`;
        answer += `| :--- | :---: | :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: |\n`;
        costingRows.slice(0, 18).forEach(r => {
          answer += `| ${r.dateKey} | \`${r.shift}\` | ${r.buyerName} | **${r.productName}** | ${formatNum(r.productionQty, prefs.decimalPlaces)} kg | **${formatPouch(r.pouchesProduced)}** | ₹${r.kitchenCost.toLocaleString()} (${r.kitchenWorkers}w) | ₹${r.fillingCost.toLocaleString()} (${r.fillingWorkers}w) | ₹${r.dispatchCost.toLocaleString()} (${r.dispatchWorkers}w) | **₹${formatNum(r.costPerPouch, prefs.decimalPlaces)}** |\n`;
        });

        answer += `\n#### 📊 Consolidated Costing Summary (${usedFallbackDate ? effectiveLabel : timeframe.label})\n`;
        answer += `- 👷 **Total Shift Manpower:** **${totalKWorkers + totalFWorkers + totalDWorkers} workers** *(Kitchen: ${totalKWorkers}, Filling: ${totalFWorkers}, Dispatch: ${totalDWorkers})*\n`;
        answer += `- 💵 **Kitchen Labour Cost:** **₹${totalKCost.toLocaleString()}** *(at ₹900/worker)*\n`;
        answer += `- 💵 **Filling Labour Cost:** **₹${totalFCost.toLocaleString()}** *(at ₹900/worker)*\n`;
        answer += `- 💵 **Dispatch Labour Cost:** **₹${totalDCost.toLocaleString()}** *(at ₹900/worker)*\n`;
        answer += `- 💰 **Total Combined Labour Cost:** **₹${totalLabourCost.toLocaleString()}**\n`;
        answer += `- 📦 **Total Pouches Produced:** **${formatPouch(totalPouches)} pouches** *(Cooked Yield: ${formatNum(totalCookedKg, prefs.decimalPlaces)} kg)*\n`;
        answer += `- 🎯 **Average Production Cost per Pouch (Kitchen + Filling):** **₹${formatNum(overallCostPerPouch, prefs.decimalPlaces)} / pouch**\n\n`;
        answer += `💡 *View full interactive monthly breakdown in **[Costing & Variance Report](/admin/costing)**.*`;
      }
    }

    // 3B. HISTORICAL OPERATIONAL ANALYTICS: WORKER COUNT, POUCHES PRODUCED, POUCHES PACKED, KITCHEN YIELD
    else if (
      qLower.includes('worker') ||
      qLower.includes('workers') ||
      qLower.includes('manpower') ||
      qLower.includes('headcount') ||
      qLower.includes('staff') ||
      qLower.includes('packed') ||
      qLower.includes('dispatched') ||
      qLower.includes('created') ||
      qLower.includes('produced') ||
      qLower.includes('cooked') ||
      qLower.includes('made') ||
      qLower.includes('filled') ||
      qLower.includes('how much') ||
      (qLower.includes('yield') && !qLower.includes('recipe')) ||
      (timeframe.hasExplicitTimeframe && (qLower.includes('how many') || qLower.includes('total') || qLower.includes('count') || qLower.includes('pouch') || Boolean(matchedProduct)))
    ) {
      intent = 'PRODUCTION_YIELD';
      const startDate = timeframe.start;
      const endDate = timeframe.end;
      const matchedBuyer = findBuyerMatch(qLower, allProducts);

      // Extract non-stopword product search tokens for fallback matching in Data logs
      const rawSearchTokens = qLower
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter(t => t.length >= 3 && !stopWords.has(t) && !/^\d+$/.test(t) && (!matchedBuyer || t !== matchedBuyer.toLowerCase()));

      const docs = await Data.find({
        createdAt: { $gte: startDate, $lte: endDate }
      }).sort({ createdAt: 1 });

      // 1. Worker count aggregation (per unique date + shift + section)
      const shiftWorkerMap = new Map();
      let kitchenWorkersTotal = 0;
      let fillingWorkersTotal = 0;
      let dispatchWorkersTotal = 0;
      let dayShiftWorkers = 0;
      let nightShiftWorkers = 0;
      const activeDatesSet = new Set();

      // 2. Production & Packing aggregation
      let kitchenBatches = 0;
      let kitchenKg = 0;
      let filledPouches = 0;
      let filledWeightKg = 0;
      let wastePouches = 0;
      let packedPouches = 0;
      let packedBoxes = 0;
      let dispatchLeakage = 0;
      let dispatchXray = 0;
      const productBreakdown = {};

      docs.forEach(doc => {
        const sec = doc.sectionMain;
        const shift = String(doc.dayTime || 'Day').trim().toLowerCase() === 'night' ? 'Night' : 'Day';
        const dateKey = doc.createdAt ? new Date(doc.createdAt).toISOString().slice(0, 10) : 'Unknown';
        const list = doc.dataList || [];

        if (list.length > 0) {
          activeDatesSet.add(dateKey);
          const wKey = `${dateKey}|||${shift}|||${sec}`;
          if (!shiftWorkerMap.has(wKey)) {
            const wCount = Number(list[0].workersQuantity) || 0;
            shiftWorkerMap.set(wKey, { dateKey, shift, section: sec, workers: wCount });
            if (sec === 'Kitchen') kitchenWorkersTotal += wCount;
            else if (sec === 'Filling') fillingWorkersTotal += wCount;
            else if (sec === 'Dispatch') dispatchWorkersTotal += wCount;

            if (shift === 'Day') dayShiftWorkers += wCount;
            else nightShiftWorkers += wCount;
          }
        }

        list.forEach(item => {
          const prodName = (item.productName || 'Unknown').trim();
          const itemBuyer = (item.buyerName || item.buyer || 'General').trim();
          const prodLower = prodName.toLowerCase();
          const buyerLower = itemBuyer.toLowerCase();

          // Filter by buyer if user specified a buyer (e.g. "rgg")
          if (matchedBuyer && buyerLower !== matchedBuyer.toLowerCase()) {
            return;
          }

          // Filter by product if user specified a product
          if (matchedProduct) {
            const mLower = matchedProduct.name.toLowerCase();
            if (!prodLower.includes(mLower) && !mLower.includes(prodLower)) {
              return;
            }
          } else if (rawSearchTokens.length > 0) {
            const matchesTokens = rawSearchTokens.every(t => prodLower.includes(t) || buyerLower.includes(t));
            if (!matchesTokens) return;
          }

          const groupKey = `${itemBuyer} — ${prodName}`;
          if (!productBreakdown[groupKey]) {
            productBreakdown[groupKey] = {
              buyer: itemBuyer,
              product: prodName,
              batches: 0,
              kg: 0,
              filled: 0,
              waste: 0,
              packed: 0,
              boxes: 0,
              dates: new Set()
            };
          }
          productBreakdown[groupKey].dates.add(dateKey);

          if (sec === 'Kitchen') {
            const bQty = Number(item.batchQuantity) || 0;
            const y = Number(item.yield) || 0;
            kitchenBatches += bQty;
            kitchenKg += bQty * y;
            productBreakdown[groupKey].batches += bQty;
            productBreakdown[groupKey].kg += bQty * y;
          } else if (sec === 'Filling') {
            const f = Number(item.pouchQuantity) || 0;
            const w = Number(item.empty) || 0;
            const ps = Number(item.packSize) > 5 ? Number(item.packSize) / 1000 : (Number(item.packSize) || 0.25);
            filledPouches += f;
            filledWeightKg += f * ps;
            wastePouches += w;
            productBreakdown[groupKey].filled += f;
            productBreakdown[groupKey].waste += w;
          } else if (sec === 'Dispatch') {
            const pk = Number(item.pouchPacked) || 0;
            const bx = Number(item.box) || 0;
            const lk = Number(item.leaked) || 0;
            const fm = Number(item.foreignMatter) || 0;
            packedPouches += pk;
            packedBoxes += bx;
            dispatchLeakage += lk;
            dispatchXray += fm;
            productBreakdown[groupKey].packed += pk;
            productBreakdown[groupKey].boxes += bx;
          }
        });
      });

      const totalWorkersAllSections = kitchenWorkersTotal + fillingWorkersTotal + dispatchWorkersTotal;
      const asksWorkers =
        qLower.includes('worker') ||
        qLower.includes('workers') ||
        qLower.includes('manpower') ||
        qLower.includes('headcount') ||
        qLower.includes('staff');
      const asksProductionOrPacking =
        qLower.includes('pouch') ||
        qLower.includes('pouches') ||
        qLower.includes('produced') ||
        qLower.includes('packed') ||
        qLower.includes('made') ||
        qLower.includes('cooked') ||
        qLower.includes('created') ||
        qLower.includes('filled') ||
        Boolean(matchedProduct) ||
        rawSearchTokens.length > 0;

      contextData = {
        timeframe: timeframe.label,
        matchedBuyer,
        matchedProduct: matchedProduct?.name,
        activeDays: activeDatesSet.size,
        workers: {
          total: totalWorkersAllSections,
          kitchen: kitchenWorkersTotal,
          filling: fillingWorkersTotal,
          dispatch: dispatchWorkersTotal,
          dayShift: dayShiftWorkers,
          nightShift: nightShiftWorkers,
          estimatedLabourCost: totalWorkersAllSections * 900
        },
        production: {
          kitchenBatches,
          kitchenKg,
          filledPouches,
          filledWeightKg,
          wastePouches,
          packedPouches,
          packedBoxes,
          dispatchLeakage,
          dispatchXray
        },
        productBreakdown
      };

      const geminiAns = await callGeminiIfAvailable(q, contextData, activeRules);
      if (geminiAns) {
        const suggestions = await generateContextualSuggestions(intent, matchedProduct, q);
        return res.status(200).json({ success: true, answer: geminiAns, intent, context: contextData, suggestions });
      }

      const prodKeys = Object.keys(productBreakdown);
      answer = `### 📊 Factory Operations Report (${timeframe.label})\n\n`;

      if (docs.length === 0) {
        answer += `No shift logs found in the database for **${timeframe.label}**.\n\n`;
        answer += `💡 *Verify shift entries in **[Kitchen](/today-kitchen)**, **[Filling](/today-filling)**, or **[Dispatch](/today-dispatch)**.*`;
      } else {
        // Section 1: Worker Count Breakdown (if asked about workers or general summary)
        if (asksWorkers) {
          answer += `#### 👷 1. Manpower & Worker Count Summary (${timeframe.label})\n\n`;
          answer += `| Department | Worker Count (Man-Shifts) | Labour Cost (@ ₹900/worker) |\n`;
          answer += `| :--- | :---: | :---: |\n`;
          answer += `| **Kitchen Section** | **${kitchenWorkersTotal.toLocaleString()}** | ₹${(kitchenWorkersTotal * 900).toLocaleString()} |\n`;
          answer += `| **Filling & Retort Section** | **${fillingWorkersTotal.toLocaleString()}** | ₹${(fillingWorkersTotal * 900).toLocaleString()} |\n`;
          answer += `| **Dispatch & Packing Section** | **${dispatchWorkersTotal.toLocaleString()}** | ₹${(dispatchWorkersTotal * 900).toLocaleString()} |\n`;
          answer += `| 🎯 **Total Factory Workers** | **${totalWorkersAllSections.toLocaleString()} workers** | **₹${(totalWorkersAllSections * 900).toLocaleString()}** |\n\n`;
          answer += `- ☀️ **Day Shift Workers:** ${dayShiftWorkers.toLocaleString()} | 🌙 **Night Shift Workers:** ${nightShiftWorkers.toLocaleString()} | 📅 **Active Production Days:** ${activeDatesSet.size} day(s)\n\n`;
        }

        // Section 2: Production & Packing Breakdown (if asked about production/pouches/packed or if not only workers)
        if (asksProductionOrPacking || !asksWorkers) {
          const filterTitle = matchedProduct
            ? `for **${matchedBuyer ? `${matchedBuyer} - ` : ''}${matchedProduct.name}**`
            : matchedBuyer
            ? `for Buyer **${matchedBuyer}**`
            : rawSearchTokens.length > 0
            ? `matching **"${rawSearchTokens.join(' ')}"**`
            : `across **${prodKeys.length}** product line(s)`;

          answer += `#### 📦 ${asksWorkers ? '2. ' : ''}Production, Filling & Packing Summary ${filterTitle}\n\n`;

          if (prodKeys.length === 0) {
            answer += `No matching product records found ${filterTitle} during **${timeframe.label}**.\n\n`;
          } else {
            answer += `| Buyer | Product Name | Kitchen Batches | Cooked Yield (Kg) | Pouches Produced (Filled) | Pouches Packed (Dispatch) | Boxes Packed |\n`;
            answer += `| :--- | :--- | :---: | :---: | :---: | :---: | :---: |\n`;

            prodKeys.slice(0, 25).forEach(pk => {
              const pb = productBreakdown[pk];
              answer += `| \`${pb.buyer}\` | **${pb.product}** | ${formatNum(pb.batches, prefs.decimalPlaces)} | ${formatNum(pb.kg, prefs.decimalPlaces)} kg | **${formatPouch(pb.filled)}** | **${formatPouch(pb.packed)}** | ${formatPouch(pb.boxes)} |\n`;
            });

            if (prodKeys.length > 25) {
              answer += `| ... | *+${prodKeys.length - 25} more products* | — | — | — | — | — |\n`;
            }

            answer += `\n**📈 Grand Totals (${timeframe.label}):**\n`;
            answer += `- 🍳 **Kitchen Cooked Output:** **${formatNum(kitchenBatches, prefs.decimalPlaces)} batches** (**${formatNum(kitchenKg, prefs.decimalPlaces)} kg**)\n`;
            answer += `- 📦 **Total Pouches Produced (Filled):** **${formatPouch(filledPouches)} pouches** *(~${formatNum(filledWeightKg, prefs.decimalPlaces)} kg)*\n`;
            answer += `- 🚚 **Total Pouches Packed (Dispatch):** **${formatPouch(packedPouches)} pouches** (**${formatPouch(packedBoxes)} carton boxes**)\n`;
            answer += `- 🗑️ **Wastage / Defects:** Filling Empty: ${formatPouch(wastePouches)} pouches | Dispatch Leakage: ${formatPouch(dispatchLeakage)} | X-Ray Defects: ${formatPouch(dispatchXray)}\n`;
            if (!asksWorkers) {
              answer += `- 👷 **Total Workers Deployed in Period:** **${totalWorkersAllSections.toLocaleString()} workers** *(Kitchen: ${kitchenWorkersTotal}, Filling: ${fillingWorkersTotal}, Dispatch: ${dispatchWorkersTotal})*\n`;
            }
          }
        }
      }
    }

    // 3C. KITCHEN STORE ISSUE / RECIPE CALCULATOR BY YIELD OR BY BATCH (Up to 4 Decimals + Unit Variants)
    else if (
      qLower.includes('by yield') ||
      qLower.includes('by batch') ||
      qLower.includes('given yield') ||
      qLower.includes('recipe yield') ||
      qLower.includes('kitchen issue') ||
      qLower.includes('store issue') ||
      ((qLower.includes('calculate') || qLower.includes('issue') || qLower.includes('recipe') || qLower.includes('bom') || qLower.includes('ingredient')) &&
        (/\d+(\.\d+)?\s*(?:kg|kgs|batch|batches)/i.test(qLower) || qLower.includes('yield')))
    ) {
      intent = 'KITCHEN_ISSUE_CALC';
      const calcRes = await calculateRecipeByYieldOrBatch(q, allProducts, prefs.decimalPlaces);
      contextData = { query: q, calcRes };

      const geminiAns = await callGeminiIfAvailable(q, contextData, activeRules);
      if (geminiAns) {
        const suggestions = await generateContextualSuggestions(intent, matchedProduct, q);
        return res.status(200).json({ success: true, answer: geminiAns, intent, context: contextData, suggestions });
      }

      if (!calcRes.found) {
        answer = `### 🍲 Kitchen Store Issue & Recipe Calculator (By Yield / By Batch)\n\n`;
        answer += `Please specify a product recipe to calculate ingredients (with up to **4 decimal places**).\n\n`;
        if (calcRes.sampleRecipes && calcRes.sampleRecipes.length > 0) {
          answer += `**Available Recipes in Database:**\n\n`;
          answer += `| Product Name | Buyer | Standard Recipe Yield (kg) | Ingredients |\n`;
          answer += `| :--- | :--- | :---: | :---: |\n`;
          calcRes.sampleRecipes.forEach(r => {
            answer += `| **${r.productName}** | ${r.buyerName} | **${formatNum(r.recipeYieldKg, 4)} kg** | ${r.ingredientCount} items |\n`;
          });
          const firstProd = calcRes.sampleRecipes[0].productName;
          answer += `\n💡 *Try asking:*\n`;
          answer += `- *"Calculate kitchen issue for 150 kg yield of ${firstProd}"*\n`;
          answer += `- *"Calculate recipe for 2.5 batches of ${firstProd}"*`;
        }
      } else {
        const { recipe, calcBasis, batches, givenYieldKg, multiplier, totalEdibleKg, totalGrossKg, calculatedIngredients } = calcRes;
        answer = `### 🍲 Kitchen Store Issue Calculation: **${recipe.productName}** (${recipe.buyerName})\n\n`;
        if (calcBasis === 'YIELD') {
          answer += `- **Calculation Mode:** \`BY YIELD\` — $\\text{Ingredient A} = \\text{Qty of A} \\times \\left(\\frac{\\text{Given Yield}}{\\text{Recipe Yield}}\\right)$\n`;
          answer += `- **Recipe Standard Yield:** **${formatNum(recipe.recipeYieldKg, 4)} kg** | **Given / Target Yield:** **${formatNum(givenYieldKg, 4)} kg**\n`;
          answer += `- **Effective Yield Multiplier:** **${formatNum(multiplier, 4)}x** *(Equivalent to ${formatNum(batches, 4)} batches)*\n\n`;
        } else {
          answer += `- **Calculation Mode:** \`BY BATCH\` — $\\text{Ingredient A} = \\text{Qty of A} \\times \\text{No. of Batches}$\n`;
          answer += `- **Number of Batches:** **${formatNum(batches, 4)} batch(es)** *(Est. Cooked Yield: ${formatNum(givenYieldKg, 4)} kg @ ${formatNum(recipe.recipeYieldKg, 4)} kg/batch)*\n\n`;
        }

        answer += `| # | Ingredient Name | 1-Batch Edible (kg) | Loss Factor | Scaled Edible (kg) | **Theoretical Gross (kg)** | Available Stock (kg & Unit) | Issue Conversion / Status |\n`;
        answer += `| :---: | :--- | :---: | :---: | :---: | :---: | :---: | :--- |\n`;

        calculatedIngredients.forEach(ing => {
          const availStr = ing.isNonStd
            ? `**${formatNum(ing.availStockKg, 4)} kg** (${formatNum(ing.primaryVariantKg, 4)} kg × ${formatNum(ing.availStockUnits, 4)} ${ing.stockUnit})`
            : `**${formatNum(ing.availStockKg, 4)} ${ing.stockUnit}**`;

          let convStr = ing.isSufficient ? '🟢 Sufficient' : `🔴 Deficit (-${formatNum(ing.deficitKg, 4)} kg)`;
          if (ing.isNonStd && ing.variantConversions.length > 0) {
            const vParts = ing.variantConversions.map(
              vc => `${formatNum(vc.unitsNeeded, 4)} ${ing.stockUnit} (@ ${formatNum(vc.variantKg, 4)}kg)`
            );
            convStr = `${vParts.join(' or ')} — ${convStr}`;
          }

          answer += `| ${ing.index} | **${ing.materialName}** | ${formatNum(ing.baseEdibleKg, 4)} kg | ${formatNum(ing.lossFactor, 4)}x | ${formatNum(ing.edibleKg, 4)} kg | **${formatNum(ing.grossKg, 4)} kg** | ${availStr} | ${convStr} |\n`;
        });

        answer += `\n**📊 Totals (4-Decimal Precision):**\n`;
        answer += `- **Total Scaled Edible Kettle Qty:** **${formatNum(totalEdibleKg, 4)} kg**\n`;
        answer += `- **Total Theoretical Gross Warehouse Req:** **${formatNum(totalGrossKg, 4)} kg**\n`;
        answer += `\n💡 *Ready to issue? Open **[Kitchen Store Issue](/material-issue)** and toggle between **By Batch** or **By Yield**.*`;
      }
    }

    // 3D. PO POUCH TRACKER & PROGRESSIVE POUCH ALLOCATION (Universal vs Exclusive Pouches)
    else if (
      qLower.includes('pouch tracker') ||
      qLower.includes('po pouch') ||
      qLower.includes('progressive pouch') ||
      qLower.includes('universal pouch') ||
      qLower.includes('exclusive pouch') ||
      (qLower.includes('universal') && qLower.includes('pouch'))
    ) {
      intent = 'PO_POUCH_TRACKER';
      const trackerData = await calculatePoPouchTrackerSummary(q, allProducts);
      contextData = { query: q, trackerData };

      const geminiAns = await callGeminiIfAvailable(q, contextData, activeRules);
      if (geminiAns) {
        const suggestions = await generateContextualSuggestions(intent, matchedProduct, q);
        return res.status(200).json({ success: true, answer: geminiAns, intent, context: contextData, suggestions });
      }

      answer = `### 📦 PO Pouch Tracker & Progressive Pouch Allocation (Month ${trackerData.currentMonth})\n\n`;
      answer += `Tracks **Exclusive Pouches** (by Buyer + Product) and **Universal Shared Pouches** (by Pack Size across products) with progressive running balances across repeated Master Buyer Orders.\n\n`;

      if (trackerData.universalPoolsSummary.length > 0) {
        answer += `#### 🌐 1. Universal Shared Pouch Pools (Deducted by Pack Size)\n\n`;
        answer += `| Pack Size | Pool Label | Pouches (IN) | Filled | Wastage | **Current Available Balance** |\n`;
        answer += `| :---: | :--- | :---: | :---: | :---: | :---: |\n`;
        trackerData.universalPoolsSummary.forEach(u => {
          answer += `| **${u.packSizeKg} kg** (${Math.round(u.packSizeKg * 1000)}g) | ${u.label} | ${formatPouch(u.stockIn)} | ${formatPouch(u.filled)} | ${formatPouch(u.wastage)} | **${formatPouch(u.remain)} pouches** |\n`;
        });
        answer += `\n`;
      }

      let rows = trackerData.trackerRows;
      if (matchedProduct) {
        rows = rows.filter(r => r.productName.toLowerCase().includes(matchedProduct.name.toLowerCase()));
      }

      answer += `#### 📋 2. Progressive PO Pouch Allocation Across Master Buyer Orders\n\n`;
      if (rows.length === 0) {
        answer += `*No Master Buyer Order line items found. Add orders in **[MRP & Purchase Planner](/purchase-planner)**.*\n`;
      } else {
        answer += `| PO # | Buyer | Product Name | Pack Size | Pouch Type | Opening Pouch Stock | Required Pouches | **Due / Balance After PO** | Status |\n`;
        answer += `| :--- | :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: |\n`;
        rows.slice(0, 25).forEach(r => {
          const dueFormatted = r.dueAfter >= 0 ? `+${formatPouch(r.dueAfter)}` : `${formatPouch(r.dueAfter)}`;
          const badge = r.dueAfter >= 0 ? '🟢 POUCH AVAILABLE' : '🔴 ORDER POUCHES';
          answer += `| **${r.orderNumber}** | ${r.buyerName} | **${r.productName}** | ${r.packSizeKg} kg | \`${r.pouchMode}\` | **${formatPouch(r.openingPouchStock)}** | ${formatPouch(r.requiredPouches)} | **${dueFormatted}** | ${badge} |\n`;
        });
      }
      answer += `\n💡 *Manage PO Pouch Tracker in **[MRP & Purchase Planner](/purchase-planner)** or configure Universal/Exclusive pools in **[Pouch Stock Ledger](/pouch)**.*`;
    }

    // 4. RAW MATERIAL INVENTORY, UNIT VARIANTS (TINS/KG) & SHORTAGE ALERTS
    else if (
      qLower.includes('raw material') ||
      qLower.includes('raw materials') ||
      qLower.includes('rm ') ||
      qLower.includes('ingredient') ||
      qLower.includes('low stock') ||
      qLower.includes('shortage') ||
      qLower.includes('variant') ||
      qLower.includes('tin') ||
      qLower.includes('tins') ||
      (qLower.includes('buffer') && !qLower.includes('pouch'))
    ) {
      intent = 'RAW_MATERIALS';
      const materials = await RawMaterial.find({}).sort({ currentStock: 1 });
      const lowStock = materials.filter(m => m.currentStock <= (m.minSafetyStock || 0));
      const nonStdMaterials = materials.filter(m => isNonStdUnit(m.baseUnit));

      // Check if user asked about a specific raw material (e.g., "tomato puree")
      const matchedRm = materials.find(m => m.name && qLower.includes(m.name.toLowerCase()));

      contextData = {
        totalMaterials: materials.length,
        lowStockCount: lowStock.length,
        matchedRm,
        nonStdMaterials: nonStdMaterials.slice(0, 10),
        lowStockSample: lowStock.slice(0, 10)
      };

      const geminiAns = await callGeminiIfAvailable(q, contextData, activeRules);
      if (geminiAns) {
        const suggestions = await generateContextualSuggestions(intent, matchedProduct, q);
        return res.status(200).json({ success: true, answer: geminiAns, intent, context: contextData, suggestions });
      }

      answer = `### 🌾 Raw Material Inventory, Unit Variants & Shortage Status\n\n`;
      if (matchedRm) {
        const variants = getRmVariants(matchedRm);
        const isNonStd = isNonStdUnit(matchedRm.baseUnit) && variants.length > 0;
        const primaryKg = isNonStd ? variants[0] : 1;
        const stockKg = isNonStd ? parseFloat((matchedRm.currentStock * primaryKg).toFixed(4)) : matchedRm.currentStock;

        answer += `#### 🔍 Specific Material Lookup: **${matchedRm.name}**\n`;
        answer += `- **Warehouse Stock (Base Unit):** **${formatNum(matchedRm.currentStock, 4)} ${matchedRm.baseUnit}**\n`;
        if (isNonStd) {
          answer += `- **Available Stock in Kg:** **${formatNum(stockKg, 4)} kg** *(${formatNum(primaryKg, 4)} kg × ${formatNum(matchedRm.currentStock, 4)} ${matchedRm.baseUnit})*\n`;
          answer += `- **Configured Weight Variants:** \`${variants.map(v => `${v} kg/${matchedRm.baseUnit}`).join(', ')}\`\n`;
        }
        answer += `- **Safety Buffer:** ${formatNum(matchedRm.minSafetyStock || 0, 4)} ${matchedRm.baseUnit} | **Avg Rate:** ₹${matchedRm.averagePurchaseRate || matchedRm.lastPurchaseRate || 0}\n\n`;
      }

      answer += `- **Total Raw Materials Tracked:** ${materials.length}\n`;
      answer += `- **Non-Standard Container / Variant Materials (e.g. Tins/Cans):** ${nonStdMaterials.length}\n`;
      answer += `- **Low Stock / Reorder Alerts:** **${lowStock.length}** item(s) below safety stock\n\n`;

      if (nonStdMaterials.length > 0 && (qLower.includes('tin') || qLower.includes('variant') || !lowStock.length)) {
        answer += `#### 🥫 Container / Variant Raw Materials (Stock in Units & Kg):\n\n`;
        answer += `| Material Name | Base Unit | Weight Variants (kg/unit) | Available Units | **Available in Kg** |\n`;
        answer += `| :--- | :---: | :---: | :---: | :---: |\n`;
        nonStdMaterials.slice(0, 10).forEach(m => {
          const vars = getRmVariants(m);
          const pKg = vars[0] || 0;
          const eqKg = pKg > 0 ? `${formatNum(m.currentStock * pKg, 4)} kg` : '—';
          answer += `| **${m.name}** | \`${m.baseUnit}\` | ${vars.length ? vars.map(v => `${v} kg`).join(', ') : 'Not set'} | ${formatNum(m.currentStock, 4)} ${m.baseUnit} | **${eqKg}** |\n`;
        });
        answer += `\n`;
      }

      if (lowStock.length > 0) {
        answer += `#### ⚠️ Critical / Low Stock Alert List:\n\n`;
        answer += `| Material Name | Current Stock | Safety Buffer | Unit | Variants (kg) | Supplier | Avg Rate |\n`;
        answer += `| :--- | :---: | :---: | :---: | :---: | :--- | :---: |\n`;

        lowStock.slice(0, 10).forEach(m => {
          const vars = getRmVariants(m);
          const varLabel = vars.length > 0 ? vars.map(v => `${v}kg`).join(', ') : '—';
          answer += `| **${m.name}** | **${formatNum(m.currentStock, 4)}** | ${formatNum(m.minSafetyStock || 0, 4)} | ${m.baseUnit} | ${varLabel} | ${m.preferredSupplier || '—'} | ₹${m.averagePurchaseRate || m.lastPurchaseRate || 0} |\n`;
        });
        answer += `\n💡 *Take action in **[Purchase Planner](/purchase-planner)** or **[Raw Materials Ledger](/raw-materials)**.*`;
      } else {
        answer += `✅ All raw materials are currently operating at or above safe buffer stock thresholds.\n`;
      }
    }

    // 5. POUCH STOCK & REMAINING INVENTORY (Exclusive & Universal Pouch Pools)
    else if (
      qLower.includes('pouch') ||
      qLower.includes('pouches') ||
      qLower.includes('remaining') ||
      qLower.includes('balance') ||
      (matchedProduct && (qLower.includes('stock') || qLower.includes('how many') || qLower.includes('left')))
    ) {
      intent = 'POUCH_STOCK';
      const currentMonth = new Date().getMonth() + 1;
      const universalPools = await UniversalPouch.find({});

      if (matchedProduct) {
        const fullProd = await Product.findById(matchedProduct._id);
        const pouchType = fullProd?.pouchType || 'EXCLUSIVE';
        const defaultPsKg = normalizePackSizeKg(fullProd?.defaultPackSizeKg || 0.25);

        const monthPouch = matchedProduct.pouches[currentMonth - 1] || {};
        const prevPouch = currentMonth > 1 ? matchedProduct.pouches[currentMonth - 2] : null;
        const prevBal = Number(prevPouch?.remain) || 0;
        const stockIn = Number(monthPouch.stock) || 0;

        // Fetch current month filling usage
        const days = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
        const year = new Date().getFullYear();
        const start = new Date(year, currentMonth - 1, 1);
        const end = new Date(year, currentMonth - 1, days[currentMonth - 1]);
        end.setHours(23, 59, 59, 999);

        const fillingDocs = await Data.find({
          sectionMain: 'Filling',
          createdAt: { $gte: start, $lte: end }
        });

        let filledMonth = 0;
        let wasteMonth = 0;
        fillingDocs.forEach(d => {
          (d.dataList || []).forEach(it => {
            if (it.productName === matchedProduct.name) {
              filledMonth += Number(it.pouchQuantity) || 0;
              wasteMonth += Number(it.empty) || 0;
            }
          });
        });

        const calculatedBalance = prevBal + stockIn - filledMonth - wasteMonth;
        const matchedUnivPool =
          pouchType === 'UNIVERSAL' && defaultPsKg > 0
            ? universalPools.find(u => Math.abs((Number(u.packSizeKg) || 0) - defaultPsKg) < 0.0005)
            : null;
        const univBal = matchedUnivPool?.pouches?.[currentMonth - 1]?.remain ?? null;

        contextData = {
          product: matchedProduct.name,
          buyer: matchedProduct.buyer,
          pouchType,
          defaultPackSizeKg: defaultPsKg,
          currentMonth,
          prevBal,
          stockIn,
          filledMonth,
          wasteMonth,
          remainingBalance: calculatedBalance,
          universalPoolBalance: univBal
        };

        const geminiAns = await callGeminiIfAvailable(q, contextData, activeRules);
        if (geminiAns) {
          const suggestions = await generateContextualSuggestions(intent, matchedProduct, q);
          return res.status(200).json({ success: true, answer: geminiAns, intent, context: contextData, suggestions });
        }

        answer = `### 📦 Pouch Inventory: **${matchedProduct.name}**\n\n`;
        answer += `**Buyer:** \`${matchedProduct.buyer}\` | **Pouch Mode:** \`${pouchType}\` | **Current Month:** Month ${currentMonth}\n\n`;
        answer += `| Metric | Quantity (Pouches) |\n`;
        answer += `| :--- | :--- |\n`;
        answer += `| **Previous Month Balance** | ${prevBal.toLocaleString()} |\n`;
        answer += `| **Pouches (IN)** | **+${stockIn.toLocaleString()}** |\n`;
        answer += `| **Pouch Filled** | -${filledMonth.toLocaleString()} |\n`;
        answer += `| **Waste Pouches** | -${wasteMonth.toLocaleString()} |\n`;
        answer += `| 🟢 **Exclusive SKU Available Balance** | **${calculatedBalance.toLocaleString()} pouches** |\n`;
        if (univBal !== null) {
          answer += `| 🌐 **Shared Universal Pool (${defaultPsKg} kg)** | **${Number(univBal).toLocaleString()} pouches** |\n`;
        }
        answer += `\n💡 *View full shift history or manage Universal & Exclusive pouches in **[Pouch Inventory Ledger](/pouch)**.*`;
      } else {
        const topProducts = allProducts.slice(0, 8);
        answer = `### 📦 Live Pouch Balances (Exclusive SKUs & Universal Pools - Month ${currentMonth})\n\n`;
        if (universalPools.length > 0) {
          answer += `#### 🌐 Shared Universal Pouch Pools (By Pack Size):\n`;
          answer += `| Pack Size | Pool Label | Pouches (IN) | Current Available Balance |\n`;
          answer += `| :---: | :--- | :---: | :---: |\n`;
          universalPools.forEach(u => {
            const m = u.pouches?.[currentMonth - 1] || {};
            answer += `| **${u.packSizeKg} kg** (${Math.round(u.packSizeKg * 1000)}g) | ${u.label || 'Universal Pool'} | ${Number(m.stock || 0).toLocaleString()} | **${Number(m.remain || 0).toLocaleString()}** |\n`;
          });
          answer += `\n`;
        }

        answer += `#### 🏷️ Top Product Pouch Balances:\n`;
        answer += `| Product Name | Buyer | Pouches (IN) | Current Balance |\n`;
        answer += `| :--- | :--- | :---: | :---: |\n`;

        topProducts.forEach(p => {
          const m = p.pouches[currentMonth - 1] || {};
          answer += `| **${p.name}** | ${p.buyer} | ${Number(m.stock || 0).toLocaleString()} | **${Number(m.remain || 0).toLocaleString()}** |\n`;
        });

        answer += `\n*Ask about a specific product, or say **"Show PO Pouch Tracker"** to see progressive order deductions across repeated POs.*`;
      }
    }

    // 6. EXPORT CONTAINER MANIFESTS
    else if (
      qLower.includes('container') ||
      qLower.includes('manifest') ||
      qLower.includes('export') ||
      qLower.includes('domestic') ||
      qLower.includes('shipment')
    ) {
      intent = 'CONTAINERS';
      const containers = await Container.find({}).sort({ priority: 1 });

      contextData = {
        totalContainers: containers.length,
        containers: containers.slice(0, 6)
      };

      const geminiAns = await callGeminiIfAvailable(q, contextData, activeRules);
      if (geminiAns) {
        const suggestions = await generateContextualSuggestions(intent, matchedProduct, q);
        return res.status(200).json({ success: true, answer: geminiAns, intent, context: contextData, suggestions });
      }

      answer = `### 🚢 Export & Domestic Container Manifests\n\n`;
      answer += `Found **${containers.length}** active shipping container(s), sorted by priority:\n\n`;
      answer += `| Priority | Container Name | Type | SKUs | Total Pouches |\n`;
      answer += `| :---: | :--- | :---: | :---: | :---: |\n`;

      containers.forEach(c => {
        const totalP = (c.list || []).reduce((acc, it) => acc + (Number(it.pouch) || 0), 0);
        answer += `| **#${c.priority || 1}** | **${c.name}** | \`${c.type || 'Export'}\` | ${c.list?.length || 0} SKUs | **${totalP.toLocaleString()}** |\n`;
      });

      answer += `\n💡 *View live packing progress and dispatch container quotas in **[Container Manifests](/container)**.*`;
    }

    // 7. RECIPES & BOM
    else if (qLower.includes('recipe') || qLower.includes('bom') || qLower.includes('ingredient list')) {
      intent = 'RECIPES';
      const recipes = await Recipe.find({}).limit(10);

      contextData = { totalRecipes: recipes.length, sample: recipes.slice(0, 5) };

      const geminiAns = await callGeminiIfAvailable(q, contextData, activeRules);
      if (geminiAns) {
        const suggestions = await generateContextualSuggestions(intent, matchedProduct, q);
        return res.status(200).json({ success: true, answer: geminiAns, intent, context: contextData, suggestions });
      }

      answer = `### 📜 Recipe Master & Bill of Materials (BOM)\n\n`;
      answer += `Currently managing **${recipes.length}** active product recipes.\n\n`;
      answer += `| Product Name | Buyer | Nominal Yield | Cooked Batch Weight | Pack Size(s) |\n`;
      answer += `| :--- | :--- | :---: | :---: | :--- |\n`;

      recipes.slice(0, 8).forEach(r => {
        const packSizes = r.packSizes && r.packSizes.length ? r.packSizes.join(', ') : `${r.packSize || 0.25} kg`;
        answer += `| **${r.productName}** | ${r.buyerName} | ${r.nominalYield || 250} pouches | ${r.cookedBatchWeight || '—'} kg | ${packSizes} |\n`;
      });

      answer += `\n💡 *Inspect full ingredients, peeling loss factors, and pack sizes in **[Recipe Master](/recipe-master)**.*`;
    }

    // 8. GENERAL SYSTEM AGENT
    else {
      intent = 'GENERAL';
      const generalContext = {
        totalProducts: allProducts.length,
        learnedRulesCount: activeRules.length
      };

      const geminiAns = await callGeminiIfAvailable(q, generalContext, activeRules);
      if (geminiAns) {
        const suggestions = await generateContextualSuggestions(intent, matchedProduct, q);
        return res.status(200).json({ success: true, answer: geminiAns, intent, context: generalContext, suggestions });
      }

      answer = `### 🤖 AGPL Factory Copilot\n\n`;
      answer += `I am your self-improving factory operations assistant with live access to production databases (up to **4-decimal precision**).\n\n`;
      answer += `You can ask questions or run live calculations anytime:\n\n`;
      answer += `- 🍲 **Kitchen Issue by Yield / Batch**: *"Calculate kitchen issue for 150 kg yield of Rajma Masala"* or *"for 2.5 batches"*\n`;
      answer += `- 📦 **PO Pouch Tracker & Progressive Balance**: *"Show PO Pouch Tracker"* (tracks running balances across repeated POs + Universal & Exclusive pouch pools)\n`;
      answer += `- 🥫 **Unit Variants & Stock in Kg**: *"Show raw materials with unit variants (tins / kg)"*\n`;
      answer += `- 📋 **Check Plans**: *"What's the production plan for tomorrow?"*\n`;
      answer += `- 🌾 **Check Shortages**: *"Show low stock raw materials"*\n`;
      answer += `- 🧠 **Teach / Correct**: *"Remember that pack size for X is Y"* or *"Keep decimals to 4 digits"*\n`;
    }

    // Prepend learning acknowledgment if a rule was just recorded
    if (justLearned) {
      let detailMsg = `I have recorded your rule for \`${justLearned.topic}\`: *"${justLearned.rule}"*. I will automatically apply this rule in future answers.`;
      if (justLearned.topic === 'DECIMAL_PRECISION') {
        detailMsg = `✅ **Decimal Precision Set**: All batch numbers, weights, and calculations are now strictly capped to **${prefs.decimalPlaces} decimal places** across all tables.\n> ✅ **Pouch Summation Fix**: Total target pouches are strictly summed as numbers (e.g. 200 + 400 + 200 = 800), eliminating string concatenation.`;
      } else if (justLearned.topic === 'VARIANCE_TOLERANCE') {
        detailMsg = `✅ **Variance Tolerance Set**: Accepted kitchen cooking variance is now configured to **±${prefs.varianceThreshold}%**.`;
      }
      answer = `> 🧠 **Instruction Learned & Activated in Factory Memory**\n> ${detailMsg}\n\n` + answer;
    }

    // Generate dynamic suggestions based on this specific interaction
    const dynamicSuggestions = await generateContextualSuggestions(intent, matchedProduct, q);

    return res.status(200).json({
      success: true,
      answer,
      intent,
      suggestions: dynamicSuggestions,
      learnedRulesApplied: activeRules.length
    });
  } catch (error) {
    console.error('AI chat error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to process AI query',
      error: error.message
    });
  }
};

// Endpoint to fetch dynamic suggestions at any time
exports.getDynamicSuggestions = async (req, res) => {
  try {
    const suggestions = await generateContextualSuggestions('GENERAL', null, '');
    return res.status(200).json({ success: true, suggestions });
  } catch (error) {
    console.error('getDynamicSuggestions error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// Endpoint to submit user feedback or direct teaching instruction
exports.submitFeedback = async (req, res) => {
  try {
    const { query, answer, feedback, correction, topic } = req.body;

    const memoryDoc = await AiMemory.create({
      type: feedback === 'DOWN' ? 'CORRECTION' : 'FEEDBACK',
      topic: topic || 'USER_FEEDBACK',
      rule: correction || `User marked response as ${feedback}`,
      originalQuery: query || '',
      metadata: { feedback, originalAnswer: answer },
      active: feedback === 'DOWN' && Boolean(correction)
    });

    return res.status(200).json({
      success: true,
      message: 'Feedback and correction saved successfully',
      data: memoryDoc
    });
  } catch (error) {
    console.error('submitFeedback error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// Endpoint to get quick overview stats
exports.getQuickStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [todayBatches, lowStockRM, pendingContainers, productCount, activeLearnedRules] = await Promise.all([
      ProductionOrder.countDocuments({ productionDate: { $gte: today, $lt: tomorrow } }),
      RawMaterial.countDocuments({ $expr: { $lte: ['$currentStock', '$minSafetyStock'] } }),
      Container.countDocuments({}),
      Product.countDocuments({}),
      AiMemory.countDocuments({ active: true })
    ]);

    return res.status(200).json({
      success: true,
      stats: {
        todayBatches,
        lowStockRM,
        pendingContainers,
        productCount,
        activeLearnedRules
      }
    });
  } catch (error) {
    console.error('getQuickStats error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
