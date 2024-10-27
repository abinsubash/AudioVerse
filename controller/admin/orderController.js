const Product = require("../../model/productModel");
const Variant = require("../../model/variantModel");
const Brand = require("../../model/brandModel");
const Category = require("../../model/categoryModel");
const Order = require("../../model/orderModel");
const User = require("../../model/userModel");
const Wallet = require("../../model/walletModel");
const orderDetails = async (req, res) => {
  try {
    const searchOrder = req.query.searchOrder || "";
    const showReturns = req.query.showReturns === "true"; // Check if return requests should be shown
    const perPage = 10;
    const currentPage = req.query.page ? parseInt(req.query.page) : 1;

    // Build the query based on whether to show return requests
    const query = showReturns
      ? { "orderItem.returnStatus": "Returned" }
      : {
          orderId: { $regex: new RegExp(searchOrder, "i") },
        };

    const totalOrders = await Order.countDocuments(query);
    const totalPages = Math.ceil(totalOrders / perPage);
    const orders = await Order.find(query)
      .sort({ _id: -1 }) // Sort by _id in descending order (last added first)
      .skip((currentPage - 1) * perPage)
      .limit(perPage);

    res.render("admin/orderpage", {
      orders,
      totalPages,
      currentPage,
      searchOrder,
      showReturns, // Pass the flag to the template
    });
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).send("An error occurred while fetching orders.");
  }
};

const getOrderDetails = async (req, res) => {
  const order = await Order.findById(req.params.id).populate("orderItem");
  res.render("admin/orderDetails", { order });
};

const orderStatusEdit = async (req, res) => {
  const { orderId, orderStatus } = req.body;

  try {
    const order = await Order.findOne({ _id: orderId });

    if (!order) {
      return res.json({ success: false, message: "Order not found" });
    }

    let updateFields = {};

    if (orderStatus === "Cancel") {
      for (let item of order.orderItem) {
        const variant = await Variant.findOne({ _id: item.variantId });

        if (variant) {
          variant.stock += item.quantity;
          await variant.save();
        }
      }

      await Order.updateOne(
        { _id: orderId },
        {
          $set: {
            isCancelled: true,
            orderStatus: "Cancelled",
            cancelDate: Date.now(),
            "orderItem.$[item].orderStatus": "Cancelled",
            "orderItem.$[item].isCancelled": true,
          },
        }
      );
      res.json({ success: true, message: "Order Cancelled" });
    } else if (orderStatus === "Shipped") {
      updateFields = {
        orderStatus: "Shipped",
        shippedDate: Date.now(),
        "orderItem.$[item].orderStatus": "Shipped",
      };
      res.status(200).json({ success: true, message: "Order Shipped" });
    } else if (orderStatus === "Delivered") {
      updateFields = {
        isDelivered: true,
        orderStatus: "Delivered",
        paymentStatus: "Paid",
        deliveredDate: Date.now(),
        "orderItem.$[item].orderStatus": "Delivered",
        "orderItem.$[item].paymentStatus": "Paid",
        "orderItem.$[item].isDelivered": true,
        "orderItem.$[item].deliveredDate": Date.now(),
      };
      if (order) {
        for (const item of order.orderItem) {
          const { productId, variantId, category } = item;

          // Increment the product's boughtCount
          const product = await Product.findOneAndUpdate(
            { _id: productId },
            { $inc: { boughtCount: 1 } },
            { new: true } // Return the updated document
          );

          // Increment the category's boughtCount if category exists
          if (category) {
            await Category.findOneAndUpdate(
              { _id: category },
              { $inc: { boughtCount: 1 } }
            );
          }

          // Increment the brand's boughtCount using productBrand
          if (product && product.productBrand) {
            await Brand.findOneAndUpdate(
              { _id: product.productBrand },
              { $inc: { boughtCount: 1 } }
            );
          }
        }
      }
      res.json({ success: true, message: "Order Delivered" });
    } else {
      return res.json({ success: false, message: "Invalid order status" });
    }

    await Order.updateOne(
      { _id: orderId },
      { $set: updateFields },
      { arrayFilters: [{ "item.isCancelled": false }] }
    );
    res.json({ success: true, message: "Order status updated successfully" });
  } catch (error) {
    console.error(error);
  }
};

