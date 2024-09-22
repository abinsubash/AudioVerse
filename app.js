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
require('./config/passport');
require('dotenv').config();

const PORT = process.env.PORT || 3000;

connectMongo(); 

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(nocache())

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
