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



module.exports = {
  wallet,
  walletorder,
  walletVerify
};
