const express = require("express");
const User = require("../../model/userModel");
const mongoose = require('mongoose');

const wallet = async (req, res) => {
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
          $unwind: '$wallet' // To flatten the wallet array
        }
      ]);
  
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
  

module.exports = {
  wallet,
};
