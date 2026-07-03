const express = require('express');
const router = express.Router();
const formidable = require("express-formidable");
require("dotenv").config();
const {signup,login,logout,
       getAllUsers,
       getCurrentUser,
       updateProfile,
       deleteUser,
       userId,
       sendOtp,
       loginOtp,
       sendVerifyOtp, 
       googleLogin} = require('../controllers/auth');
const {authorization,authAdmin} = require('../middlewares/authorization');

router.post('/login',login);
router.post("/googleLogin",googleLogin)
router.route("/signup").post(signup);
router.post("/logout",logout);
router.route("/getAllUsers").get(getAllUsers);
router.get("/profile/:id",getCurrentUser).put("/profile/:id",formidable(),updateProfile);
router.route("/:id").delete(authorization,authAdmin,deleteUser).get(userId);
router.post("/otpEntry",sendOtp);
router.post("/otpLogin",loginOtp);
router.post("/verifyOtp",sendVerifyOtp);

module.exports = router;
