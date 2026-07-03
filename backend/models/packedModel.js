const mongoose = require('mongoose');

const packedSchema = new mongoose.Schema({
    buyerName:{
        type: String,
        required:true,
    },
    productName:{
        type: String,
        required:true,
    },
    batch:{
        type: String,
        required:true,
    },
    packSize:{
        type: Number,
        required:true,
    },
    pouchPacked:{
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

module.exports = mongoose.model('Packed',packedSchema);