const returnConfirm = async (req, res) => {
  const { orderId, orderItemId } = req.params;
  const returnStatus = req.body.status;

  try {
    if (returnStatus === "confirm") {
      const order = await Order.findOne(
        { _id: orderId, "orderItem._id": orderItemId },
        { "orderItem.$": 1 }
      );
      const orderItem = order.orderItem[0];
      const productId = orderItem.productId;
      const variantId = orderItem.variantId;
      const product = await Product.findById(productId)
        .populate("category")
        .populate("productBrand");

      if (!product) {
        return res
          .status(404)
          .json({ success: false, message: "Product not found" });
      }

      if (product.boughtCount > 0) {
        product.boughtCount -= 1;
        await product.save();
      }

      if (product.category && product.category.boughtCount > 0) {
        await Category.findByIdAndUpdate(product.category._id, {
          $inc: { boughtCount: -1 },
        });
      }

      if (product.productBrand && product.productBrand.boughtCount > 0) {
        await Brand.findByIdAndUpdate(product.productBrand._id, {
          $inc: { boughtCount: -1 },
        });
      }

      if (!order || order.orderItem.length === 0) {
        return res
          .status(404)
          .json({ message: "Order or Order Item not found" });
      }

      const originalTotalPrice = orderItem.totalPrice;
      const incrementAmount = originalTotalPrice;
      const quantityToReturn = orderItem.quantity;
      const updatedOrder = await Order.findOneAndUpdate(
        { _id: orderId, "orderItem._id": orderItemId },
        {
          $set: {
            "orderItem.$.isReturn": true,
            "orderItem.$.returnStatus": "Accepted",
            "orderItem.$.orderStatus":"Returned"
          },
        },
        { new: true }
      );
      const variant = await Variant.findById(variantId);
      const allItemsReturned = order.orderItem.every(item => item.isReturn);

    if (allItemsReturned) {
      // Update the main order status to "Returned"
      await Order.updateOne(
        { _id: orderId },
        { $set: { orderStatus: "Returned" } }
      );
    }
      if (!variant) {
        return res.json({ message: "Variant not found" });
      }

      const newStock = variant.stock + quantityToReturn;

      await Variant.findByIdAndUpdate(
        variantId,
        { stock: newStock },
        { new: true }
      );

      const userId = updatedOrder.userId;
      const user = await User.findById(userId).populate("walletId");
      if (!user) {
        return res.json({ message: "User not found" });
      }

      const wallet = await Wallet.findOneAndUpdate(
        { _id: user.walletId },
        { $inc: { balance: incrementAmount } },
        { new: true }
      );

      await Wallet.findByIdAndUpdate(
        { _id: user.walletId },
        {
          $push: {
            history: {
              date: new Date(),
              amount: incrementAmount,
              transactionType: "Refund",
              newBalance: wallet.balance,
            },
          },
        }
      );

      return res.json({
        success: true,
        message: "Return confirmed and wallet updated successfully!",
      });
    } else if (returnStatus === "Cancel") {
      const order = await Order.findOne(
        { _id: orderId, "orderItem._id": orderItemId },
        { "orderItem.$": 1 }
      );

      if (!order || order.orderItem.length === 0) {
        return res.json({
          success: false,
          message: "Order or Order Item not found",
        });
      }

      const updatedOrder = await Order.findOneAndUpdate(
        { _id: orderId, "orderItem._id": orderItemId },
        {
          $set: {
            "orderItem.$.returnStatus": "Rejected",
          },
        },
        { new: true }
      );

      return res.json({
        success: true,
        message: "Return has been cancelled successfully!",
      });
    }
  } catch (error) {
    console.error("Error processing return confirmation:", error);
    return res.status(500).json({ message: "Server error" });
  }
};
module.exports = {
  orderDetails,
  getOrderDetails,
  orderStatusEdit,
  returnConfirm,
};
