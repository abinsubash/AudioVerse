const Product = require("../../model/productModel");
const Cart = require("../../model/cartModel");
const Variant = require("../../model/variantModel");
const User = require("../../model/userModel");
const Address = require("../../model/addressModel");
const Order = require("../../model/orderModel");
const express = require("express");
const Razorpay = require("razorpay");
const crypto = require("crypto");
require("dotenv").config();

const checkoutPge = async (req, res) => {
  const cart = await Cart.findOne({ userId: req.session.userExist._id })
    .populate("items.ProductId")
    .populate("items.variantId");
  if (!cart) {
    return res.redirect("/cart");
  }
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
  const orders = await Order.find({ userId: req.session.userExist._id }).sort({
    _id: -1,
  });
  console.log(orders);
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
        canceledItem.orderStatus = "Cancelled";
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
          message: "Order item successfully Cancelled",
        });
      }
    }
  } catch (error) {
    conosle.log(error);
  }
};

async function updateOrderStatus(order) {
  const allDelivered = order.orderItem.every(
    (item) => item.orderStatus === "delivered"
  );
  const allCancelled = order.orderItem.every(
    (item) => item.orderStatus === "Cancelled"
  );
  const allShipped = order.orderItem.every(
    (item) => item.orderStatus === "shipped"
  );

  if (allCancelled) {
    order.orderStatus = "Cancelled";
  } else if (allDelivered) {
    order.orderStatus = "delivered";
  } else if (allShipped) {
    order.orderStatus = "shipped";
  }

  await order.save();
}

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAYX_KEY_ID,
  key_secret: process.env.RAZORPAYX_KEY_SECRET,
});
const RazorpaySet = async (req, res) => {
  try {
    const cart = await Cart.findOne({ userId: req.session.userExist._id });
    let amount = cart.totalPrice;
    console.log("Key ID:", process.env.RAZORPAYX_KEY_ID);
    console.log("Key Secret:", process.env.RAZORPAYX_KEY_SECRET);

    amount = amount * 100;
    const razorpayOrder = await razorpay.orders.create({
      amount: amount,
      currency: "INR",
      receipt: "receipt#1",
      payment_capture: 1,
    });
    console.log("hikasdfksad")
    res.json({
      success: true,
      key_id: process.env.RAZORPAYX_KEY_ID,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      order_id: razorpayOrder.id,
    });
  } catch (error) {
    console.error("Error creating Razorpay order:", error);
  }
};

const verifyRazorpay = async (req, res) => {
  try {
    console.log(req.body)
    const { paymentData, addressData, paymentMethodInput } = req.body;
    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAYX_KEY_SECRET)
      .update(paymentData.order_id + "|" + paymentData.payment_id)
      .digest("hex");
    if (generatedSignature !== paymentData.signature) {
      return res.json({
        success: false,
        message: "Payment verification failed!",
      });
    }
    const cart = await Cart.findOne({ userId: req.session.userExist._id })
      .populate("items.ProductId")
      .populate("items.variantId");

    if (!cart) {
      return res.send({success:false, message: "Cart not found" });
    }

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

    // Store order details in the database
    const newOrder = new Order({
      userId: req.session.userExist._id,
      orderId: `ORD-${Date.now()}`,
      orderItem: itemsDetails,
      address: {
        name: addressData.name,
        email: req.session.userExist.email,
        phoneNo: addressData.phoneNo,
        streetAddress: addressData.streetAddress,
        city: addressData.city,
        district: addressData.district,
        pincode: addressData.pincode,
      },
      totalAmount: cart.totalPrice,
      paymentMethod: paymentMethodInput,
      orderStatus: "Pending",
      paymentStatus: "Paid",
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
      return res.json({ success: false, message: "Cart not found" });
    }

    res.json({ success: true, message: "Order created successfully" });
  } catch (error) {
    console.error("Error verifying Razorpay payment:", error);
    res.json({ success: false, message: "Error processing the order" });
  }
};

module.exports = {
  checkoutPge,
  orderTest,
  orderDetails,
  orderCancellation,
  toCheckout,
  RazorpaySet,
  verifyRazorpay,
};
