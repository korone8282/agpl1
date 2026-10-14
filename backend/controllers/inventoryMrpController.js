const xlsx = require('xlsx');
const mongoose = require('mongoose');
const RawMaterial = require('../models/rawMaterialModel');
const Recipe = require('../models/recipeModel');
const StockLedger = require('../models/stockLedgerModel');
const ProductionOrder = require('../models/productionOrderModel');
const PurchaseOrder = require('../models/purchaseOrderModel');
const MaterialIssue = require('../models/materialIssueModel');
const KitchenVariance = require('../models/kitchenVarianceModel');
const BuyerOrder = require('../models/buyerOrderModel');
const MaterialOrder = require('../models/materialOrderModel');
const Data = require('../models/dataModel');

// Helper to robustly parse Excel dates (serial numbers, Date objects, strings)
const parseExcelDate = (val) => {
    if (!val) return null;
    if (val instanceof Date) return val;
    if (typeof val === 'number') {
        // Excel serial date to JS Date
        const date = new Date(Math.round((val - 25569) * 86400 * 1000));
        return isNaN(date.getTime()) ? null : date;
    }
    if (typeof val === 'string') {
        // Handle common formats: YYYY-MM-DD, DD-MM-YYYY, DD/MM/YYYY
        const clean = val.trim();
        const dmyMatch = clean.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
        if (dmyMatch) {
            const date = new Date(`${dmyMatch[3]}-${dmyMatch[2]}-${dmyMatch[1]}`);
            return isNaN(date.getTime()) ? null : date;
        }
        const date = new Date(clean);
        return isNaN(date.getTime()) ? null : date;
    }
    return null;
};

// Helper to generate concise 4-5 digit random code (e.g. GRN-48291, ISS-19284)
const generate4to5DigitCode = (prefix) => {
    const num = Math.floor(10000 + Math.random() * 90000);
    return `${prefix}-${num}`;
};

// Helper to escape regex special characters
const escapeRegex = (str) => String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Helper to normalize units to standard values
const normalizeUnit = (unit) => {
    if (!unit) return 'kg';
    const u = String(unit).trim().toLowerCase();
    if (['kg', 'kgs', 'kilogram', 'kilograms'].includes(u)) return 'kg';
    if (['g', 'gm', 'gms', 'gram', 'grams'].includes(u)) return 'g';
    if (['l', 'ltr', 'ltrs', 'litre', 'liter', 'litres', 'liters'].includes(u)) return 'L';
    if (['ml', 'mls', 'millilitre', 'milliliter'].includes(u)) return 'ml';
    if (['pcs', 'pc', 'piece', 'pieces', 'nos', 'no', 'number', 'numbers'].includes(u)) return 'pcs';
    if (['tin', 'tins'].includes(u)) return 'tin';
    if (['can', 'cans'].includes(u)) return 'can';
    if (['box', 'boxes', 'bx'].includes(u)) return 'box';
    if (['packet', 'packets', 'pkt', 'pkts', 'pouch', 'pouches'].includes(u)) return 'packet';
    if (['bottle', 'bottles', 'btl'].includes(u)) return 'bottle';
    if (['jar', 'jars'].includes(u)) return 'jar';
    if (['bag', 'bags', 'sack', 'sacks'].includes(u)) return 'bag';
    if (['carton', 'cartons', 'ctn'].includes(u)) return 'carton';
    if (['roll', 'rolls'].includes(u)) return 'roll';
    if (['bundle', 'bundles'].includes(u)) return 'bundle';
    return String(unit).trim();
};

// ==========================================
// 1. RAW MATERIAL CONTROLLER
// ==========================================

