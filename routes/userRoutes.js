const express = require("express");
const passport = require("passport");
const userController = require("../controller/user/userController");
const userAuth = require("../middleware/userAuth");
const User = require("../model/userModel");
const cartController = require('../controller/user/cartController');
const checkoutController = require("../controller/user/checkoutController");
const userRoutes = express.Router();
const shopController = require('../controller/user/shopController')
userRoutes.get("/auth/google",passport.authenticate("google", { scope: ["profile", "email"] }));

userRoutes.get("/auth/google/callback",passport.authenticate("google", { failureRedirect: "/login" }),userController.googleauth);

userRoutes.get("/login", userAuth.isLogout, userController.login);
userRoutes.post("/login", userController.loginValidation);
userRoutes.post("/otp", userController.otpVerification);
userRoutes.get("/otp", userAuth.isLogout, userController.getOtp);
userRoutes.get("/resendOtp", userController.resendOTP);
userRoutes.get("/signup", userAuth.isLogout, userController.signup);
userRoutes.post("/signup", userController.signupValidation);

//home
userRoutes.get("/", userAuth.isBlocked, userController.homePage);
userRoutes.get("/logout", userController.logout);

//Forget Password
userRoutes.get('/forgetPassword',userAuth.isBlocked,userController.forgetPassowrd);
userRoutes.post('/confirmEmail',userController.confirmEmail);
userRoutes.get('/reset-password',userAuth.isBlocked,userController.resetPassword);
userRoutes.post('/confirmPassword',userController.confirmPassword)

// Todo :product page 
userRoutes.get("/shop",userAuth.isBlocked, userAuth.isBlocked, shopController.newShop);
userRoutes.get("/api/shop", userAuth.isBlocked, shopController.shopNewPage);



userRoutes.get("/search", userAuth.isBlocked, userController.searchAndsort);
userRoutes.get("/filter", userAuth.isBlocked, userController.filter);

userRoutes.get("/singleProduct", userController.singleProduct);

// Todo :Profile
userRoutes.get("/profile",userAuth.isBlocked, userAuth.isLogin,userController.profile);
userRoutes.post("/updateprofile",userAuth.isBlocked,userAuth.isLogin,userController.updateProfile);
userRoutes.post("/changePassword",userAuth.isBlocked,userAuth.isLogin,userController.changePassword);


//Todo :404 
userRoutes.get('/404',userController.error404)

//Tod : cart 
userRoutes.get("/cart",userAuth.isBlocked,userAuth.isBlocked,userAuth.isLogin,cartController.cart);
userRoutes.post("/updateCart/:Id",userAuth.isBlocked,userAuth.isLogin,cartController.updateCart);
userRoutes.post("/addtoCart",userAuth.isLogin,cartController.addToCart);
userRoutes.delete('/cartDelete/:Id',userAuth.isLogin,cartController.cartDelete);


//Todo: Address
userRoutes.get('/address',userAuth.isBlocked,userAuth.isLogin,userController.address)
userRoutes.post('/addAddress',userAuth.isLogin,userController.addAddress)
userRoutes.put("/editAddress",userAuth.isLogin,userController.editAddress)
userRoutes.delete('/deleteAddress',userAuth.isLogin,userController.deleteAddress)

userRoutes.get("/checkout",userAuth.isBlocked,userAuth.isLogin,checkoutController.checkoutPge);
userRoutes.post('/toCheckout',userAuth.isBlocked,userAuth.isLogin,checkoutController.toCheckout)
userRoutes.post("/order",userAuth.isBlocked,userAuth.isLogin,checkoutController.orderTest)

//Todo: Orders
userRoutes.get("/orderDetails",userAuth.isBlocked, userAuth.isLogin, checkoutController.orderDetails);
userRoutes.post("/orderCancellation", userAuth.isLogin, checkoutController.orderCancellation);


//Todo:Wishlist
userRoutes.post('/deleteFromWishlist',userAuth.isBlocked,userAuth.isLogin,shopController.deleteFromWishlist)
userRoutes.get('/wishlist',userAuth.isBlocked,userAuth.isLogin,shopController.wishlist)
userRoutes.post('/addAndRemoveWishlist',shopController.addAndRemoveWishlist)


userRoutes.get("/contact", userAuth.isBlocked, (req, res) => {
  res.render("users/contact", { user: req.session.userExist });
});


module.exports = userRoutes;
