const express = require('express');
const router = express.Router();
const multer = require('multer');
const {
    getRawMaterials,
    getRawMaterialById,
    createRawMaterial,
    updateRawMaterial,
    getRecipes,
    getRecipeById,
    createRecipe,
    updateRecipe,
    importRecipesExcel,
    importOpeningStockExcel,
    getStockLedger,
    recordAdjustment,
    recordGRN,
    getPriceTrends,
    createProductionOrder,
    getProductionOrders,
    calculateMRP,
    getPerishableAlerts,
    createPurchaseOrder,
    getPurchaseOrders,
    createMaterialIssue,
    getMaterialIssues
} = require('../controllers/inventoryMrpController');

// Multer memory storage for direct in-memory Excel buffer parsing
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Raw Materials Endpoints
router.route('/raw-materials')
    .get(getRawMaterials)
    .post(createRawMaterial);

router.route('/raw-materials/:id')
    .get(getRawMaterialById)
    .put(updateRawMaterial);

router.get('/price-trends/:id', getPriceTrends);

// Recipes Endpoints
router.route('/recipes')
    .get(getRecipes)
    .post(createRecipe);

router.route('/recipes/:id')
    .get(getRecipeById)
    .put(updateRecipe);

// Excel Bulk Importers
router.post('/recipes/import-excel', upload.single('file'), importRecipesExcel);
router.post('/stock/import-opening', upload.single('file'), importOpeningStockExcel);

// Live Stock Ledger, GRN & Adjustments
router.get('/ledger', getStockLedger);
router.post('/ledger/adjust', recordAdjustment);
router.post('/grn', recordGRN);

// Production Orders
router.route('/production-orders')
    .get(getProductionOrders)
    .post(createProductionOrder);

// MRP & Perishable Alerts
router.get('/mrp/calculate', calculateMRP);
router.get('/perishable-alerts', getPerishableAlerts);

// Purchase Orders
router.route('/purchase-orders')
    .get(getPurchaseOrders)
    .post(createPurchaseOrder);

// Kitchen Material Issues
router.route('/material-issues')
    .get(getMaterialIssues)
    .post(createMaterialIssue);

module.exports = router;
