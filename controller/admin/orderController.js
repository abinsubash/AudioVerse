const Product = require("../../model/productModel");
const Variant = require("../../model/variantModel");
const Brand = require("../../model/brandModel");
const Category = require("../../model/categoryModel");
const Order = require("../../model/orderModel");

const orderDetails = async (req, res) => {
  try {
    const searchOrder = req.query.searchOrder || "";
    const perPage = 10;
    const currentPage = req.query.page ? parseInt(req.query.page) : 1;
    const totalOrders = await Order.countDocuments();
    const totalPages = Math.ceil(totalOrders / perPage);
    const orders = await Order.find({
      orderId: {
        $regex: new RegExp(searchOrder, "i"),
      },
    })
      .sort({ _id: -1 }) // Sort by _id in descending order (last added first)
      .skip((currentPage - 1) * perPage)
      .limit(perPage);
    

    res.render("admin/orderpage", {
      orders,
      totalPages,
      currentPage,
      searchOrder,
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
            "orderItem.$[].orderStatus": "Cancelled",
            "orderItem.$[].isCancelled": true,
          },
        }
      );
      res.json({success:true,message:"Order Cancelled"})
    } else if (orderStatus === "Shipped") {
      updateFields = {
        orderStatus: "Shipped",
        shippedDate: Date.now(),
        "orderItem.$[].orderStatus": "Shipped",
      };
      res.json({success:true,message:"Order Shipped"})

    } else if (orderStatus === "Delivered") {
      updateFields = {
        isDelivered: true,
        orderStatus: "Delivered",
        deliveredDate: Date.now(),
        "orderItem.$[].orderStatus": "Delivered",
        "orderItem.$[].isDelivered": true,
        "orderItem.$[].deliveredDate": Date.now(),
      };
      res.json({success:true,message:"Order Delivered"})

    } else {
      return res.json({ success: false, message: "Invalid order status" });
    }

    await Order.updateOne({ _id: orderId }, { $set: updateFields });

    res.json({ success: true, message: "Order status updated successfully" });
  } catch (error) {
    console.error(error);
  }
};

module.exports = { orderDetails, getOrderDetails, orderStatusEdit };
