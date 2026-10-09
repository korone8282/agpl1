// Unit and Business Logic Verification for MRP & GRN Engine
const assert = require('assert');

function calculatePouchBatches(targetPouches, nominalBatchYield) {
    return parseFloat((targetPouches / nominalBatchYield).toFixed(4));
}

function calculateGrossRequired(edibleQty, unit, lossFactor, batches) {
    let unitMultiplier = 1;
    if (unit === 'g' || unit === 'gm') unitMultiplier = 0.001;
    if (unit === 'ml') unitMultiplier = 0.001;
    return parseFloat((edibleQty * unitMultiplier * (lossFactor || 1.0) * batches).toFixed(3));
}

function calculateShortfall(totalGrossRequired, minSafetyStock, currentStock, incomingPipelineQty) {
    const available = currentStock + incomingPipelineQty;
    const threshold = totalGrossRequired + minSafetyStock;
    return Math.max(0, parseFloat((threshold - available).toFixed(3)));
}

function calculateCommercialOrderQty(shortfall, packSize) {
    if (shortfall <= 0) return { bagCount: 0, orderQty: 0 };
    if (packSize > 1) {
        const bagCount = Math.ceil(shortfall / packSize);
        return { bagCount, orderQty: bagCount * packSize };
    }
    const orderQty = Math.ceil(shortfall);
    return { bagCount: orderQty, orderQty };
}

function calculateOrderByDate(productionDate, leadTimeDays) {
    const prodDate = new Date(productionDate);
    return new Date(prodDate.getTime() - (leadTimeDays * 86400000));
}

function calculateVariance(theoreticalGrossQty, actualIssuedQty) {
    const varianceQty = parseFloat((actualIssuedQty - theoreticalGrossQty).toFixed(3));
    const variancePercent = theoreticalGrossQty > 0 ? parseFloat(((varianceQty / theoreticalGrossQty) * 100).toFixed(2)) : 0;
    return { varianceQty, variancePercent };
}

console.log('--- Testing MRP & Inventory Mathematical Engine ---');

// Test 1: Decimal Batches
const batches = calculatePouchBatches(600, 250);
console.log('Test 1 (Batch Scaling): 600 pouches / 250 nominal yield =', batches, 'batches');
assert.strictEqual(batches, 2.4, 'Batches must be 2.4');

// Test 2: Peeling / Loss Factor on Onions (100/85 = 1.176)
// 25 kg edible onions per batch * 1.176 factor * 2.4 batches = 70.56 kg gross
const grossOnions = calculateGrossRequired(25, 'kg', 1.176, batches);
console.log('Test 2 (Loss Factor Gross): 25 kg * 1.176 factor * 2.4 batches =', grossOnions, 'kg');
assert(Math.abs(grossOnions - 70.56) < 0.01, 'Gross onions should be ~70.56 kg');

// Test 3: Gram to Kg conversion (Kasturi Methi 200g in Paneer Butter Masala)
const grossMethi = calculateGrossRequired(200, 'g', 1.0, 2.4);
console.log('Test 3 (Unit Conversion): 200 g * 1.0 * 2.4 batches =', grossMethi, 'kg');
assert.strictEqual(grossMethi, 0.48, 'Gross methi should be 0.48 kg');

// Test 4: Shortfall with Safety Stock and Current Inventory
// Required: 70.56 kg, Safety Stock: 50 kg, Current: 40 kg, Pipeline: 0 kg
// Threshold: 120.56 kg. Shortfall = 120.56 - 40 = 80.56 kg
const shortfall = calculateShortfall(grossOnions, 50, 40, 0);
console.log('Test 4 (Shortfall): Gross 70.56 + Safety 50 - Current 40 =', shortfall, 'kg');
assert(Math.abs(shortfall - 80.56) < 0.01, 'Shortfall should be ~80.56 kg');

// Test 5: Commercial Pack Size Rounding (50 kg onion bags)
// Shortfall 80.56 kg -> 2 bags (100 kg)
const commercialOrder = calculateCommercialOrderQty(shortfall, 50);
console.log('Test 5 (Bag Rounding): Shortfall 80.56 kg with 50 kg bags =', commercialOrder.bagCount, 'bags =', commercialOrder.orderQty, 'kg');
assert.strictEqual(commercialOrder.bagCount, 2, 'Should recommend 2 bags');
assert.strictEqual(commercialOrder.orderQty, 100, 'Should order 100 kg');

// Test 6: Perishable Lead Time Order-By Alert
const prodDate = new Date('2026-10-12T00:00:00Z');
const orderByDate = calculateOrderByDate(prodDate, 2);
console.log('Test 6 (Lead Time Order-By): Prod Date 2026-10-12 - 2 days =', orderByDate.toISOString().split('T')[0]);
assert.strictEqual(orderByDate.toISOString().split('T')[0], '2026-10-10');

// Test 7: Kitchen Variance Tracking
// Planned 70.56 kg gross, actual issued 72.0 kg
const variance = calculateVariance(70.56, 72.0);
console.log('Test 7 (Kitchen Variance): Planned 70.56 kg vs Actual 72.0 kg = +', variance.varianceQty, 'kg (', variance.variancePercent, '%)');
assert(variance.varianceQty > 0 && variance.variancePercent > 0);

console.log('\n--- All 7 Business Logic & Mathematical Rules Verified 100% Successfully! ---');
