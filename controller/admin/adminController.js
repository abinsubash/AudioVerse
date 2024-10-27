const express = require('express');
const User = require('../../model/userModel');
const Brand =require('../../model/brandModel');
const Category = require('../../model/categoryModel');
const Admin = require('../../model/adminModel');
const bcrypt = require('bcrypt');
const Order = require("../../model/orderModel")
const Product=require("../../model/productModel")

const login = (req,res)=>{
  if(req.session.adminLogged){
    return res.redirect('/admin/home')
  }
    res.render('admin/login');
}
const adminLogin = async (req, res) => {
  const { username, password } = req.body;
  const admin = await Admin.findOne({ userName: username });
  if (!admin) {
      return res.json({ success: false, message: "Wrong username" });
  }
  const pass = await bcrypt.compare(password, admin.password);
  if (pass) {
    req.session.adminLogged = admin.userName
      return res.json({ success: true });
  }
  res.json({ success: false, message: "Wrong password" });

}

const logout = (req, res) => {
  req.session.destroy();
  res.redirect('/admin/');
};

const home = async (req, res) => {
  const filter = req.query.filter || 'day';
  let startDate, endDate;
  const today = new Date();
  let labels = [];
  let filterLabel = '';

  // Set initial date as today if no filter
  if (!req.query.filter) {
      // Today's range
      startDate = new Date(today);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(today);
      endDate.setHours(23, 59, 59, 999);

      // Today's hour labels
      for (let i = 0; i < 24; i++) {
          labels.push(`${i}:00`);
      }
      filterLabel = 'Hours of Today';
  } else if (filter === 'day') {
      // Get current week's Monday
      startDate = new Date(today);
      startDate.setDate(today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1));
      startDate.setHours(0, 0, 0, 0);
      
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);

      // Generate labels for each day of the week
      for (let i = 0; i < 7; i++) {
          const date = new Date(startDate);
          date.setDate(startDate.getDate() + i);
          labels.push(date.toLocaleDateString('en-US', { weekday: 'long' }));
      }
      filterLabel = 'Days of the Week';
  } else if (filter === 'week') {
      // Last 7 weeks
      endDate = new Date(today);
      endDate.setHours(23, 59, 59, 999);
      startDate = new Date(today);
      startDate.setDate(today.getDate() - (7 * 6));
      startDate.setHours(0, 0, 0, 0);

      for (let i = 0; i < 7; i++) {
          labels.push(`Week ${i + 1}`);
      }
      filterLabel = 'Last 7 Weeks';
  } else if (filter === 'month') {
      // Last 7 months
      endDate = new Date(today);
      endDate.setHours(23, 59, 59, 999);
      startDate = new Date(today);
      startDate.setMonth(today.getMonth() - 6);
      startDate.setDate(1);
      startDate.setHours(0, 0, 0, 0);

      for (let i = 0; i < 7; i++) {
          const date = new Date(today);
          date.setMonth(today.getMonth() - i);
          labels.unshift(date.toLocaleDateString('en-US', { month: 'long' }));
      }
      filterLabel = 'Last 7 Months';
  } else if (filter === 'year') {
      // Last 7 years
      endDate = new Date(today);
      endDate.setHours(23, 59, 59, 999);
      startDate = new Date(today);
      startDate.setFullYear(today.getFullYear() - 6);
      startDate.setMonth(0, 1);
      startDate.setHours(0, 0, 0, 0);

      for (let i = 0; i < 7; i++) {
          const year = today.getFullYear() - i;
          labels.unshift(year.toString());
      }
      filterLabel = 'Last 7 Years';
  }

  try {
      // Base query for delivered orders
      const query = { 
          isDelivered: true,
          deliveredDate: { $gte: startDate, $lte: endDate }
      };

      // Fetch delivered orders
      const deliveredOrders = await Order.find(query)
          .populate("userId")
          .sort({ deliveredDate: 1 });

      // Initialize period counts
      let periodCounts;
      if (!req.query.filter) {
          // For today's view, initialize 24 hours
          periodCounts = new Array(24).fill(0);
      } else {
          // For other filters, initialize 7 periods
          periodCounts = new Array(7).fill(0);
      }

      // Count orders for each period based on filter
      deliveredOrders.forEach(order => {
          const deliveryDate = new Date(order.deliveredDate);
          let index;

          if (!req.query.filter) {
              // Count by hour for today's view
              index = deliveryDate.getHours();
          } else if (filter === 'day') {
              const dayDiff = Math.floor((deliveryDate - startDate) / (1000 * 60 * 60 * 24));
              index = dayDiff;
          } else if (filter === 'week') {
              const weekDiff = Math.floor((deliveryDate - startDate) / (1000 * 60 * 60 * 24 * 7));
              index = weekDiff;
          } else if (filter === 'month') {
              const monthDiff = (deliveryDate.getFullYear() - startDate.getFullYear()) * 12 
                  + deliveryDate.getMonth() - startDate.getMonth();
              index = monthDiff;
          } else if (filter === 'year') {
              const yearDiff = deliveryDate.getFullYear() - startDate.getFullYear();
              index = yearDiff;
          }

          if (index >= 0 && index < periodCounts.length) {
              periodCounts[index]++;
          }
      });

      // Calculate total sales for the period
      let totalSales = 0;
      deliveredOrders.forEach((order) => {
          order.orderItem.forEach((item) => {
              totalSales += item.totalPrice;
          });
      });

      // Get total users
      const totalUsers = await User.countDocuments();

      // Get today's specific counts (regardless of filter)
      const todayStart = new Date(today);
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date(today);
      todayEnd.setHours(23, 59, 59, 999);

      const todayOrders = await Order.find({
          isDelivered: true,
          deliveredDate: { $gte: todayStart, $lte: todayEnd }
      });

      let todaySales = 0;
      todayOrders.forEach((order) => {
          order.orderItem.forEach((item) => {
              todaySales += item.totalPrice;
          });
      });

      const topProducts = await Product.find()
      .sort({ boughtCount: -1 })  // Sort in descending order
      .limit(10);  // Limit to top 10

    // Top 10 categories based on boughtCount
    const topCategories = await Category.find()
      .sort({ boughtCount: -1 })
      .limit(10);

    // Top 10 brands based on boughtCount
    const topBrands = await Brand.find()
      .sort({ boughtCount: -1 })
      .limit(10);

      res.render('admin/home', {
          totalSales,
          totalOrders: deliveredOrders.length,
          totalUsers,
          todaySales,
          todayOrders: todayOrders.length,
          labels: JSON.stringify(labels),
          salesData: JSON.stringify(periodCounts),
          filter,
          filterLabel,
          topProducts,
          topCategories,
          topBrands
      });

  } catch (error) {
      console.error("Error fetching data:", error);
      res.status(500).render('error', {
          message: "Error fetching dashboard data"
      });
  }
};