exports.getRawMaterials = async (req, res) => {
    try {
        const { storageType, search, lowStock, expiringSoon } = req.query;
        let query = { isActive: true };

        if (storageType && ['Cold', 'Ambient'].includes(storageType)) {
            query.storageType = storageType;
        }

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { code: { $regex: search, $options: 'i' } },
                { preferredSupplier: { $regex: search, $options: 'i' } }
            ];
        }

        let materials = await RawMaterial.find(query).sort({ name: 1 });

        const now = new Date();
        const enriched = materials.map(m => {
            const doc = m.toObject();
            if (doc.earliestExpiryDate) {
                const exp = new Date(doc.earliestExpiryDate);
                const diffTime = exp.getTime() - now.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                doc.daysUntilExpiry = diffDays;
                if (diffDays < 0) {
                    doc.fefoStatus = 'EXPIRED';
                } else if (diffDays <= 7) {
                    doc.fefoStatus = 'CRITICAL';
                } else if (diffDays <= 30) {
                    doc.fefoStatus = 'EXPIRING_SOON';
                } else {
                    doc.fefoStatus = 'SAFE';
                }
            } else {
                doc.daysUntilExpiry = null;
                doc.fefoStatus = 'NO_EXPIRY';
            }
            return doc;
        });

        let result = enriched;
        if (lowStock === 'true') {
            result = result.filter(m => m.currentStock <= 0);
        }
        if (expiringSoon === 'true') {
            result = result.filter(m => m.fefoStatus === 'CRITICAL' || m.fefoStatus === 'EXPIRING_SOON' || m.fefoStatus === 'EXPIRED');
        }

        res.status(200).json({
            success: true,
            count: result.length,
            data: result
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getRawMaterialById = async (req, res) => {
    try {
        const material = await RawMaterial.findById(req.params.id);
        if (!material) {
            return res.status(404).json({ success: false, message: 'Raw material not found' });
        }

        const recentTransactions = await StockLedger.find({ rawMaterial: material._id })
            .sort({ createdAt: -1 })
            .limit(30);

        // 1. FEFO active batch lots (sorted by expiryDate ascending)
        const activeLots = await StockLedger.find({
            rawMaterial: material._id,
            transactionType: { $in: ['OPENING', 'GRN'] }
        })
            .sort({ expiryDate: 1, createdAt: 1 })
            .limit(30);

        // 2. Purchase History Log -> date, quantity, rate, cost, vendor
        const purchaseLedgers = await StockLedger.find({
            rawMaterial: material._id,
            transactionType: { $in: ['GRN', 'OPENING'] }
        }).sort({ createdAt: -1 }).limit(100);

        const purchaseHistory = purchaseLedgers.map(p => {
            let vendor = p.vendor || '';
            if (!vendor && p.reason) {
                const match = p.reason.match(/from\s+(.+)$/i);
                if (match) vendor = match[1].trim();
            }
            if (!vendor && p.transactionType === 'OPENING') vendor = 'Opening Stock';
            if (!vendor) vendor = material.preferredSupplier || '—';

            return {
                _id: p._id,
                date: p.createdAt,
                quantity: p.quantity,
                rate: p.rate,
                cost: p.totalAmount > 0 ? p.totalAmount : parseFloat((p.quantity * p.rate).toFixed(3)),
                vendor,
                grnNumber: p.grnNumber || '—',
                lotNumber: p.lotNumber || '—',
                unit: p.unit || material.baseUnit
            };
        });

        // Also blend any historic price entries from material.priceHistory not covered
        if (material.priceHistory && material.priceHistory.length > 0) {
            material.priceHistory.forEach(ph => {
                const exists = purchaseHistory.some(p => p.grnNumber && ph.grnNumber && p.grnNumber === ph.grnNumber);
                if (!exists && ph.rate) {
                    purchaseHistory.push({
                        _id: ph._id || Math.random().toString(),
                        date: ph.date || new Date(),
                        quantity: 0,
                        rate: ph.rate,
                        cost: 0,
                        vendor: ph.vendor || material.preferredSupplier || '—',
                        grnNumber: ph.grnNumber || '—',
                        lotNumber: '—',
                        unit: material.baseUnit
                    });
                }
            });
            purchaseHistory.sort((a, b) => new Date(b.date) - new Date(a.date));
        }

        // 3. Usage Records -> date, recipe name, opening balance - used qty, closing balance
        const issues = await MaterialIssue.find({
            $or: [
                { 'items.rawMaterial': material._id },
                { 'items.materialName': { $regex: `^${escapeRegex(material.name.trim())}$`, $options: 'i' } }
            ]
        }).sort({ createdAt: -1 }).limit(100);

        const usageMap = new Map();
        issues.forEach(iss => {
            const it = (iss.items || []).find(item =>
                (item.rawMaterial && String(item.rawMaterial) === String(material._id)) ||
                (item.materialName && item.materialName.toLowerCase() === material.name.toLowerCase())
            );
            if (it) {
                const usedQty = Number(it.actualIssuedQty) || 0;
                let openBal = it.openingStock;
                let closeBal = it.closingStock;
                if ((openBal === undefined || openBal === null) && closeBal !== undefined && closeBal !== null) {
                    openBal = closeBal + usedQty;
                }
                if ((closeBal === undefined || closeBal === null) && openBal !== undefined && openBal !== null) {
                    closeBal = Math.max(0, openBal - usedQty);
                }

                const record = {
                    _id: iss._id,
                    issueNumber: iss.issueNumber,
                    date: iss.issueDate || iss.createdAt,
                    recipeName: iss.productName || 'Recipe Issue',
                    batches: iss.batches || 1,
                    openingBalance: openBal,
                    usedQty: usedQty,
                    closingBalance: closeBal,
                    unit: it.unit || material.baseUnit
                };
                usageMap.set(String(iss._id), record);
            }
        });

        // Supplement from StockLedger for any KITCHEN_ISSUE or adjustments
        const ledgerUsages = await StockLedger.find({
            rawMaterial: material._id,
            transactionType: { $in: ['KITCHEN_ISSUE', 'WRITE_OFF', 'ADJUSTMENT'] }
        }).sort({ createdAt: -1 }).limit(100);

        ledgerUsages.forEach(lu => {
            const matchingIssue = Array.from(usageMap.values()).find(u => u.issueNumber === lu.referenceId);
            if (!matchingIssue) {
                const usedQty = Math.abs(Number(lu.quantity) || 0);
                const closeBal = Number(lu.balanceAfter) || 0;
                const openBal = closeBal + usedQty;

                let recipeName = 'Kitchen Issue';
                if (lu.reason) {
                    const mMatch = lu.reason.match(/of\s+([^(]+)/i);
                    if (mMatch) {
                        recipeName = mMatch[1].trim();
                    } else {
                        recipeName = lu.reason;
                    }
                }

                usageMap.set(String(lu._id), {
                    _id: lu._id,
                    issueNumber: lu.referenceId || 'ISS-MANUAL',
                    date: lu.createdAt,
                    recipeName,
                    batches: 1,
                    openingBalance: openBal,
                    usedQty,
                    closingBalance: closeBal,
                    unit: lu.unit || material.baseUnit
                });
            }
        });

        const usageRecords = Array.from(usageMap.values()).sort((a, b) => new Date(b.date) - new Date(a.date));

        res.status(200).json({
            success: true,
            data: {
                ...material.toObject(),
                recentTransactions,
                activeLots,
                purchaseHistory,
                usageRecords
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.createRawMaterial = async (req, res) => {
    try {
        const {
            name,
            code,
            storageType,
            baseUnit,
            currentStock,
            minSafetyStock,
            leadTimeDays,
            packSize,
            preferredSupplier,
            lastPurchaseRate
        } = req.body;

        const existing = await RawMaterial.findOne({ name: name.trim() });
        if (existing) {
            return res.status(400).json({ success: false, message: `Raw material "${name}" already exists` });
        }

        const normalizedBaseUnit = normalizeUnit(baseUnit);

        const material = await RawMaterial.create({
            name: name.trim(),
            code: code ? code.trim().toUpperCase() : undefined,
            storageType: storageType || 'Ambient',
            baseUnit: normalizedBaseUnit,
            currentStock: Number(currentStock) || 0,
            minSafetyStock: Number(minSafetyStock) || 0,
            leadTimeDays: Number(leadTimeDays) || 1,
            packSize: Number(packSize) || 1,
            preferredSupplier: preferredSupplier || '',
            lastPurchaseRate: Number(lastPurchaseRate) || 0,
            earliestExpiryDate: req.body.earliestExpiryDate ? new Date(req.body.earliestExpiryDate) : undefined
        });

        // If initial opening stock was provided during creation, record ledger entry
        if (Number(currentStock) > 0) {
            await StockLedger.create({
                rawMaterial: material._id,
                materialName: material.name,
                transactionType: 'OPENING',
                quantity: Number(currentStock),
                balanceAfter: Number(currentStock),
                unit: material.baseUnit,
                rate: Number(lastPurchaseRate) || 0,
                totalAmount: (Number(currentStock) * (Number(lastPurchaseRate) || 0)),
                storageType: material.storageType,
                reason: 'Initial master creation'
            });
        }

        res.status(201).json({ success: true, data: material });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.updateRawMaterial = async (req, res) => {
    try {
        if (req.body.baseUnit) {
            req.body.baseUnit = normalizeUnit(req.body.baseUnit);
        }
        const material = await RawMaterial.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });
        if (!material) {
            return res.status(404).json({ success: false, message: 'Raw material not found' });
        }
        res.status(200).json({ success: true, data: material });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ==========================================
// 2. RECIPE CONTROLLER
// ==========================================

exports.getRecipes = async (req, res) => {
    try {
        const { buyerName, search } = req.query;
        let query = { isActive: true };
        if (buyerName && buyerName !== 'ALL') {
            query.buyerName = buyerName;
        }
        if (search) {
            query.$or = [
                { productName: { $regex: search, $options: 'i' } },
                { buyerName: { $regex: search, $options: 'i' } }
            ];
        }
        const recipes = await Recipe.find(query).sort({ buyerName: 1, productName: 1 });
        const allBuyers = await Recipe.distinct('buyerName', { isActive: true });
        res.status(200).json({ success: true, count: recipes.length, buyers: allBuyers, data: recipes });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getRecipeById = async (req, res) => {
    try {
        const recipe = await Recipe.findById(req.params.id);
        if (!recipe) {
            return res.status(404).json({ success: false, message: 'Recipe not found' });
        }
        res.status(200).json({ success: true, data: recipe });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.createRecipe = async (req, res) => {
    try {
        const { buyerName, productName, nominalBatchYieldPouches, batchCookedWeightKg, packSizes, ingredients } = req.body;
        const bName = (buyerName || 'General').trim();
        const pName = (productName || '').trim();

        if (!pName) {
            return res.status(400).json({ success: false, message: 'Product name is required' });
        }

        const existing = await Recipe.findOne({ buyerName: bName, productName: pName });
        if (existing) {
            return res.status(400).json({ success: false, message: `Recipe for "${pName}" under buyer "${bName}" already exists` });
        }

        const cookedWeight = parseFloat(Number(batchCookedWeightKg || 0).toFixed(4));
        let normalizedPackSizes = [];
        if (Array.isArray(packSizes)) {
            normalizedPackSizes = packSizes.map(p => {
                const n = parseFloat(p) || 0;
                return n > 5 ? parseFloat((n / 1000).toFixed(4)) : parseFloat(n.toFixed(4));
            }).filter(p => p > 0);
        }
        let pouchesPerBatch = Number(nominalBatchYieldPouches) || 250;
        if (cookedWeight > 0 && normalizedPackSizes.length > 0) {
            pouchesPerBatch = parseFloat((cookedWeight / normalizedPackSizes[0]).toFixed(3));
        }

        // Link rawMaterial IDs where available
        const enrichedIngredients = await Promise.all(
            (ingredients || []).map(async (ing) => {
                const escapedName = escapeRegex((ing.materialName || '').trim());
                let rm = await RawMaterial.findOne({
                    name: { $regex: `^${escapedName}$`, $options: 'i' }
                });
                return {
                    ...ing,
                    rawMaterial: rm ? rm._id : undefined,
                    lossFactor: Number(ing.lossFactor) || 1.0,
                    edibleQuantity: Number(ing.edibleQuantity) || 0,
                    unit: normalizeUnit(ing.unit)
                };
            })
        );

        const recipe = await Recipe.create({
            buyerName: bName,
            productName: pName,
            nominalBatchYieldPouches: pouchesPerBatch,
            batchCookedWeightKg: cookedWeight,
            packSizes: normalizedPackSizes,
            ingredients: enrichedIngredients
        });

        res.status(201).json({ success: true, data: recipe });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.updateRecipe = async (req, res) => {
    try {
        const { buyerName, productName, nominalBatchYieldPouches, batchCookedWeightKg, packSizes, ingredients } = req.body;
        const recipe = await Recipe.findById(req.params.id);
        if (!recipe) {
            return res.status(404).json({ success: false, message: 'Recipe not found' });
        }

        if (buyerName) recipe.buyerName = buyerName.trim();
        if (productName) recipe.productName = productName.trim();
        if (batchCookedWeightKg !== undefined) {
            recipe.batchCookedWeightKg = parseFloat(Number(batchCookedWeightKg || 0).toFixed(4));
        }
        if (packSizes !== undefined && Array.isArray(packSizes)) {
            recipe.packSizes = packSizes.map(p => {
                const n = parseFloat(p) || 0;
                return n > 5 ? parseFloat((n / 1000).toFixed(4)) : parseFloat(n.toFixed(4));
            }).filter(p => p > 0);
        }
        if (recipe.batchCookedWeightKg > 0 && recipe.packSizes && recipe.packSizes.length > 0) {
            recipe.nominalBatchYieldPouches = parseFloat((recipe.batchCookedWeightKg / recipe.packSizes[0]).toFixed(3));
        } else if (nominalBatchYieldPouches) {
            recipe.nominalBatchYieldPouches = Number(nominalBatchYieldPouches);
        }

        if (ingredients && Array.isArray(ingredients)) {
            const enrichedIngredients = await Promise.all(
                ingredients.map(async (ing) => {
                    const escapedName = escapeRegex((ing.materialName || '').trim());
                    let rm = await RawMaterial.findOne({
                        name: { $regex: `^${escapedName}$`, $options: 'i' }
                    });
                    return {
                        ...ing,
                        rawMaterial: rm ? rm._id : ing.rawMaterial,
                        lossFactor: Number(ing.lossFactor) || 1.0,
                        edibleQuantity: Number(ing.edibleQuantity) || 0,
                        unit: normalizeUnit(ing.unit)
                    };
                })
            );
            recipe.ingredients = enrichedIngredients;
        }

        await recipe.save();
        res.status(200).json({ success: true, data: recipe });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ==========================================
// 3. EXCEL IMPORTERS (RECIPES & OPENING STOCK)
// ==========================================

exports.importRecipesExcel = async (req, res) => {
    try {
        if (!req.file || !req.file.buffer) {
            return res.status(400).json({ success: false, message: 'Please upload an Excel file (.xlsx or .xls)' });
        }

        const isPreview = req.body.preview === 'true';
        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
        const parsedRecipes = [];
        const errors = [];

        for (const sheetName of workbook.SheetNames) {
            const worksheet = workbook.Sheets[sheetName];
            const rawRows = xlsx.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

            if (!rawRows || rawRows.length < 2) continue;

            let nominalBatchYieldPouches = 250;
            let batchCookedWeightKg = 0;
            let packSizes = [];
            let explicitProductName = '';
            let headerRowIndex = -1;

            // Find nominal batch yield, cooked weight, explicit product name, pack sizes, and table headers
            for (let i = 0; i < Math.min(rawRows.length, 10); i++) {
                const row = rawRows[i];
                for (let j = 0; j < row.length; j++) {
                    const cellVal = String(row[j]).toLowerCase();
                    if ((cellVal.includes('product') || cellVal.includes('recipe name')) && !cellVal.includes('pouch') && !cellVal.includes('yield')) {
                        if (row[j + 1] && String(row[j + 1]).trim()) {
                            explicitProductName = String(row[j + 1]).trim();
                        }
                    }
                    if (cellVal.includes('nominal') || cellVal.includes('yield (pouch') || cellVal.includes('pouches per batch') || cellVal.includes('pouches/batch')) {
                        const val = parseFloat(row[j + 1]);
                        if (!isNaN(val) && val > 0) nominalBatchYieldPouches = val;
                    }
                    if (cellVal.includes('cooked weight') || cellVal.includes('batch weight') || cellVal.includes('total yield') || cellVal.includes('cooked yield') || cellVal.includes('batch yield (kg)')) {
                        const rawVal = row[j + 1] !== '' ? row[j + 1] : row[j];
                        const match = String(rawVal).match(/[\d.]+/);
                        if (match) {
                            const val = parseFloat(match[0]);
                            if (!isNaN(val) && val > 0) batchCookedWeightKg = val;
                        }
                    }
                    if (cellVal.includes('pack size') || cellVal.includes('pouch size') || cellVal.includes('package size')) {
                        const rawVal = String(row[j + 1] || '');
                        const sizes = rawVal.split(/[,/|]/).map(s => {
                            const m = s.match(/[\d.]+/);
                            if (!m) return null;
                            const n = parseFloat(m[0]);
                            return n > 5 ? parseFloat((n / 1000).toFixed(4)) : parseFloat(n.toFixed(4));
                        }).filter(Boolean);
                        if (sizes.length > 0) {
                            packSizes = sizes;
                        }
                    }
                    if (cellVal.includes('ingredient') || cellVal.includes('material') || cellVal.includes('s. no.') || cellVal.includes('s.no')) {
                        headerRowIndex = i;
                    }
                }
                if (headerRowIndex !== -1) break;
            }

            if (headerRowIndex === -1) {
                // If not found in first 10, search all
                for (let i = 0; i < rawRows.length; i++) {
                    const row = rawRows[i];
                    if (row.some(c => {
                        const str = String(c).toLowerCase();
                        return str.includes('ingredient') || str.includes('material') || str.includes('description');
                    })) {
                        headerRowIndex = i;
                        break;
                    }
                }
            }

            if (headerRowIndex === -1) {
                errors.push(`Sheet "${sheetName}": Could not find ingredient table header`);
                continue;
            }

            const headerRow = rawRows[headerRowIndex].map(h => String(h).trim().toLowerCase());
            const nameIdx = headerRow.findIndex(h =>
                h.includes('ingredient') ||
                h.includes('material') ||
                h.includes('item') ||
                h.includes('description')
            );
            const codeIdx = headerRow.findIndex(h => h.includes('code'));
            const qtyIdx = headerRow.findIndex(h =>
                h.includes('base quantity') ||
                h.includes('edible') ||
                h.includes('qty') ||
                h.includes('quantity')
            );
            const unitIdx = headerRow.findIndex(h => h.includes('unit') || h.includes('uom'));
            const factorIdx = headerRow.findIndex(h =>
                h.includes('loss factor') ||
                h.includes('factor') ||
                h.includes('loss') ||
                h.includes('peeling')
            );
            const formulaIdx = headerRow.findIndex(h =>
                h.includes('quantity ×') ||
                h.includes('quantity *') ||
                h.includes('formula') ||
                h.includes('gross')
            );
            const storageIdx = headerRow.findIndex(h => h.includes('storage') || h.includes('type') || h.includes('temp'));
            const notesIdx = headerRow.findIndex(h => h.includes('note') || h.includes('stage') || h.includes('process'));

            const ingredients = [];

            for (let i = headerRowIndex + 1; i < rawRows.length; i++) {
                const row = rawRows[i];
                if (!row || row.length === 0) continue;

                const materialName = nameIdx !== -1 && row[nameIdx] ? String(row[nameIdx]).trim() : '';
                if (!materialName) continue; // skip blank rows

                // Skip footnote / rule / summary rows
                if (
                    /^(rule|note|total|remark|summary)/i.test(materialName) ||
                    /^(rule|note)/i.test(String(row[0]).trim())
                ) {
                    continue;
                }

                const materialCode = codeIdx !== -1 && row[codeIdx] ? String(row[codeIdx]).trim() : '';
                let edibleQty = qtyIdx !== -1 ? parseFloat(row[qtyIdx]) : 0;
                if (isNaN(edibleQty)) edibleQty = 0;

                const unit = unitIdx !== -1 && row[unitIdx] ? normalizeUnit(row[unitIdx]) : 'kg';
                let lossFactor = factorIdx !== -1 ? parseFloat(row[factorIdx]) : 1.0;
                if (isNaN(lossFactor) || lossFactor <= 0) lossFactor = 1.0;

                // If loss factor is default (1.0) and there's a formula column like "0.442*1.01", extract multiplier
                if (lossFactor === 1.0 && formulaIdx !== -1 && row[formulaIdx]) {
                    const match = String(row[formulaIdx]).match(/[*xX]\s*([\d.]+)/);
                    if (match && parseFloat(match[1]) > 0) {
                        lossFactor = parseFloat(match[1]);
                    }
                }

                let storageType = storageIdx !== -1 && row[storageIdx] ? String(row[storageIdx]).trim() : 'Ambient';
                if (!['Cold', 'Ambient'].includes(storageType)) {
                    storageType = /cold|chill|dairy|veg/i.test(storageType) ? 'Cold' : 'Ambient';
                }
                const notes = notesIdx !== -1 && row[notesIdx] ? String(row[notesIdx]).trim() : '';

                ingredients.push({
                    materialName,
                    materialCode,
                    edibleQuantity: edibleQty,
                    unit,
                    lossFactor: lossFactor > 0 ? lossFactor : 1.0,
                    storageType,
                    notes
                });
            }

            let recipeProductName = explicitProductName;
            if (!recipeProductName) {
                const isGenericSheet = /^(ingredients|sheet\s*\d+|recipe\s*\d*)$/i.test(sheetName.trim());
                if (!isGenericSheet) {
                    recipeProductName = sheetName.trim();
                } else {
                    const originalName = req.file.originalname ? req.file.originalname.replace(/\.[^/.]+$/, '').trim() : '';
                    recipeProductName = originalName || sheetName.trim();
                }
            }

            if (ingredients.length > 0) {
                if (batchCookedWeightKg > 0 && packSizes.length > 0) {
                    nominalBatchYieldPouches = parseFloat((batchCookedWeightKg / packSizes[0]).toFixed(3));
                }
                parsedRecipes.push({
                    productName: recipeProductName,
                    nominalBatchYieldPouches,
                    batchCookedWeightKg,
                    packSizes,
                    ingredientCount: ingredients.length,
                    ingredients
                });
            }
        }

        if (isPreview) {
            return res.status(200).json({
                success: true,
                mode: 'preview',
                totalSheets: workbook.SheetNames.length,
                parsedCount: parsedRecipes.length,
                recipes: parsedRecipes,
                errors
            });
        }

        // Commit to database
        let recipesToSave = parsedRecipes;
        if (req.body.recipes) {
            try {
                const customList = typeof req.body.recipes === 'string' ? JSON.parse(req.body.recipes) : req.body.recipes;
                if (Array.isArray(customList) && customList.length > 0) {
                    recipesToSave = customList;
                }
            } catch (e) {}
        }

        const savedRecipes = [];
        for (const rec of recipesToSave) {
            const enrichedIngredients = [];

            for (const ing of rec.ingredients) {
                // Find or create RawMaterial record
                const escapedName = escapeRegex(ing.materialName.trim());
                let rawMat = await RawMaterial.findOne({
                    name: { $regex: `^${escapedName}$`, $options: 'i' }
                });

                if (!rawMat) {
                    rawMat = await RawMaterial.create({
                        name: ing.materialName,
                        code: ing.materialCode ? ing.materialCode.toUpperCase() : undefined,
                        storageType: ing.storageType,
                        baseUnit: ing.unit === 'g' || ing.unit === 'kg' ? 'kg' : (ing.unit === 'ml' || ing.unit === 'L' ? 'L' : ing.unit)
                    });
                }

                enrichedIngredients.push({
                    rawMaterial: rawMat._id,
                    materialName: ing.materialName,
                    materialCode: ing.materialCode || rawMat.code || '',
                    edibleQuantity: ing.edibleQuantity,
                    unit: ing.unit,
                    lossFactor: ing.lossFactor,
                    storageType: ing.storageType,
                    notes: ing.notes
                });
            }

            const recipe = await Recipe.findOneAndUpdate(
                { productName: rec.productName },
                {
                    productName: rec.productName,
                    nominalBatchYieldPouches: rec.nominalBatchYieldPouches,
                    batchCookedWeightKg: rec.batchCookedWeightKg,
                    ...(rec.packSizes && rec.packSizes.length > 0 ? { packSizes: rec.packSizes } : {}),
                    ingredients: enrichedIngredients,
                    isActive: true
                },
                { upsert: true, new: true }
            );

            savedRecipes.push(recipe);
        }

        res.status(200).json({
            success: true,
            mode: 'committed',
            message: `Successfully imported ${savedRecipes.length} recipes`,
            count: savedRecipes.length,
            data: savedRecipes,
            errors
        });
    } catch (err) {
        console.error('Recipe Excel Import Error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.importOpeningStockExcel = async (req, res) => {
    try {
        if (!req.file || !req.file.buffer) {
            return res.status(400).json({ success: false, message: 'Please upload an Excel file (.xlsx or .xls)' });
        }

        const isPreview = req.body.preview === 'true';
        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rawRows = xlsx.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

        if (!rawRows || rawRows.length < 2) {
            return res.status(400).json({ success: false, message: 'The uploaded file appears to be empty' });
        }

        let headerRowIndex = -1;
        for (let i = 0; i < Math.min(rawRows.length, 10); i++) {
            const row = rawRows[i];
            if (row.some(c => String(c).toLowerCase().includes('material') || String(c).toLowerCase().includes('item') || String(c).toLowerCase().includes('ingredient'))) {
                headerRowIndex = i;
                break;
            }
        }

        if (headerRowIndex === -1) {
            return res.status(400).json({ success: false, message: 'Could not find header row containing Material/Item Name' });
        }

        const headers = rawRows[headerRowIndex].map(h => String(h).trim().toLowerCase());
        const nameIdx = headers.findIndex(h => h.includes('material') || h.includes('item') || h.includes('name'));
        const codeIdx = headers.findIndex(h => h.includes('code'));
        const storageIdx = headers.findIndex(h => h.includes('storage') || h.includes('type'));
        const stockIdx = headers.findIndex(h => h.includes('opening') || h.includes('balance') || h.includes('stock') || h.includes('qty'));
        const unitIdx = headers.findIndex(h => h.includes('unit') || h.includes('uom'));
        const rateIdx = headers.findIndex(h => h.includes('rate') || h.includes('price') || h.includes('cost'));
        const expiryIdx = headers.findIndex(h => h.includes('expiry') || h.includes('exp'));
        const leadIdx = headers.findIndex(h => h.includes('lead') || h.includes('time'));
        const safetyIdx = headers.findIndex(h => h.includes('safety') || h.includes('min'));
        const bagIdx = headers.findIndex(h => h.includes('bag') || h.includes('pack') || h.includes('commercial'));
        const supplierIdx = headers.findIndex(h => h.includes('supplier') || h.includes('vendor'));

        const parsedItems = [];
        for (let i = headerRowIndex + 1; i < rawRows.length; i++) {
            const row = rawRows[i];
            if (!row || row.length === 0) continue;

            const name = nameIdx !== -1 && row[nameIdx] ? String(row[nameIdx]).trim() : '';
            if (!name) continue;

            const code = codeIdx !== -1 && row[codeIdx] ? String(row[codeIdx]).trim() : '';
            let storageType = storageIdx !== -1 && row[storageIdx] ? String(row[storageIdx]).trim() : 'Ambient';
            if (!['Cold', 'Ambient'].includes(storageType)) {
                storageType = /cold|chill|dairy|veg/i.test(storageType) ? 'Cold' : 'Ambient';
            }

            const openingStock = stockIdx !== -1 ? parseFloat(row[stockIdx]) || 0 : 0;
            const unit = unitIdx !== -1 && row[unitIdx] ? normalizeUnit(row[unitIdx]) : 'kg';
            const rate = rateIdx !== -1 ? parseFloat(row[rateIdx]) || 0 : 0;
            const expiryDate = expiryIdx !== -1 ? parseExcelDate(row[expiryIdx]) : null;
            const leadTimeDays = leadIdx !== -1 ? parseFloat(row[leadIdx]) || 1 : 1;
            const minSafetyStock = safetyIdx !== -1 ? parseFloat(row[safetyIdx]) || 0 : 0;
            const packSize = bagIdx !== -1 ? parseFloat(row[bagIdx]) || 1 : 1;
            const preferredSupplier = supplierIdx !== -1 && row[supplierIdx] ? String(row[supplierIdx]).trim() : '';

            parsedItems.push({
                name,
                code,
                storageType,
                openingStock,
                unit,
                rate,
                expiryDate,
                leadTimeDays,
                minSafetyStock,
                packSize,
                preferredSupplier
            });
        }

        if (isPreview) {
            return res.status(200).json({
                success: true,
                mode: 'preview',
                count: parsedItems.length,
                data: parsedItems
            });
        }

        // Commit to database: Update RawMaterial and create StockLedger entries
        const committed = [];
        for (const item of parsedItems) {
            const escapedName = escapeRegex(item.name.trim());
            let rawMat = await RawMaterial.findOne({
                name: { $regex: `^${escapedName}$`, $options: 'i' }
            });

            if (!rawMat) {
                rawMat = await RawMaterial.create({
                    name: item.name.trim(),
                    code: item.code ? item.code.toUpperCase() : undefined,
                    storageType: item.storageType,
                    baseUnit: item.unit,
                    currentStock: item.openingStock,
                    minSafetyStock: item.minSafetyStock,
                    leadTimeDays: item.leadTimeDays,
                    packSize: item.packSize,
                    preferredSupplier: item.preferredSupplier,
                    lastPurchaseRate: item.rate,
                    averagePurchaseRate: item.rate,
                    earliestExpiryDate: item.expiryDate || undefined,
                    priceHistory: item.rate > 0 ? [{ rate: item.rate, date: new Date(), vendor: item.preferredSupplier }] : []
                });
            } else {
                rawMat.currentStock = item.openingStock;
                rawMat.storageType = item.storageType;
                rawMat.baseUnit = item.unit;
                if (item.expiryDate) {
                    if (!rawMat.earliestExpiryDate || new Date(item.expiryDate) < new Date(rawMat.earliestExpiryDate)) {
                        rawMat.earliestExpiryDate = item.expiryDate;
                    }
                }
                if (item.code) rawMat.code = item.code.toUpperCase();
                if (item.minSafetyStock > 0) rawMat.minSafetyStock = item.minSafetyStock;
                if (item.leadTimeDays > 0) rawMat.leadTimeDays = item.leadTimeDays;
                if (item.packSize > 0) rawMat.packSize = item.packSize;
                if (item.preferredSupplier) rawMat.preferredSupplier = item.preferredSupplier;
                if (item.rate > 0) {
                    rawMat.lastPurchaseRate = item.rate;
                    rawMat.averagePurchaseRate = item.rate;
                    rawMat.priceHistory.push({ rate: item.rate, date: new Date(), vendor: item.preferredSupplier });
                }
                await rawMat.save();
            }

            // Create ledger entry
            const ledgerEntry = await StockLedger.create({
                rawMaterial: rawMat._id,
                materialName: rawMat.name,
                transactionType: 'OPENING',
                quantity: item.openingStock,
                balanceAfter: item.openingStock,
                unit: item.unit,
                rate: item.rate,
                totalAmount: item.openingStock * item.rate,
                storageType: item.storageType,
                vendor: item.preferredSupplier || 'Opening Stock',
                expiryDate: item.expiryDate || undefined,
                reason: 'Day-1 Opening Stock Import'
            });

            committed.push({ rawMat, ledgerEntry });
        }

        res.status(200).json({
            success: true,
            mode: 'committed',
            message: `Successfully onboarded opening stock for ${committed.length} materials`,
            count: committed.length,
            data: committed
        });
    } catch (err) {
        console.error('Opening Stock Excel Import Error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// ==========================================
// 4. STOCK LEDGER & ADJUSTMENTS
// ==========================================

exports.getStockLedger = async (req, res) => {
    try {
        const { rawMaterialId, transactionType, storageType, limit = 50, page = 1 } = req.query;
        let query = {};

        if (rawMaterialId) query.rawMaterial = rawMaterialId;
        if (transactionType) query.transactionType = transactionType;
        if (storageType) query.storageType = storageType;

        const skip = (Number(page) - 1) * Number(limit);
        const entries = await StockLedger.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit))
            .populate('rawMaterial', 'name code baseUnit storageType');

        const total = await StockLedger.countDocuments(query);

        res.status(200).json({
            success: true,
            count: entries.length,
            total,
            page: Number(page),
            pages: Math.ceil(total / Number(limit)),
            data: entries
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.recordAdjustment = async (req, res) => {
    try {
        const { rawMaterialId, adjustmentType, quantity, reason, createdBy } = req.body;

        const rawMat = await RawMaterial.findById(rawMaterialId);
        if (!rawMat) {
            return res.status(404).json({ success: false, message: 'Raw material not found' });
        }

        const qtyNum = Number(quantity);
        if (isNaN(qtyNum) || qtyNum === 0) {
            return res.status(400).json({ success: false, message: 'Valid quantity is required' });
        }

        // adjustmentType: 'WRITE_OFF' (deduction) or 'AUDIT_CORRECTION' (can be + or -)
        const delta = adjustmentType === 'WRITE_OFF' ? -Math.abs(qtyNum) : qtyNum;
        const newBalance = Math.max(0, rawMat.currentStock + delta);

        rawMat.currentStock = newBalance;
        await rawMat.save();

        const ledgerEntry = await StockLedger.create({
            rawMaterial: rawMat._id,
            materialName: rawMat.name,
            transactionType: adjustmentType === 'WRITE_OFF' ? 'WRITE_OFF' : 'ADJUSTMENT',
            quantity: delta,
            balanceAfter: newBalance,
            unit: rawMat.baseUnit,
            rate: rawMat.lastPurchaseRate,
            totalAmount: Math.abs(delta) * rawMat.lastPurchaseRate,
            storageType: rawMat.storageType,
            reason: reason || 'Manual stock adjustment',
            createdBy: createdBy || 'Admin'
        });

        res.status(200).json({
            success: true,
            message: 'Stock adjustment recorded successfully',
            data: { material: rawMat, ledger: ledgerEntry }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ==========================================
// 5. GOODS RECEIPT NOTE (GRN) & PRICE TRENDS
// ==========================================

exports.recordGRN = async (req, res) => {
    try {
        const { grnNumber, vendorInvoiceNumber, vendorName, receivedDate, items } = req.body;

        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ success: false, message: 'GRN must contain at least one item' });
        }

        const date = receivedDate ? new Date(receivedDate) : new Date();
        const autoGrn = grnNumber || generate4to5DigitCode('GRN');
        const processedItems = [];

        for (const item of items) {
            const rawMat = await RawMaterial.findById(item.rawMaterialId);
            if (!rawMat) continue;

            const qty = Number(item.quantityReceived) || 0;
            const rate = Number(item.purchaseRate) || 0;
            if (qty <= 0) continue;

            const newStock = rawMat.currentStock + qty;
            rawMat.currentStock = newStock;
            rawMat.lastPurchaseRate = rate;

            if (item.expiryDate) {
                const itemExp = new Date(item.expiryDate);
                if (!rawMat.earliestExpiryDate || itemExp < new Date(rawMat.earliestExpiryDate)) {
                    rawMat.earliestExpiryDate = itemExp;
                }
            }

            // Update moving average rate
            if (rawMat.averagePurchaseRate > 0) {
                rawMat.averagePurchaseRate = parseFloat(((rawMat.averagePurchaseRate + rate) / 2).toFixed(3));
            } else {
                rawMat.averagePurchaseRate = rate;
            }

            rawMat.priceHistory.push({
                date,
                rate,
                grnNumber: autoGrn,
                vendor: vendorName || item.vendorName || ''
            });

            await rawMat.save();

            const ledger = await StockLedger.create({
                rawMaterial: rawMat._id,
                materialName: rawMat.name,
                transactionType: 'GRN',
                quantity: qty,
                balanceAfter: newStock,
                unit: rawMat.baseUnit,
                rate: rate,
                totalAmount: qty * rate,
                grnNumber: autoGrn,
                vendor: vendorName || item.vendorName || '',
                lotNumber: item.lotNumber || `LOT-${autoGrn}`,
                expiryDate: item.expiryDate ? new Date(item.expiryDate) : undefined,
                storageType: rawMat.storageType,
                referenceId: vendorInvoiceNumber || '',
                reason: `GRN from ${vendorName || 'Supplier'}`,
                createdBy: req.body.createdBy || 'Store Manager'
            });

            processedItems.push({ rawMat, ledger });
        }

        res.status(201).json({
            success: true,
            message: `GRN ${autoGrn} recorded successfully for ${processedItems.length} items`,
            grnNumber: autoGrn,
            data: processedItems
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.updateGRN = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            quantity,
            rate,
            lotNumber,
            expiryDate,
            vendor,
            reason,
            grnNumber,
            rawMaterialId
        } = req.body;

        const entry = await StockLedger.findById(id);
        if (!entry) {
            return res.status(404).json({ success: false, message: 'GRN audit trail entry not found' });
        }

        const oldQty = Number(entry.quantity) || 0;
        const newQty = quantity !== undefined ? Number(quantity) : oldQty;
        const newRate = rate !== undefined ? Number(rate) : (Number(entry.rate) || 0);

        const currentMatId = String(entry.rawMaterial?._id || entry.rawMaterial);
        const targetMatId = rawMaterialId ? String(rawMaterialId) : currentMatId;
        const isMaterialChanged = targetMatId && targetMatId !== currentMatId;

        if (isMaterialChanged) {
            // 1. Revert stock from old material
            if (currentMatId) {
                const oldMat = await RawMaterial.findById(currentMatId);
                if (oldMat) {
                    oldMat.currentStock = Math.max(0, (oldMat.currentStock || 0) - oldQty);
                    if (entry.grnNumber && Array.isArray(oldMat.priceHistory)) {
                        oldMat.priceHistory = oldMat.priceHistory.filter(p => p.grnNumber !== entry.grnNumber);
                    }
                    await oldMat.save();
                }
            }
            // 2. Add stock to new material
            const newMat = await RawMaterial.findById(targetMatId);
            if (!newMat) {
                return res.status(404).json({ success: false, message: 'Selected new raw material not found' });
            }
            newMat.currentStock = (newMat.currentStock || 0) + newQty;
            newMat.lastPurchaseRate = newRate;
            if (entry.grnNumber) {
                newMat.priceHistory.push({
                    date: entry.createdAt || new Date(),
                    rate: newRate,
                    grnNumber: grnNumber || entry.grnNumber,
                    vendor: vendor || entry.vendor || ''
                });
            }
            await newMat.save();

            entry.rawMaterial = newMat._id;
            entry.materialName = newMat.name;
            entry.unit = newMat.baseUnit;
            entry.storageType = newMat.storageType;
            entry.balanceAfter = newMat.currentStock;
        } else {
            // Same raw material: adjust stock difference
            if (currentMatId) {
                const rawMat = await RawMaterial.findById(currentMatId);
                if (rawMat) {
                    const diff = newQty - oldQty;
                    rawMat.currentStock = Math.max(0, (rawMat.currentStock || 0) + diff);
                    if (rate !== undefined) {
                        rawMat.lastPurchaseRate = newRate;
                    }
                    if ((grnNumber || entry.grnNumber) && Array.isArray(rawMat.priceHistory)) {
                        const targetGrn = entry.grnNumber;
                        const ph = rawMat.priceHistory.find(p => p.grnNumber === targetGrn);
                        if (ph) {
                            ph.rate = newRate;
                            if (vendor !== undefined) ph.vendor = vendor;
                            if (grnNumber !== undefined) ph.grnNumber = grnNumber;
                        }
                    }
                    if (expiryDate) {
                        const exp = new Date(expiryDate);
                        if (!rawMat.earliestExpiryDate || exp < new Date(rawMat.earliestExpiryDate)) {
                            rawMat.earliestExpiryDate = exp;
                        }
                    }
                    await rawMat.save();
                    entry.balanceAfter = rawMat.currentStock;
                }
            }
        }

        entry.quantity = newQty;
        entry.rate = newRate;
        entry.totalAmount = newQty * newRate;
        if (lotNumber !== undefined) entry.lotNumber = lotNumber;
        if (expiryDate !== undefined) entry.expiryDate = expiryDate ? new Date(expiryDate) : undefined;
        if (vendor !== undefined) {
            entry.vendor = vendor;
            if (!reason) entry.reason = `GRN from ${vendor}`;
        }
        if (reason !== undefined) entry.reason = reason;
        if (grnNumber !== undefined) entry.grnNumber = grnNumber;

        await entry.save();

        res.status(200).json({
            success: true,
            message: 'GRN audit trail entry updated successfully and warehouse stock synchronized',
            data: entry
        });
    } catch (err) {
        console.error('Update GRN Error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.deleteGRN = async (req, res) => {
    try {
        const { id } = req.params;
        let entries = [];
        const isObjectId = mongoose.Types.ObjectId.isValid(id);
        if (isObjectId) {
            const single = await StockLedger.findById(id);
            if (single) {
                entries.push(single);
            }
        }

        // If not found by ID, look for entries by grnNumber
        if (entries.length === 0) {
            entries = await StockLedger.find({ grnNumber: id, transactionType: 'GRN' });
        }

        if (entries.length === 0) {
            return res.status(404).json({ success: false, message: 'GRN audit trail entry not found' });
        }

        // For each entry, reverse the inward stock in RawMaterial
        for (const entry of entries) {
            const rawMatId = entry.rawMaterial?._id || entry.rawMaterial;
            if (rawMatId) {
                const rawMat = await RawMaterial.findById(rawMatId);
                if (rawMat) {
                    const qty = Number(entry.quantity) || 0;
                    rawMat.currentStock = Math.max(0, (rawMat.currentStock || 0) - qty);

                    // Also remove price history entry if matched
                    if (entry.grnNumber && Array.isArray(rawMat.priceHistory)) {
                        rawMat.priceHistory = rawMat.priceHistory.filter(
                            p => p.grnNumber !== entry.grnNumber
                        );
                        if (rawMat.priceHistory.length > 0) {
                            rawMat.lastPurchaseRate = rawMat.priceHistory[rawMat.priceHistory.length - 1].rate;
                        }
                    }
                    await rawMat.save();
                }
            }
            await StockLedger.findByIdAndDelete(entry._id);
        }

        res.status(200).json({
            success: true,
            message: `Successfully deleted ${entries.length} GRN audit trail item(s) and reverted warehouse stock`
        });
    } catch (err) {
        console.error('Delete GRN Error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getPriceTrends = async (req, res) => {
    try {
        const rawMat = await RawMaterial.findById(req.params.id);
        if (!rawMat) {
            return res.status(404).json({ success: false, message: 'Raw material not found' });
        }

        const history = [...(rawMat.priceHistory || [])].sort((a, b) => new Date(a.date) - new Date(b.date));
        res.status(200).json({
            success: true,
            materialName: rawMat.name,
            currentRate: rawMat.lastPurchaseRate,
            averageRate: rawMat.averagePurchaseRate,
            history
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ==========================================
// 6. PRODUCTION ORDERS
// ==========================================

exports.createProductionOrder = async (req, res) => {
    try {
        const { orderNumber, buyerName, buyerOrderId, productionDate, priority, items, notes } = req.body;

        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ success: false, message: 'Production order must have at least one product item' });
        }

        const autoOrderNumber = orderNumber || generate4to5DigitCode('PO');
        const processedItems = [];

        for (const it of items) {
            const recipe = await Recipe.findOne({
                $or: [
                    ...(it.recipeId ? [{ _id: it.recipeId }] : []),
                    { productName: { $regex: `^${it.productName.trim()}$`, $options: 'i' } }
                ]
            });

            if (!recipe) {
                return res.status(400).json({ success: false, message: `Recipe not found for "${it.productName}"` });
            }

            const targetPouches = Number(it.targetPouches);
            const packSize = Number(it.packSize) || (recipe.packSizes && recipe.packSizes[0]) || 0;
            let nominalYield = recipe.nominalBatchYieldPouches || 250;
            if (recipe.batchCookedWeightKg > 0 && packSize > 0) {
                nominalYield = parseFloat((recipe.batchCookedWeightKg / packSize).toFixed(3));
            }
            const batches = parseFloat((targetPouches / nominalYield).toFixed(3));

            processedItems.push({
                recipe: recipe._id,
                productName: recipe.productName,
                targetPouches,
                nominalYield,
                batches
            });
        }

        const prodOrder = await ProductionOrder.create({
            orderNumber: autoOrderNumber,
            buyerName: buyerName || '',
            buyerOrderId: buyerOrderId || null,
            productionDate: productionDate ? new Date(productionDate) : new Date(),
            priority: priority || 'NORMAL',
            items: processedItems,
            notes: notes || ''
        });

        res.status(201).json({ success: true, data: prodOrder });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getProductionOrders = async (req, res) => {
    try {
        const { status, startDate, endDate } = req.query;
        let query = {};
        if (status) query.status = status;
        if (startDate || endDate) {
            query.productionDate = {};
            if (startDate) query.productionDate.$gte = new Date(startDate);
            if (endDate) query.productionDate.$lte = new Date(endDate);
        }

        const orders = await ProductionOrder.find(query)
            .sort({ productionDate: 1 })
            .populate('items.recipe');

        res.status(200).json({ success: true, count: orders.length, data: orders });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.updateProductionOrder = async (req, res) => {
    try {
        const { buyerName, buyerOrderId, productionDate, priority, items, notes } = req.body;
        const order = await ProductionOrder.findById(req.params.id);
        if (!order) {
            return res.status(404).json({ success: false, message: 'Production order not found' });
        }

        if (buyerName !== undefined) order.buyerName = buyerName;
        if (buyerOrderId !== undefined) order.buyerOrderId = buyerOrderId;
        if (productionDate) order.productionDate = new Date(productionDate);
        if (priority) order.priority = priority;
        if (notes !== undefined) order.notes = notes;

        if (items && Array.isArray(items) && items.length > 0) {
            const processedItems = [];
            for (const it of items) {
                const recipe = await Recipe.findOne({
                    $or: [
                        ...(it.recipeId ? [{ _id: it.recipeId }] : []),
                        { productName: { $regex: `^${it.productName.trim()}$`, $options: 'i' } }
                    ]
                });

                if (!recipe) {
                    return res.status(400).json({ success: false, message: `Recipe not found for "${it.productName}"` });
                }

                const targetPouches = Number(it.targetPouches);
                const packSize = Number(it.packSize) || (recipe.packSizes && recipe.packSizes[0]) || 0;
                let nominalYield = recipe.nominalBatchYieldPouches || 250;
                if (recipe.batchCookedWeightKg > 0 && packSize > 0) {
                    nominalYield = parseFloat((recipe.batchCookedWeightKg / packSize).toFixed(3));
                }
                const batches = parseFloat((targetPouches / nominalYield).toFixed(3));

                processedItems.push({
                    recipe: recipe._id,
                    productName: recipe.productName,
                    targetPouches,
                    nominalYield,
                    batches
                });
            }
            order.items = processedItems;
        }

        await order.save();
        res.status(200).json({ success: true, message: 'Production order updated successfully', data: order });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.deleteProductionOrder = async (req, res) => {
    try {
        const order = await ProductionOrder.findById(req.params.id);
        if (!order) {
            return res.status(404).json({ success: false, message: 'Production order not found' });
        }

        await ProductionOrder.findByIdAndDelete(req.params.id);
        res.status(200).json({ success: true, message: 'Production order deleted successfully' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ==========================================
// COMPLETE MASTER BUYER ORDERS
// ==========================================

exports.createBuyerOrder = async (req, res) => {
    try {
        const { orderNumber, buyerName, orderDate, deliveryDate, items, notes } = req.body;
        if (!buyerName || !items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ success: false, message: 'Buyer name and at least one item are required' });
        }

        const autoOrderNumber = orderNumber || generate4to5DigitCode('BO');
        const processedItems = [];

        for (const it of items) {
            let recipeId = it.recipeId || null;
            if (!recipeId) {
                const rec = await Recipe.findOne({
                    productName: { $regex: `^${it.productName.trim()}$`, $options: 'i' }
                });
                if (rec) recipeId = rec._id;
            }
            processedItems.push({
                recipe: recipeId,
                productName: it.productName.trim(),
                targetPouches: Number(it.targetPouches),
                packSize: Number(it.packSize) || 1,
                notes: it.notes || ''
            });
        }

        const buyerOrder = await BuyerOrder.create({
            orderNumber: autoOrderNumber,
            buyerName: buyerName.trim(),
            orderDate: orderDate ? new Date(orderDate) : new Date(),
            deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
            items: processedItems,
            status: 'PENDING',
            notes: notes || ''
        });

        res.status(201).json({ success: true, data: buyerOrder });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getBuyerOrders = async (req, res) => {
    try {
        const { status, buyerName } = req.query;
        let query = {};
        if (status) query.status = status;
        if (buyerName) query.buyerName = { $regex: buyerName, $options: 'i' };

        const orders = await BuyerOrder.find(query).sort({ createdAt: -1 });
        res.status(200).json({ success: true, count: orders.length, data: orders });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.updateBuyerOrder = async (req, res) => {
    try {
        const { buyerName, orderNumber, orderDate, deliveryDate, items, status, notes } = req.body;
        const order = await BuyerOrder.findById(req.params.id);
        if (!order) {
            return res.status(404).json({ success: false, message: 'Buyer order not found' });
        }

        if (buyerName) order.buyerName = buyerName.trim();
        if (orderNumber) order.orderNumber = orderNumber.trim();
        if (orderDate) order.orderDate = new Date(orderDate);
        if (deliveryDate !== undefined) order.deliveryDate = deliveryDate ? new Date(deliveryDate) : null;
        if (status) order.status = status;
        if (notes !== undefined) order.notes = notes;

        if (items && Array.isArray(items) && items.length > 0) {
            const processedItems = [];
            for (const it of items) {
                let recipeId = it.recipeId || null;
                let rec = null;
                if (recipeId) rec = await Recipe.findById(recipeId);
                if (!rec && it.productName) {
                    rec = await Recipe.findOne({
                        productName: { $regex: `^${it.productName.trim()}$`, $options: 'i' }
                    });
                    if (rec) recipeId = rec._id;
                }
                const packSize = Number(it.packSize) || (rec && rec.packSizes && rec.packSizes[0]) || 1;
                processedItems.push({
                    recipe: recipeId,
                    productName: it.productName.trim(),
                    targetPouches: Number(it.targetPouches),
                    packSize: packSize,
                    notes: it.notes || ''
                });
            }
            order.items = processedItems;
        }

        await order.save();
        res.status(200).json({ success: true, data: order });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.deleteBuyerOrder = async (req, res) => {
    try {
        const order = await BuyerOrder.findById(req.params.id);
        if (!order) {
            return res.status(404).json({ success: false, message: 'Buyer order not found' });
        }
        await BuyerOrder.findByIdAndDelete(req.params.id);
        res.status(200).json({ success: true, message: 'Buyer order deleted successfully' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ==========================================
// 7. TIME-PHASED MRP CALCULATION & PERISHABLE ALERTS
// ==========================================

exports.calculateMRP = async (req, res) => {
    try {
        const { orderIds, buyerOrderIds } = req.query;
        let orders = [];
        const hasOrderIdsParam = orderIds !== undefined;
        const hasBuyerOrderIdsParam = buyerOrderIds !== undefined;

        if (hasOrderIdsParam) {
            const idList = orderIds.split(',').map(s => s.trim()).filter(Boolean);
            if (idList.length > 0) {
                orders = await ProductionOrder.find({
                    _id: { $in: idList },
                    status: { $in: ['PLANNED', 'IN_PROGRESS'] }
                })
                .sort({ productionDate: 1 })
                .populate('items.recipe');
            }
        } else if (!hasBuyerOrderIdsParam) {
            // Backward compatibility if neither param is provided: all planned/in_progress
            orders = await ProductionOrder.find({
                status: { $in: ['PLANNED', 'IN_PROGRESS'] }
            })
            .sort({ productionDate: 1 })
            .populate('items.recipe');
        }

        let buyerOrders = [];
        if (hasBuyerOrderIdsParam) {
            const buyerIdList = buyerOrderIds.split(',').map(s => s.trim()).filter(Boolean);
            if (buyerIdList.length > 0) {
                buyerOrders = await BuyerOrder.find({
                    _id: { $in: buyerIdList }
                })
                .sort({ deliveryDate: 1, orderDate: 1 })
                .populate('items.recipe');
            }
        }

        // Fetch all raw materials
        const allMaterials = await RawMaterial.find({ isActive: true });
        const materialMap = new Map();
        allMaterials.forEach(m => materialMap.set(String(m._id), m));

        // Fetch all recipes for reliable lookup (handles unpopulated recipe refs and name matches)
        const allRecipes = await Recipe.find();
        const recipeMap = new Map();
        allRecipes.forEach(r => {
            recipeMap.set(String(r._id), r);
            recipeMap.set(r.productName.trim().toLowerCase(), r);
        });

        // Find active incoming material order batches sorted by date descending
        const activeBatches = await MaterialOrder.find({ status: 'ORDERED' }).sort({ orderDate: -1 });

        // Map incoming batches by both rawMaterialId and materialName lowercase for persistent lookup
        const incomingMap = new Map();
        activeBatches.forEach(b => {
            const batchObj = {
                _id: b._id,
                orderQty: b.orderQty,
                orderDate: b.orderDate,
                unit: b.unit,
                vendor: b.vendor,
                notes: b.notes
            };

            const keys = new Set();
            if (b.rawMaterial) keys.add(String(b.rawMaterial));
            if (b.materialName) keys.add(b.materialName.trim().toLowerCase());

            keys.forEach(k => {
                if (!incomingMap.has(k)) {
                    incomingMap.set(k, {
                        totalQty: 0,
                        batches: []
                    });
                }
                const entry = incomingMap.get(k);
                entry.totalQty += b.orderQty;
                entry.batches.push(batchObj);
            });
        });

        // Aggregate gross requirements
        // key: rawMaterialId or materialName
        const reqMap = new Map();

        // 1. Process Planned Production Batches
        for (const order of orders) {
            for (const item of order.items) {
                let recipe = item.recipe;
                if (!recipe || !recipe.ingredients) {
                    if (item.recipe) recipe = recipeMap.get(String(item.recipe._id || item.recipe));
                    if (!recipe && item.productName) recipe = recipeMap.get(item.productName.trim().toLowerCase());
                }
                if (!recipe || !recipe.ingredients) continue;

                const itemPackSize = Number(item.packSize) || (recipe.packSizes && recipe.packSizes[0]) || 0;
                let nominalYield = item.nominalYield || recipe.nominalBatchYieldPouches || 250;
                if (recipe.batchCookedWeightKg > 0 && itemPackSize > 0) {
                    nominalYield = recipe.batchCookedWeightKg / itemPackSize;
                }
                const batches = (item.batches && !itemPackSize) ? item.batches : parseFloat((Number(item.targetPouches) / nominalYield).toFixed(3));

                for (const ing of recipe.ingredients) {
                    let rmId = ing.rawMaterial ? String(ing.rawMaterial) : null;
                    let rm = rmId ? materialMap.get(rmId) : null;

                    if (!rm) {
                        rm = allMaterials.find(m => m.name.toLowerCase() === ing.materialName.toLowerCase());
                        if (rm) rmId = String(rm._id);
                    }

                    const key = rmId || ing.materialName.toLowerCase();

                    let unitMultiplier = 1;
                    if ((ing.unit === 'g' || ing.unit === 'gm') && (!rm || rm.baseUnit === 'kg')) {
                        unitMultiplier = 0.001;
                    } else if (ing.unit === 'ml' && (!rm || rm.baseUnit === 'L')) {
                        unitMultiplier = 0.001;
                    }

                    const grossRequired = ing.edibleQuantity * unitMultiplier * (ing.lossFactor || 1.0) * batches;

                    if (!reqMap.has(key)) {
                        const incomingInfo = (rmId && incomingMap.get(String(rmId))) ||
                                             (rm && incomingMap.get(String(rm._id))) ||
                                             (rm && incomingMap.get(rm.name.trim().toLowerCase())) ||
                                             incomingMap.get(ing.materialName.trim().toLowerCase());
                        const pipelineQty = incomingInfo ? parseFloat(incomingInfo.totalQty.toFixed(3)) : 0;
                        const batchesList = incomingInfo ? incomingInfo.batches : [];
                        const latestDate = batchesList.length > 0 ? batchesList[0].orderDate : null;

                        reqMap.set(key, {
                            rawMaterialId: rmId,
                            materialName: rm ? rm.name : ing.materialName,
                            materialCode: rm ? rm.code : ing.materialCode,
                            storageType: rm ? rm.storageType : ing.storageType,
                            baseUnit: rm ? rm.baseUnit : ing.unit,
                            currentStock: rm ? rm.currentStock : 0,
                            leadTimeDays: rm ? (rm.leadTimeDays || 1) : 1,
                            packSize: rm ? rm.packSize : 1,
                            preferredSupplier: rm ? rm.preferredSupplier : '',
                            lastPurchaseRate: rm ? rm.lastPurchaseRate : 0,
                            incomingPipelineQty: pipelineQty,
                            orderedBatches: batchesList,
                            latestOrderDate: latestDate,
                            totalGrossRequired: 0,
                            ordersInvolved: [],
                            earliestProductionDate: order.productionDate
                        });
                    }

                    const entry = reqMap.get(key);
                    entry.totalGrossRequired += grossRequired;
                    entry.ordersInvolved.push({
                        orderId: order._id,
                        orderNumber: order.orderNumber,
                        productionDate: order.productionDate,
                        productName: item.productName,
                        batches: batches,
                        grossRequired: parseFloat(grossRequired.toFixed(3))
                    });

                    if (new Date(order.productionDate) < new Date(entry.earliestProductionDate)) {
                        entry.earliestProductionDate = order.productionDate;
                    }
                }
            }
        }

        // 2. Process Master Buyer Orders
        for (const bo of buyerOrders) {
            const boDate = bo.deliveryDate || bo.orderDate || new Date();
            for (const item of (bo.items || [])) {
                let recipe = item.recipe;
                if (!recipe || !recipe.ingredients) {
                    if (item.recipe) recipe = recipeMap.get(String(item.recipe._id || item.recipe));
                    if (!recipe && item.productName) recipe = recipeMap.get(item.productName.trim().toLowerCase());
                }
                if (!recipe || !recipe.ingredients) continue;

                const targetPouches = Number(item.targetPouches) || 0;
                if (targetPouches <= 0) continue;

                const itemPackSize = Number(item.packSize) || (recipe.packSizes && recipe.packSizes[0]) || 0;
                let nominalYield = recipe.nominalBatchYieldPouches || 250;
                if (recipe.batchCookedWeightKg > 0 && itemPackSize > 0) {
                    nominalYield = recipe.batchCookedWeightKg / itemPackSize;
                }
                const batches = parseFloat((targetPouches / nominalYield).toFixed(3));

                for (const ing of recipe.ingredients) {
                    let rmId = ing.rawMaterial ? String(ing.rawMaterial) : null;
                    let rm = rmId ? materialMap.get(rmId) : null;

                    if (!rm) {
                        rm = allMaterials.find(m => m.name.toLowerCase() === ing.materialName.toLowerCase());
                        if (rm) rmId = String(rm._id);
                    }

                    const key = rmId || ing.materialName.toLowerCase();

                    let unitMultiplier = 1;
                    if ((ing.unit === 'g' || ing.unit === 'gm') && (!rm || rm.baseUnit === 'kg')) {
                        unitMultiplier = 0.001;
                    } else if (ing.unit === 'ml' && (!rm || rm.baseUnit === 'L')) {
                        unitMultiplier = 0.001;
                    }

                    const grossRequired = ing.edibleQuantity * unitMultiplier * (ing.lossFactor || 1.0) * batches;

                    if (!reqMap.has(key)) {
                        const incomingInfo = (rmId && incomingMap.get(String(rmId))) ||
                                             (rm && incomingMap.get(String(rm._id))) ||
                                             (rm && incomingMap.get(rm.name.trim().toLowerCase())) ||
                                             incomingMap.get(ing.materialName.trim().toLowerCase());
                        const pipelineQty = incomingInfo ? parseFloat(incomingInfo.totalQty.toFixed(3)) : 0;
                        const batchesList = incomingInfo ? incomingInfo.batches : [];
                        const latestDate = batchesList.length > 0 ? batchesList[0].orderDate : null;

                        reqMap.set(key, {
                            rawMaterialId: rmId,
                            materialName: rm ? rm.name : ing.materialName,
                            materialCode: rm ? rm.code : ing.materialCode,
                            storageType: rm ? rm.storageType : ing.storageType,
                            baseUnit: rm ? rm.baseUnit : ing.unit,
                            currentStock: rm ? rm.currentStock : 0,
                            leadTimeDays: rm ? (rm.leadTimeDays || 1) : 1,
                            packSize: rm ? rm.packSize : 1,
                            preferredSupplier: rm ? rm.preferredSupplier : '',
                            lastPurchaseRate: rm ? rm.lastPurchaseRate : 0,
                            incomingPipelineQty: pipelineQty,
                            orderedBatches: batchesList,
                            latestOrderDate: latestDate,
                            totalGrossRequired: 0,
                            ordersInvolved: [],
                            earliestProductionDate: boDate
                        });
                    }

                    const entry = reqMap.get(key);
                    entry.totalGrossRequired += grossRequired;
                    entry.ordersInvolved.push({
                        orderId: bo._id,
                        orderNumber: bo.orderNumber,
                        productionDate: boDate,
                        productName: item.productName,
                        buyerName: bo.buyerName,
                        isBuyerOrder: true,
                        batches: batches,
                        grossRequired: parseFloat(grossRequired.toFixed(3))
                    });

                    if (new Date(boDate) < new Date(entry.earliestProductionDate)) {
                        entry.earliestProductionDate = boDate;
                    }
                }
            }
        }

        const now = new Date();
        const mrpResults = Array.from(reqMap.values()).map(entry => {
            const totalRequired = parseFloat(entry.totalGrossRequired.toFixed(3));
            // Net shortfall = Gross Required - Current Stock (No safety buffer)
            const netShortfall = Math.max(0, totalRequired - entry.currentStock);

            // Commercial bag / pack rounding
            let suggestedOrderQty = 0;
            let bagCount = 0;
            if (netShortfall > 0) {
                if (entry.packSize > 1) {
                    bagCount = Math.ceil(netShortfall / entry.packSize);
                    suggestedOrderQty = bagCount * entry.packSize;
                } else {
                    suggestedOrderQty = Math.ceil(netShortfall);
                    bagCount = suggestedOrderQty;
                }
            }

            // Lead time "Order-By" date calculation
            const earliestDate = new Date(entry.earliestProductionDate);
            const orderByDate = new Date(earliestDate.getTime() - (entry.leadTimeDays * 86400000));
            const isUrgent = netShortfall > 0 && entry.incomingPipelineQty === 0 && orderByDate <= now;
            const isWarning = netShortfall > 0 && entry.incomingPipelineQty === 0 && orderByDate <= new Date(now.getTime() + 2 * 86400000);

            // Estimated Arrival Date (based on ordered quantity & latest order date)
            let estArrivalDate = null;
            if (entry.latestOrderDate) {
                const orderTime = new Date(entry.latestOrderDate).getTime();
                estArrivalDate = new Date(orderTime + (entry.leadTimeDays * 86400000));
            }

            // Status determination:
            // - If shortfall === 0: 'NOT REQUIRED'
            // - If shortfall > 0:
            //     - If incomingPipelineQty >= netShortfall: 'COMPLETE'
            //     - Else if incomingPipelineQty > 0: 'PARTIAL'
            //     - Else: 'DUE'
            let status = 'DUE';
            if (netShortfall === 0) {
                status = 'NOT REQUIRED';
            } else if (entry.incomingPipelineQty >= netShortfall) {
                status = 'COMPLETE';
            } else if (entry.incomingPipelineQty > 0) {
                status = 'PARTIAL';
            } else {
                status = 'DUE';
            }

            return {
                ...entry,
                totalGrossRequired: totalRequired,
                isShortage: netShortfall > 0,
                shortfallQuantity: parseFloat(netShortfall.toFixed(3)),
                bagCount,
                suggestedOrderQty,
                estimatedOrderCost: parseFloat((suggestedOrderQty * entry.lastPurchaseRate).toFixed(3)),
                orderByDate,
                isUrgent,
                isWarning,
                estArrivalDate,
                status,
                latestOrderDate: entry.latestOrderDate || null
            };
        });

        // Sort by urgency: Urgent first, then by earliest orderByDate
        mrpResults.sort((a, b) => {
            if (a.isUrgent && !b.isUrgent) return -1;
            if (!a.isUrgent && b.isUrgent) return 1;
            return new Date(a.orderByDate) - new Date(b.orderByDate);
        });

        res.status(200).json({
            success: true,
            totalOrdersEvaluated: orders.length,
            totalMaterialsRequired: mrpResults.length,
            shortageCount: mrpResults.filter(r => r.isShortage && r.status !== 'COMPLETE').length,
            urgentCount: mrpResults.filter(r => r.isUrgent).length,
            data: mrpResults
        });
    } catch (err) {
        console.error('MRP Calculation Error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// ==========================================
// MATERIAL INCOMING ORDER BATCHES (MULTI-BATCH)
// ==========================================

exports.getMaterialOrders = async (req, res) => {
    try {
        const { materialName, rawMaterialId } = req.query;
        let query = { status: 'ORDERED' };
        if (rawMaterialId) query.rawMaterial = rawMaterialId;
        else if (materialName) query.materialName = { $regex: `^${materialName.trim()}$`, $options: 'i' };

        const orders = await MaterialOrder.find(query)
            .populate('rawMaterial', 'name code leadTimeDays preferredSupplier currentStock')
            .sort({ orderDate: -1 });

        const augmented = orders.map(ord => {
            const doc = ord.toObject();
            const leadTime = (doc.rawMaterial && doc.rawMaterial.leadTimeDays) ? doc.rawMaterial.leadTimeDays : 1;
            const orderTime = new Date(doc.orderDate).getTime();
            doc.leadTimeDays = leadTime;
            doc.estArrivalDate = new Date(orderTime + (leadTime * 86400000));
            doc.vendorName = doc.vendor || (doc.rawMaterial && doc.rawMaterial.preferredSupplier) || '—';
            return doc;
        });

        res.status(200).json({ success: true, count: augmented.length, data: augmented });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.createMaterialOrderBatch = async (req, res) => {
    try {
        const { materialName, rawMaterialId, orderQty, orderDate, unit, vendor, notes } = req.body;
        if (!materialName || !orderQty || Number(orderQty) <= 0) {
            return res.status(400).json({ success: false, message: 'Material name and valid order quantity are required' });
        }

        let rmId = rawMaterialId || null;
        if (!rmId) {
            const rm = await RawMaterial.findOne({ name: { $regex: `^${materialName.trim()}$`, $options: 'i' } });
            if (rm) rmId = rm._id;
        }

        const batch = await MaterialOrder.create({
            materialName: materialName.trim(),
            rawMaterial: rmId,
            orderQty: Number(orderQty),
            orderDate: orderDate ? new Date(orderDate) : new Date(),
            unit: unit || 'kg',
            vendor: vendor || '',
            notes: notes || '',
            status: 'ORDERED'
        });

        res.status(201).json({ success: true, message: 'Order batch recorded successfully', data: batch });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.deleteMaterialOrderBatch = async (req, res) => {
    try {
        const batch = await MaterialOrder.findById(req.params.id);
        if (!batch) {
            return res.status(404).json({ success: false, message: 'Order batch not found' });
        }
        await MaterialOrder.findByIdAndDelete(req.params.id);
        res.status(200).json({ success: true, message: 'Order batch deleted successfully' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.clearMaterialOrders = async (req, res) => {
    try {
        const { materialName, rawMaterialId } = req.body;
        let query = { status: 'ORDERED' };
        if (rawMaterialId) query.rawMaterial = rawMaterialId;
        else if (materialName) query.materialName = { $regex: `^${materialName.trim()}$`, $options: 'i' };

        await MaterialOrder.deleteMany(query);
        res.status(200).json({ success: true, message: 'All incoming orders cleared for this material' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getPerishableAlerts = async (req, res) => {
    try {
        // Reuse MRP calculation logic focusing exclusively on Cold storage perishables
        const orders = await ProductionOrder.find({
            status: { $in: ['PLANNED', 'IN_PROGRESS'] }
        }).sort({ productionDate: 1 }).populate('items.recipe');

        const coldMaterials = await RawMaterial.find({ isActive: true, storageType: 'Cold' });
        const coldMap = new Map();
        coldMaterials.forEach(m => coldMap.set(String(m._id), m));

        const alerts = [];
        const now = new Date();

        for (const order of orders) {
            for (const item of order.items) {
                if (!item.recipe || !item.recipe.ingredients) continue;
                for (const ing of item.recipe.ingredients) {
                    if (ing.storageType !== 'Cold') continue;

                    let rm = ing.rawMaterial ? coldMap.get(String(ing.rawMaterial)) : null;
                    if (!rm) {
                        rm = coldMaterials.find(m => m.name.toLowerCase() === ing.materialName.toLowerCase());
                    }

                    const leadDays = rm ? rm.leadTimeDays : 1;
                    const orderByDate = new Date(new Date(order.productionDate).getTime() - (leadDays * 86400000));

                    // Edible to gross calculation
                    const grossNeeded = ing.edibleQuantity * (ing.lossFactor || 1.0) * item.batches;
                    const currentStock = rm ? rm.currentStock : 0;
                    const isDeficit = currentStock < grossNeeded;

                    alerts.push({
                        productionOrderId: order._id,
                        orderNumber: order.orderNumber,
                        productionDate: order.productionDate,
                        productName: item.productName,
                        materialName: rm ? rm.name : ing.materialName,
                        grossRequired: parseFloat(grossNeeded.toFixed(3)),
                        unit: rm ? rm.baseUnit : ing.unit,
                        currentStock,
                        leadTimeDays: leadDays,
                        orderByDate,
                        isOrderDueToday: orderByDate.toDateString() === now.toDateString(),
                        isOverdue: orderByDate < now,
                        preferredSupplier: rm ? rm.preferredSupplier : ''
                    });
                }
            }
        }

        alerts.sort((a, b) => new Date(a.orderByDate) - new Date(b.orderByDate));

        res.status(200).json({
            success: true,
            count: alerts.length,
            dueTodayCount: alerts.filter(a => a.isOrderDueToday || a.isOverdue).length,
            data: alerts
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ==========================================
// 8. PURCHASE ORDERS & KITCHEN ISSUE
// ==========================================

exports.createPurchaseOrder = async (req, res) => {
    try {
        const { poNumber, expectedDeliveryDate, supplier, items, notes } = req.body;

        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ success: false, message: 'Purchase order must have items' });
        }

        const autoPo = poNumber || generate4to5DigitCode('PO');
        const po = await PurchaseOrder.create({
            poNumber: autoPo,
            expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate) : undefined,
            supplier: supplier || '',
            items: items.map(it => ({
                rawMaterial: it.rawMaterialId,
                materialName: it.materialName,
                materialCode: it.materialCode || '',
                storageType: it.storageType || 'Ambient',
                requiredNetQty: Number(it.requiredNetQty) || 0,
                packSize: Number(it.packSize) || 1,
                orderQty: Number(it.orderQty) || 0,
                unit: it.unit || 'kg',
                estimatedRate: Number(it.estimatedRate) || 0,
                status: 'PENDING'
            })),
            notes: notes || ''
        });

        res.status(201).json({ success: true, data: po });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getPurchaseOrders = async (req, res) => {
    try {
        const { status } = req.query;
        let query = {};
        if (status) query.status = status;

        const pos = await PurchaseOrder.find(query).sort({ createdAt: -1 });
        res.status(200).json({ success: true, count: pos.length, data: pos });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.createMaterialIssue = async (req, res) => {
    try {
        const { productionOrderId, kitchenSupervisor, items, notes, buyerName, productName, batches } = req.body;

        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ success: false, message: 'Material issue must have items' });
        }

        const autoIssueNumber = generate4to5DigitCode('ISS');
        const processedItems = [];

        let resolvedBuyer = buyerName || '';
        let resolvedProduct = productName || '';
        const numBatches = batches !== undefined && batches !== null && Number(batches) > 0 ? Number(batches) : 1;

        if (productionOrderId) {
            const pOrder = await ProductionOrder.findById(productionOrderId).populate('items.recipe');
            if (pOrder && pOrder.items && pOrder.items.length > 0) {
                const first = pOrder.items[0];
                if (!resolvedProduct) resolvedProduct = first.productName;
                if (!resolvedBuyer) {
                    resolvedBuyer = first.recipe?.buyerName || pOrder.buyerName || 'General';
                }
            }
        }

        for (const it of items) {
            let rawMat = null;
            if (it.rawMaterialId) {
                rawMat = await RawMaterial.findById(it.rawMaterialId);
            }
            if (!rawMat && it.materialName) {
                rawMat = await RawMaterial.findOne({
                    name: { $regex: `^${it.materialName.trim()}$`, $options: 'i' }
                });
            }
            if (!rawMat) continue;

            const issuedQty = Number(it.actualIssuedQty) || 0;
            const theoreticalGross = Number(it.theoreticalGrossQty) || 0;
            const variance = issuedQty - theoreticalGross;
            const variancePercent = theoreticalGross > 0 ? parseFloat(((variance / theoreticalGross) * 100).toFixed(3)) : 0;

            // Deduct stock from RawMaterial
            const oldStock = rawMat.currentStock;
            const newStock = Math.max(0, rawMat.currentStock - issuedQty);
            rawMat.currentStock = newStock;
            await rawMat.save();

            // Record in ledger
            const ledgerEntry = await StockLedger.create({
                rawMaterial: rawMat._id,
                materialName: rawMat.name,
                transactionType: 'KITCHEN_ISSUE',
                quantity: -issuedQty,
                balanceAfter: newStock,
                unit: rawMat.baseUnit,
                rate: rawMat.lastPurchaseRate,
                totalAmount: issuedQty * rawMat.lastPurchaseRate,
                storageType: rawMat.storageType,
                referenceId: autoIssueNumber,
                reason: `Kitchen store issue for ${numBatches} batch(es) of ${resolvedProduct || 'Recipe'}${productionOrderId ? ` (PO #${productionOrderId})` : ''}`,
                createdBy: kitchenSupervisor || 'Kitchen Supervisor'
            });

            processedItems.push({
                rawMaterial: rawMat._id,
                materialName: rawMat.name,
                openingStock: parseFloat(oldStock.toFixed(3)),
                closingStock: parseFloat(newStock.toFixed(3)),
                theoreticalEdibleQty: Number(it.theoreticalEdibleQty) || 0,
                lossFactor: Number(it.lossFactor) || 1.0,
                theoreticalGrossQty: theoreticalGross,
                actualIssuedQty: issuedQty,
                unit: rawMat.baseUnit,
                varianceQty: parseFloat(variance.toFixed(3)),
                variancePercent,
                lotsUsed: [{
                    ledgerId: ledgerEntry._id,
                    quantity: issuedQty,
                    rate: rawMat.lastPurchaseRate
                }]
            });
        }

        const totalIssuedKg = processedItems.reduce((acc, it) => acc + (it.actualIssuedQty || 0), 0);

        const issue = await MaterialIssue.create({
            issueNumber: autoIssueNumber,
            productionOrder: productionOrderId || undefined,
            batches: numBatches,
            kitchenSupervisor: kitchenSupervisor || '',
            buyerName: resolvedBuyer || 'General',
            productName: resolvedProduct || (processedItems[0]?.materialName ? `Recipe for ${processedItems[0].materialName}` : 'Recipe Issue'),
            totalIssuedKg: parseFloat(totalIssuedKg.toFixed(3)),
            items: processedItems,
            notes: notes || ''
        });

        res.status(201).json({ success: true, data: issue });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getMaterialIssues = async (req, res) => {
    try {
        const issues = await MaterialIssue.find()
            .sort({ createdAt: -1 })
            .populate('productionOrder');
        res.status(200).json({ success: true, count: issues.length, data: issues });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.deleteMaterialIssue = async (req, res) => {
    try {
        const issue = await MaterialIssue.findById(req.params.id);
        if (!issue) {
            return res.status(404).json({ success: false, message: 'Material issue not found' });
        }

        // 1. Undo stock reductions for each raw material in the issue
        for (const it of (issue.items || [])) {
            const issuedQty = Number(it.actualIssuedQty) || 0;
            if (issuedQty > 0) {
                let rawMat = null;
                if (it.rawMaterial) {
                    rawMat = await RawMaterial.findById(it.rawMaterial);
                }
                if (!rawMat && it.materialName) {
                    rawMat = await RawMaterial.findOne({
                        name: { $regex: `^${it.materialName.trim()}$`, $options: 'i' }
                    });
                }
                if (rawMat) {
                    rawMat.currentStock = Math.max(0, (rawMat.currentStock || 0) + issuedQty);
                    await rawMat.save();
                }
            }
        }

        // 2. Remove corresponding StockLedger entries created for this issue
        if (issue.issueNumber) {
            await StockLedger.deleteMany({
                referenceId: issue.issueNumber,
                transactionType: 'KITCHEN_ISSUE'
            });
        }

        const ledgerIds = [];
        (issue.items || []).forEach(it => {
            (it.lotsUsed || []).forEach(l => {
                if (l.ledgerId) ledgerIds.push(l.ledgerId);
            });
        });
        if (ledgerIds.length > 0) {
            await StockLedger.deleteMany({ _id: { $in: ledgerIds } });
        }

        // 3. Delete the issue document itself
        await MaterialIssue.findByIdAndDelete(req.params.id);

        res.status(200).json({
            success: true,
            message: 'Material issue deleted and stock reductions reverted successfully'
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ==========================================
// 9. KITCHEN VARIANCE TRACKER & FILLING LOOKUP
// ==========================================

exports.lookupFillingData = async (req, res) => {
    try {
        const { batchCode, shift, productName, buyerName } = req.query;

        if (!batchCode && !productName) {
            return res.status(400).json({ success: false, message: 'Batch code or product name is required' });
        }

        let query = {
            sectionMain: { $regex: 'Filling', $options: 'i' }
        };

        if (shift && shift !== 'All') {
            query.dayTime = shift;
        }

        const fillingDocs = await Data.find(query).sort({ createdAt: -1 }).limit(100);
        let match = null;

        for (const doc of fillingDocs) {
            if (!doc.dataList || !Array.isArray(doc.dataList)) continue;
            for (const item of doc.dataList) {
                const batchMatches = batchCode
                    ? item.batch && String(item.batch).trim().toLowerCase() === String(batchCode).trim().toLowerCase()
                    : true;
                const prodMatches = productName
                    ? item.productName && item.productName.trim().toLowerCase() === productName.trim().toLowerCase()
                    : true;
                const buyerMatches = buyerName
                    ? item.buyerName && item.buyerName.trim().toLowerCase() === buyerName.trim().toLowerCase()
                    : true;

                if (batchMatches && (prodMatches || !productName)) {
                    const packSizeG = Number(item.packSize) || 250;
                    const lossPouches = (Number(item.pouchLoss) || 0) + (Number(item.leaked) || 0);
                    const wastageKg = parseFloat(((lossPouches * packSizeG) / 1000).toFixed(3));

                    match = {
                        date: doc.createdAt,
                        shift: doc.dayTime,
                        batchCode: item.batch || batchCode,
                        buyerName: item.buyerName || buyerName || '',
                        productName: item.productName || productName || '',
                        pouchesFilled: Number(item.filled) || 0,
                        packSizeG: packSizeG,
                        pouchLoss: Number(item.pouchLoss) || 0,
                        leaked: Number(item.leaked) || 0,
                        wastageKg: wastageKg
                    };
                    break;
                }
            }
            if (match) break;
        }

        res.status(200).json({
            success: true,
            found: !!match,
            data: match
        });
    } catch (err) {
        console.error('lookupFillingData error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.createKitchenVariance = async (req, res) => {
    try {
        const {
            issueNumber,
            buyerName,
            productName,
            productionDate,
            shift,
            issuedQuantityKg,
            batches,
            totalFilledPouches,
            totalFilledWeightKg,
            totalWastageKg,
            totalYieldKg,
            theoreticalGrossKg,
            varianceKg,
            variancePercent,
            ingredientBreakdown,
            supervisor,
            notes
        } = req.body;

        if (!productName) {
            return res.status(400).json({ success: false, message: 'Product name is required' });
        }

        const issuedKg = parseFloat((Number(issuedQuantityKg) || 0).toFixed(3));
        const finalYieldKg = parseFloat((Number(totalYieldKg) || 0).toFixed(3));
        const finalVarianceKg = parseFloat((finalYieldKg - issuedKg).toFixed(3));
        const finalVariancePct = issuedKg > 0 ? parseFloat(((finalVarianceKg / issuedKg) * 100).toFixed(3)) : 0;

        // Process batches array
        const processedBatches = (batches || []).map(b => {
            const pouches = Number(b.pouchesFilled) || 0;
            const packSize = Number(b.packSizeG) || 250;
            const extra = Number(b.extraWeightG) || 0;
            const actualUnitWeightKg = parseFloat(((packSize + extra) / 1000).toFixed(4));
            const filledWtKg = parseFloat((pouches * actualUnitWeightKg).toFixed(3));
            const waste = parseFloat((Number(b.wastageKg) || 0).toFixed(3));
            const bYield = parseFloat((filledWtKg + waste).toFixed(3));

            return {
                batchCode: (b.batchCode || '').trim(),
                shift: b.shift || 'Day',
                pouchesFilled: pouches,
                packSizeG: packSize,
                extraWeightG: extra,
                actualPouchWeightKg: actualUnitWeightKg,
                filledWeightKg: filledWtKg,
                wastageKg: waste,
                batchYieldKg: bYield
            };
        });

        const batchCodesStr = processedBatches.map(b => b.batchCode).filter(Boolean).join(', ');

        const record = await KitchenVariance.create({
            issueNumber: (issueNumber || '').trim(),
            buyerName: (buyerName || '').trim(),
            productName: productName.trim(),
            productionDate: productionDate ? new Date(productionDate) : new Date(),
            batchNumber: batchCodesStr || (issueNumber || 'Direct Issue'),
            shift: shift || (processedBatches[0]?.shift || 'Day'),
            issuedQuantityKg: issuedKg,
            batches: processedBatches,
            totalFilledPouches: Number(totalFilledPouches) || processedBatches.reduce((a, b) => a + b.pouchesFilled, 0),
            totalFilledWeightKg: parseFloat((Number(totalFilledWeightKg) || processedBatches.reduce((a, b) => a + b.filledWeightKg, 0)).toFixed(3)),
            totalWastageKg: parseFloat((Number(totalWastageKg) || processedBatches.reduce((a, b) => a + b.wastageKg, 0)).toFixed(3)),
            totalYieldKg: finalYieldKg,
            theoreticalGrossKg: parseFloat((Number(theoreticalGrossKg) || 0).toFixed(3)),
            varianceKg: finalVarianceKg,
            variancePercent: finalVariancePct,
            ingredientBreakdown: ingredientBreakdown || [],
            supervisor: supervisor || 'Kitchen Supervisor',
            notes: notes || ''
        });

        res.status(201).json({ success: true, data: record });
    } catch (err) {
        console.error('createKitchenVariance error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getKitchenVariances = async (req, res) => {
    try {
        const { search, shift, buyerName } = req.query;
        let query = {};
        if (shift && shift !== 'All') query.shift = shift;
        if (buyerName && buyerName !== 'All') query.buyerName = buyerName;
        if (search) {
            query.$or = [
                { batchNumber: { $regex: search, $options: 'i' } },
                { productName: { $regex: search, $options: 'i' } },
                { issueNumber: { $regex: search, $options: 'i' } },
                { buyerName: { $regex: search, $options: 'i' } }
            ];
        }

        const records = await KitchenVariance.find(query).sort({ productionDate: -1, createdAt: -1 });
        res.status(200).json({ success: true, count: records.length, data: records });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};


