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
const Wallet = require("../../model/walletModel");
const { ObjectId } = mongoose.Types;
const generateRefferalID = () => {
  return crypto.randomBytes(6).toString("hex");
};

const generateOTP = () => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

const googleauth = async (req, res) => {
  const user = await User.findOne({ _id: req.user._id });
  if (user.isBlocked) {
    return res.redirect("/login");
  }
  req.session.userExist = req.user;

  res.redirect("/");
};

const sendOtp = (email, otp) => {
  const transfort = nodemailer.createTransport({
    service: "Gmail",
    auth: {
      user: process.env.EMAIL,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  const mailOption = {
    from: process.env.EMAIL,
    to: email,
    subject: "AUDIOVERSE OTP",
    text: `Your SignUp OTP ${otp},it will expire after 30 seconds`,
  };
  return transfort.sendMail(mailOption);
};

// -------------- Controller ------------------------

const signup = (req, res) => {
  res.render("users/signUp");
};

const signupValidation = async (req, res) => {
  try {
      const { name, email, phonenumber, password, referral } = req.body;
      const otp = generateOTP();
    if(referral){

      const user = await User.findOne({ referalID: referral });
      if (!user) {
          return res.json({ error: "Referral Not Found" });
      }
    }

      const existUser = await User.findOne({ email: email });
      if (existUser) {
          return res.json({ error: "User Already Exists" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const tempUser = new User({
          name,
          email,
          phone: phonenumber,
          password: hashedPassword,
          referalID: generateRefferalID(),
          isValid: false,
      });

      const otpModel = new OTP({
          email,
          otp,
      });

      req.session.email = email;
      req.session.tempUser = tempUser;
      await sendOtp(email, otp);
      await otpModel.save();

      res.json({ success: true });
  } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal Server Error" });
  }
};

const otpVerification = async (req, res) => {
  const { otp } = req.body;
  const tempUser = req.session.tempUser;
  const email = req.session.email;
  
  try {
    const otpUse = await OTP.findOne({ email: email });
    if (!otpUse) {
      return res.json({ success: false, message: "OTP not found" });
    }
    
    if (otpUse.otp != otp) {
      return res.json({ success: false, message: "OTP is Invalid" });
    }
    
    const newuser = new User(tempUser);
    await newuser.save();

    // Create a wallet for the new user and add ₹50 to it
    const newWallet = new Wallet({
      userId: newuser._id,
      balance: 50, // Add ₹50 to the signup user's wallet
      history: [{
        date: Date.now(),
        amount: 50,
        transactionType: "Signup Bonus",
        newBalance: 50,
      }],
    });
    await newWallet.save();
    
    // Update the new user with the walletId
    await User.findByIdAndUpdate(newuser._id, { walletId: newWallet._id });

    if (req.session.refferdUser) {
      const referredUser = await User.findById(req.session.refferdUser);
      console.log("Pooda",referredUser)
      if (referredUser) {
        await User.findOneAndUpdate(
          { _id: req.session.refferdUser },
          { $inc: { signUpCount: 1 } }
        );

        let wallet;
        if (!referredUser.walletId) {
          wallet = new Wallet({
            userId: referredUser._id,
          });
          await wallet.save();

          referredUser.walletId = wallet._id;
          await referredUser.save();
        }
        wallet = await Wallet.findOne({ _id: referredUser.walletId });
        if (wallet) {
          const referralBonus = 200;
          wallet.balance += referralBonus;
          wallet.history.push({
            date: Date.now(),
            amount: referralBonus,
            transactionType: "Referral Bonus",
            newBalance: wallet.balance,
          });
          await wallet.save();
        }
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: "An error occurred" });
  }
};

const resendOTP = async (req, res) => {
  const email = req.session.email;
  if (!email) {
    return res.json({ message: "Email not found" });
  }

  const newOtp = generateOTP();

  try {
    await OTP.findOneAndDelete({ email });

    const otpModel = new OTP({
      email,
      otp: newOtp,
    });
    await otpModel.save();

    await sendOtp(email, newOtp);

    res.json({ success: true, message: "OTP resent successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to resend OTP" });
  }
};

const loginValidation = async (req, res) => {
  const { email, password } = req.body;
  const userExist = await User.findOne({ email: email });
  if (!userExist) {
    return res.json({ success: false, message: "Enter valid email" });
  }
  if (userExist.isBlocked) {
    return res.json({ success: false, message: "User is blocked" });
  }
  const userPass = await bcrypt.compare(password, userExist.password);
  if (userPass) {
    req.session.userExist = userExist;
    return res.json({ success: true });
  } else {
    res.json({ success: false, message: "Incorrect password" });
  }
};

const logout = (req, res) => {
  req.session.destroy();
  res.redirect("/");
};

const getOtp = (req, res) => {
  res.render("users/otp");
};

const login = (req, res) => {
  const blockedMessage = req.session.blockedMessage;
  req.session.blockedMessage = null;
  res.render("users/login", { blockedMessage });
};

//Todo : Home page

const homePage = async (req, res) => {
  try {
    const products = await Product.find({});

    const boatProducts = await Promise.all(
      products.map(async (product) => {
        const brand = await Brand.findOne({ _id: product.productBrand });
        if (brand && brand.brandName === "Boat") {
          return product;
        }
      })
    );

    const filteredBoatProducts = boatProducts.filter((product) => product);

    const populatedBoatProducts = await Promise.all(
      filteredBoatProducts.map((product) =>
        Product.findById(product._id)
          .populate("productBrand")
          .populate("variants")
          .populate("category")
      )
    );

    if (req.session.userExist) {
      const user = await User.findOne({ _id: req.session.userExist._id });
      if (user.isBlocked) {
        return res.redirect("/login");
      }
    }

    res.render("users/home", {
      user: req.session.userExist,
      products: populatedBoatProducts,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
};

const searchAndsort = async (req, res) => {
  try {
    const { value } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = 6;
    const skip = (page - 1) * limit;

    const totalProducts = await Product.countDocuments({ isDeleted: false });
    const products = await Product.find({
      isDeleted: false,
      productName: { $regex: value, $options: "i" },
    })
      .populate("productBrand")
      .populate("variants")
      .populate("category")
      .skip(skip)
      .limit(limit)
      .exec();
    res.json({
      success: true,
      products: products,
      totalPages: Math.ceil(totalProducts / limit),
      currentPage: page,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "An error occurred." });
    console.error(error);
  }
};

const filter = async (req, res) => {
  const { values } = req.query;
  const categoryIds = values ? values.split(",") : [];

  try {
    const products = await Product.find({
      category: { $in: categoryIds },
    })
      .populate("productBrand")
      .populate("variants")
      .populate("category");

    res.json({ success: true, products });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "An error occurred while filtering products.",
    });
  }
};

const singleProduct = async (req, res) => {
  try {
    let { variantColor, id } = req.query;
    const product = await Product.find({ _id: id })
      .populate("productBrand")
      .populate("variants")
      .populate("category")
      .exec();
    if (
      !variantColor &&
      product[0].variants &&
      product[0].variants.length > 0
    ) {
      variantColor = product[0].variants[0].color;
    }
    if (!product) {
      console.log("no products");
    }
    const categoryId = product[0].category._id.toString();
    const relatedProduct = await Product.find()
      .populate("productBrand")
      .populate("variants")
      .populate("category")
      .exec();

    const filteredProducts = relatedProduct.filter(
      (product) => product.category._id.toString() === categoryId
    );
    let wishlist;
    if (req.session.userExist) {
      wishlist = await Wishlist.findOne({ userId: req.session.userExist._id });
    }
    const productss = await Product.find({ _id: id });

    if (productss && productss.length > 0) {
      const newproduct = productss[0];
      if (newproduct.variants) {
        newproduct.variants.forEach(async (variant) => {
          const { _id } = variant;
          const showVariant = await Varinat.find({ _id });
          showVariant.forEach(async (newvariant) => {
            if (newvariant.color == variantColor) {
              const newVarint = await Varinat.find({ _id: newvariant.id });
              let itemExist = false;

              if (req.session.userExist) {
                const cart = await Cart.findOne({
                  userId: req.session.userExist._id,
                });

                itemExist =
                  cart &&
                  cart.items.some(
                    (item) => item.variantId.toString() === newVarint[0].id
                  );
              }
              res.render("users/singleProduct", {
                wishlist: wishlist || { items: [] },
                user: req.session.userExist,
                products: product,
                relatedProducts: filteredProducts,
                newvarinats: newVarint,
                itemExists: itemExist,
              });
            }
          });
        });
      } else {
        console.log("No variants found");
      }
    } else {
      console.log("Product not found");
    }
  } catch (error) {
    res.redirect("/404");
    console.log(error);
  }
};

//Todo : userprofile
const profile = (req, res) => {
  res.render("users/profile", { user: req.session.userExist });
};

//Todo :UpdateProfile
const updateProfile = async (req, res) => {
  try {
    const { name, phone } = req.body;
    if (!req.session.userExist) {
      return res.json({
        success: false,
        message: "Session expired. Please log in again.",
      });
    }

    const user = await User.findOne({ email: req.session.userExist.email });

    if (!user) {
      return res.json({ success: false, message: "User not found" });
    }

    await User.updateOne(
      { email: req.session.userExist.email },
      {
        name: name,
        phone: phone,
      }
    );
    req.session.userExist = await User.findOne({
      email: req.session.userExist.email,
    });
    res.json({ success: true, message: "Profile Updated" });
  } catch (error) {
    console.log("Server error:", error);
    res.json({ success: false, message: "Error updating profile" });
  }
};

// Todo: Change Password
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if(currentPassword==newPassword){
      return res.json({success:false,message:"current password and new password are same"})
    }
    const user = await User.findOne({ _id: req.session.userExist._id });

    if (!user) {
      return res.json({ success: false, message: "User not found" });
    }
    const isPasswordMatch = await bcrypt.compare(
      currentPassword,
      user.password
    );
    if (!isPasswordMatch) {
      return res.json({
        success: false,
        message: "Current password is incorrect",
      });
    }
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await User.updateOne(
      { _id: req.session.userExist._id },
      { password: hashedPassword }
    );
    req.session.userExist = await User.findOne({
      _id: req.session.userExist._id,
    });

    return res.json({
      success: true,
      message: "Password updated successfully",
    });
  } catch (error) {
    console.error("Error changing password:", error);
  }
};

const forgetPassowrd = (req, res) => {
  res.render("users/forgetEmail");
};

const confirmEmail = async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });

  if (!user) {
    return res.json({ success: false, message: "Email Not found" });
  }

  const token = crypto.randomBytes(20).toString("hex");
  req.session.token = token;
  req.session.email = email;
  const mailOptions = {
    from: process.env.EMAIL,
    to: email,
    subject: "Your Password Reset Link",
    html: `
      <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px; background-color: #f9f9f9;">
          <div style="background-color: #ffffff; padding: 30px; border-radius: 10px; box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);">
              <h3>Reset Your Password</h3>
              <p>Click the link below to reset your password:</p>
              <a href="https://audioverse.store/reset-password?token=${token}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a>
              <p>Thanks for using our service!</p>
          </div>
      </div>`,
  };

  try {
    const transporter = nodemailer.createTransport({
      service: "Gmail",
      auth: {
        user: process.env.EMAIL,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    await transporter.sendMail(mailOptions);
    return res.status(200).json({
      success: true,
      message: "Password reset link has been sent to your email",
    });
  } catch (error) {
    console.error("Error sending email:", error);
    return res
      .status(500)
      .json({ success: false, message: "Error sending email" });
  }
};

const resetPassword = (req, res) => {
  if (req.session.token == req.query.token) {
    return res.render("users/forgetPassword");
  } else {
    res.status(400);
  }
};

const confirmPassword = async (req, res) => {
  const { newpassword } = req.body;
  const user = await User.findOne({ email: req.session.email });
  if (!user) {
    return res.json({ success: false, message: "user doesnot find" });
  }
  const hashedPassword = await bcrypt.hash(newpassword, 10);
  await User.updateOne(
    { email: req.session.email },
    {
      password: hashedPassword,
    }
  );
  res.json({ success: true, message: "password updated" });
};



// address

const address = async (req, res) => {
  const user = await User.findOne({ _id: req.session.userExist._id });
  const address = await Address.findOne({ _id: user.addressId });
  res.render("users/addAddress", { user: user, address: address });
};

const addAddress = async (req, res) => {
  try {
    const { name, streetAddress, city, district, pincode, phoneNo } = req.body;

    const user = await User.findOne({ _id: req.session.userExist._id });

    let address = await Address.findOne({ userId: user._id });

    if (!address) {
      address = new Address({
        userId: user._id,
        addresses: [],
      });
      await address.save();
    }

    address.addresses.push({
      name,
      streetAddress,
      city,
      district,
      pincode,
      phoneNo,
    });

    await address.save();
    if (!user.addressId) {
      await User.updateOne({ _id: user._id }, { addressId: address._id });
    }

    res.json({ success: true, message: "Address added" });
  } catch (error) {
    console.log(error);
  }
};

const editAddress = async (req, res) => {
  const { addressId, name, streetAddress, city, district, pincode, phoneNo } =
    req.body;

  const addressDoc = await Address.findOne({
    userId: req.session.userExist._id,
  });

  if (!addressDoc) {
    return res.json({ success: false, message: "Address document not found" });
  }

  const addressIndex = addressDoc.addresses.findIndex(
    (address) => address._id.toString() === addressId
  );

  if (addressIndex === -1) {
    return res.json({ success: false, message: "Address not found" });
  }

  addressDoc.addresses[addressIndex] = {
    ...addressDoc.addresses[addressIndex],
    name,
    streetAddress,
    city,
    district,
    pincode,
    phoneNo,
  };

  await addressDoc.save();

  return res.json({ success: true, message: "Address updated successfully" });
};

const deleteAddress = async (req, res) => {
  try {
    const { addressId } = req.body;

    const result = await Address.updateOne(
      { userId: req.session.userExist._id },
      { $pull: { addresses: { _id: addressId } } }
    );

    if (result.modifiedCount === 0) {
      return res.json({
        success: false,
        message: "Address not found or already deleted",
      });
    }
    return res.json({ success: true, message: "Address deleted successfully" });
  } catch (error) {
    console.error(error);
  }
};

const refferal = async (req, res) => {
  const referralId = req.params.referralId;

  try {
    const user = await User.findOne({ referalID: referralId });

    if (user) {
      res.json({ success: true, userName: user.name });
    } else {
      res.json({ success: false, message: "User not found" });
    }
  } catch (error) {
    res.json({ success: false, message: "Server error" });
  }
};

module.exports = {
  login,
  signup,
  homePage,
  signupValidation,
  otpVerification,
  resendOTP,
  getOtp,
  loginValidation,
  logout,
  singleProduct,
  googleauth,
  profile,
  updateProfile,
  changePassword,
  forgetPassowrd,
  confirmPassword,
  confirmEmail,
  resetPassword,
  address,
  addAddress,
  editAddress,
  deleteAddress,
  searchAndsort,
  filter,
  refferal,
};
