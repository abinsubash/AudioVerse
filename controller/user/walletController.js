const express = require("express");
const User = require("../../model/userModel");
const mongoose = require('mongoose');
const Razorpay = require('razorpay');
const Wallet=require('../../model/walletModel')
const crypto = require('crypto')
const wallet = async (req, res) => {
  console.log(req.session.userExist._id)
    try {
      const user = await User.aggregate([
        {
          $match: { _id: new mongoose.Types.ObjectId(req.session.userExist._id) }
        },
        {
          $lookup: {
            from: 'wallets',
            localField: 'walletId',
            foreignField: '_id',
            as: 'wallet'
          }
        },
        {
          $unwind: '$wallet'
        },
        {
          $addFields: {
            'wallet.history': {
              $reverseArray: {
                $sortArray: {
                  input: '$wallet.history',
                  sortBy: 1
                }
              }
            }
          }
        }
      ]);      
      console.log(user)
  
      if (user && user.length > 0) {
        res.render('users/wallet', {user:req.session.userExist,
          wallet: user[0].wallet
        });
      } else {
        res.render('users/wallet', {user:req.session.userExist,
          wallet: null
        });
      }
    } catch (error) {
      console.error(error);
    }
  };
  


  const razorpay = new Razorpay({
    key_id: process.env.RAZORPAYX_KEY_ID,
    key_secret: process.env.RAZORPAYX_KEY_SECRET
});



const walletorder=async (req, res) => {
  const { amount } = req.body; // Amount to be added

  try {
      const options = {
          amount: amount * 100, // Amount in smallest currency unit (e.g., paise)
          currency: "INR",
          receipt: `receipt_wallet_${new Date().getTime()}`
      };

      const order = await razorpay.orders.create(options);
      res.json({
          success: true,
          key_id: process.env.RAZORPAYX_KEY_ID,
          amount: options.amount,
          currency: options.currency,
          order_id: order.id
      });
  } catch (error) {
      console.error(error);
      res.status(500).send("Server Error");
  }
}
const walletVerify = async (req, res) => {
  try {
      const { paymentData } = req.body;

      const verifyRazorpayPayment = (paymentData) => {
          const generatedSignature = crypto
              .createHmac("sha256", process.env.RAZORPAYX_KEY_SECRET)
              .update(paymentData.order_id + "|" + paymentData.payment_id)
              .digest("hex");

          return generatedSignature === paymentData.signature;
      };

      const isPaymentValid = verifyRazorpayPayment(paymentData);

      if (isPaymentValid) {
          const payment = await razorpay.payments.fetch(paymentData.payment_id);

          if (!payment || !payment.amount) {
              return res.status(400).json({ success: false, message: 'Invalid payment or missing amount.' });
          }

          const amountToAdd = payment.amount / 100; 

          let wallet = await Wallet.findOne({ userId: req.session.userExist._id });
          console.log(wallet);

          if (!wallet) {
              wallet = new Wallet({
                  userId: req.session.userExist._id,
                  balance: 0, 
                  history: [],
              });
          }

          wallet.balance += amountToAdd;

          wallet.history.push({
              amount: amountToAdd,
              transactionType: 'Credit', 
              newBalance: wallet.balance,
          });

          await wallet.save();

          res.json({ success: true, message: 'Wallet balance updated successfully!' });
      } else {
          res.json({ success: false, message: 'Payment verification failed.' });
      }
  } catch (error) {
      console.error('Error verifying wallet payment:', error);
      res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};


const claimRefferal= async (req, res) => {
  try {
      const { referralCode } = req.body;

      const referrerUser = await User.findOne({ referalID: referralCode });
      if (!referrerUser) {
          return res.json({ success: false, message: "Invalid referral code." });
      }

      const userId = req.session.userExist._id;

      const claimingUser = await User.findById(userId);
      
      if (claimingUser.isReferred) {
          return res.json({ success: false, message: "Referral bonus already claimed." });
      }

      let userWallet = await Wallet.findOne({ userId });
      if (!userWallet) {
          userWallet = await Wallet.create({ userId, balance: 50 });
      } else {
          userWallet.balance += 50;
      }
      userWallet.history.push({
          amount: 50,
          transactionType: "Referral Bonus (Claimed)",
          newBalance: userWallet.balance
      });
      await userWallet.save();

      claimingUser.isReferred = true;
      await claimingUser.save();

      let referrerWallet = await Wallet.findOne({ userId: referrerUser._id });
      if (!referrerWallet) {
          referrerWallet = await Wallet.create({ userId: referrerUser._id, balance: 200 });
      } else {
          referrerWallet.balance += 200;
      }
      referrerWallet.history.push({
          amount: 200,
          transactionType: "Referral Bonus (Referral Code Used)",
          newBalance: referrerWallet.balance
      });
      await referrerWallet.save();

      res.json({ success: true, message: "Referral bonus added successfully." });
  } catch (error) {
      console.error("Error in claiming referral:", error);
      res.status(500).json({ success: false, message: "An error occurred while claiming the referral." });
  }
};
module.exports = {
  wallet,
  walletorder,
  walletVerify,
  claimRefferal
};
