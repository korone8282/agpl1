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
    updateGRN,
    deleteGRN,
    getPriceTrends,
    createProductionOrder,
    getProductionOrders,
    updateProductionOrder,
    deleteProductionOrder,
    calculateMRP,
    getPerishableAlerts,
    createPurchaseOrder,
    getPurchaseOrders,
    createMaterialIssue,
    getMaterialIssues,
    deleteMaterialIssue,
    createKitchenVariance,
    getKitchenVariances,
    lookupFillingData,
    createBuyerOrder,
    getBuyerOrders,
    updateBuyerOrder,
    deleteBuyerOrder,
    getMaterialOrders,
    createMaterialOrderBatch,
    deleteMaterialOrderBatch,
    clearMaterialOrders
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
router.put('/grn/:id', updateGRN);
router.delete('/grn/:id', deleteGRN);

// Production Orders
router.route('/production-orders')
    .get(getProductionOrders)
    .post(createProductionOrder);

router.route('/production-orders/:id')
    .put(updateProductionOrder)
    .delete(deleteProductionOrder);

// Complete Master Buyer Orders
router.route('/buyer-orders')
    .get(getBuyerOrders)
    .post(createBuyerOrder);

router.route('/buyer-orders/:id')
    .put(updateBuyerOrder)
    .delete(deleteBuyerOrder);

// Material Order Batches (Incoming PO Batches)
router.route('/material-orders')
    .get(getMaterialOrders)
    .post(createMaterialOrderBatch);

router.delete('/material-orders/:id', deleteMaterialOrderBatch);
router.post('/material-orders/clear', clearMaterialOrders);

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

router.delete('/material-issues/:id', deleteMaterialIssue);

// Kitchen Variance Tracker
router.route('/kitchen-variance')
    .get(getKitchenVariances)
    .post(createKitchenVariance);

router.get('/filling-lookup', lookupFillingData);

module.exports = router;
