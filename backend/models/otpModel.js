const mongoose = require('mongoose');
const mailSender = require('../utils/nodeMailer');

const otpSchema = new mongoose.Schema({
    email:{
        type: String,
        required : true
    },
    otp:{
        type: String,
        required:true,
    },
    createdAt: {
        type: Date,
        default: Date.now(),
        expires: 5*60*1000,
    },
})

async function sendMail(email,otp){
try {
    await mailSender(email,"Otp Verfication Email",otp);
} catch (error) {
    console.log("error while sending mail",error);
    throw new error;
}
}

otpSchema.pre("save", async function(){
    await sendMail(this.email,this.otp);
});



module.exports =  mongoose.model('OtpModel',otpSchema)