const User = require('../model/userModel');

// const isLogged = async (req,res,next)=>{

// }

const isBlocked = async(req,res,next)=>{
    try{
        if(!req.session.userExist){
            next()
        }else{
            const user = await User.findOne({_id:req.session.userExist._id});
            if(user.isBlocked){
                delete req.session.userExist;
                res.redirect("/login")
            }else{
                next();
            }
            
        }
    }catch(error){
        console.log(error)
    }
}
    const isLogin = async (req,res,next)=>{
        if(req.session.userExist){
            const user = await User.findOne({_id:req.session.userExist._id});
            if(!user.isBlocked){
                next()
            }else{
                res.redirect('/login')
            }
            
        }else{
            res.redirect('/login')
        }
    }

  const isLogout = async (req, res, next) => {
    try {
        if (req.session.userExist) {
            if(req.session.userExist.isBlocked){
                res.redirect("/login")
            }
            return res.redirect('/');
        } else {
            next();
        }
    } catch (error) {
        res.send(error.message);
    }
};
module.exports = {isLogout,isBlocked,isLogin}