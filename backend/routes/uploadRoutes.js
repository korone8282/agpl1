const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
    destination: (req,file,cb) => {
        cb(null, '../public/uploads/');
    },
    filename: (req,file,cb) => {
       const extname = path.extname(file.originalname);
       cb(null, `${file.fieldname}_${Date.now()}${extname}`) 
    }
})

const fileFilter = (req,file,cb) => {
    const filetypes = /jpe?g|png|webp/;
    const mimetypes = /image\/jpe?g|image\/png|image\/webp/;

    const extname = path.extname(file.originalname).toLowerCase();
    const mimetype = file.mimetype;

    if(filetypes.test(extname) && mimetypes.test(mimetype)){
        cb(null,true);
    } else {
        cb(new Error("images only"),false);
    }
}

const upload = multer({storage,fileFilter});
const uploadSingleImage = upload.single("image");

router.post("/",(req,res)=>{

    uploadSingleImage(req, res , (err) =>{
        if(err){
            res.status(400).json({message:err});
        } else if (req.file) {
            res.status(200).json({
                image:`${req.file.path}`,
                message:"successfull image upload"})
        } else {
            res.status(400).json({message:"No image file provided"});
        }

    })
})

module.exports = router;