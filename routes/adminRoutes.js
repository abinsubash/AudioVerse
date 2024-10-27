const express = require('express');
const adminRoutes = express.Router();
const adminController = require('../controller/admin/adminController');
const User = require('../model/userModel');
const categoryController = require('../controller/admin/categoryController')
const upload = require('../config/multer');
const brandController = require('../controller/admin/brandController');
const productController = require('../controller/admin/productController')
const adminAuth = require('../middleware/adminAuth');
const  orderController = require('../controller/admin/orderController');
const offerController = require('../controller/admin/offerController');
const couponController = require('../controller/admin/couponController');
const salesController = require('../controller/admin/salesController');



adminRoutes.get('/',adminController.login);
adminRoutes.post('/',adminController.adminLogin);
adminRoutes.get('/logout',adminAuth.isLogged,adminController.logout)

//Todo:Home 
adminRoutes.get('/home',adminAuth.isLogged,adminAuth.isLogged,adminController.home);


adminRoutes.get('/brands',adminAuth.isLogged,adminController.brands);
adminRoutes.post('/addbrand',adminAuth.isLogged,brandController.addBrand);
adminRoutes.delete('/deleteBrand/:id',adminAuth.isLogged, brandController.deleteBrand);
adminRoutes.put('/restoreBrand/:id',adminAuth.isLogged, brandController.restoreBrand);
adminRoutes.get('/getBrand/:id', adminAuth.isLogged,brandController.getBrand);
adminRoutes.put('/updateBrand/:id',adminAuth.isLogged, brandController.updateBrand);

// Todo: User
adminRoutes.post('/block/:id',adminAuth.isLogged, adminController.block);
adminRoutes.get('/userlist',adminAuth.isLogged, adminController.usersList);


adminRoutes.get('/category',adminAuth.isLogged,categoryController.categoryPg)
adminRoutes.post('/addCategory',adminAuth.isLogged,categoryController.addCategory)
adminRoutes.post('/category/:id',adminAuth.isLogged, categoryController.categoryDelete);
adminRoutes.post('/editCategory/:categoryId',adminAuth.isLogged, categoryController.editCategory) 


// ----------------------products---------------------------
adminRoutes.get('/product',adminAuth.isLogged,productController.productPage);
adminRoutes.get('/addProduct',adminAuth.isLogged,productController.addProductPage);
adminRoutes.post('/addProduct',adminAuth.isLogged, upload.any(), productController.addProduct);
adminRoutes.get('/viewProduct/:id',adminAuth.isLogged,productController.viewProduct)
adminRoutes.get('/editProduct/:id',adminAuth.isLogged,productController.editProductPage);
adminRoutes.post('/updateProduct/:id', adminAuth.isLogged,upload.any(), productController.updateProduct);
adminRoutes.get('/editVariant',adminAuth.isLogged, productController.editVariant);
adminRoutes.post('/updateVariant',adminAuth.isLogged,upload.any(), productController.updateVariant);
adminRoutes.post('/deleteProduct/:id',adminAuth.isLogged,productController.isDeleted);
adminRoutes.get('/NewVariant/:productId',adminAuth.isLogged,productController.newVariant);
adminRoutes.post('/addNewVariant/:productId',upload.any(),productController.addNewVariant)

adminRoutes.get('/orders',adminAuth.isLogged,orderController.orderDetails);
adminRoutes.patch("/orderStatusEdit",adminAuth.isLogged,orderController.orderStatusEdit);
adminRoutes.get('/orders/:id', adminAuth.isLogged,orderController.getOrderDetails);
adminRoutes.post('/return/:orderId/:orderItemId', adminAuth.isLogged, orderController.returnConfirm);

// -------------- Todo: offer ----------------

adminRoutes.get('/offer', adminAuth.isLogged,offerController.offer);
adminRoutes.post('/addOffer', adminAuth.isLogged,offerController.addOffer);
adminRoutes.patch('/updateOffer', adminAuth.isLogged,offerController.editOffer)
adminRoutes.delete('/deleteOffer/:offerId', adminAuth.isLogged,offerController.deleteOffer)
adminRoutes.post('/productOffer', adminAuth.isLogged,offerController.productOffer)
adminRoutes.delete('/removeOffer', adminAuth.isLogged,offerController.removeOffer)
adminRoutes.post('/applyOfferToCategory', adminAuth.isLogged,offerController.categoryOffer);
adminRoutes.delete('/removeOfferFromCategory', adminAuth.isLogged,offerController.removeCategoryOffer);


// Todo: Coupon
adminRoutes.get('/coupon', adminAuth.isLogged,couponController.couponPage)
adminRoutes.post('/addCoupon', adminAuth.isLogged,couponController.addCoupon)
adminRoutes.patch('/editCoupon', adminAuth.isLogged,couponController.editCoupon)
adminRoutes.delete('/deleteCoupon', adminAuth.isLogged,couponController.deleteCoupon)



//Todo:Sales Report
adminRoutes.get('/salesReport', adminAuth.isLogged,salesController.salesPage)
adminRoutes.get('/downloadSalesReport',  adminAuth.isLogged,salesController.downloadSalesReport);
adminRoutes.get('/downloadSalesReportExcel', adminAuth.isLogged, salesController.downloadSalesReportExcel);


module.exports = adminRoutes;

