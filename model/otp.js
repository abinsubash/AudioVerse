const mongoose = require('mongoose')

const otpSchema =new mongoose.Schema({
    email:{
        type:String,
        require:true
    },
    otp:{
        type:String,
        require:true
    },
    cratedAt:{
        type:Date,
        default:Date.now,
        expires:30

    }
});

otpSchema.index({createdAt:1},{expireAfterSeconds:30})
const OTP = mongoose.model('OTP',otpSchema)
module.exports = OTP;