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
const mongoose = require("mongoose");
const Wishlist = require("../../model/wishlistModel");
const { lookup } = require("dns");
const { ObjectId } = mongoose.Types;

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
    if ((req.query.query || req.query.category || req.query.sort || req.query.priceRange) && (!req.query.searchHist || !req.query.isClear)) {
     
      const [minPrice, maxPrice] = priceRange.split('-').map(Number);
      if (sortPrice) {
        console.log('pooda myraa')
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
              "productDetails.productName": { $regex: search?search:'a', $options: "i" },
            },
          },
          {
            $match: checkedCategory ? { "productDetails.category": new mongoose.Types.ObjectId(checkedCategory) } :{},
          },
          // Price range filter
          {
            $match: {
              ...(minPrice && maxPrice ? { price: { $gte: minPrice, $lte: maxPrice } } : ''),
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
      }else if (sortFont) {
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
          {
            $match: checkedCategory ? { "productDetails.category": new mongoose.Types.ObjectId(checkedCategory) } : {},
          },
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
                  $sort: { productNameLower: sortFont },
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

        // Render the response
       return res.render("users/shop", {
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
        return
      }

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
      return
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
      return
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("Server error");
  }
};



const shopNewPage = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 6;
  const skip = (page - 1) * limit;
  previousSearch = "";
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

const wishlist = async (req, res) => {
  const _id = req.session.userExist._id;
  const wishlist = await Wishlist.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(_id) } },  
    {
      $lookup: {
        from: 'products',             
        localField: 'items.productId', 
        foreignField: '_id',          
        as: 'productDetails'          
      }
    },
    {
      $lookup: {
        from: 'variants',              
        localField: 'items.variantId', 
        foreignField: '_id',           
        as: 'variantDetails'          
      }
    }
  ]);
    
  console.log(wishlist);
  res.render("users/wishlist", { user: req.session.userExist ,wishlist:wishlist});
};


const addAndRemoveWishlist = async (req, res) => {

  if(!req.session.userExist){
    res.json({ success: false, message: "User does not exist", redirect: true });
    return
  }
  const _id = req.session.userExist._id;
  const { variantid } = req.body;
  try {
    const wishlist = await Wishlist.findOne({ userId: _id });
    console.log(wishlist);
    const variant = await Varinat.findOne({ _id: variantid });
    if (!wishlist) {
      console.log("Creating a new wishlist");
      const newWishlist = new Wishlist({
        userId: _id,
        items: [
          {
            productId: variant.productId,
            variantId: variantid,
          },
        ],
      });
      await newWishlist.save();
      res.json({success:true,message:"Item added to wishlist"})
    } else {
      const itemIndex = wishlist.items.findIndex((item) =>
        item.variantId.equals(variantid)
      );

      if (itemIndex === -1) {
        wishlist.items.push({
          productId: variant.productId,
          variantId: variantid,
        });

        await wishlist.save();
        res.json({success:true,message:"Item added to wishlist"})
      } else {
        wishlist.items.splice(itemIndex, 1);
        await wishlist.save();
        res.json({success:true,message:"Item removed from wishlist"})
      }
    }
  } catch (error) {
    console.log(error);
  }
};






const deleteFromWishlist = async (req, res) => {
  const { objectId } = req.body; 
  try {
      const userId = req.session.userExist._id; 
      const wishlist = await Wishlist.findOne({ userId: userId });
      console.log(wishlist);
      
      if (!wishlist) {
          return res.json({ success: false, message: 'Wishlist not found' });
      }

      wishlist.items = wishlist.items.filter(item => !item._id.equals(new mongoose.Types.ObjectId(objectId)));
      
      await wishlist.save();
      console.log('item deleted ')
      return res.json({ success: true, message: 'Item removed from wishlist successfully' });
  } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};



module.exports = { newShop, shopNewPage, wishlist, addAndRemoveWishlist,deleteFromWishlist };
