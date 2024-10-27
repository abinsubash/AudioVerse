const mongoose = require('mongoose');

// Define the offer schema
const offerSchema = new mongoose.Schema({
    offerName: {
        type: String,
        required: true
    },
    offerPercentage: {
        type: String,
        required: true
    },
    startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date,
        required: true,
        index: { expires: '0s' } 
    },
    categoryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref:"Category"
    },
    brandId: {
        type: mongoose.Schema.Types.ObjectId,
        ref:"Brand"
    },
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref:"Product"
    },
    
});

const Offer = mongoose.model('Offer', offerSchema);

module.exports = Offer;
