const User = require("../model/userModel");
const Offer = require("../model/offerModel");
const Product = require("../model/productModel");
const Variant = require("../model/variantModel");
const Category = require("../model/categoryModel");
const Cart = require("../model/cartModel");
// const isLogged = async (req,res,next)=>{

// }

const isBlocked = async (req, res, next) => {
  try {
    if (!req.session.userExist) {
      const user = await User.findOne({_id:req.session.userExist._id})
      if(user){
        next();
      }else{
        res.redirect('/login')
      }
    } else {
      const user = await User.findOne({ _id: req.session.userExist._id });
      if (user.isBlocked) {
        delete req.session.userExist;
        res.redirect("/login");
      } else {
        next();
      }
    }
  } catch (error) {
    console.log(error);
  }
};
const isLogin = async (req, res, next) => {
  if (req.session.userExist) {
    const user = await User.findOne({ _id: req.session.userExist._id });
    if (!user.isBlocked) {
      next();
    } else {
      res.redirect("/login");
    }
  } else {
    res.render("users/login");
  }
};

const isLogout = async (req, res, next) => {
  try {
    if (req.session.userExist) {
      if (req.session.userExist.isBlocked) {
        res.redirect("/login");
      }
      return res.redirect("/");
    } else {
      next();
    }
  } catch (error) {
    res.send(error.message);
  }
};

const offerCleanupMiddleware = async (req, res, next) => {
  try {
    // Product and variant offer cleanup
    const products = await Product.find({ offerId: { $ne: null } }).populate(
      "variants"
    );

    for (const product of products) {
      const offer = await Offer.findById(product.offerId);

      if (!offer) {
        await Product.updateOne(
          { _id: product._id },
          { $unset: { offerId: "" } }
        );

        await Variant.updateMany(
          { _id: { $in: product.variants.map((v) => v._id) } },
          { $unset: { offerId: "", offerPrice: "" } }
        );
      }
    }

    // Category offer cleanup
    const categories = await Category.find({ offerId: { $ne: null } });
    for (const category of categories) {
      const offer = await Offer.findById(category.offerId);
      if (!offer) {
        await Category.updateOne(
          { _id: category._id },
          { $unset: { offerId: "" } }
        );
      }
    }

    // User cart cleanup
    if (req.session.userExist) {
      const cart = await Cart.findOne({ userId: req.session.userExist });

      if (cart) {
        let totalPrice = cart.totalPrice || 0;
        let totalDiscount = 0; // Initialize totalDiscount

        for (const item of cart.items) {
          const variant = await Variant.findById(item.variantId);
          const product = await Product.findById(variant.productId);

          totalPrice -= item.total || 0;

          if (!variant.offerId) {
            // Reset offerPrice and discount as there's no offer
            item.offerPrice = 0;
            item.discount = 0;

            // Recalculate total based on actualPrice and quantity
            const actualPrice = item.actualPrice || 0;
            const quantity = item.quantity || 1;

            item.total = actualPrice * quantity;
          } else {
            // Get offer details from the product's offerId
            const offer = await Offer.findById(variant.offerId);

            if (!offer) {
              // If offer doesn't exist, reset offerPrice and discount
              item.offerPrice = 0;
              item.discount = 0;
              item.total = item.actualPrice * item.quantity;
            } else {
              const actualPrice = item.actualPrice || 0;
              const quantity = item.quantity || 1;
              const offerPercentage = offer.offerPercentage || 0;

              if (!item.offerPrice || !item.discount || !item.total) {
                item.discount = actualPrice * (offerPercentage / 100);
                item.offerPrice = actualPrice - item.discount;
                item.total = item.offerPrice * quantity; 
              } else {
                item.total = item.offerPrice * quantity;
              }
            }
          }

          totalPrice += item.total;
          
          totalDiscount += (item.discount || 0) * (item.quantity || 1);
        }

        cart.totalPrice = totalPrice;
        cart.totalDiscount = totalDiscount;
        await cart.save();
      }
    }

    next();
  } catch (error) {
    console.error("Error during offer cleanup:", error);
    return res.status(500).send("Server error during offer cleanup.");
  }
};  
module.exports = { isLogout, isBlocked, isLogin, offerCleanupMiddleware };
