const mongoose = require('mongoose');

const categorySchema = mongoose.Schema({
    categoryName:{
        type:String,
        require:true
    },
    isDeleted:{
        type:Boolean,
        default:false,
        require:true
    }
},{
    timestamps:true
})

const Category = mongoose.model('Category',categorySchema);
module.exports= Category;