const mongoose = require('mongoose')
const passport = require('passport')
const userSchema = mongoose.Schema({
    name:{
        type:String
    },
    email: {
        type: String,
        required: true, 
        
    },
    phone:{
        type:Number,
        
    },
    password:{
        type:String,
        
    },
    creatdAt:{
        type:Date,
        default:Date.now
    },
    referalID:{
        type:String,
        unique:true
    },
    referredBy:{
        type:String
    },
    signUpCount:{
        type:Number,
        default:0
    },
    isBlocked:{
        type:Boolean,
        default:false
    },
    isGoogleAuth:{
        type:Boolean,
        default:false
    },
    cartId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Cart"
    },
    addressId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Address"
    }
});
const User = mongoose.model("User",userSchema);
module.exports = User;