const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
    couponName: {
        type: String,
        required: true,
        unique: true 
    },
    couponPercentage: {
        type: Number,
        required: true,
    },
    minPurchase: {
        type: Number,
        required: true
    },
    addedDate: {
        type: Date,
    },
    expiryDate: {
        type: Date,
        required: true
    },
    user: [{
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        isBought: {
            type: Boolean,
            default: false
        }
    }]
});
const Coupon = mongoose.model('Coupon', couponSchema);
module.exports = Coupon
