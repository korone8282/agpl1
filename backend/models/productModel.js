const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    buyer:{
        type: String,
        required : true,
    },
    name:{
        type: String,
        required : true,
    },
    pouches:[{
        month:{
            type: String,
            required : true
        },
        stock:{
            type: Number,
            default: 0,
        },
        remain:{
            type: Number,
            default: 0,
        },
    }],
    dispatched:[{
        month:{
            type: String,
            required : true
        },
        dispatch:{
            type: Number,
            default: 0,
        },
        balance:{
            type: Number,
            default: 0,
        },
    }],
    createdAt: {
        type: Date,
        default: Date.now(),
    },
})

module.exports = mongoose.model('Product',productSchema); 