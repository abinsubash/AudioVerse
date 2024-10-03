const Product = require("../../model/productModel");
const Cart = require("../../model/cartModel");
const Variant = require("../../model/variantModel");
const User = require("../../model/userModel");
const Address = require("../../model/addressModel");
const Order = require("../../model/orderModel");
const express = require("express");

const checkoutPge = async (req, res) => {
  const cart = await Cart.findOne({ userId: req.session.userExist._id })
    .populate("items.ProductId")
    .populate("items.variantId");

  const address = await Address.findOne({ userId: req.session.userExist._id });

  res.render("users/checkout", {
    user: req.session.userExist,
    cart: cart,
    address: address,
  });
};

const toCheckout = async (req, res) => {
  try {
    const cart = await Cart.findOne({ userId: req.session.userExist._id });

    if (!cart || cart.items.length === 0) {
      return res.json({ success: false, message: "Your cart is empty." });
    }

    let currentQuantity = true;
    let ProductName;
    let color;

    for (const item of cart.items) {
      const variant = await Variant.findOne({ _id: item.variantId.toString() });

      if (!variant || variant.stock < item.quantity) {
        currentQuantity = false;
        color = variant.color;
        const product = await Product.findOne({
          _id: item.ProductId.toString(),
        });
        ProductName = product ? product.productName : "Unknown Product";
        break; 
      }
    }

    if (!currentQuantity) {
      return res.json({
        success: false,
        message: `${ProductName} (${color}) is out of stock or insufficient quantity.`,
      });
    }

    // Proceed to checkout if everything is in stock
    return res.json({
      success: true,
      message: "Stock is available. Proceeding to checkout.",
    });
  } catch (error) {
    console.error("Error during checkout:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
};

const orderTest = async (req, res) => {
  try {
    const { name, streetAddress, city, district, pincode, phoneNo } =
      req.body.addressData;
    const { paymentMethodInput } = req.body;
    const cart = await Cart.findOne({ userId: req.session.userExist._id })
      .populate("items.ProductId")
      .populate("items.variantId");
    if (!cart) {
      return res.status(404).send({ message: "Cart not found" });
    }
    // Fetch item details
    const itemsDetails = await Promise.all(
      cart.items.map(async (item) => {
        const product = await Product.findById(item.ProductId);
        const variant = await Variant.findById(item.variantId);

        return {
          productId: product._id,
          productName: product.productName,
          description: product.description,
          category: product.category,
          variantId: variant._id,
          variantColor: variant.color,
          quantity: item.quantity,
          price: variant.price,
          totalPrice: item.total,
          discountAmount: 0,
          brand: product.brand,
          image: variant.images[0],
          color: variant.color,
          orderDate: Date.now(),
        };
      })
    );
    const newOrder = new Order({
      userId: req.session.userExist._id,
      orderId: `ORD-${Date.now()}`,
      orderItem: itemsDetails,
      address: {
        name,
        email: req.session.userExist.email,
        phoneNo,
        streetAddress,
        city,
        district,
        pincode,
      },
      totalAmount: cart.totalPrice,
      paymentMethod: paymentMethodInput,
      orderStatus: "Pending",
      paymentStatus: "Pending",
    });
    await newOrder.save();
    cart.items.forEach(async (item) => {
      const variantId = item.variantId._id
        ? item.variantId._id.toString()
        : item.variantId.toString();
      await Variant.updateOne(
        { _id: variantId },
        { $inc: { stock: -item.quantity } }
      );
    });
    const deletedCart = await Cart.findOneAndDelete({
      userId: req.session.userExist._id,
    });
    if (!deletedCart) {
      console.log("Cart not found");
      return res.json({ success: false, message: "Cart not found" });
    }
    res.json({ success: true, message: "Order created successfully" });
  } catch (error) {
    console.error("Error fetching order details:", error);
  }
};

const orderDetails = async (req, res) => {
  const user = await User.findOne({ _id: req.session.userExist._id });
  const orders = await Order.find({ userId: req.session.userExist._id });
  res.render("users/order", { user: user, orderdItem: orders });
};

const orderCancellation = async (req, res) => {
  try {
    const { reason, orderId } = req.body;
    const itemId = req.body.variantId;
    const order = await Order.findOne({ _id: orderId });

    if (order) {
      const itemIndex = order.orderItem.findIndex(
        (item) => item._id.toString() === itemId.toString()
      );

      if (itemIndex !== -1) {
        const canceledItem = order.orderItem[itemIndex];

        canceledItem.isCancelled = true;
        canceledItem.orderStatus ='cancelled'
        canceledItem.cancelReson = reason;
        canceledItem.cancelDate = Date.now();
        await order.save();
        const variantId = canceledItem.variantId;
        const variant = await Variant.findOne({ _id: variantId });
        if (variant) {
          variant.stock += canceledItem.quantity;
          await variant.save();
        }


        updateOrderStatus(order);

        res.json({
          success: true,
          message: "Order item successfully cancelled",
        });
      }
    }
  } catch (error) {
    conosle.log(error);
  }
};


async function updateOrderStatus(order) {
  const allDelivered = order.orderItem.every(item => item.orderStatus === 'delivered');
  const allCancelled = order.orderItem.every(item => item.orderStatus === 'cancelled');
  const allShipped = order.orderItem.every(item => item.orderStatus === 'shipped');

  if (allCancelled) {
    order.orderStatus = 'cancelled';
  } else if (allDelivered) {
    order.orderStatus = 'delivered';
  } else if (allShipped) {
    order.orderStatus = 'shipped';
  }

  await order.save();
}


module.exports = {
  checkoutPge,
  orderTest,
  orderDetails,
  orderCancellation,
  toCheckout,
};
