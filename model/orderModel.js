const mongoose = require("mongoose");

const orderSchema = mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  orderId: {
    type: String,
    required:true,
    unique: true,
  },
  orderItem: [
    {
    productId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Product",
        required:true
    },
      variantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref:"Variant",
        required:true
      },
      productName:{
        type:String,
        required:true
      },
      quantity:{
        type:Number,
        required:true
      },
      color:{
        type:String,
        required:true
      },
      price:{
        type:Number,
        required:true
      },
      totalPrice:{
        type:Number,
        required:true
      },
      discountAmount:{
        type:Number,
      },
      couponDiscount:{
        type:Number
      },
      category:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Category",
      },
      brand:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Brand",
      },
      image:{
        type:String,
        required:true
      },
      description:{
        type:String,
        required:true
      },
      paymentStatus:{
        type:String,
        required:true,
        default:"Pending"
      },
      orderStatus:{
        type:String,
        required:true,
        default:"Pending"
      },
      orderDate:{
        type:Date,
        default:Date.now()
      },
      cancelDate:{
        type:Date
      },
      isCancelled:{
        type:Boolean,
        default:false
      },
      cancelReson:{
        type:String,
      },
      isReturn:{
        type:Boolean,
        default:false
      },
      returnDate:{
        type:Date
      },
      returnReson:{
        type:String
      },
      shippedDate:{
        type:Date
      },
      isDelivered:{
        type:Boolean,
        default:false,
        required:true
      },
      deliveredDate:{
        type:Date
      },
      returnStatus:{
        type:String
      }
    },
  ],  
  address:{
    name:{
        type:String,
        required:true
    },
    email:{
        type:String,
        required:true,
    },
    phoneNo:{
        type:Number,
        required:true
    },
    streetAddress:{
        type:String,
        required:true
    },
    city:{
        type:String,
        required:true
    },
    district:{
        type:String,
        require:true
    },
    pincode:{
        type:Number,
        required:true
    },

  },
  totalAmount:{
    type:Number,
    required:true,
    default:0
  },
  paymentMethod:{
    type:String,
    required:true
  },
  orderStatus:{
    type:String,
    default:'Pending',
    required:true
  },
  paymentStatus:{
    type:String,
    default:'Pending',
    required:true
  },
  orderDate:{
    type:Date,
    default:Date.now
  },
  discount:{
    type:Number,
  },
  isCancelled:{
    type:Boolean,
    default:false
  },
  isDelivered:{
    type:Boolean,
    default:false,
    required:true
  },
  deliveredDate:{
    type:Date
  }
});

const Order = mongoose.model('Order',orderSchema);
module.exports = Order