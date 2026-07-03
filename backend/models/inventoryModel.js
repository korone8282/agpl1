const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
    pDate:{
        type: Date,
    },
    name:{
        type: String,
        required : true,
    },
    unit:{
        type: String,
    },
    stock:{
        type: Number,
    },
    rate:{
        type: Number,
    },
    quant:{
        type: Number,
    },
    equipment:{
        type: String,
    },
    section:{
        type: String,
    },
    lDate:{
        type: Date,
    },
})

module.exports = mongoose.model('Inventory',inventorySchema);