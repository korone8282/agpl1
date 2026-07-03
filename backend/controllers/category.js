require("dotenv").config();
const Category = require('../models/categoryModel');

exports.createCategory = async(req,res) => {
try {
    const{name} = req.body;

    if(!name){
        return res.json({error:"Name is required"});
    }

    const existCategory = await Category.findOne({name});

    if(existCategory){
      return res.status(500).json({
            message:"category already exists",
        });
    }


    const newCategory = await Category.create({
        name,
    })
    res.status(200).json({
        success:true,
        data:newCategory,
        message:"Category created"
    });


} catch (error) {
    console.log(error);
    res.status(400).json({
        message:error
    })
}
}

exports.updateCategory = async(req,res) => {
    try {
   
       
        const {updatedName} = req.body;
        const {categoryId} = req.params;
 
        if(!updatedName){
            return res.json({error:"Name is required"});
        }
        
        const existCategory = await Category.findOne({_id:categoryId});

        if(!existCategory){
          return res.status(500).json({
                message:"category doesn't exists",
            });
        }
        
        existCategory.name = updatedName;
        const updatedCategory = await existCategory.save();


        res.status(200).json({
            success:true,
            data:updatedCategory,
            message:"Category updated"
        });
    
    } catch (error) {
        console.log(error);
        res.status(400).json({
            message:error
        })
    }
    }

exports.deleteCategory = async(req,res) => {
        try {

            const {categoryId} = req.params;
       
        const existCategory = await Category.findOne({_id:categoryId});
    
        if(!existCategory){
          return res.status(500).json({
                message:"category doesn't exists",
            });
        }   
            
             await Category.findOneAndDelete({_id:categoryId});
            
            res.status(200).json({
                success:true,

                message:"Category deleted"
            });
        
        } catch (error) {
            console.log(error);
            res.status(400).json({
                message:error
            })
        }
        }

exports.categoryList = async(req,res) => {
            try {
    
                const categories = await Category.find({});

                res.status(200).json({
                    success:true,
                    data:categories,    
                });
            
            } catch (error) {
                console.log(error);
                res.status(400).json({
                    message:error
                })
            }
            }

exports.readCategory = async(req,res) => {
                try {
                      
                const existCategory = await Category.findOne({_id:req.params.id});
                console.log(req.params.id);
            
                if(!existCategory){
                  return res.status(500).json({
                        message:"category doesn't exists",
                    });
                }
                    
            
                    res.status(200).json({
                        success:true,
                        data:existCategory,
                    });
                
                } catch (error) {
                    console.log(error);
                    res.status(400).json({
                        message:error
                    })
                }
                }