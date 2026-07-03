const mongoose = require('mongoose');

const goalSchema = new mongoose.Schema({
       buyerName:{
            type: String,
            required:true,
        },
        fname:{
            type: String,
            required:true,
        },
        batchNum:{
            type: String,
            required:true,
        },
        pouchSize:{
            type: Number,
            required:true,
        },
        pouchGoal:{
            type: Number,
            required:true,
        },
        pouchPacked:{
            type: Number,
            default:0,
        },
        day:{ 
            type: String,
            required:true,
        },
        date: {
            type: Date
        },
        createdAt: {
            type: Date,
        },
})

module.exports =  mongoose.model('Goal',goalSchema);

