const Product = require('../../model/productModel');
const Cart = require('../../model/cartModel')
const Variant= require('../../model/variantModel');
const User = require("../../model/userModel");
const express = require('express');


const cart =async (req, res) => {
    try{
        const {variantId,productId} = req.query
        const user = await User.findOne({_id:req.session.userExist._id}); 
      const cart = await Cart.findOne({userId:user.id})
        const cartProduct = await Cart.findOne({ userId: user._id })
        .populate('items.ProductId')  
        .populate('items.variantId');
        
        res.render("users/cart", { user: req.session.userExist, cartProducts: cartProduct });
      
    }catch(error){
        console.log(error)
    }
  }



  const updateCart = async (req, res) => {
    const { Id } = req.params;
    const { quantity } = req.body;
    
    try {
        const cart = await Cart.findOne({ userId: req.session.userExist._id });
        if (!cart) {
            return res.json({ success: false, message: 'Cart not found' });
        }
    
        const itemIndex = cart.items.findIndex(item => item._id.toString() === Id);
        if (itemIndex === -1) {
            return res.json({ success: false, message: 'Item not found in cart' });
        }
        
        const product = await Product.findById(cart.items[itemIndex].ProductId); 
        const variant = await Variant.findById(cart.items[itemIndex].variantId); 

        if (quantity > variant.stock) {
            return res.json({ success: false, message: `Only ${variant.stock} items in stock for this variant` });
        }

        cart.items[itemIndex].quantity = quantity;

        const itemPrice = variant.offerPrice ? variant.offerPrice : variant.price;
        
        cart.items[itemIndex].total = itemPrice * quantity;

        cart.totalPrice = cart.items.reduce((total, item) => total + item.total, 0);

        const updatedCart = await cart.save();
        
        res.json({ success: true, message: 'Quantity updated successfully', cart: updatedCart });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'An error occurred while updating the cart.' });
    }
};




const cartDelete = async (req, res) => {
  const { Id } = req.params;

  try {
      const cart = await Cart.findOne({ userId: req.session.userExist._id });
      if (!cart) {
          return res.json({ success: false, message: 'Cart not found' });
      }

      const itemIndex = cart.items.findIndex(item => item._id.toString() === Id);

      if (itemIndex !== -1) {
          const itemTotal = cart.items[itemIndex].total;
          cart.totalPrice -= itemTotal; 

          cart.items.splice(itemIndex, 1);

          await cart.save();

          res.json({ success: true, message: 'Item deleted successfully', cart });
      } else {
          res.json({ success: false, message: 'Item not found' });
      }
  } catch (error) {
      console.error(error);
  }
};

const addToCart = async (req, res) => {
  try {
    console.log("pooda ")
    const { variantId, productId } = req.body;
    const user = await User.findOne({ _id: req.session.userExist._id });

    let cart = await Cart.findOne({ userId: user._id });
    const variant = await Variant.findOne({ _id: variantId, stock: { $gt: 0 } });

    if (!variant) {
      return res.json({ success: false, message: "Stock is unavailable" });
    }

    if (!cart) {
      cart = new Cart({
        userId: user._id,
        items: [],
        totalPrice: 0
      });
      await cart.save();
    }

    const itemExist = cart.items.some(item => item.variantId.toString() === variantId);

    // Calculate the prices
    const actualPrice = variant.price;
    const offerPrice = variant.offerPrice || actualPrice;
    const quantity = 1; // When adding a new item, default quantity is 1
    const total = quantity * offerPrice||quantity * actualPrice;
    const discount = (quantity * actualPrice) - total;

    if (!itemExist) {
      const product = await Product.findOne({ _id: productId });

      if (product) {
        // Update total cart price by adding this item's total
        cart.totalPrice += total;

        cart.items.push({
          variantId: variant._id,
          ProductId: product._id,
          quantity: quantity,
          actualPrice: actualPrice,
          offerPrice: offerPrice,
          discount: discount,
          total: total
        });

        await cart.save();

        // If the user's cart ID isn't set, update it
        if (!user.cartId) {
          await User.updateOne({ _id: user._id }, { cartId: cart._id });
        }

        return res.json({ success: true, message: 'Item added to cart successfully' });
      } else {
        return res.status(400).json({ success: false, message: 'Product not found' });
      }
    } else {
      // Update quantity and total price for the existing item in the cart
      const updatedCartItem = await Cart.updateOne(
        { userId: user._id, 'items.variantId': variantId },
        { 
          $inc: { 'items.$.quantity': 1 }, // Increment quantity by 1
          $set: {
            'items.$.total': total * (quantity + 1),
            'items.$.discount': discount * (quantity + 1)
          }
        }
      );

      cart.totalPrice += total;
      await cart.save();

      return res.json({ success: true, message: 'Item quantity updated in cart' });
    }
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

module.exports = {cart,updateCart,cartDelete,addToCart}