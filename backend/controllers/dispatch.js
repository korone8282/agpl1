require("dotenv").config();
const Packed = require('../models/packedModel')
const Data = require('../models/dataModel')
const Dispatch = require('../models/dispatchModel')

exports.readDispatch = async(req,res) => {
    try {
                                    
                  
        const existData = await Dispatch.find({}).sort({lDate: -1 });

             if(!existData.length){
               return res.status(404).json({
              message:"data doesn't exists",
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

exports.readPacked = async(req,res) => {
    try {
                                    
                  
        const existData = await Packed.find({});

             if(!existData.length){
               return res.status(404).json({
              message:"data doesn't exists",
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


exports.updateData = async(req,res)=>{
    try {

        const {filling,i,product,id,packed,box,issue,element} = req.body;
        const data = await Data.findById(req.params.id);

        if(!data){
            return res.status(404).json({
                success:false,
                data:"no data exists",
            }); 
        }

       const index = data.dataList.findIndex( obj => obj.buyerName === element.buyerName && obj.productName === element.productName && obj.batch === element.batch)

        data.dataList[index].pouchQuantity = filling ||  data.dataList[index].pouchQuantity;

        if(packed && issue && box){

        data.dataList[index].pouchPerCycle = parseInt(packed) + (data.dataList[index].pouchPerCycle || 0);
        data.dataList[index].retortCycle = parseInt(box) + (data.dataList[index].retortCycle || 0);

           await Packed.create({
                buyerName:data.dataList[index].buyerName,
                productName:data.dataList[index].productName,
                batch:data.dataList[index].batch,
                packSize:data.dataList[index].packSize,
                pouchPacked:packed,
                box,
                lDate:issue,
            })
        }
        
        const updatedData = await data.save();

        res.status(200).json({
            success:true,
            data:updatedData,
            message:"data successfully updated",
        }) 

    } catch (error) {
    console.log(error);
        res.status(500).json({
            success:false,
            data:error,
    });
    }
}           

exports.readPackedReport = async(req,res) => {
    try {                         
                  
        const {start,end} = req.body;
                    
        const startDate = new Date(start);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(end);
        endDate.setHours(23, 59, 59, 999);

        const existData = await Packed.find({ 
        lDate:{
            $gte:startDate,
            $lte:endDate
        },});

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

exports.readDispatchedReport = async(req,res) => {
    try {                         
                  
        const {start,end} = req.body;
                    
        const startDate = new Date(start);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(end);
        endDate.setHours(23, 59, 59, 999);

        const existData = await Dispatch.find({ 
        lDate:{
            $gte:startDate,
            $lte:endDate
        },}).sort({lDate: -1 });;

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