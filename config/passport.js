const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../model/userModel'); 

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,  
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "https://audioverse.store/auth/google/callback"
  },
  async (accessToken, refreshToken, profile, done) => { 
    try {
      const email = profile.emails[0].value;
      let user = await User.findOne({ email: email });
      if (!user) {
        user = new User({
          email: email,
          name: profile.displayName,
          isGoogleAuth:true
        });
        await user.save();
      }
      return done(null, user);
    } catch (error) {
      console.log(error);
      return done(error, null); 
    }
  }
));

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

module.exports = passport;
