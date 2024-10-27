const express = require("express");
const path = require("path");
const app = express();
const { v4: uuidv4 } = require("uuid");
const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes');
const session = require("express-session");
const connectMongo = require('./config/db');
const passport = require('passport');
const nocache = require('nocache')
const cron = require('node-cron')
require('./config/passport');
require('dotenv').config();

const PORT = process.env.PORT || 3000;

connectMongo(); 

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(nocache());


cron.schedule('0 0 * * *', async () => {
  try {
    const expiredOffers = await Offer.find({ endDate: { $lt: new Date() } });

    for (let offer of expiredOffers) {
      await Product.updateMany(
        { offerId: offer._id },
        { $unset: { offerId: "" } }
      );

      await Variant.updateMany(
        { offerId: offer._id },
        { $unset: { offerId: "", offerPrice: "" } }
      );
    }

    console.log('Expired offers cleaned up.');
  } catch (error) {
    console.error('Error during offer cleanup:', error);
  }
});



app.use(session({
  secret: 'your-secret-key',
  resave: false, 
  saveUninitialized: true, 
  cookie: { secure: false } 
}));


app.use(passport.initialize());
app.use(passport.session());

//--------view engine -----------

app.set('view engine','ejs');
app.set('views',path.join(__dirname,'/views'));
app.use(express.static(path.join(__dirname,'public')));

app.use('/',userRoutes);
app.use('/admin',adminRoutes);


//----------port--------------------

app.listen(PORT,()=>{
    console.log(`server is running on http://localhost:${PORT}`)
})


