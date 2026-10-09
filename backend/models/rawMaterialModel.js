const mongoose = require('mongoose');

const rawMaterialSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            unique: true,
            trim: true
        },
        code: {
            type: String,
            trim: true,
            uppercase: true,
            default: ''
        },
        storageType: {
            type: String,
            enum: ['Cold', 'Ambient'],
            default: 'Ambient'
        },
        baseUnit: {
            type: String,
            default: 'kg',
            trim: true
        },
        currentStock: {
            type: Number,
            default: 0
        },
        minSafetyStock: {
            type: Number,
            default: 0
        },
        leadTimeDays: {
            type: Number,
            default: 1
        },
        packSize: {
            type: Number,
            default: 1 // Commercial packaging size (e.g. 25 kg bag, 15 L tin)
        },
        preferredSupplier: {
            type: String,
            default: ''
        },
        lastPurchaseRate: {
            type: Number,
            default: 0 // INR per baseUnit
        },
        averagePurchaseRate: {
            type: Number,
            default: 0
        },
        priceHistory: [
            {
                date: { type: Date, default: Date.now },
                rate: { type: Number, required: true },
                grnNumber: { type: String, default: '' },
                vendor: { type: String, default: '' }
            }
        ],
        isActive: {
            type: Boolean,
            default: true
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model('RawMaterial', rawMaterialSchema);
