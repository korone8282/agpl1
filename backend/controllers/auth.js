const User = require('../models/userModel');
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const otpGen = require('otp-generator');
const OtpModel = require('../models/otpModel');
const VerfiyOtpModel = require('../models/verifyOtp');

require("dotenv").config();

exports.sendOtp = async(req,res) => {
    try {
        const {email} = req.body;

        const existUser = await User.findOne({email});

        if(!existUser){
            return res.status(400).json({
                message:'Invalid info',
                success:false,
            })
        }

        var otp = otpGen.generate(4,{
            upperCaseAlphabets:false,
            lowerCaseAlphabets:false,
            specialChars:false,
        })
        
        const entry = await OtpModel.create({
            email:existUser.email,
            otp,
        })

        res.status(200).json({
            success:true,
            entry,
            message:"Otp Sent",
        });

    } catch (error) {
       return res.status(403).json({
            success:false,
            message:"error sending otp"
         });
        }
}

exports.sendVerifyOtp = async(req,res) => {
    try {

        const {email} = req.body;

        const existUser = await User.findOne({email});

        if(existUser){
            return res.status(400).json({
                message:'Already Registered',
                success:false,
            })
        }

        var otp = otpGen.generate(4,{
            upperCaseAlphabets:false,
            lowerCaseAlphabets:false,
            specialChars:false,
        })
        
        const entry = await VerfiyOtpModel.create({
            email:email,
            otp,
        })

        res.status(200).json({
            success:true,
            entry,
            message:"Otp Sent",
        });

    } catch (error) {
       return res.status(403).json({
            success:false,
            message:"error sending verification otp"
         });
        }
}

exports.loginOtp = async(req,res) =>{
try {
    const {email,otp} = req.body
    const newOtp = otp.join("");
    
    let existUser = await User.findOne({email});

    const recentOtp = await OtpModel.findOne({email}).sort({createdAt:-1}).limit(1);

    if(recentOtp.otp.length == 0){
        return res.status(400).json({
            message:'Otp not found',
            success:false,
        })
    }

    if(recentOtp.otp!==newOtp){
        return res.status(400).json({
            message:'invalid Otp',
            success:false,
        })
    }

    var token1 = jwt.sign({
        email:existUser.email,
        id:existUser.id,
        isAdmin:existUser.isAdmin,
    },
    process.env.JWT_SECRET,
    {expiresIn:"3h"}
    );

    existUser = existUser.toObject();
    existUser.token = token1;
    existUser.password=" ";

      res.status(200).json({
        success:true,
        existUser,
        token1,
        message:"logged in"
    });

} catch (error) {
    return res.status(403).json({
        success:false,
        message:"error logging in"
     });
}
}

exports.signup = async(req,res) => {

  try{
    
    let {fname,email,password,confirmPassword,otp} = req.body;
    const newOtp = otp.join("");

    if(!fname||!email||!password||!confirmPassword||!newOtp){
        res.status(500).json({
            success:false,
            message:"Fill all the fields"
        });
        return;
    }


    const existUser = await User.findOne({email});

    if(existUser){
      return  res.status(500).json({
            success:false,
            data:"User exists",
        });
    }

    if(password!==confirmPassword){
        res.status(500).json({
            success:false,
            data:"pass don't match",
        });
        return;
    }

    const recentOtp = await VerfiyOtpModel.findOne({email}).sort({createdAt:-1}).limit(1);

    if(recentOtp.otp.length == 0){
        return res.status(400).json({
            message:'Otp not found',
            success:false,
        })
    }

    if(recentOtp.otp!==newOtp){
        return res.status(400).json({
            message:'Invalid Otp',
            success:false,
        })
    }

    let hashPass;
    try{
        hashPass=await bcrypt.hash(password,10);
    }catch(e){
        console.log(e);
    return res.status(500).json({
        success:false,
        data:"error in hashing",
    });
    }

    // newUser = User.create({})  await newUser.save()
    const newUser = await User.create({
        fname,
        email,
        password:hashPass,
        image:`https://api.dicebear.com/7.x/initials/svg?seed=${fname} ${fname}`
    })
    res.status(200).json({
        success:true,
        data:newUser,
        message:"signup successsfull"
    });
  } catch(e){
    console.log(e);
    res.status(500).json({
        success:false,
        data:"error",
    });
  } 
}

