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

const stopWords = new Set([
  'raw', 'material', 'materials', 'stock', 'pouch', 'pouches', 'plan', 'plans', 'order', 'orders',
  'show', 'list', 'what', 'whats', 'how', 'much', 'many', 'status', 'created', 'produced', 'cooked',
  'made', 'today', 'tomorrow', 'yesterday', 'week', 'month', 'remaining', 'left', 'yield', 'container',
  'containers', 'manifest', 'manifests', 'recipe', 'recipes', 'bom'
]);

// Helper: fuzzy search product name in list
function findBestProductMatch(query, products) {
  const q = query.toLowerCase();
  // Direct inclusion
  let matched = products.find(p => p.name.length > 3 && q.includes(p.name.toLowerCase()));
  if (matched) return matched;

  // Key token matching without stop-words (e.g. "butter garlic", "basmati", "ancient grain")
  const tokens = q.replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(t => t.length > 2 && !stopWords.has(t));
  if (tokens.length === 0) return null;

  let bestScore = 0;
  let bestProd = null;

  for (const prod of products) {
    const pTokens = prod.name.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(t => t.length > 2);
    let score = 0;
    for (const t of tokens) {
      if (pTokens.some(pt => pt.includes(t) || t.includes(pt))) {
        score += 1;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestProd = prod;
    }
  }

  return bestScore >= 1 ? bestProd : null;
}

// Helper: parse date ranges
function parseTimeframe(text) {
  const now = new Date();
  const lower = text.toLowerCase();

  if (lower.includes('tomorrow')) {
    const start = new Date(now);
    start.setDate(start.getDate() + 1);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setHours(23, 59, 59, 999);
    return { label: 'Tomorrow', start, end, isTomorrow: true };
  }

  if (lower.includes('today')) {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    return { label: 'Today', start, end, isToday: true };
  }

  if (lower.includes('yesterday')) {
    const start = new Date(now);
    start.setDate(start.getDate() - 1);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setHours(23, 59, 59, 999);
    return { label: 'Yesterday', start, end };
  }

  if (lower.includes('last week') || lower.includes('past week') || lower.includes('last 7 days')) {
    const start = new Date(now);
    start.setDate(start.getDate() - 7);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    return { label: 'Last 7 Days', start, end };
  }

  if (lower.includes('this week')) {
    const start = new Date(now);
    const day = start.getDay() || 7;
    start.setDate(start.getDate() - day + 1);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    return { label: 'This Week', start, end };
  }

  if (lower.includes('this month')) {
    const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    return { label: 'This Month', start, end };
  }

  if (lower.includes('last month')) {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    return { label: 'Last Month', start, end };
  }

  // Default past 30 days
  const defaultStart = new Date(now);
  defaultStart.setDate(defaultStart.getDate() - 30);
  return { label: 'Recent', start: defaultStart, end: now };
}

// Number and quantity formatting engine
function formatNum(value, maxDecimals = 3) {
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

// Extract active user preferences and formatting rules from memory
function extractLearnedPreferences(activeRules = []) {
  let decimalPlaces = 3; // Default 3 decimals for batches/weights
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
        const rmShortage = Math.max(0, grossNeeded - currentStock);
        if (rmShortage > 0) hasShortage = true;

        const ingEval = {
          materialName: matName,
          grossNeeded: parseFloat(grossNeeded.toFixed(2)),
          unit: ing.unit || rmDoc?.baseUnit || 'kg',
          currentStock,
          shortage: parseFloat(rmShortage.toFixed(2)),
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
          existing.grossNeeded = parseFloat((existing.grossNeeded + ingEval.grossNeeded).toFixed(2));
          existing.shortage = parseFloat(Math.max(0, existing.grossNeeded - existing.currentStock).toFixed(2));
          if (existing.shortage > 0) existing.isSufficient = false;
        }
      }
    }

    itemsEvaluation.push({
      productName: pName,
      targetPouches: targetP,
      batches: parseFloat(batches.toFixed(2)),
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
        const rmShortage = Math.max(0, grossNeeded - currentStock);
        if (rmShortage > 0) hasShortage = true;

        const ingEval = {
          materialName: matName,
          grossNeeded: parseFloat(grossNeeded.toFixed(2)),
          unit: ing.unit || rmDoc?.baseUnit || 'kg',
          currentStock,
          shortage: parseFloat(rmShortage.toFixed(2)),
          isSufficient: rmShortage === 0,
          leadTimeDays: rmDoc?.leadTimeDays || 1,
          preferredSupplier: rmDoc?.preferredSupplier || 'Local Vendor'
        };
        ingredientsList.push(ingEval);

        if (!aggregateMaterials.has(matName)) {
          aggregateMaterials.set(matName, { ...ingEval });
        } else {
          const existing = aggregateMaterials.get(matName);
          existing.grossNeeded = parseFloat((existing.grossNeeded + ingEval.grossNeeded).toFixed(2));
          existing.shortage = parseFloat(Math.max(0, existing.grossNeeded - existing.currentStock).toFixed(2));
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
      batchesNeeded: parseFloat(batchesNeeded.toFixed(2)),
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
      suggestions.push(`How many pouches remaining for ${pName}?`);
      suggestions.push(`Show recipe BOM & pack sizes for ${pName}`);
      suggestions.push(`How much ${pName} was cooked this month?`);
    }

    // Dynamic suggestions based on specialized intents
    if (lastIntent === 'ORDER_FEASIBILITY') {
      suggestions.push(`In master buyer order - 15274 are there enough material for all of their order?`);
      suggestions.push(`Audit factory data for typos, pack sizes & variance`);
      suggestions.push(`Show low stock raw materials`);
    } else if (lastIntent === 'BUYER_ORDER_CHECK') {
      suggestions.push(`For PO-55863 are there enough pouches and raw material?`);
      suggestions.push(`Audit factory data for typos, pack sizes & variance`);
      suggestions.push(`What is the production plan for tomorrow?`);
    } else if (lastIntent === 'DATA_AUDIT') {
      suggestions.push(`For PO-55863 are there enough pouches and raw material?`);
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

    // 3. PRODUCTION CREATED / YIELD (KITCHEN & FILLING DATA)
    else if (
      qLower.includes('created') ||
      qLower.includes('produced') ||
      qLower.includes('cooked') ||
      qLower.includes('made') ||
      qLower.includes('how much') ||
      (qLower.includes('yield') && !qLower.includes('recipe'))
    ) {
      intent = 'PRODUCTION_YIELD';
      const startDate = timeframe.start;
      const endDate = timeframe.end;

      const filter = {
        createdAt: { $gte: startDate, $lte: endDate }
      };

      const docs = await Data.find(filter);

      // Aggregate yields
      let kitchenBatches = 0;
      let kitchenKg = 0;
      let filledPouches = 0;
      let wastePouches = 0;
      const productBreakdown = {};

      docs.forEach(doc => {
        const sec = doc.sectionMain;
        const dateKey = doc.createdAt ? new Date(doc.createdAt).toISOString().slice(0, 10) : 'Unknown';

        (doc.dataList || []).forEach(item => {
          const prodName = item.productName || 'Unknown';
          if (matchedProduct && !prodName.toLowerCase().includes(matchedProduct.name.toLowerCase()) && !matchedProduct.name.toLowerCase().includes(prodName.toLowerCase())) {
            return;
          }

          if (!productBreakdown[prodName]) {
            productBreakdown[prodName] = { batches: 0, kg: 0, filled: 0, waste: 0, dates: new Set() };
          }
          productBreakdown[prodName].dates.add(dateKey);

          if (sec === 'Kitchen') {
            const bQty = Number(item.batchQuantity) || 0;
            const y = Number(item.yield) || 0;
            kitchenBatches += bQty;
            kitchenKg += bQty * y;
            productBreakdown[prodName].batches += bQty;
            productBreakdown[prodName].kg += bQty * y;
          } else if (sec === 'Filling') {
            const f = Number(item.pouchQuantity) || 0;
            const w = Number(item.empty) || 0;
            filledPouches += f;
            wastePouches += w;
            productBreakdown[prodName].filled += f;
            productBreakdown[prodName].waste += w;
          }
        });
      });

      contextData = {
        timeframe: timeframe.label,
        matchedProduct: matchedProduct?.name,
        kitchenBatches,
        kitchenKg,
        filledPouches,
        wastePouches,
        productBreakdown
      };

      const geminiAns = await callGeminiIfAvailable(q, contextData, activeRules);
      if (geminiAns) {
        const suggestions = await generateContextualSuggestions(intent, matchedProduct, q);
        return res.status(200).json({ success: true, answer: geminiAns, intent, context: contextData, suggestions });
      }

      const prodKeys = Object.keys(productBreakdown);
      if (prodKeys.length > 0) {
        answer = `### 🍲 Production Output (${timeframe.label})\n\n`;
        if (matchedProduct) {
          answer += `Data for **${matchedProduct.name}** (${matchedProduct.buyer}):\n\n`;
        } else {
          answer += `Factory output across **${prodKeys.length}** product(s):\n\n`;
        }

        answer += `| Product Name | Kitchen Batches | Cooked Yield (Kg) | Pouch Filled | Waste Pouches |\n`;
        answer += `| :--- | :---: | :---: | :---: | :---: |\n`;

        prodKeys.forEach(pk => {
          const pb = productBreakdown[pk];
          answer += `| **${pk}** | ${formatNum(pb.batches, prefs.decimalPlaces)} | ${formatNum(pb.kg, prefs.decimalPlaces)} kg | **${formatPouch(pb.filled)}** | ${formatPouch(pb.waste)} |\n`;
        });

        answer += `\n**Overall Totals:**\n`;
        answer += `- 🍳 **Kitchen Batches Cooked:** ${formatNum(kitchenBatches, prefs.decimalPlaces)} batches (${formatNum(kitchenKg, prefs.decimalPlaces)} kg)\n`;
        answer += `- 📦 **Pouches Filled:** ${formatPouch(filledPouches)} pouches\n`;
        answer += `- 🗑️ **Waste / Empty Pouches:** ${formatPouch(wastePouches)} pouches\n`;
      } else {
        answer = `### 🍲 Production Output (${timeframe.label})\n\n`;
        answer += `No production or filling records found for ${matchedProduct ? `**${matchedProduct.name}**` : 'any product'} within **${timeframe.label}**.\n\n`;
        answer += `💡 *Verify shift entries in the **[Kitchen Section](/today-kitchen)** or **[Filling Section](/today-filling)** to see today's logged shifts.*`;
      }
    }

    // 4. RAW MATERIAL INVENTORY & SHORTAGE ALERTS
    else if (
      qLower.includes('raw material') ||
      qLower.includes('raw materials') ||
      qLower.includes('rm ') ||
      qLower.includes('ingredient') ||
      qLower.includes('low stock') ||
      qLower.includes('shortage') ||
      (qLower.includes('buffer') && !qLower.includes('pouch'))
    ) {
      intent = 'RAW_MATERIALS';
      const materials = await RawMaterial.find({}).sort({ currentStock: 1 });
      const lowStock = materials.filter(m => m.currentStock <= (m.minSafetyStock || 0));

      contextData = {
        totalMaterials: materials.length,
        lowStockCount: lowStock.length,
        lowStockSample: lowStock.slice(0, 10)
      };

      const geminiAns = await callGeminiIfAvailable(q, contextData, activeRules);
      if (geminiAns) {
        const suggestions = await generateContextualSuggestions(intent, matchedProduct, q);
        return res.status(200).json({ success: true, answer: geminiAns, intent, context: contextData, suggestions });
      }

      answer = `### 🌾 Raw Material Inventory & Shortage Status\n\n`;
      answer += `- **Total Raw Materials Tracked:** ${materials.length}\n`;
      answer += `- **Low Stock / Reorder Alerts:** **${lowStock.length}** item(s) below safety stock\n\n`;

      if (lowStock.length > 0) {
        answer += `#### ⚠️ Critical / Low Stock Alert List:\n\n`;
        answer += `| Material Name | Current Stock | Safety Buffer | Unit | Supplier | Avg Rate |\n`;
        answer += `| :--- | :---: | :---: | :---: | :--- | :---: |\n`;

        lowStock.slice(0, 8).forEach(m => {
          answer += `| **${m.name}** | **${m.currentStock}** | ${m.minSafetyStock || 0} | ${m.baseUnit} | ${m.preferredSupplier || '—'} | ₹${m.averagePurchaseRate || m.lastPurchaseRate || 0} |\n`;
        });
        answer += `\n💡 *Take action in **[Purchase Planner](/purchase-planner)** or **[Raw Materials Ledger](/raw-materials)**.*`;
      } else {
        answer += `✅ All raw materials are currently operating at or above safe buffer stock thresholds.\n`;
      }
    }

    // 5. POUCH STOCK & REMAINING INVENTORY
    else if (
      qLower.includes('pouch') ||
      qLower.includes('pouches') ||
      qLower.includes('remaining') ||
      qLower.includes('balance') ||
      (matchedProduct && (qLower.includes('stock') || qLower.includes('how many') || qLower.includes('left')))
    ) {
      intent = 'POUCH_STOCK';
      const currentMonth = new Date().getMonth() + 1;

      if (matchedProduct) {
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

        contextData = {
          product: matchedProduct.name,
          buyer: matchedProduct.buyer,
          currentMonth,
          prevBal,
          stockIn,
          filledMonth,
          wasteMonth,
          remainingBalance: calculatedBalance
        };

        const geminiAns = await callGeminiIfAvailable(q, contextData, activeRules);
        if (geminiAns) {
          const suggestions = await generateContextualSuggestions(intent, matchedProduct, q);
          return res.status(200).json({ success: true, answer: geminiAns, intent, context: contextData, suggestions });
        }

        answer = `### 📦 Pouch Inventory: **${matchedProduct.name}**\n\n`;
        answer += `**Buyer:** \`${matchedProduct.buyer}\` | **Current Month:** Month ${currentMonth}\n\n`;
        answer += `| Metric | Quantity (Pouches) |\n`;
        answer += `| :--- | :--- |\n`;
        answer += `| **Previous Month Balance** | ${prevBal.toLocaleString()} |\n`;
        answer += `| **Pouches (IN)** | **+${stockIn.toLocaleString()}** |\n`;
        answer += `| **Pouch Filled** | -${filledMonth.toLocaleString()} |\n`;
        answer += `| **Waste Pouches** | -${wasteMonth.toLocaleString()} |\n`;
        answer += `| 🟢 **Current Available Balance** | **${calculatedBalance.toLocaleString()} pouches** |\n\n`;
        answer += `💡 *View full shift history or add new pouches in **[Pouch Inventory Ledger](/pouch)**.*`;
      } else {
        const topProducts = allProducts.slice(0, 8);
        answer = `### 📦 Live Pouch Balances (Top SKUs - Month ${currentMonth})\n\n`;
        answer += `| Product Name | Buyer | Pouches (IN) | Current Balance |\n`;
        answer += `| :--- | :--- | :---: | :---: |\n`;

        topProducts.forEach(p => {
          const m = p.pouches[currentMonth - 1] || {};
          answer += `| **${p.name}** | ${p.buyer} | ${Number(m.stock || 0).toLocaleString()} | **${Number(m.remain || 0).toLocaleString()}** |\n`;
        });

        answer += `\n*Ask about a specific product like: "How many pouches remaining for Butter Garlic Rice?" or check **[Pouch Ledger](/pouch)**.*`;
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
      answer += `I am your self-improving factory operations assistant with live access to production databases.\n\n`;
      answer += `You can ask questions on a whim or teach me specific instructions/corrections:\n\n`;
      answer += `- 📋 Check plans: *"What's the production plan for tomorrow?"*\n`;
      answer += `- 🍲 Check outputs: *"How much Butter Garlic was created in last week?"*\n`;
      answer += `- 📦 Check balances: *"How many pouches remaining for Organic Basmati Rice?"*\n`;
      answer += `- 🌾 Check shortages: *"Show low stock raw materials"* \n`;
      answer += `- 🚢 Check shipments: *"Status of export container manifests"* \n`;
      answer += `- 🧠 Teach / Correct: *"Remember that pack size for X is Y"* or *"No, calculate yield as Z"*\n`;
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
