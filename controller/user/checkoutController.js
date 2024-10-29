const Product = require("../../model/productModel");
const Cart = require("../../model/cartModel");
const Variant = require("../../model/variantModel");
const User = require("../../model/userModel");
const Address = require("../../model/addressModel");
const Order = require("../../model/orderModel");
const express = require("express");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const mongoose = require("mongoose");
const Wallet = require("../../model/walletModel");
const Coupon = require('../../model/couponModel');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
require("dotenv").config();

const checkoutPge = async (req, res) => {
  const cart = await Cart.findOne({ userId: req.session.userExist._id })
    .populate("items.ProductId")
    .populate("items.variantId");
  if (!cart) {
    return res.redirect("/cart");
  }
  const address = await Address.findOne({ userId: req.session.userExist._id });
    const coupon = await Coupon.find({})
  res.render("users/checkout", {
    user: req.session.userExist,
    cart: cart,
    address: address,
    coupons:coupon
  });
};

const toCheckout = async (req, res) => {
  try {
    console.log("jih")
    const cart = await Cart.findOne({ userId: req.session.userExist._id })
      .populate({
        path: 'items.ProductId',
        select: 'productName isDeleted', // Include isDeleted field
      })
      .populate({
        path: 'items.variantId',
        select: 'color stock',
      });
      console.log(cart)
     
      if (!cart || cart.items.length === 0) {
        return res.json({ success: false, message: "Your cart is empty." });
      }
  
      let currentQuantity = true;
      let ProductName = '';
      let color = '';
  
      for (const item of cart.items) {
        const product = item.ProductId;
        const variant = item.variantId;
  
        if (product && product.isDeleted) {
          return res.json({
            success: false,
            message: `${product.productName} is no longer available.`,
          });
        }
  
        if (!variant || variant.stock < item.quantity) {
          currentQuantity = false;
          color = variant ? variant.color : 'Unknown Color';
          ProductName = product ? product.productName : 'Unknown Product';
          break;
        }
      }
  
      if (!currentQuantity) {
        return res.json({
          success: false,
          message: `${ProductName} (${color}) is out of stock or has insufficient quantity.`,
        });
      }
  
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
    console.log("Coupon ID received:", req.body.couponId);
    const { name, streetAddress, city, district, pincode, phoneNo } = req.body.addressData;
    const { paymentMethodInput, couponId } = req.body;
    
    const cart = await Cart.findOne({ userId: req.session.userExist._id })
      .populate("items.ProductId")
      .populate("items.variantId");
    
    if (!cart) {
      return res.status(404).send({ message: "Cart not found" });
    }

    let totalAmount = cart.totalPrice;
    let discountAmount = 0;
    let couponApplied = null;

    // Apply coupon if provided
    if (couponId) {
      const coupon = await Coupon.findById(couponId);
      if (coupon && new Date() < coupon.expiryDate && totalAmount >= coupon.minPurchase) {
        // Check if the user has already used this coupon
        const userCouponUsage = coupon.user.find(u => u.userId.toString() === req.session.userExist._id.toString());
        
        if (!userCouponUsage || !userCouponUsage.isBought) {
          discountAmount = (totalAmount * coupon.couponPercentage) / 100;
          totalAmount -= discountAmount;
          couponApplied = {
            couponId: coupon._id,
            couponName: coupon.couponName,
            discountPercentage: coupon.couponPercentage,
            discountAmount: discountAmount
          };

          if (userCouponUsage) {
            userCouponUsage.isBought = true;
          } else {
            coupon.user.push({ userId: req.session.userExist._id, isBought: true });
          }
          await coupon.save();
        }
      }
    }

    // Fetch item details with proportional discount distribution
    const itemsDetails = await Promise.all(
      cart.items.map(async (item) => {
        const product = await Product.findById(item.ProductId);
        const variant = await Variant.findById(item.variantId);

        // Calculate this item's proportional discount if a coupon was applied
        let itemDiscountAmount = 0;
        if (discountAmount > 0) {
          // Calculate ratio based on item's contribution to total cart value
          const itemRatio = item.total / cart.totalPrice;
          itemDiscountAmount = Math.round(discountAmount * itemRatio);
        }

        return {
          productId: product._id,
          productName: product.productName,
          description: product.description,
          category: product.category,
          variantId: variant._id,
          variantColor: variant.color,
          quantity: item.quantity,
          price: variant.price,
          totalPrice: item.total - itemDiscountAmount, // Original total minus item's share of discount
          discountAmount: itemDiscountAmount, // Store the item's share of the discount
          brand: product.brand,
          image: variant.images[0],
          color: variant.color,
          orderDate: Date.now(),
        };
      })
    );
    
    console.log("Items with distributed discounts:", itemsDetails);

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
      totalAmount: totalAmount,
      discountAmount: discountAmount,
      couponApplied: couponApplied,
      paymentMethod: paymentMethodInput,
      orderStatus: "Pending",
      paymentStatus: "Pending",
    });

    await newOrder.save();

    // Update variant stock
    for (const item of cart.items) {
      const variantId = item.variantId._id
        ? item.variantId._id.toString()
        : item.variantId.toString();
      await Variant.updateOne(
        { _id: variantId },
        { $inc: { stock: -item.quantity } }
      );
    }

    // Delete the cart
    const deletedCart = await Cart.findOneAndDelete({ userId: req.session.userExist._id });
    if (!deletedCart) {
      console.log("Cart not found");
      return res.json({ success: false, message: "Cart not found" });
    }

    res.json({ success: true, message: "Order created successfully" });
  } catch (error) {
    console.error("Error creating order:", error);
    res.status(500).json({ success: false, message: "Error creating order" });
  }
};

