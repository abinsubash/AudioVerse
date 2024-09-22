const mongoose = require('mongoose');
const dotenv = require('dotenv');


dotenv.config();


const connectMongo = () => {
    mongoose.connect(process.env.MONGO_URL, {
        // useNewUrlParser: true,  
        // useUnifiedTopology: true
    })
    .then(() => {
        console.log("MongoDB connected");
    })
    .catch((error) => { 
        console.error("MongoDB connection error:", error);
    });
};


module.exports = connectMongo;
