const mongoose = require('mongoose');

const dispatchSchema = new mongoose.Schema({
    buyerName:{
        type: String,
        required:true,
    },
    productName:{
        type: String,
        required:true,
    },
    pouchDispatched:{
        type: Number,
        required:true,
    },
    box:{
        type: Number,
        required:true,
    },
    lDate:{
        type: Date,
        required:true,
    },
})

module.exports = mongoose.model('Dispatch',dispatchSchema);