exports.googleLogin = async(req,res) =>{
    
    try{

        const {token} = req.body;
        const {email,picture,name,jti} =  jwt.decode(token,process.env.JWT_SECRET);

        let existUser = await User.findOne({email});

        if(!existUser){
            let hashPass;
            try{
                hashPass=await bcrypt.hash(jti,10);
            }catch(e){
                console.log(e);
            return res.status(500).json({
                success:false,
                data:"error in hashing",
            });
            }
        
            // newUser = User.create({})  await newUser.save()
            const newUser = await User.create({
                fname:name,
                email:email,
                password:hashPass,
                image:`https://api.dicebear.com/7.x/initials/svg?seed=${name} ${name}`
            })
            return res.status(200).json({
                success:true,
                data:newUser,
                message:"signup successsfull"
            });
            } else {
                var token1 = jwt.sign({
                                    email:existUser.email,
                                    id:existUser.id,
                                    isAdmin:existUser.isAdmin,
                                },
                                process.env.JWT_SECRET,
                                {expiresIn:"3h"}
                                );
                
            existUser = existUser.toObject();
            existUser.token = token1;
            existUser.password=" ";

              res.status(200).json({
                success:true,
                existUser,
                token1,
                message:"logged in"
            });
                            }
        } catch(e){
    console.log(e);
    res.status(500).json({
        success:false,
        data:"error",
    });
    }
   
}

exports.login = async(req,res) =>{
    
    try{

        const {email,password} = req.body;

        if(!email||!password){
            res.status(500).json({
                success:false,
                data:"fill all fields",
            });
            return;
        }

        let existUser = await User.findOne({email});

        if(!existUser){
   return res.status(500).json({
        success:false,
        data:"no such user",
    });
        }
        //payload
        if(await bcrypt.compare(password,existUser.password)){
            var token = jwt.sign({
                email:existUser.email,
                id:existUser.id,
                isAdmin:existUser.isAdmin,
            },
            process.env.JWT_SECRET,
            {expiresIn:"3h"}
            );

            existUser = existUser.toObject();
            existUser.token = token;
            existUser.password=" ";
            
              res.status(200).json({
                success:true,
                existUser,
                token,
                message:"logged in"
            });
        }
        else{
            res.status(403).json({
                success:false,
                message:"wrong pass"
             });
             return;
        }


        } catch(e){
    console.log(e);
    res.status(500).json({
        success:false,
        data:"error",
    });
    }
   
}

exports.logout = async(req,res) =>{
    try{
        res.cookie('cookie1',"",{
            httpOnly:true,
            expires: new Date(0),
        });

        res.status(200).json({
            message:"logged out",
        });
         
    }catch(e){
        console.log(e);
        res.status(500).json({
            success:false,
            data:"error",
        });
    }
}

exports.getAllUsers = async(req,res) =>{
    try{
        const users = await User.find({});

            res.status(200).json({
                message:"success",
                users,
            })
        }catch(e){
        console.log(e);
        res.status(500).json({
            success:false,
            data:"error",
        }); 
    }
}
 
exports.getCurrentUser = async(req,res) =>{

    try{
        const user = await User.findById(req.params.id);

        if(!user){
           res.status(404).json({
               success:false,
               data:"no user exists",
           }); 
           return;
        }

        res.status(200).json({
         success:true,
         data:user,
        });

    }catch(e){
        console.log(e);
        res.status(500).json({
            success:false,
            data:"error",
    });
}

}

exports.updateProfile = async(req,res) =>{
try{

    const user = await User.findById(req.params.id);

    const {fname,dob,gender,image,about} = req.fields;

        if(!user){
            return res.status(404).json({
                success:false,
                data:"no user exists",
            }); 
        }

        user.fname = fname || user.fname;
        user.dob = dob || user.dob;
        user.gender = gender || user.gender;
        user.image = image || user.image;
        user.about = about || user.about;


        const updatedUser  = await user.save();

        res.status(200).json({
            success:true,
            message:"product succesfully updated",
            updatedUser
        })


}catch(e){
    console.log(e);
        res.status(500).json({
            success:false,
            data:"error",
    });
}
}

exports.deleteUser = async(req,res) =>{
    try{
       
        const user = await User.findById(req.params.id);

        if(!user){
            res.status(404).json({
                success:false,
                data:"no user exists",
            }); 
            return;
        }


        if(user.isAdmin){
            res.status(400).json({
                message:"can't delete admin"
            })
            return;
        }

        await User.findOneAndDelete({_id:user._id});

        res.status(200).json({
            success:true,
            message:"successfully deleted",
        })

    }catch(e){
        console.log(e);
        res.status(500).json({
            success:false,
            data:"error",
    });
    }
}

exports.userId = async(req,res) =>{
    try{
       
        const user = await User.findById(req.params.id).select('-password');

        if(!user){
            res.status(404).json({
                success:false,
                data:"no user exists",
            }); 
            return;
        }

        res.status(200).json({
            success:true,
            user,
        })

    }catch(e){
        console.log(e);
        res.status(500).json({
            success:false,
            data:"error",
    });
    }
}