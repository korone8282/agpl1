const mongoose = require('mongoose');

const kitchenBatchItemSchema = new mongoose.Schema({
    batchCode: {
        type: String,
        required: true,
        trim: true
    },
    shift: {
        type: String,
        enum: ['Day', 'Night', 'General'],
        default: 'Day'
    },
    pouchesFilled: {
        type: Number,
        required: true,
        default: 0
    },
    packSizeG: {
        type: Number,
        required: true,
        default: 250 // Base nominal pack size in grams (e.g. 250g)
    },
    extraWeightG: {
        type: Number,
        default: 0 // x: extra fill weight in grams (e.g. +8g -> 258g)
    },
    actualPouchWeightKg: {
        type: Number,
        required: true,
        default: 0.250 // (packSizeG + extraWeightG) / 1000
    },
    filledWeightKg: {
        type: Number,
        required: true,
        default: 0 // pouchesFilled * actualPouchWeightKg
    },
    wastageKg: {
        type: Number,
        default: 0 // Spillage / burnt residue / retort loss in kg
    },
    batchYieldKg: {
        type: Number,
        required: true,
        default: 0 // filledWeightKg + wastageKg
    }
});

const kitchenVarianceSchema = new mongoose.Schema(
    {
        issueNumber: {
            type: String,
            default: '',
            trim: true
        },
        buyerName: {
            type: String,
            default: '',
            trim: true
        },
        productName: {
            type: String,
            required: true,
            trim: true
        },
        productionDate: {
            type: Date,
            default: Date.now
        },
        batchNumber: {
            type: String,
            default: '',
            trim: true
        },
        shift: {
            type: String,
            enum: ['Day', 'Night', 'General', 'Mixed'],
            default: 'Day'
        },
        issuedQuantityKg: {
            type: Number,
            required: true // Total raw materials issued in kitchen from store issue (kg)
        },
        batches: [kitchenBatchItemSchema],
        totalFilledPouches: {
            type: Number,
            default: 0
        },
        totalFilledWeightKg: {
            type: Number,
            default: 0
        },
        totalWastageKg: {
            type: Number,
            default: 0
        },
        totalYieldKg: {
            type: Number,
            required: true // Total Accounted Final Yield (kg): sum of filledWeightKg + wastageKg across all batches
        },
        theoreticalGrossKg: {
            type: Number,
            default: 0 // Calculated from BOM for the total yield
        },
        varianceKg: {
            type: Number,
            required: true // totalYieldKg - issuedQuantityKg
        },
        variancePercent: {
            type: Number,
            required: true // (varianceKg / issuedQuantityKg) * 100
        },
        ingredientBreakdown: [
            {
                materialName: { type: String, required: true },
                actualIssuedQty: { type: Number, default: 0 },
                theoreticalGrossQty: { type: Number, default: 0 },
                varianceQty: { type: Number, default: 0 },
                unit: { type: String, default: 'kg' }
            }
        ],
        supervisor: {
            type: String,
            default: 'Kitchen Supervisor',
            trim: true
        },
        notes: {
            type: String,
            default: '',
            trim: true
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model('KitchenVariance', kitchenVarianceSchema);
