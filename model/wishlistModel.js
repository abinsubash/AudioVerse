const mongoose = require("mongoose");

const wishlistSchema = mongoose.Schema({
  userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true 
  },
  items: [
          {
          productId: { 
              type: mongoose.Schema.Types.ObjectId,
              ref: "Product",
              required: true 
          },
          variantId: {
              type: mongoose.Schema.Types.ObjectId,
              ref: "Variant",
              required: true 
          },
      },
  ],
  createdAt: {
      type: Date,
      default: Date.now,
      required: true 
  }
});

const Wishlist =mongoose.model('Wishlist',wishlistSchema);

module.exports =Wishlist