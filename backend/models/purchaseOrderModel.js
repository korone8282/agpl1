const mongoose = require('mongoose');

const purchaseOrderItemSchema = new mongoose.Schema({
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
        default: ''
    },
    storageType: {
        type: String,
        enum: ['Cold', 'Ambient'],
        default: 'Ambient'
    },
    requiredNetQty: {
        type: Number,
        required: true
    },
    packSize: {
        type: Number,
        default: 1
    },
    orderQty: {
        type: Number,
        required: true // Rounded to commercial pack size
    },
    unit: {
        type: String,
        default: 'kg'
    },
    estimatedRate: {
        type: Number,
        default: 0
    },
    actualRate: {
        type: Number,
        default: 0
    },
    receivedQty: {
        type: Number,
        default: 0
    },
    status: {
        type: String,
        enum: ['PENDING', 'PARTIAL', 'RECEIVED'],
        default: 'PENDING'
    }
});

const purchaseOrderSchema = new mongoose.Schema(
    {
        poNumber: {
            type: String,
            required: true,
            unique: true,
            trim: true
        },
        orderDate: {
            type: Date,
            default: Date.now
        },
        expectedDeliveryDate: {
            type: Date
        },
        supplier: {
            type: String,
            default: ''
        },
        items: [purchaseOrderItemSchema],
        status: {
            type: String,
            enum: ['DRAFT', 'SENT', 'RECEIVED', 'CANCELLED'],
            default: 'DRAFT'
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

module.exports = mongoose.model('PurchaseOrder', purchaseOrderSchema);
