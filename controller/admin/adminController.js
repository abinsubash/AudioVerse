const express = require('express');
const User = require('../../model/userModel');
const Brand =require('../../model/brandModel');
const Category = require('../../model/categoryModel');
const Admin = require('../../model/adminModel');
const bcrypt = require('bcrypt');
const login = (req,res)=>{
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


const usersList = (req,res)=>{
    res.render('admin/usermanage')
}

const userlisting = async (req, res) => {
    try {
      const users = await User.find({});
      res.json(users);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  }
  
  
  const block = async (req, res) => {
    try {
      const { id } = req.params;
      const user = await User.findOne({ _id: id });
      if (user) {
        user.isBlocked = !user.isBlocked;
        await user.save();
        res.json({ success: true, isBlocked: user.isBlocked });
      } else {
        res.status(404).json({ success: false, message: "User not found" });
      }
    } catch (error) {
      console.log(error);
    }
  }

    const brands = async (req,res)=>{
        try{
    
            const brands =  await Brand.find({})
             res.render('admin/brand',{brands})
        }catch(error){
            console.log(error);
        }
    }
module.exports = {login,home,brands,usersList,userlisting,block,adminLogin,logout}