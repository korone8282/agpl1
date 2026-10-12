const mongoose = require('mongoose');

const materialOrderSchema = new mongoose.Schema(
    {
        rawMaterial: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'RawMaterial'
        },
        materialName: {
            type: String,
            required: true,
            trim: true
        },
        orderQty: {
            type: Number,
            required: true
        },
        orderDate: {
            type: Date,
            default: Date.now
        },
        unit: {
            type: String,
            default: 'kg'
        },
        vendor: {
            type: String,
            default: ''
        },
        notes: {
            type: String,
            default: ''
        },
        status: {
            type: String,
            enum: ['ORDERED', 'RECEIVED', 'CANCELLED'],
            default: 'ORDERED'
        }
    },
    {
        timestamps: true
    }
);

// Index for fast material lookups sorted by orderDate descending
materialOrderSchema.index({ materialName: 1, orderDate: -1 });

module.exports = mongoose.model('MaterialOrder', materialOrderSchema);
