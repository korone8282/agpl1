const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    fname:{
        type: String,
        required : true,
    },
    email:{
        type: String,
        required : true,
        unique:true
    },
    password:{
        type: String,
        required:true,
    },
    confirmPassword:{
        type: String,
    },
    image:{
        type:String,
    },
    dob:{
        type: Date,
    },
    gender:{
        type:String,
    },
    about:{
        type:String,
    },
    isAdmin:{
        type:Boolean,
        required:true,
        default:false,
    }
},
{timestamps:true})

module.exports =  mongoose.model('User',userSchema);

