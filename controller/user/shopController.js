const User = require("../../model/userModel");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const OTP = require("../../model/otp");
const Product = require("../../model/productModel");
const Varinat = require("../../model/variantModel");
const Category = require("../../model/categoryModel");
const Brand = require("../../model/brandModel");
const { isDeleted } = require("../admin/productController");
const Variant = require("../../model/variantModel");
const Cart = require("../../model/cartModel");
const Address = require("../../model/addressModel");
const mongoose = require('mongoose');
const { lookup } = require("dns");
const { ObjectId } = mongoose.Types;

const shop = async (req, res) => {
  try {
    const { search, checkedCategory, sortOption } = req.query;
    console.log("This is sort option", sortOption);
    let variantsQuery = { isDeleted: false };

    let productIds = [];
    const page = parseInt(req.query.page) || 1;
    const limit = 6;
    const skip = (page - 1) * limit;

    // Search products by name
    if (search) {
      const products = await Product.find({
        productName: { $regex: search, $options: "i" },
        isDeleted: false,
      }).select("_id");

      productIds = products.map((product) => product._id);
    }

    // Filter by category
    if (checkedCategory) {
      const categoryId = new mongoose.Types.ObjectId(checkedCategory);

      const productsInCategory = await Product.find({
        category: categoryId,
        isDeleted: false,
      }).select("_id");

      const categoryProductIds = productsInCategory.map(
        (product) => product._id
      );
      productIds =
        productIds.length > 0
          ? productIds.filter((id) => categoryProductIds.includes(id))
          : categoryProductIds;
    }

    // If product IDs were found, add them to the query
    if (productIds.length > 0) {
      variantsQuery.productId = { $in: productIds };
    }

    // Handle sorting by price in the database query
    let sortQuery = {};
    if (sortOption === "price-low-high") {
      sortQuery = { price: 1 }; // Sort by price ascending
    } else if (sortOption === "price-high-low") {
      sortQuery = { price: -1 }; // Sort by price descending
    }

    // Fetch variants from MongoDB
    let variants = await Variant.find(variantsQuery)
      .populate("productId") // Populate product reference
      .sort(sortQuery) // Apply price sorting if applicable
      .skip(skip) // Apply pagination
      .limit(limit) // Limit to 6 results per page
      .exec();

    // Handle sorting by productName in-memory (since productName is in the populated product)
    if (sortOption === "alphabetical-az") {
      variants = variants.sort((a, b) =>
        a.productId.productName
          .trim()
          .localeCompare(b.productId.productName.trim())
      );
    } else if (sortOption === "alphabetical-za") {
      variants = variants.sort((a, b) =>
        b.productId.productName
          .trim()
          .localeCompare(a.productId.productName.trim())
      );
    }
    console.log("Paginated and Sorted Variants:", variants);

    // Count total variants (for pagination)
    const totalVariants = await Variant.countDocuments(variantsQuery);

    // Calculate total pages
    const totalPages = Math.ceil(totalVariants / limit);

    // Render the response
    res.render("users/shop", {
      user: req.session.userExist,
      variants: variants,
      currentPage: page,
      totalPages: totalPages,
      category: await Category.find({}),
      brands: await Brand.find({}),
      search: search || "",
      checkedCategory: checkedCategory ? [checkedCategory] : [],
      sortOption: sortOption || "",
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
};








let previousSearch = "";
let previousCheckedCategory = "";
let previousSortOption = "";
let previousPriceRange = "";
let sortPrice = ''
let sortFont = ''


const newShop = async (req, res) => {
  try {
    if (req.query.searchHist || req.query.isClear) {
      previousSearch = ""
    }
    console.log("This is req:", req.query);
    const itemsPerPage = 6;
    let currentPage = parseInt(req.query.page) || 1;
    const skip = (currentPage - 1) * itemsPerPage;

    const search = req.query.query || previousSearch;
    const checkedCategory = req.query.category || previousCheckedCategory;
    const sortOption = req.query.sort || previousSortOption;
    const priceRange = req.query.priceRange || previousPriceRange;

    if (sortOption === "alphabetical-az") {
      sortPrice = ''
      sortFont = 1
    } else if (sortOption === "alphabetical-za") {
      sortPrice = ''
      sortFont = -1
    } else if (sortOption === "price-low-high") {
      sortFont = ''
      sortPrice = 1
    } else if (sortOption === "price-high-low") {
      sortFont = ''
      sortPrice = -1
    }


    previousSearch = search;
    previousCheckedCategory = checkedCategory;
    previousSortOption = sortOption;
    previousPriceRange = priceRange;
    
    if (req.query.isClear) {
      previousSearch = "";
      previousCheckedCategory = "";
      previousSortOption = "",
        previousPriceRange = "",
        sortPrice = '',
        sortFont = ''
    }
    if (req.query.query || req.query.category || req.query.sort || req.query.priceRange &&!req.query.searchHist ||! req.query.isClear) {
      console.log("Search:", search);
      console.log("Checked Category:", checkedCategory);
      console.log("Sort Option:", sortOption);
      console.log("Price Range:", priceRange);
      const [minPrice, maxPrice] = priceRange.split('-').map(Number);
      console.log(minPrice,maxPrice);
      if (sortPrice) {
        const variantsData = await Variant.aggregate([
          {
            $match: {
              isDeleted: false,
            },
          },
          {
            $lookup: {
              from: "products",
              localField: "productId",
              foreignField: "_id",
              as: "productDetails",
            },
          },
          {
            $unwind: "$productDetails",
          },
          {
            $match: {
              "productDetails.productName": { $regex: search, $options: "i" },
            },
          },
          // Check if checkedCategory is provided and create a new ObjectId instance for it
          {
            $match: checkedCategory ? { "productDetails.category": new mongoose.Types.ObjectId(checkedCategory) } : {},
          },
          // Price range filter
          {
            $match: {
              ...(minPrice && maxPrice ? { price: { $gte: minPrice, $lte: maxPrice } } : {}),
            },
          },
          {
            $facet: {
              data: [
                {
                  $project: {
                    color: 1,
                    price: 1,
                    stock: 1,
                    images: 1,
                    "productDetails._id": 1,
                    "productDetails.productName": 1,
                    "productDetails.productBrand": 1,
                    "productDetails.description": 1,
                    "productDetails.category": 1,
                    productNameLower: { $toLower: "$productDetails.productName" },
                  },
                },
                {
                  $sort: { price: sortPrice },
                },
                { $skip: skip },
                { $limit: itemsPerPage },
              ],
              totalCount: [
                {
                  $count: "count",
                },
              ],
            },
          },
        ]);        
        
        const variants = variantsData[0].data;

        const totalVariantsCount = variantsData[0].totalCount.length > 0 ? variantsData[0].totalCount[0].count : 0;

        const totalPages = Math.ceil(totalVariantsCount / itemsPerPage);

        console.log("hi")
        // Render the response
        res.render("users/shop", {
          variants: variants,
          user: req.session.userExist,
          currentPage: currentPage,
          totalPages: totalPages,
          category: await Category.find({}),
          brands: await Brand.find({}),
          search: search || "",
          sortOption: sortOption || "",
          checkedCategory: checkedCategory || "",
          priceRange: priceRange || "",  // Pass the price range

        });
      } else if (sortFont) {

        const variantsData = await Variant.aggregate([
          {
            $match: {
              isDeleted: false,
            },
          },
          {
            $lookup: {
              from: "products",
              localField: "productId",
              foreignField: "_id",
              as: "productDetails",
            },
          },
          {
            $unwind: "$productDetails",
          },
          {
            $match: {
              "productDetails.productName": { $regex: search, $options: "i" },
            },
          },
          // Check if checkedCategory is provided and create a new ObjectId instance for it
          {
            $match: checkedCategory ? { "productDetails.category": new mongoose.Types.ObjectId(checkedCategory) } : {},
          },
          // Price range filter
          {
            $match: {
              ...(minPrice && maxPrice ? { price: { $gte: minPrice, $lte: maxPrice } } : {}),
            },
          },
          {
            $facet: {
              data: [
                {
                  $project: {
                    color: 1,
                    price: 1,
                    stock: 1,
                    images: 1,
                    "productDetails._id": 1,
                    "productDetails.productName": 1,
                    "productDetails.productBrand": 1,
                    "productDetails.description": 1,
                    "productDetails.category": 1,
                    productNameLower: { $toLower: "$productDetails.productName" },
                  },
                },
                {
                  $sort: { price: sortFont },
                },
                { $skip: skip },
                { $limit: itemsPerPage },
              ],
              totalCount: [
                {
                  $count: "count",
                },
              ],
            },
          },
        ]);
        
        const variants = variantsData[0].data;

        const totalVariantsCount = variantsData[0].totalCount.length > 0 ? variantsData[0].totalCount[0].count : 0;

        const totalPages = Math.ceil(totalVariantsCount / itemsPerPage);

        console.log("hi")
        // Render the response
        res.render("users/shop", {
          variants: variants,
          user: req.session.userExist,
          currentPage: currentPage,
          totalPages: totalPages,
          category: await Category.find({}),
          brands: await Brand.find({}),
          search: search || "",
          sortOption: sortOption || "",
          checkedCategory: checkedCategory || "",
          priceRange: priceRange || "",

        });
      }
      console.log("andiii")

      const variantsData = await Variant.aggregate([
        {
          $match: {
            isDeleted: false,
          },
        },
        {
          $lookup: {
            from: "products",
            localField: "productId",
            foreignField: "_id",
            as: "productDetails",
          },
        },
        {
          $unwind: "$productDetails",
        },
        {
          $match: {
            "productDetails.productName": { $regex: search, $options: "i" }, // Product name search
            ...(checkedCategory && { "productDetails.category": new mongoose.Types.ObjectId(checkedCategory) }), // Category filter
            ...(minPrice && maxPrice && {
              price: { $gte: minPrice, $lte: maxPrice } 
            }),
          },
        },
        {
          $facet: {
            data: [
              {
                $project: {
                  color: 1,
                  price: 1,
                  stock: 1,
                  images: 1,
                  "productDetails._id": 1,
                  "productDetails.productName": 1,
                  "productDetails.productBrand": 1,
                  "productDetails.description": 1,
                  "productDetails.category": 1,
                  productNameLower: { $toLower: "$productDetails.productName" }, 
                },
              },
              { $skip: skip },
              { $limit: itemsPerPage },
            ],
            totalCount: [
              {
                $count: "count",
              },
            ],
          },
        },
      ]);
      
      
      const variants = variantsData[0].data;

      const totalVariantsCount = variantsData[0].totalCount.length > 0 ? variantsData[0].totalCount[0].count : 0;

      const totalPages = Math.ceil(totalVariantsCount / itemsPerPage);

      res.render("users/shop", {
        variants: variants,
        user: req.session.userExist,
        currentPage: currentPage,
        totalPages: totalPages,
        category: await Category.find({}),
        brands: await Brand.find({}),
        search: search || "",
        sortOption: sortOption || "",
        checkedCategory: checkedCategory || "",
        priceRange: priceRange || "",

      });
    } else {
      const variantsData = await Variant.aggregate([
        {
          $match: { isDeleted: false },
        },
        {
          $lookup: {
            from: "products",
            localField: "productId",
            foreignField: "_id",
            as: "productDetails",
          },
        },
        {
          $unwind: "$productDetails",
        },
        {
          $project: {
            color: 1,
            price: 1,
            stock: 1,
            images: 1,
            "productDetails._id": 1,
            "productDetails.productName": 1,
            "productDetails.productBrand": 1,
            "productDetails.description": 1,
            "productDetails.category": 1,
            productNameLower: { $toLower: "$productDetails.productName" }, 
          },
        },
        {
          $facet: {
            data: [
              { $skip: skip },
              { $limit: itemsPerPage },
            ],
            totalCount: [
              { $count: "count" },
            ],
          },
        },
      ]);

      const variants = variantsData[0].data;
      const totalVariantsCount = variantsData[0].totalCount.length > 0 ? variantsData[0].totalCount[0].count : 0;
      const totalPages = Math.ceil(totalVariantsCount / itemsPerPage);


      res.render("users/shop", {
        variants: variants,
        user: req.session.userExist,
        currentPage: currentPage,
        totalPages: totalPages,
        category: await Category.find({}),
        brands: await Brand.find({}),
        search: search || "",
        checkedCategory: checkedCategory || "",
        sortOption: sortOption || "",
        priceRange: priceRange || "",
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("Server error");
  }
};





const shopNewPage = async (req, res) => {
  console.log("pooda patti");
  const page = parseInt(req.query.page) || 1;
  const limit = 6;
  const skip = (page - 1) * limit;
  previousSearch = ''
  try {
    const totalProducts = await Product.countDocuments({ isDeleted: false });

    const products = await Product.find({ isDeleted: false })
      .populate("productBrand")
      .populate("variants")
      .populate("category")
      .skip(skip)
      .limit(limit)
      .exec();

    const totalPages = Math.ceil(totalProducts / limit);

    // Send products as JSON response
    console.log("sadanam send");

    res.json({
      products,
      currentPage: page,
      totalPages: totalPages,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

module.exports = { shop, newShop, shopNewPage };
