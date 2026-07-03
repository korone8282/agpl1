const User = require('../models/userModel');
const jwt = require("jsonwebtoken");
require("dotenv").config();

//authentication
exports.authorization = async(req,res,next)=>{
try{
                           //cookie-name
    const token =  req.header("Authorization").replace("Bearer ", "")  ;

    if(!token){
        res.status(401).json({
            success:false,
            data:"no token"
        });
        return;
}

try{    
    //return payload of user
        const data =  jwt.verify(token,process.env.JWT_SECRET);
        // req.user = data;
        req.user = await User.findById(data.id).select("-password");

}catch(e){
    res.status(401).json({
        message:e,
        success:false,
        data:"invalid token"
    });
    
     return;
}

next();
}catch(e){
    console.log(e);
    res.status(500).json({
        success:false,
        data:"error",
        message:e.message
    });
}
}

//authorization
exports.authAdmin = (req,res,next) =>{
    if(req.user && req.user.isAdmin){
        next();
    }
    else{
        res.status(401).json({
            message:"Not authorized as an Admin"
        })
    }
}