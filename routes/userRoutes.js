const express = require("express");
const passport = require("passport");
const userController = require("../controller/user/userController");
const userAuth = require("../middleware/userAuth");
const User = require("../model/userModel");
const cartController = require('../controller/user/cartController');
const checkoutController = require("../controller/user/checkoutController");
const userRoutes = express.Router();
const shopController = require('../controller/user/shopController')
const walletController = require('../controller/user/walletController')




userRoutes.get("/auth/google",passport.authenticate("google", { scope: ["profile", "email"] }));
userRoutes.get("/auth/google/callback",passport.authenticate("google", { failureRedirect: "/login" }),userController.googleauth);

userRoutes.get("/login", userAuth.isLogout, userController.login);
userRoutes.post("/login", userController.loginValidation);
userRoutes.post("/otp", userController.otpVerification);
userRoutes.get("/otp", userAuth.isLogout, userController.getOtp);
userRoutes.get("/resendOtp", userController.resendOTP);
userRoutes.get("/signup", userAuth.isLogout, userController.signup);
userRoutes.post("/signup", userController.signupValidation);
userRoutes.get('/findUserByReferral/:referralId',userController.refferal)
//home
userRoutes.get("/", userAuth.isBlocked, userController.homePage);
userRoutes.get("/logout", userController.logout);

//Forget Password
userRoutes.get('/forgetPassword',userAuth.isBlocked,userController.forgetPassowrd);
userRoutes.post('/confirmEmail',userController.confirmEmail);
userRoutes.get('/reset-password',userAuth.isBlocked,userController.resetPassword);
userRoutes.post('/confirmPassword',userController.confirmPassword)

// Todo :product page 
userRoutes.get("/shop",userAuth.offerCleanupMiddleware,userAuth.isBlocked, userAuth.isBlocked, shopController.newShop);
userRoutes.get("/api/shop",userAuth.offerCleanupMiddleware, userAuth.isBlocked, shopController.shopNewPage);



userRoutes.get("/search", userAuth.isBlocked, userController.searchAndsort);
userRoutes.get("/filter", userAuth.isBlocked,  userController.filter);

userRoutes.get("/singleProduct", userController.singleProduct);

// Todo :Profile
userRoutes.get("/profile",userAuth.isBlocked, userAuth.isLogin,userController.profile);
userRoutes.post("/updateprofile",userAuth.isBlocked,userAuth.isLogin,userController.updateProfile);
userRoutes.post("/changePassword",userAuth.isBlocked,userAuth.isLogin,userController.changePassword);
userRoutes.post('/claimReferral',userAuth.isBlocked,userAuth.isLogin,walletController.claimRefferal)


//Tod : cart 
userRoutes.get("/cart",userAuth.offerCleanupMiddleware,userAuth.isBlocked,userAuth.isLogin,cartController.cart);
userRoutes.post("/updateCart/:Id",userAuth.offerCleanupMiddleware,userAuth.isBlocked,userAuth.isLogin,cartController.updateCart);
userRoutes.post("/addtoCart",userAuth.offerCleanupMiddleware,userAuth.isLogin,cartController.addToCart);
userRoutes.delete('/cartDelete/:Id',userAuth.isLogin,cartController.cartDelete);


//Todo: Address
userRoutes.get('/address',userAuth.isBlocked,userAuth.isLogin,userController.address)
userRoutes.post('/addAddress',userAuth.isLogin,userController.addAddress)
userRoutes.put("/editAddress",userAuth.isLogin,userController.editAddress)
userRoutes.delete('/deleteAddress',userAuth.isLogin,userController.deleteAddress)

userRoutes.get("/checkout",userAuth.isBlocked,userAuth.isLogin,checkoutController.checkoutPge);
userRoutes.post('/toCheckout',userAuth.isBlocked,userAuth.isLogin,checkoutController.toCheckout)
userRoutes.post("/order",userAuth.isBlocked,userAuth.isLogin,checkoutController.orderTest)
userRoutes.post('/order/walletPay',userAuth.isBlocked,userAuth.isLogin,checkoutController.walletPay)
//Todo: Orders
userRoutes.get("/orderDetails",userAuth.isBlocked, userAuth.isLogin, checkoutController.orderDetails);
userRoutes.post("/orderCancellation", userAuth.isLogin, checkoutController.orderCancellation);
userRoutes.post('/Razorpay',userAuth.isBlocked,checkoutController.RazorpaySet)
userRoutes.post('/verifyRazorpay', userAuth.isBlocked,checkoutController.verifyRazorpay);
userRoutes.post('/return',userAuth.isBlocked,checkoutController.orderReturn);
userRoutes.get('/downloadInvoice/:orderId',userAuth.isBlocked,checkoutController.invoiceDownload)
userRoutes.post('/retryPayment',userAuth.isBlocked,checkoutController.retryPayment)
userRoutes.post('/verifyRetryPayment',userAuth.isBlocked,checkoutController.verifyRetryPayment)

//Todo:Wishlist
userRoutes.post('/deleteFromWishlist',userAuth.isBlocked,userAuth.isLogin,shopController.deleteFromWishlist)
userRoutes.get('/wishlist',userAuth.isBlocked,userAuth.isLogin,shopController.wishlist)
userRoutes.post('/addAndRemoveWishlist',userAuth.isBlocked,userAuth.isLogin,shopController.addAndRemoveWishlist)



//Todo:Wallet
userRoutes.get('/wallet',userAuth.isBlocked,userAuth.isLogin,walletController.wallet)
userRoutes.post('/api/create-wallet-order',userAuth.isLogin,walletController.walletorder);
userRoutes.post('/api/verify-wallet-payment',userAuth.isLogin,walletController.walletVerify)
userRoutes.get("/contact", userAuth.isBlocked, (req, res) => {
  res.render("users/contact", { user: req.session.userExist });
});


module.exports = userRoutes;
