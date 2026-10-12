const mongoose = require('mongoose');

const materialIssueItemSchema = new mongoose.Schema({
    rawMaterial: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'RawMaterial'
    },
    materialName: {
        type: String,
        required: true,
        trim: true
    },
    openingStock: {
        type: Number,
        default: 0
    },
    closingStock: {
        type: Number,
        default: 0
    },
    theoreticalEdibleQty: {
        type: Number,
        required: true
    },
    lossFactor: {
        type: Number,
        default: 1.0
    },
    theoreticalGrossQty: {
        type: Number,
        required: true // theoreticalEdibleQty * lossFactor * batches
    },
    actualIssuedQty: {
        type: Number,
        required: true
    },
    unit: {
        type: String,
        default: 'kg'
    },
    lotsUsed: [
        {
            ledgerId: { type: mongoose.Schema.Types.ObjectId, ref: 'StockLedger' },
            lotNumber: { type: String, default: '' },
            quantity: { type: Number, required: true },
            rate: { type: Number, default: 0 },
            expiryDate: { type: Date }
        }
    ],
    varianceQty: {
        type: Number,
        default: 0 // actualIssuedQty - theoreticalGrossQty
    },
    variancePercent: {
        type: Number,
        default: 0 // (varianceQty / theoreticalGrossQty) * 100
    }
});

const materialIssueSchema = new mongoose.Schema(
    {
        issueNumber: {
            type: String,
            required: true,
            unique: true,
            trim: true
        },
        productionOrder: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'ProductionOrder'
        },
        batches: {
            type: Number,
            default: 1
        },
        buyerName: {
            type: String,
            default: '',
            trim: true
        },
        productName: {
            type: String,
            default: '',
            trim: true
        },
        totalIssuedKg: {
            type: Number,
            default: 0
        },
        issueDate: {
            type: Date,
            default: Date.now
        },
        kitchenSupervisor: {
            type: String,
            default: ''
        },
        items: [materialIssueItemSchema],
        status: {
            type: String,
            enum: ['ISSUED', 'RETURNED'],
            default: 'ISSUED'
        },
        notes: {
            type: String,
            default: ''
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model('MaterialIssue', materialIssueSchema);
