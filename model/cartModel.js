const mongoose = require("mongoose");
const Product = require("../model/productModel");
const Variant = require("../model/variantModel")
const cartSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    require: true,
  },
  items: [
    {
      ProductId: {
        type: mongoose.Schema.Types.ObjectId,
        ref:"Product"
      },
      variantId:{
        type: mongoose.Schema.Types.ObjectId,
        ref:"Variant",
     },
      quantity:{
        type:Number,
        required:true,
        default:1
      },
      total:{
        type:Number,
        require:true,
      }
    },
  ],
  totalPrice:{
    type:Number,
  }
});

const Cart = mongoose.model("Cart",cartSchema);
module.exports = Cart