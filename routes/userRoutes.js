const express = require("express");
const passport = require("passport");
const userController = require("../controller/user/userController");
const userAuth = require("../middleware/userAuth");
const User = require("../model/userModel");
const userRoutes = express.Router();

userRoutes.get("/auth/google",passport.authenticate("google", { scope: ["profile", "email"] }));

userRoutes.get("/auth/google/callback",passport.authenticate("google", { failureRedirect: "/login" }),userController.googleauth);

userRoutes.get("/login", userAuth.isLogout, userController.login);
userRoutes.post("/login", userController.loginValidation);
userRoutes.post("/otp", userController.otpVerification);
userRoutes.get("/otp", userAuth.isLogout, userController.getOtp);
userRoutes.get("/signup", userAuth.isLogout, userController.signup);
userRoutes.post("/signup", userController.signupValidation);
userRoutes.get("/", userAuth.isBlocked, userController.homePage);
userRoutes.get("/logout", userController.logout);
userRoutes.get("/resendOtp", userController.resendOTP);
userRoutes.get('/forgetPassword',userController.forgetPassowrd);
userRoutes.post('/confirmEmail',userController.confirmEmail);
userRoutes.get('/reset-password',userController.resetPassword);
userRoutes.post('/confirmPassword',userController.confirmPassword)

// Todo :product page 
userRoutes.get("/shop", userAuth.isBlocked, userController.shop);
userRoutes.get("/singleProduct", userController.singleProduct);
userRoutes.get("/variants", userController.findVarint);

// Todo :Profile
userRoutes.get("/profile", userAuth.isLogin,userController.profile);
userRoutes.post("/updateprofile",userAuth.isLogin,userController.updateProfile);
userRoutes.post("/changePassword",userAuth.isLogin,userController.changePassword);


//Todo :404 
userRoutes.get('/404',userController.error404)




userRoutes.get("/cart", userAuth.isBlocked, (req, res) => {
  res.render("users/cart", { user: req.session.userExist });
});
userRoutes.get("/product", userAuth.isBlocked, (req, res) => {
  res.render("users/product", { user: req.session.userExist });
});

userRoutes.get("/cart", userAuth.isBlocked, (req, res) => {
  res.render("users/cart", { user: req.session.userExist });
});

userRoutes.get("/contact", userAuth.isBlocked, (req, res) => {
  res.render("users/contact", { user: req.session.userExist });
});
userRoutes.get("/checkout", userAuth.isBlocked, (req, res) => {
  res.render("users/checkout", { user: req.session.userExist });
});

userRoutes.get("/profile", userAuth.isBlocked, (req, res) => {
  res.render("users/profile", { user: req.session.userExist });
});

module.exports = userRoutes;