const usersList = async (req, res) => {
  try {
    const searchName = req.query.searchName
      const page = parseInt(req.query.page) || 1; 
      const limit =  10; 
      const skip = (page - 1) * limit; 

      const totalUsers = await User.countDocuments(); 
      const users = await User.find({
        name: { 
          $regex: new RegExp(searchName, 'i')  
        }
      }).skip(skip).limit(limit);


      const totalPages = Math.ceil(totalUsers / limit); // Calculate total pages

      res.render('admin/usermanage', {
          users,
          currentPage: page,
          totalPages,
          searchName
      });
  } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).send('Internal Server Error');
  }
};

  
  
  const block = async (req, res) => {
    try {
      const { id } = req.params;
      const user = await User.findOne({ _id: id });
      if (user) {
        user.isBlocked = !user.isBlocked;
        await user.save();
        res.json({ success: true, isBlocked: user.isBlocked });
      } else {
        res.json({ success: false, message: "User not found" });
      }
    } catch (error) {
      console.log(error);
    }
  }

  const brands = async (req, res) => {
    try {
      const searchBrand = req.query.searchBrand||""
      const page = parseInt(req.query.page) || 1; 
      const limit = 10; 
      const skip = (page - 1) * limit; 
  
      const totalBrands = await Brand.countDocuments({});
  
        const brands = await Brand.find({
          brandName: { 
            $regex: new RegExp(searchBrand, 'i')  
          }
        }).skip(skip)
          .limit(limit)
          .exec();
      const totalPages = Math.ceil(totalBrands / limit);
  
      res.render('admin/brand', {
        brands,
        currentPage: page,
        totalPages: totalPages,
        searchBrand:searchBrand
      });
    } catch (error) {
      console.log(error);
    }
  };
    
module.exports = {login,home,brands,usersList,block,adminLogin,logout}