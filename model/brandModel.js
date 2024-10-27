const mongoose = require('mongoose');

const brandSchema = new mongoose.Schema({
    brandName: {
        type: String,
        required: true
    },
    isDeleted: {
        type: Boolean,
        default: false,
        required: true
    },
    boughtCount:{
        type: Number,
        default: 0 
    }
});

const Brand = mongoose.model('Brand', brandSchema);

module.exports = Brand;