const orderDetails = async (req, res) => {
  const user = await User.findOne({ _id: req.session.userExist._id });
  const orders = await Order.find({ userId: req.session.userExist._id }).sort({
    _id: -1,
  });
  res.render("users/order", { user: user, orderdItem: orders });
};

const orderCancellation = async (req, res) => {
  try {
    const { reason, orderId } = req.body;
    const itemId = req.body.variantId;
    const order = await Order.findOne({ _id: orderId });
    let paidPrice;
    if (order) {
      const itemIndex = order.orderItem.findIndex(
        (item) => item._id.toString() === itemId.toString()
      );

      if (itemIndex !== -1) {
        const canceledItem = order.orderItem[itemIndex];
        if (canceledItem.paymentStatus === "Paid") {
          paidPrice = canceledItem.totalPrice;
          const wallet = await Wallet.findOne({ userId: req.session.userExist._id })
          if (wallet) {
            await Wallet.findOneAndUpdate(
              { userId: req.session.userExist._id },
              {
                $push: {
                  history: {
                    date: new Date(),
                    amount: paidPrice,
                    transactionType: "Refund",
                    newBalance: wallet.balance + paidPrice,
                  },
                },
                $set: { balance: wallet.balance + paidPrice },
              },
              { new: true } 
            );
          } 
        }
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

        if (paidPrice) {
          const userWithWallet = await User.aggregate([
            {
              $match: { _id: new mongoose.Types.ObjectId(order.userId) },
            },
            {
              $lookup: {
                from: "wallets",
                localField: "_id",
                foreignField: "userId",
                as: "wallet",
              },
            },
            {
              $unwind: "$wallet",
            },
          ]);

          if (userWithWallet.length > 0) {
            const userWallet = userWithWallet[0].wallet;

            await Wallet.updateOne(
              { _id: userWallet._id },
              {
                $inc: { balance: paidPrice }, 
                $push: {
                  history: {
                    date: new Date(),
                    amount: paidPrice,
                    transactionType: "Refund",
                    newBalance: userWallet.balance + paidPrice, 
                  },
                },
              }
            );
          }
        }

        res.json({
          success: true,
          message: "Order item successfully Cancelled",
        });
      }
    }
  } catch (error) {
    console.log(error);
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
    order.isCancelled = true;
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
    if (req.body.couponId) {
      const coupon = await Coupon.findById(req.body.couponId);

      if (!coupon) {
          return res.status(404).json({ error: 'Coupon not found' });
      }

      // Check if the user has already used the coupon
      const userCoupon = coupon.user.find(user => user.userId === req.session.userExist._id&& user.isBought === true);

      if (userCoupon) {
          return res.status(400).json({
              error: 'You have already used this coupon.',
          });
      }

      // Check if the cart total meets the minimum purchase requirement
      if (cart.totalPrice < coupon.minPurchase) {
          return res.status(400).json({
              error: `Minimum purchase of $${coupon.minPurchase.toFixed(2)} is required to apply this coupon.`,
          });
      }

      // Calculate the discount amount
      const discountAmount = (cart.totalPrice * coupon.couponPercentage) / 100;
      amount = cart.totalPrice - discountAmount;
      }
        // Update the final amount after applying the discount
    amount = amount * 100;
    const razorpayOrder = await razorpay.orders.create({
      amount: amount,
      currency: "INR",
      receipt: "receipt#1",
      payment_capture: 1,
    });
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
    const { paymentData, addressData, paymentMethodInput, couponId } = req.body;
    const cart = await Cart.findOne({ userId: req.session.userExist._id })
      .populate("items.ProductId")
      .populate("items.variantId");

    if (!cart) {
      return res.send({ success: false, message: "Cart not found" });
    }

    let totalAmount = cart.totalPrice;
    let couponDiscountAmount = 0;

    if (couponId) {
      const coupon = await Coupon.findById(couponId);

      if (!coupon) {
        return res.json({ success: false, message: "Coupon not found" });
      }

      if (totalAmount < coupon.minPurchase) {
        return res.status(400).json({
          success: false,
          message: `Minimum purchase of $${coupon.minPurchase.toFixed(2)} is required to apply this coupon.`,
        });
      }

      const userCoupon = coupon.user.find(user => user.userId === req.session.userExist._id);

      if (userCoupon && userCoupon.isBought === true) {
        return res.status(400).json({
          success: false,
          message: "You have already used this coupon.",
        });
      }

      // Calculate total coupon discount
      couponDiscountAmount = (totalAmount * coupon.couponPercentage) / 100;
      totalAmount -= couponDiscountAmount;

      coupon.user.push({
        userId: req.session.userExist._id,
        isBought: true,
      });

      await coupon.save();
    }

    const itemsDetails = await Promise.all(
      cart.items.map(async (item) => {
        const product = await Product.findById(item.ProductId);
        const variant = await Variant.findById(item.variantId);

        // Calculate individual item's discount proportionally
        let itemDiscountAmount = 0;
        if (couponDiscountAmount > 0) {
          // Calculate this item's share of the discount based on its proportion of total cart value
          const itemRatio = item.total / cart.totalPrice;
          itemDiscountAmount = Math.round(couponDiscountAmount * itemRatio);
        }

        return {
          productId: product._id,
          productName: product.productName,
          paymentStatus: paymentData.paymentStatus === 'failed' ? "Failed" : "Paid",
          description: product.description,
          category: product.category,
          variantId: variant._id,
          variantColor: variant.color,
          quantity: item.quantity,
          price: variant.price,
          totalPrice: item.total - itemDiscountAmount, // Original total minus coupon discount
          discountAmount: itemDiscountAmount, // Coupon discount amount for this item
          brand: product.brand,
          image: variant.images[0],
          color: variant.color,
          orderDate: Date.now(),
        };
      })
    );

    // Create new order with appropriate payment status
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
      totalAmount: totalAmount,
      paymentMethod: paymentMethodInput,
      orderStatus: "Pending",
      paymentStatus: paymentData.paymentStatus === 'failed' ? "Failed" : "Paid",
      failureReason: paymentData.paymentStatus === 'failed' ? (paymentData.errorMessage || "Payment Failed") : null
    });

    await newOrder.save();

    // Rest of the code remains the same...
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

    res.json({ 
      success: true, 
      message: paymentData.paymentStatus === 'failed' ? "Order recorded as failed" : "Order created successfully",
      paymentStatus: paymentData.paymentStatus
    });

  } catch (error) {
    console.error("Error verifying Razorpay payment:", error);
    res.json({ success: false, message: "Error processing the order" });
  }
};

