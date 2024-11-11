const express = require("express");
const User = require("../../model/userModel");
const Brand = require("../../model/brandModel");
const Category = require("../../model/categoryModel");
const Admin = require("../../model/adminModel");
const bcrypt = require("bcrypt");
const Order = require("../../model/orderModel");
const Product = require("../../model/productModel");

const login = (req, res) => {
  if (req.session.adminLogged) {
    return res.redirect("/admin/home");
  }
  res.render("admin/login");
};
const adminLogin = async (req, res) => {
  const { username, password } = req.body;
  const admin = await Admin.findOne({ userName: username });
  if (!admin) {
    return res.json({ success: false, message: "Wrong username" });
  }
  const pass = await bcrypt.compare(password, admin.password);
  if (pass) {
    req.session.adminLogged = admin.userName;
    return res.json({ success: true });
  }
  res.json({ success: false, message: "Wrong password" });
};

const logout = (req, res) => {
  req.session.destroy();
  res.redirect("/admin/");
};

const home = async (req, res) => {
  try {
    const filter = req.query.filter || "all";
    const today = new Date();
    let startDate,
      endDate,
      labels = [],
      filterLabel = "";

    switch (filter) {
      case "day":
        startDate = new Date(today);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(today);
        endDate.setHours(23, 59, 59, 999);
        labels = Array.from({ length: 24 }, (_, i) => `${i}:00`);
        filterLabel = "Hours of Today";
        break;
      case "week":
        startDate = new Date(today);
        startDate.setDate(
          today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1)
        );
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        endDate.setHours(23, 59, 59, 999);
        labels = Array.from({ length: 7 }, (_, i) => {
          const date = new Date(startDate);
          date.setDate(startDate.getDate() + i);
          return date.toLocaleDateString("en-US", { weekday: "long" });
        });
        filterLabel = "Days of the Week";
        break;
      case "month":
        startDate = new Date(today);
        startDate.setMonth(today.getMonth() - 6);
        startDate.setDate(1);
        endDate = new Date(today);
        labels = Array.from({ length: 7 }, (_, i) => {
          const date = new Date(today);
          date.setMonth(today.getMonth() - i);
          return date.toLocaleDateString("en-US", { month: "long" });
        });
        filterLabel = "Last 7 Months";
        break;
      case "year":
        startDate = new Date(today);
        startDate.setFullYear(today.getFullYear() - 6);
        startDate.setMonth(0, 1);
        endDate = new Date(today);
        labels = Array.from({ length: 7 }, (_, i) =>
          (today.getFullYear() - i).toString()
        );
        filterLabel = "Last 7 Years";
        break;
      case "all":
        startDate = null;
        endDate = null;
        const yearsToShow = 10;
        const currentYear = today.getFullYear();
        labels = Array.from({ length: yearsToShow }, (_, i) =>
          (currentYear - i).toString()
        ).reverse();
        filterLabel = "All Time (Yearly)";
        break;
    }

    const [allTimeOrders, totalUsers, topProducts, topCategories, topBrands] =
      await Promise.all([
        Order.find({ isDelivered: true })
          .populate("userId")
          .populate("orderItem.productId"),
        User.countDocuments(),
        Product.find().sort({ boughtCount: -1 }).limit(10),
        Category.find().sort({ boughtCount: -1 }).limit(10),
        Brand.find().sort({ boughtCount: -1 }).limit(10),
      ]);
    const totalSales = allTimeOrders.reduce(
      (sum, order) =>
        sum +
        order.orderItem.reduce((itemSum, item) => itemSum + item.totalPrice, 0),
      0
    );

    const filteredOrders =
      startDate && endDate
        ? await Order.find({
            isDelivered: true,
            deliveredDate: { $gte: startDate, $lte: endDate },
          })
            .populate("userId")
            .sort({ deliveredDate: 1 })
        : allTimeOrders;

    const filterSales = filteredOrders.reduce(
      (sum, order) =>
        sum +
        order.orderItem.reduce((itemSum, item) => itemSum + item.totalPrice, 0),
      0
    );
    const filterOrders = filteredOrders.length;

    const periodCounts = new Array(labels.length).fill(0);
    filteredOrders.forEach((order) => {
      const deliveryDate = new Date(order.deliveredDate);
      let index;

      if (filter === "all") {
        index = labels.indexOf(deliveryDate.getFullYear().toString());
      } else {
        switch (filter) {
          case "day":
            index = deliveryDate.getHours();
            break;
          case "week":
            index = deliveryDate.getDay();
            break;
          case "month":
            index = today.getMonth() - deliveryDate.getMonth();
            break;
          case "year":
            index = today.getFullYear() - deliveryDate.getFullYear();
            break;
        }
      }

      if (index >= 0 && index < periodCounts.length) {
        periodCounts[index]++;
      }
    });

    if (filter === "month" || filter === "year") {
      labels.reverse();
      periodCounts.reverse();
    }
    const todayStart = new Date(today);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);

    const todayOrders = await Order.find({
      isDelivered: true,
      deliveredDate: { $gte: todayStart, $lte: todayEnd },
    });

    const todaySales = todayOrders.reduce(
      (sum, order) =>
        sum +
        order.orderItem.reduce((itemSum, item) => itemSum + item.totalPrice, 0),
      0
    );

    res.render("admin/home", {
      totalSales,
      totalOrders: allTimeOrders.length,
      totalUsers,

      filterSales,
      filterOrders,
      todaySales,
      todayOrders: todayOrders.length,
      labels: JSON.stringify(labels),
      salesData: JSON.stringify(periodCounts),
      filter,
      filterLabel,
      topProducts,
      topCategories,
      topBrands,
      formatCurrency: (amount) =>
        amount.toLocaleString("en-US", {
          style: "currency",
          currency: "USD",
        }),
      formatNumber: (num) => num.toLocaleString("en-US"),
    });
  } catch (error) {
    console.error("Error fetching data:", error);
    res.render("layout/404");
  }
};

const usersList = async (req, res) => {
  try {
    const searchName = req.query.searchName;
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    const totalUsers = await User.countDocuments();
    const users = await User.find({
      name: {
        $regex: new RegExp(searchName, "i"),
      },
    })
      .skip(skip)
      .limit(limit);

    const totalPages = Math.ceil(totalUsers / limit); // Calculate total pages

    res.render("admin/usermanage", {
      users,
      currentPage: page,
      totalPages,
      searchName,
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.render("layout/404");
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
};

const brands = async (req, res) => {
  try {
    const searchBrand = req.query.searchBrand || "";
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    const totalBrands = await Brand.countDocuments({});

    const brands = await Brand.find({
      brandName: {
        $regex: new RegExp(searchBrand, "i"),
      },
    })
      .skip(skip)
      .limit(limit)
      .exec();
    const totalPages = Math.ceil(totalBrands / limit);

    res.render("admin/brand", {
      brands,
      currentPage: page,
      totalPages: totalPages,
      searchBrand: searchBrand,
    });
  } catch (error) {
    console.log(error);
  }
};

module.exports = { login, home, brands, usersList, block, adminLogin, logout };
