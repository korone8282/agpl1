const mongoose = require('mongoose');

const recipeIngredientSchema = new mongoose.Schema({
    rawMaterial: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'RawMaterial'
    },
    materialName: {
        type: String,
        required: true,
        trim: true
    },
    materialCode: {
        type: String,
        default: '',
        trim: true
    },
    edibleQuantity: {
        type: Number,
        required: true // Net edible weight per 1 nominal batch
    },
    unit: {
        type: String,
        default: 'kg',
        trim: true
    },
    lossFactor: {
        type: Number,
        default: 1.0 // Peeling/loss factor e.g. 100/85 = 1.176
    },
    storageType: {
        type: String,
        enum: ['Cold', 'Ambient'],
        default: 'Ambient'
    },
    notes: {
        type: String,
        default: ''
    }
});

const recipeSchema = new mongoose.Schema(
    {
        buyerName: {
            type: String,
            required: true,
            trim: true,
            default: 'General'
        },
        productName: {
            type: String,
            required: true,
            trim: true
        },
        productRef: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product'
        },
        nominalBatchYieldPouches: {
            type: Number,
            default: 250 // Standard pouches produced per 1 recipe batch (or derived from cooked weight / pack size)
        },
        batchCookedWeightKg: {
            type: Number,
            default: 0 // Batch cooked weight / Total yield in kg (supports decimals)
        },
        packSizes: {
            type: [Number], // Available pack sizes in kg (e.g. [0.16, 0.2, 0.25])
            default: []
        },
        ingredients: [recipeIngredientSchema],
        version: {
            type: Number,
            default: 1
        },
        isActive: {
            type: Boolean,
            default: true
        }
    },
    {
        timestamps: true
    }
);

recipeSchema.index({ buyerName: 1, productName: 1 }, { unique: true });

module.exports = mongoose.model('Recipe', recipeSchema);
