const xlsx = require('xlsx');
const RawMaterial = require('../models/rawMaterialModel');
const Recipe = require('../models/recipeModel');
const StockLedger = require('../models/stockLedgerModel');
const ProductionOrder = require('../models/productionOrderModel');
const PurchaseOrder = require('../models/purchaseOrderModel');
const MaterialIssue = require('../models/materialIssueModel');

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
        const { storageType, search, lowStock } = req.query;
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

        if (lowStock === 'true') {
            materials = materials.filter(m => m.currentStock <= m.minSafetyStock);
        }

        res.status(200).json({
            success: true,
            count: materials.length,
            data: materials
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
            .limit(20);

        res.status(200).json({
            success: true,
            data: {
                ...material.toObject(),
                recentTransactions
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
            lastPurchaseRate: Number(lastPurchaseRate) || 0
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
        const recipes = await Recipe.find({ isActive: true }).sort({ productName: 1 });
        res.status(200).json({ success: true, count: recipes.length, data: recipes });
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
        const { productName, nominalBatchYieldPouches, batchCookedWeightKg, ingredients } = req.body;

        const existing = await Recipe.findOne({ productName: productName.trim() });
        if (existing) {
            return res.status(400).json({ success: false, message: `Recipe for "${productName}" already exists` });
        }

        // Link rawMaterial IDs where available
        const enrichedIngredients = await Promise.all(
            (ingredients || []).map(async (ing) => {
                const escapedName = escapeRegex(ing.materialName.trim());
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
            productName: productName.trim(),
            nominalBatchYieldPouches: Number(nominalBatchYieldPouches) || 250,
            batchCookedWeightKg: Number(batchCookedWeightKg) || 0,
            ingredients: enrichedIngredients
        });

        res.status(201).json({ success: true, data: recipe });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.updateRecipe = async (req, res) => {
    try {
        const recipe = await Recipe.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });
        if (!recipe) {
            return res.status(404).json({ success: false, message: 'Recipe not found' });
        }
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
            let explicitProductName = '';
            let headerRowIndex = -1;

            // Find nominal batch yield, cooked weight, explicit product name, and table headers
            for (let i = 0; i < Math.min(rawRows.length, 10); i++) {
                const row = rawRows[i];
                for (let j = 0; j < row.length; j++) {
                    const cellVal = String(row[j]).toLowerCase();
                    if ((cellVal.includes('product') || cellVal.includes('recipe name')) && !cellVal.includes('pouch') && !cellVal.includes('yield')) {
                        if (row[j + 1] && String(row[j + 1]).trim()) {
                            explicitProductName = String(row[j + 1]).trim();
                        }
                    }
                    if (cellVal.includes('nominal') || cellVal.includes('yield') || cellVal.includes('pouch')) {
                        const val = parseFloat(row[j + 1]);
                        if (!isNaN(val) && val > 0) nominalBatchYieldPouches = val;
                    }
                    if (cellVal.includes('cooked weight') || cellVal.includes('batch weight')) {
                        const val = parseFloat(row[j + 1]);
                        if (!isNaN(val) && val > 0) batchCookedWeightKg = val;
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
                parsedRecipes.push({
                    productName: recipeProductName,
                    nominalBatchYieldPouches,
                    batchCookedWeightKg,
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
                    priceHistory: item.rate > 0 ? [{ rate: item.rate, date: new Date(), vendor: item.preferredSupplier }] : []
                });
            } else {
                rawMat.currentStock = item.openingStock;
                rawMat.storageType = item.storageType;
                rawMat.baseUnit = item.unit;
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
        const autoGrn = grnNumber || `GRN-${Date.now()}`;
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

            // Update moving average rate
            if (rawMat.averagePurchaseRate > 0) {
                rawMat.averagePurchaseRate = parseFloat(((rawMat.averagePurchaseRate + rate) / 2).toFixed(2));
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
        const { orderNumber, productionDate, priority, items, notes } = req.body;

        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ success: false, message: 'Production order must have at least one product item' });
        }

        const autoOrderNumber = orderNumber || `PO-${Date.now()}`;
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
            const nominalYield = recipe.nominalBatchYieldPouches || 250;
            const batches = parseFloat((targetPouches / nominalYield).toFixed(4));

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

// ==========================================
// 7. TIME-PHASED MRP CALCULATION & PERISHABLE ALERTS
// ==========================================

exports.calculateMRP = async (req, res) => {
    try {
        // Find all active planned production orders sorted chronologically
        const orders = await ProductionOrder.find({
            status: { $in: ['PLANNED', 'IN_PROGRESS'] }
        }).sort({ productionDate: 1 }).populate('items.recipe');

        // Fetch all raw materials
        const allMaterials = await RawMaterial.find({ isActive: true });
        const materialMap = new Map();
        allMaterials.forEach(m => materialMap.set(String(m._id), m));

        // Find incoming pending purchase orders
        const pendingPOs = await PurchaseOrder.find({
            status: { $in: ['DRAFT', 'SENT'] }
        });

        const incomingMap = new Map();
        pendingPOs.forEach(po => {
            po.items.forEach(it => {
                if (it.rawMaterial) {
                    const id = String(it.rawMaterial);
                    const pendingQty = Math.max(0, it.orderQty - (it.receivedQty || 0));
                    incomingMap.set(id, (incomingMap.get(id) || 0) + pendingQty);
                }
            });
        });

        // Aggregate gross requirements
        // key: rawMaterialId or materialName
        const reqMap = new Map();

        for (const order of orders) {
            for (const item of order.items) {
                const recipe = item.recipe;
                if (!recipe || !recipe.ingredients) continue;

                const batches = item.batches;

                for (const ing of recipe.ingredients) {
                    let rmId = ing.rawMaterial ? String(ing.rawMaterial) : null;
                    let rm = rmId ? materialMap.get(rmId) : null;

                    if (!rm) {
                        // Match by name
                        rm = allMaterials.find(m => m.name.toLowerCase() === ing.materialName.toLowerCase());
                        if (rm) rmId = String(rm._id);
                    }

                    const key = rmId || ing.materialName.toLowerCase();

                    // Convert units to base unit if necessary (e.g. g -> kg, ml -> L)
                    let unitMultiplier = 1;
                    if ((ing.unit === 'g' || ing.unit === 'gm') && (!rm || rm.baseUnit === 'kg')) {
                        unitMultiplier = 0.001;
                    } else if (ing.unit === 'ml' && (!rm || rm.baseUnit === 'L')) {
                        unitMultiplier = 0.001;
                    }

                    const grossRequired = ing.edibleQuantity * unitMultiplier * (ing.lossFactor || 1.0) * batches;

                    if (!reqMap.has(key)) {
                        reqMap.set(key, {
                            rawMaterialId: rmId,
                            materialName: rm ? rm.name : ing.materialName,
                            materialCode: rm ? rm.code : ing.materialCode,
                            storageType: rm ? rm.storageType : ing.storageType,
                            baseUnit: rm ? rm.baseUnit : ing.unit,
                            currentStock: rm ? rm.currentStock : 0,
                            minSafetyStock: rm ? rm.minSafetyStock : 0,
                            leadTimeDays: rm ? rm.leadTimeDays : 1,
                            packSize: rm ? rm.packSize : 1,
                            preferredSupplier: rm ? rm.preferredSupplier : '',
                            lastPurchaseRate: rm ? rm.lastPurchaseRate : 0,
                            incomingPipelineQty: rmId ? (incomingMap.get(rmId) || 0) : 0,
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

        const now = new Date();
        const mrpResults = Array.from(reqMap.values()).map(entry => {
            const totalRequired = parseFloat(entry.totalGrossRequired.toFixed(3));
            const availableEffective = entry.currentStock + entry.incomingPipelineQty;
            const targetThreshold = totalRequired + entry.minSafetyStock;
            const netShortfall = Math.max(0, targetThreshold - availableEffective);

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
            const isUrgent = netShortfall > 0 && orderByDate <= now;
            const isWarning = netShortfall > 0 && orderByDate <= new Date(now.getTime() + 2 * 86400000);

            return {
                ...entry,
                totalGrossRequired: totalRequired,
                isShortage: netShortfall > 0,
                shortfallQuantity: parseFloat(netShortfall.toFixed(3)),
                bagCount,
                suggestedOrderQty,
                estimatedOrderCost: parseFloat((suggestedOrderQty * entry.lastPurchaseRate).toFixed(2)),
                orderByDate,
                isUrgent,
                isWarning
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
            shortageCount: mrpResults.filter(r => r.isShortage).length,
            urgentCount: mrpResults.filter(r => r.isUrgent).length,
            data: mrpResults
        });
    } catch (err) {
        console.error('MRP Calculation Error:', err);
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
                        grossRequired: parseFloat(grossNeeded.toFixed(2)),
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

        const autoPo = poNumber || `PO-${Date.now()}`;
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
        const { productionOrderId, kitchenSupervisor, items, notes } = req.body;

        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ success: false, message: 'Material issue must have items' });
        }

        const autoIssueNumber = `ISS-${Date.now()}`;
        const processedItems = [];

        for (const it of items) {
            const rawMat = await RawMaterial.findById(it.rawMaterialId);
            if (!rawMat) continue;

            const issuedQty = Number(it.actualIssuedQty) || 0;
            const theoreticalGross = Number(it.theoreticalGrossQty) || 0;
            const variance = issuedQty - theoreticalGross;
            const variancePercent = theoreticalGross > 0 ? parseFloat(((variance / theoreticalGross) * 100).toFixed(2)) : 0;

            // Deduct stock from RawMaterial
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
                reason: `Kitchen store issue for production order ${productionOrderId || 'Direct'}`,
                createdBy: kitchenSupervisor || 'Kitchen Supervisor'
            });

            processedItems.push({
                rawMaterial: rawMat._id,
                materialName: rawMat.name,
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

        const issue = await MaterialIssue.create({
            issueNumber: autoIssueNumber,
            productionOrder: productionOrderId || undefined,
            kitchenSupervisor: kitchenSupervisor || '',
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

