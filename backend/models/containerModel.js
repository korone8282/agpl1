const mongoose = require('mongoose');

const containerSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    type: {
        type: String,
        enum: ['Export', 'Domestic'],
        default: 'Export',
    },
    priority: {
        type: Number,
        default: 1,
    },
    list: [{
        buyerName: {
            type: String,
        },
        productName: {
            type: String,
        },
        pouch: {
            type: Number,
        },
        packSize: {
            type: Number,
        },
    }],
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

module.exports =  mongoose.model('Container',containerSchema)