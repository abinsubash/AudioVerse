const mongoose = require("mongoose");
const Product = require("../model/productModel");
const Variant = require("../model/variantModel")
const cartSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  items: [
    {
      ProductId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
      },
      variantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Variant",
      },
      quantity: {
        type: Number,
        required: true,
        default: 1,
      },
      actualPrice: {
        type: Number,  
        required: true,
      },
      offerPrice: {
        type: Number, 
        required: false, 
      },
      discount: {
        type: Number,  
        required: false,
      },
      total: {
        type: Number,  
        required: true,
      }
    },
  ],
  totalPrice: {
    type: Number, 
    required: true,
  },
  totalDiscount:{
    type:Number
  }
});


const Cart = mongoose.model("Cart",cartSchema);
module.exports = Cart