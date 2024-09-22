const mongoose = require('mongoose');

const variantSchema = mongoose.Schema({
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true 
    },
    color: {
        type: String,
        required: true  
    },
    price: {
        type: Number,
        required: true 
    },
    stock: {
        type: Number,
        required: true  
    },
    images: {
        type: [String]
    },
    isDeleted:{
        type:Boolean,
        default:false,
        required:true
    }
});

const Variant = mongoose.model('Variant', variantSchema);

module.exports = Variant