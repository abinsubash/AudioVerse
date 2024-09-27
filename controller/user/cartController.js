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
        console.log(cart)
        
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
          res.json({success:false,message:`Only ${variant.stock} items in stock for this variant`});
          return
        }
        const itemPrice = variant.price
        cart.items[itemIndex].quantity = quantity;

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
      const { variantId, productId } = req.body; 
      const user = await User.findOne({ _id: req.session.userExist._id });
  
      let cart = await Cart.findOne({ userId: user._id });
      const variant = await Variant.findOne({ _id: variantId });
      if (!cart) {
        cart = new Cart({
          userId: user._id,
          items: [],
          totalPrice:variant.price
        });
        await cart.save();
      }
  
      const itemExist =cart.items.some(item => item.variantId.toString() === variantId);
  
      if (!itemExist) {
        // Fetch product and variant details
        const product = await Product.findOne({ _id: productId });
        cart.totalPrice =cart.totalPrice+ variant.price
        if (product && variant) {
          // Add new item to cart
          cart.items.push({
            variantId: variant._id,
            ProductId: product._id,
            quantity: 1,
            total:variant.price
          });
  
          await cart.save();
  
          // If the user's cart ID isn't set, update it
          if (!user.cartId) {
            await User.updateOne({ _id: user._id }, { cartId: cart._id });
          }
          
          return res.json({ success: true, message: 'Item added to cart successfully' });
        } else {
          return res.status(400).json({ success: false, message: 'Product or variant not found' });
        }
      } else {
        await Cart.updateOne(
          { userId: user._id, 'items.variantId': variantId },
          { $inc: { 'items.$.quantity': 1 } }  
        );
  
        return res.json({ success: true, message: 'Item quantity updated in cart' });
      }
    } catch (error) {
      console.log(error);
      return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  };
  
module.exports = {cart,updateCart,cartDelete,addToCart}