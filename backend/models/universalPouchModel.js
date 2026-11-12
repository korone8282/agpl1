const mongoose = require('mongoose');

const universalPouchSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    packSize: {
        type: String,
        required: true,
        trim: true
    },
    buyer: {
        type: String,
        default: '',
        trim: true
    },
    pouches: [{
        month: {
            type: String,
            required: true
        },
        stock: {
            type: Number,
            default: 0
        },
        remain: {
            type: Number,
            default: 0
        },
        entries: [{
            date: {
                type: String
            },
            quantity: {
                type: Number,
                default: 0
            }
        }]
    }],
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Create 12 months placeholder array helper
universalPouchSchema.statics.createDefaultMonths = function () {
    const list = [];
    for (let i = 1; i <= 12; i++) {
        list.push({
            month: String(i),
            stock: 0,
            remain: 0,
            entries: []
        });
    }
    return list;
};

module.exports = mongoose.model('UniversalPouch', universalPouchSchema);
