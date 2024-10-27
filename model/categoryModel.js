const mongoose = require('mongoose');

const categorySchema = mongoose.Schema({
    categoryName: {
        type: String,
        required: true
    },
    isDeleted: {
        type: Boolean,
        default: false,
        required: true
    },
    offerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Offer',  
    },
    boughtCount:{
        type: Number,
        default: 0 
    }
},{
    timestamps: true
});


const Category = mongoose.model('Category',categorySchema);
module.exports= Category;