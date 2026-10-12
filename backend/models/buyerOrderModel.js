const mongoose = require('mongoose');

const buyerOrderItemSchema = new mongoose.Schema({
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
    packSize: {
        type: Number,
        default: 1
    },
    notes: {
        type: String,
        default: ''
    }
});

const buyerOrderSchema = new mongoose.Schema(
    {
        orderNumber: {
            type: String,
            required: true,
            unique: true,
            trim: true
        },
        buyerName: {
            type: String,
            required: true,
            trim: true
        },
        orderDate: {
            type: Date,
            default: Date.now
        },
        deliveryDate: {
            type: Date
        },
        items: [buyerOrderItemSchema],
        status: {
            type: String,
            enum: ['PENDING', 'SCHEDULED', 'IN_PRODUCTION', 'COMPLETED', 'CANCELLED'],
            default: 'PENDING'
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

module.exports = mongoose.model('BuyerOrder', buyerOrderSchema);
