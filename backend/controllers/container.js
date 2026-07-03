require("dotenv").config();
const Container = require('../models/containerModel');
const Data = require('../models/dataModel');

exports.createData = async(req,res) => {
    try {
 
        const arr = req.body;
        const {name} = req.params;

         if(!arr.length){
           return res.status(400).json({
                message:"Empty Entry Submitted",
            })
         }
    
        const newData = await Container.create({
            name,
            list: arr,
        })
    
        res.status(200).json({
            success:true,
            data:newData,
            message:"Data created"
        });
    
    
    } catch (error) {
        console.log(error);
        res.status(400).json({
            message:error
        })
    }
    }

exports.readData = async(req,res) => {
    try {
    
        const {start,end} = req.body;
        
        const startDate = new Date(start);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(end);
        endDate.setHours(23, 59, 59, 999);
      
        const existData = await Data.find({createdAt:{
            $gte:startDate,
            $lte:endDate
        }});

             if(!existData.length){
               return res.status(404).json({
              message:"Data doesn't exists",
                    })
                    }
      
                res.status(200).json({
                    success:true,
                    data:existData,
                })
                
        } catch (error) {
            console.log(error);
            res.status(400).json({
             message:error
        })
                }
         }

exports.readExport = async(req,res) => {
    try {

        const {exportId} = req.params;

        const existExport = await Container.findOne({_id:exportId});
    
        if(!existExport){
          return res.status(500).json({
                message:"Export doesn't exists",
            });
        }   
                                
                res.status(200).json({
                    success:true,
                    data:existExport,
                })
                
        } catch (error) {
            console.log(error);
            res.status(400).json({
             message:error
        })
                }
         }

exports.readAll = async(req,res) => {
    try {

        const existData = await Container.find({});

             if(!existData.length){
               return res.status(404).json({
              message:"Data doesn't exists",
                    })
                    }
                                
                res.status(200).json({
                    success:true,
                    data:existData,
                })
                
        } catch (error) {
            console.log(error);
            res.status(400).json({
             message:error
        })
                }
         }


exports.deleteExport = async(req,res) => {
        try {

            const {exportId} = req.params;
       
        const existExport = await Container.findOne({_id:exportId});
    
        if(!existExport){
          return res.status(500).json({
                message:"Export doesn't exists",
            });
        }   
            
             await Container.findOneAndDelete({_id:exportId});
            
            res.status(200).json({
                success:true,
                message:"Container deleted"
            });
        
        } catch (error) {
            console.log(error);
            res.status(400).json({
                message:error
            })
        }
        }
