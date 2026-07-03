const mongoose = require('mongoose');

const containerSchema = new mongoose.Schema({
       name:{
            type: String,
            required : true
        },
        list:[{
        buyerName:{
            type: String,
        },
        productName:{
            type: String,
        },
        pouch:{
            type: Number,
        },
        packSize:{
            type: Number,
        },
    }],
})

module.exports =  mongoose.model('Container',containerSchema)