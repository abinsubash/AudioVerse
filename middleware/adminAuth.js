const isLogged=(req,res,next)=>{
    if(!req.session.adminLogged){
        return res.redirect("/admin/")
    }else{
        next()
    }
}

module.exports = {isLogged}