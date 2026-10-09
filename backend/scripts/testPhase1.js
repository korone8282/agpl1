const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

// Import controllers
const {
    importRecipesExcel,
    importOpeningStockExcel
} = require('../controllers/inventoryMrpController');

async function runTest() {
    console.log('--- Testing Phase 1: Excel Parsers ---');

    // 1. Test Recipe Master Excel Parsing
    const recipeFilePath = path.join(__dirname, '../../templates/Recipes_Master_Template.xlsx');
    const recipeBuffer = fs.readFileSync(recipeFilePath);

    const mockReqRecipe = {
        file: { buffer: recipeBuffer },
        body: { preview: 'true' }
    };

    let recipeResult = null;
    const mockResRecipe = {
        status: (code) => ({
            json: (data) => {
                recipeResult = { code, data };
                return data;
            }
        })
    };

    await importRecipesExcel(mockReqRecipe, mockResRecipe);

    console.log('Recipe Parse Status Code:', recipeResult.code);
    console.log('Total Recipes Found:', recipeResult.data.parsedCount);
    console.log('Recipes Parsed:');
    recipeResult.data.recipes.forEach(r => {
        console.log(`- ${r.productName} (Yield: ${r.nominalBatchYieldPouches} pouches, Ingredients: ${r.ingredientCount})`);
        r.ingredients.forEach(ing => {
            console.log(`    * ${ing.materialName}: ${ing.edibleQuantity} ${ing.unit} (Loss factor: ${ing.lossFactor}, Storage: ${ing.storageType})`);
        });
    });

    // 2. Test Opening Stock Excel Parsing
    const stockFilePath = path.join(__dirname, '../../templates/Opening_Stock_Template.xlsx');
    const stockBuffer = fs.readFileSync(stockFilePath);

    const mockReqStock = {
        file: { buffer: stockBuffer },
        body: { preview: 'true' }
    };

    let stockResult = null;
    const mockResStock = {
        status: (code) => ({
            json: (data) => {
                stockResult = { code, data };
                return data;
            }
        })
    };

    await importOpeningStockExcel(mockReqStock, mockResStock);

    console.log('\nOpening Stock Parse Status Code:', stockResult.code);
    console.log('Total Opening Stock Items Found:', stockResult.data.count);
    stockResult.data.data.forEach(item => {
        console.log(`- ${item.name} (${item.storageType}): ${item.openingStock} ${item.unit} @ ₹${item.rate}/${item.unit}, Expiry: ${item.expiryDate ? item.expiryDate.toISOString().split('T')[0] : 'N/A'}, Safety: ${item.minSafetyStock}, Bag: ${item.packSize}`);
    });

    console.log('\n--- Phase 1 Parser Verification Successful! ---');
}

runTest().catch(console.error);
