const express = require('express');
const User = require('../../model/userModel');
const Brand =require('../../model/brandModel');
const Category = require('../../model/categoryModel');
const Admin = require('../../model/adminModel');
const bcrypt = require('bcrypt');
const login = (req,res)=>{
  if(req.session.adminLogged){
    return res.redirect('/admin/home')
  }
    res.render('admin/login');
}
const adminLogin = async (req, res) => {
  const { username, password } = req.body;
  const admin = await Admin.findOne({ userName: username });
  if (!admin) {
      return res.json({ success: false, message: "Wrong username" });
  }
  const pass = await bcrypt.compare(password, admin.password);
  if (pass) {
    req.session.adminLogged = admin.userName
      return res.json({ success: true });
  }
  res.json({ success: false, message: "Wrong password" });

}

const logout = (req, res) => {
  req.session.destroy();
  res.redirect('/admin/');
};

const home = (req,res)=>{
    res.render('admin/home')
}



const usersList = async (req, res) => {
  try {
    const searchName = req.query.searchName
      const page = parseInt(req.query.page) || 1; 
      const limit =  10; 
      const skip = (page - 1) * limit; 

      const totalUsers = await User.countDocuments(); 
      const users = await User.find({
        name: { 
          $regex: new RegExp(searchName, 'i')  
        }
      }).skip(skip).limit(limit);


      const totalPages = Math.ceil(totalUsers / limit); // Calculate total pages

      res.render('admin/usermanage', {
          users,
          currentPage: page,
          totalPages,
          searchName
      });
  } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).send('Internal Server Error');
  }
};

  
  
  const block = async (req, res) => {
    try {
      const { id } = req.params;
      const user = await User.findOne({ _id: id });
      if (user) {
        user.isBlocked = !user.isBlocked;
        await user.save();
        res.json({ success: true, isBlocked: user.isBlocked });
      } else {
        res.json({ success: false, message: "User not found" });
      }
    } catch (error) {
      console.log(error);
    }
  }

  const brands = async (req, res) => {
    try {
      const searchBrand = req.query.searchBrand||""
      const page = parseInt(req.query.page) || 1; 
      const limit = 10; 
      const skip = (page - 1) * limit; 
  
      const totalBrands = await Brand.countDocuments({});
  
        const brands = await Brand.find({
          brandName: { 
            $regex: new RegExp(searchBrand, 'i')  
          }
        }).skip(skip)
          .limit(limit)
          .exec();
      const totalPages = Math.ceil(totalBrands / limit);
  
      res.render('admin/brand', {
        brands,
        currentPage: page,
        totalPages: totalPages,
        searchBrand:searchBrand
      });
    } catch (error) {
      console.log(error);
    }
  };
    
module.exports = {login,home,brands,usersList,block,adminLogin,logout}