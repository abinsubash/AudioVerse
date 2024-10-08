const mongoose = require('mongoose');

const walletSchema = mongoose.Schema({
    userId:{
        type:mongoose.Schema.Types.ObjectId,
        required:true,
        ref:"User"
    },
    balance:{
        type:Number,
        required:true,
        default:0
    },
    history:[{
        date:{
            type:Date,
            default:Date.now()
        },
        amount:{
            type:Number,
        },
        transactionType:{
            type:String
        },
        newBalance:{
            type:Number
        }
    }]
});

const Wallet = mongoose.model("Wallet",walletSchema);

module.exports = Wallet