const orderReturn = async (req, res) => {
  try {
    const { returnProductId, returnOrderId, returnReason } = req.body;
    const updatedOrder = await Order.findOneAndUpdate(
      { _id: returnOrderId, "orderItem._id": returnProductId },
      {
        $set: {
          "orderItem.$.returnStatus": "Returned",
          "orderItem.$.returnDate": new Date(),
          "orderItem.$.returnReson": returnReason,
        },
      },
      { new: true }
    );
    if (!updatedOrder) {
      res.json({success:false,message:"Order item is not found"});
      return;
    }

    res.json({success:true,message:"Return request sented "});
  } catch (error) {
    console.log(error)
  }
};


const invoiceDownload = async (req, res) => {
  try {
    const orderId = req.params.orderId;
    const order = await Order.findById(orderId)
        .populate('orderItem.productId')
        .populate('orderItem.variantId')
        .populate('orderItem.category')
        .populate('orderItem.brand')
        .exec();

    if (!order) {
        return res.status(404).send('Order not found');
    }

    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=order-${orderId}.pdf`);

    // Initialize PDF document
    const doc = new PDFDocument({
        margin: 50,
        size: 'A4'
    });

    // Pipe directly to response
    doc.pipe(res);

    // Add Logo
    const logoPath = path.join(__dirname, '../../public/images/logo.png');
    doc.image(logoPath, 50, 45, { width: 100 }).moveDown(2);

    // Document Title and Order ID
    doc.fontSize(24)
       .text('INVOICE', { align: 'center' })
       .moveDown(1);

    // Invoice Details
    doc.fontSize(10)
       .text(`Order ID: ${order.orderId}`, { align: 'right' })
       .text(`Date: ${new Date(order.orderDate).toLocaleDateString()}`, { align: 'right' })
       .moveDown(1);

    // Billing Information
    doc.fontSize(14)
       .text('Billing Address:', { underline: true })
       .fontSize(10)
       .moveDown(0.5);
    
    const addressBlock = [
        `Name: ${order.address.name}`,
        `Email: ${order.address.email}`,
        `Phone: ${order.address.phoneNo}`,
        `Address: ${order.address.streetAddress}`,
        `${order.address.city}, ${order.address.district}`,
        `Pincode: ${order.address.pincode}`
    ];

    addressBlock.forEach(line => {
        doc.text(line, { continued: false });
    });

    doc.moveDown(2);

    // Order Status Information
    doc.fontSize(12)
       .text('Order Information:', { underline: true })
       .fontSize(10)
       .moveDown(0.5);

    doc.text(`Payment Method: ${order.paymentMethod}`)
       .text(`Order Status: ${order.orderStatus}`)
       .text(`Payment Status: ${order.paymentStatus}`)
       .moveDown(2);

    // Table Header
    doc.fontSize(12).font('Helvetica-Bold');
    
    // Initialize table structure
    const startX = 50;
    const columnWidth = {
        product: 150,
        color: 80,
        price: 80,
        quantity: 60,
        total: 100
    };

    // Draw Table Header
    doc.rect(startX, doc.y, 500, 20).fill('#e6e6e6');
    
    let currentX = startX;
    let currentY = doc.y;

    // Table headers
    doc.fill('#000000')
       .text('Product', currentX + 5, currentY + 5, { width: columnWidth.product })
       .text('Color', currentX + columnWidth.product + 5, currentY + 5, { width: columnWidth.color })
       .text('Price', currentX + columnWidth.product + columnWidth.color + 5, currentY + 5, { width: columnWidth.price })
       .text('Qty', currentX + columnWidth.product + columnWidth.color + columnWidth.price + 5, currentY + 5, { width: columnWidth.quantity })
       .text('Total', currentX + columnWidth.product + columnWidth.color + columnWidth.price + columnWidth.quantity + 5, currentY + 5, { width: columnWidth.total });

    doc.moveDown();
    currentY = doc.y;

    // Draw Table Content
    doc.font('Helvetica');

    if (Array.isArray(order.orderItem)) {
        order.orderItem.forEach((item, index) => {
            const rowHeight = 25;
            if (currentY + rowHeight > doc.page.height - 100) {
                doc.addPage();
                currentY = 50;
            }

            // Alternate row background
            if (index % 2 === 0) {
                doc.rect(startX, currentY, 500, rowHeight).fill('#f9f9f9');
            }

            doc.fill('#000000');

            // Product Name
            doc.text(item.productName,
                currentX + 5,
                currentY + 5,
                { width: columnWidth.product - 10 });

            // Color
            doc.text(item.color || 'N/A',
                currentX + columnWidth.product + 5,
                currentY + 5,
                { width: columnWidth.color - 10 });

            // Price
            doc.text(`${item.price.toFixed(2)}`,
                currentX + columnWidth.product + columnWidth.color + 5,
                currentY + 5,
                { width: columnWidth.price - 10 });

            // Quantity
            doc.text(item.quantity.toString(),
                currentX + columnWidth.product + columnWidth.color + columnWidth.price + 5,
                currentY + 5,
                { width: columnWidth.quantity - 10, align: 'center' });

            // Total Price
            doc.text(`${item.totalPrice.toFixed(2)}`,
                currentX + columnWidth.product + columnWidth.color + columnWidth.price + columnWidth.quantity + 5,
                currentY + 5,
                { width: columnWidth.total - 10, align: 'right' });

            // Draw row border
            doc.rect(startX, currentY, 500, rowHeight).stroke();
            currentY += rowHeight;
        });
    }

    // Move to next section
    doc.moveDown(2);

    // Summary Section
    const summaryX = 350;
    const summaryWidth = 200;
    
    doc.font('Helvetica-Bold');
    doc.fontSize(10);

    // Calculate summary values
    const subtotal = order.totalAmount || 0;
    const discount = order.discount || 0;
    const total = subtotal - discount;

    // Draw Summary
    const summaryStartY = doc.y;
    doc.rect(summaryX, summaryStartY, summaryWidth, 80)
       .fill('#f5f5f5');

    doc.fill('#000000');
    let summaryY = summaryStartY + 10;

    // Subtotal
    doc.text('Subtotal:', summaryX + 10, summaryY);
    doc.text(`${subtotal.toFixed(2)}`, summaryX + 10, summaryY, {
        width: summaryWidth - 20,
        align: 'right'
    });

    // Discount if applicable
    if (discount > 0) {
        summaryY += 20;
        doc.text('Discount:', summaryX + 10, summaryY);
        doc.text(`${discount.toFixed(2)}`, summaryX + 10, summaryY, {
            width: summaryWidth - 20,
            align: 'right'
        });
    }

    // Total
    summaryY += 20;
    doc.font('Helvetica-Bold')
       .text('Total Amount:', summaryX + 10, summaryY);
    doc.text(`${total.toFixed(2)}`, summaryX + 10, summaryY, {
        width: summaryWidth - 20,
        align: 'right'
    });

    // Footer
    doc.fontSize(8)
       .font('Helvetica')
       .text('Thank you for your business!', 50, doc.page.height - 50, {
           align: 'center'
       });

    doc.end();
}catch (err) {
    console.log(err)
      res.status(500).send('An error occurred while generating the PDF.');
  }
}



const retryPayment=async (req, res) => {
  const { orderId } = req.body;

  try {
      const order = await Order.findById(orderId);

      if (!order) {
          return res.status(404).json({ success: false, message: 'Order not found' });
      }

      const razorpayOrder = await razorpay.orders.create({
          amount: order.totalAmount * 100,
          currency: 'INR',
          receipt: `retry_${order.orderId}`,
      });

      res.json({
          success: true,
          key_id: process.env.RAZORPAYX_KEY_ID, 
          amount: razorpayOrder.amount,
          currency: razorpayOrder.currency,
          order_id: razorpayOrder.id, 
          name: order.address.name,
          email: order.address.email,
          contact: order.address.phoneNo,
      });
  } catch (error) {
      console.error('Error creating Razorpay order for retry:', error);
      res.json({ success: false, message: 'Error processing payment retry' });
  }
}
const verifyRetryPayment= async (req, res) => {
  const { paymentData, orderId } = req.body;

  try {
      const generatedSignature = crypto
          .createHmac('sha256', process.env.RAZORPAYX_KEY_SECRET)
          .update(paymentData.order_id + '|' + paymentData.payment_id)
          .digest('hex');

      if (generatedSignature !== paymentData.signature) {
          return res.json({ success: false, message: 'Payment verification failed' });
      }

      await Order.updateOne(
          { _id: orderId },
          { paymentStatus: 'Paid' }
      );

      res.json({ success: true, message: 'Payment verified and order updated' });
  } catch (error) {
      console.error('Error verifying payment:', error);
      res.json({ success: false, message: 'Error processing payment verification' });
  }
}

module.exports = {
  checkoutPge,
  orderTest,
  orderDetails,
  orderCancellation,
  toCheckout,
  RazorpaySet,
  verifyRazorpay,
  orderReturn,
  invoiceDownload,
  retryPayment,
  verifyRetryPayment
};
