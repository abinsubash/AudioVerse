const mongoose = require('mongoose')

const adminSchema = mongoose.Schema({
    userName:{
        type:String,
        require:true
    },
    password:{
        type:String,
        require:true
    }
})

const Admin = mongoose.model('Admin',adminSchema);
module.exports = Admin