const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
    pDate:{
        type: Date,
    },
    name:{
        type: String,
    },
    unit:{
        type: String,
    },
    count:{
        type: Number,
    },
    rate:{
        type: Number,
    },
    equipment:{
        type: String,
    },
    section:{
        type: String,
    },
})

module.exports = mongoose.model('Report',reportSchema);