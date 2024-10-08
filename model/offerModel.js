const mongoose = require('mongoose')

const offerSchema = mongoose.SchemaTypes({
    offerName:{
        type:String,
        required:true
    },
    offerPercentage:{
        type:String,
        required:true
    },
    startDate:{
        type:Date,
        required:true
    },
    endDate:{
        type:Date,
        required:true,
    },
    isDeleted:{
        type:Boolean,
        default:false
    },
    categoryId:{
        type:mongoose.Schema.Types.ObjectId
    },
    brandId:{
        type:mongoose.Schema.Types.ObjectId
    }
});

const Offer = mongoose.model("offer",offerSchema)

module.exports=offerSchema