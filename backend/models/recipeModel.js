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
        productName: {
            type: String,
            required: true,
            unique: true,
            trim: true
        },
        productRef: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product'
        },
        nominalBatchYieldPouches: {
            type: Number,
            required: true,
            default: 250 // Standard pouches produced per 1 recipe batch
        },
        batchCookedWeightKg: {
            type: Number,
            default: 0
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

module.exports = mongoose.model('Recipe', recipeSchema);
