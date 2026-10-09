const mongoose = require('mongoose');

const stockLedgerSchema = new mongoose.Schema(
    {
        rawMaterial: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'RawMaterial',
            required: true
        },
        materialName: {
            type: String,
            required: true,
            trim: true
        },
        transactionType: {
            type: String,
            enum: ['OPENING', 'GRN', 'KITCHEN_ISSUE', 'ADJUSTMENT', 'WRITE_OFF'],
            required: true
        },
        quantity: {
            type: Number,
            required: true // Positive for additions (IN), negative for deductions (OUT)
        },
        balanceAfter: {
            type: Number,
            required: true
        },
        unit: {
            type: String,
            default: 'kg'
        },
        rate: {
            type: Number,
            default: 0 // INR per unit
        },
        totalAmount: {
            type: Number,
            default: 0
        },
        grnNumber: {
            type: String,
            default: '',
            trim: true
        },
        lotNumber: {
            type: String,
            default: '',
            trim: true
        },
        expiryDate: {
            type: Date
        },
        storageType: {
            type: String,
            enum: ['Cold', 'Ambient']
        },
        referenceId: {
            type: String,
            default: '' // PO id, issue id, or reason tag
        },
        reason: {
            type: String,
            default: ''
        },
        createdBy: {
            type: String,
            default: 'System'
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model('StockLedger', stockLedgerSchema);
