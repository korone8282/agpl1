const mongoose = require('mongoose');

const productionOrderItemSchema = new mongoose.Schema({
    recipe: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Recipe'
    },
    productName: {
        type: String,
        required: true,
        trim: true
    },
    targetPouches: {
        type: Number,
        required: true
    },
    nominalYield: {
        type: Number,
        required: true,
        default: 250
    },
    batches: {
        type: Number,
        required: true // targetPouches / nominalYield
    }
});

const productionOrderSchema = new mongoose.Schema(
    {
        orderNumber: {
            type: String,
            required: true,
            unique: true,
            trim: true
        },
        buyerName: {
            type: String,
            default: '',
            trim: true
        },
        buyerOrderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'BuyerOrder'
        },
        productionDate: {
            type: Date,
            required: true
        },
        priority: {
            type: String,
            enum: ['NORMAL', 'URGENT'],
            default: 'NORMAL'
        },
        items: [productionOrderItemSchema],
        status: {
            type: String,
            enum: ['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
            default: 'PLANNED'
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

module.exports = mongoose.model('ProductionOrder', productionOrderSchema);
