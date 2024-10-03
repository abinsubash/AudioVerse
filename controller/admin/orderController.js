const Product = require('../../model/productModel');
const Variant = require('../../model/variantModel');
const Brand = require('../../model/brandModel');
const Category = require('../../model/categoryModel');
const Order = require('../../model/orderModel');

const orderDetails = async (req, res) => {
  try {
    const searchOrder = req.query.searchOrder||''
    const perPage = 10;
    const currentPage = req.query.page ? parseInt(req.query.page) : 1;
    const totalOrders = await Order.countDocuments();
    const totalPages = Math.ceil(totalOrders / perPage);
    const orders = await Order.find({
      orderId: { 
        $regex: new RegExp(searchOrder, 'i')  
      }
    })
      .skip((currentPage - 1) * perPage)
      .limit(perPage);

    res.render("admin/orderpage", { orders, totalPages, currentPage ,searchOrder});
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).send("An error occurred while fetching orders.");
  }
};


const orderApproval= async(req,res)=>{
    
    const {orderId} = req.body
     await Order.updateOne({_id:orderId},{isApproved:true,approvedDate:Date.now()})
    res.json({ success: true, message: "order approved" });
}


getOrderDetails = async (req, res) => {
  const order = await Order.findById(req.params.id).populate('orderItem');
  res.render('admin/orderDetails', { order });
};

const orderStatusEdit = async (req, res) => {
    const { itemId, status, orderId } = req.body;
  
    try {
      let updateFields = {};
      let updatedOrder;
  
      // Fetch the order to get item details for stock update in case of cancellation
      const order = await Order.findOne({ _id: orderId });
      if (!order) {
        return res.json({ success: false, message: "Order not found" });
      }
      const orderItem = order.orderItem.find(item => item._id.toString() === itemId);
      if (!orderItem) {
        return res.json({ success: false, message: "Item not found in the order" });
      }
  
      if (status === "Shipped") {
        updateFields = {
          "orderItem.$.orderStatus": status,
          "orderItem.$.shippedDate": new Date(), 
        };
      } else if (status === "Delivered") {
        updateFields = {
          "orderItem.$.orderStatus": status,
          "orderItem.$.isDelivered": true,
          "orderItem.$.deliveredDate": new Date(), 
        };
      } else if (status === "Cancel") {
        updateFields = {
          "orderItem.$.orderStatus": status,
          "orderItem.$.isCancelled": true,
          "orderItem.$.cancelDate": new Date(), 
        };
  
        const variantId = orderItem.variantId;
        const canceledQuantity = orderItem.quantity;
  
        await Variant.findOneAndUpdate(
          { _id: variantId },
          { $inc: { stock: canceledQuantity } } 
        );
      }
  
      updatedOrder = await Order.findOneAndUpdate(
        { _id: orderId, "orderItem._id": itemId },
        {
          $set: updateFields
        },
        { new: true } 
      );
  
      if (!updatedOrder) {
        return res.json({ success: false, message: "Order or Item not found" });
      }
      updateOrderStatus(updatedOrder);

      return res.json({ success: true, message: "Order status updated", order: updatedOrder });
    } catch (error) {
      console.error("Error updating order status:", error);
      return res.json({ success: false, message: "Error updating order status" });
    }
  };
  
  async function updateOrderStatus(order) {
    const allCancelled = order.orderItem.every(item => item.isCancelled);
    const allDelivered = order.orderItem.every(item => item.orderStatus === 'Delivered');
    const allShipped = order.orderItem.every(item => item.orderStatus === 'Shipped');
  
    if (allCancelled) {
      order.orderStatus = 'cancelled';
    } else if (allDelivered) {
      order.orderStatus = 'delivered';
    } else if (allShipped) {
      order.orderStatus = 'shipped';
    }
  
    // Save changes to the order
    await order.save();
  }
  
  
module.exports = {orderDetails,orderApproval,orderStatusEdit,getOrderDetails}