require("dotenv").config();
const Data = require('../models/dataModel');

exports.createData = async(req,res) => {
try {

    const {string,dayTime} = req.params;

    const dataItems = req.body;
    const section = string.split("_")[0];
    const newdate = new Date(string.split("_")[1]);

     if(!dataItems.length){
       return res.status(400).json({
            message:"Empty Entry Submitted",
        })
     }

     const existData = await Data.find({
        createdAt:newdate,
        sectionMain:section,
        dayTime:dayTime
    });

        if(existData.length){
         return res.status(404).json({
         message:"Data for this date already exists",
         })
    }

    const newData = await Data.create({
        sectionMain: section,
        dataList: dataItems,
        dayTime:dayTime,
        createdAt:newdate,
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
    
        const {date,month} = req.params;

        const start = new Date(`2026-${month}-${date}`);
        start.setHours(0, 0, 0, 0);
        const end = new Date(`2026-${month}-${date}`);
        end.setHours(23, 59, 59, 999);

        const existData = await Data.find({createdAt:{
            $gte:start,
            $lte:end
        }});

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

exports.deleteData = async(req,res)=>{
    try {
        const data = await Data.findById(req.params.id);

        if(!data){
            res.status(404).json({
                success:false,
                data:"no product exists",
            }); 
            return;
        }
        
        await Data.findOneAndDelete({_id:req.params.id});

        
        res.status(200).json({
            success:true,
            message:"data successfully deleted",
        })

    } catch (error) {
    console.log(error);
        res.status(500).json({
            success:false,
            data:error,
    });
    }
}

exports.readBuyerData = async(req,res) => {
    try {

        const {start,end,buyer} = req.body;

        if(!start||!end||!buyer){
            res.status(400).json({
                success:false,
                data:"no data found"
    
            })
         }
    

        const startDate = new Date(start);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(end);
        endDate.setHours(23, 59, 59, 999);

        const existData = await Data.find({createdAt:{
            $gte:startDate,
            $lte:endDate
        },dataList:{ $elemMatch: { buyerName:buyer } } });

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

exports.readMonthlyData = async(req,res) => {
            try {

                const days = [31,29,31,30,31,30,31,31,30,31,30,31];

                const {month} = req.params;
        
                const startDate = new Date(`2026-${month}-01`);
                startDate.setHours(0, 0, 0, 0);
                const endDate = new Date(`2026-${month}-${days[month-1]}`);
                endDate.setHours(23, 59, 59, 999);

                const existData = await Data.find({createdAt:{
                    $gte:startDate,
                    $lte:endDate
                } });
        
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


exports.readDvN = async(req,res) => {
                    try {

                        const {start,end} = req.body;
                  
                        const startDate = new Date(start);
                        startDate.setHours(0, 0, 0, 0);
                        const endDate = new Date(end);
                        endDate.setHours(23, 59, 59, 999);
                
                        const existData = await Data.find({createdAt:{
                            $gte:startDate,
                            $lte:endDate
                        }}).sort({"createdAt": -1});
                      
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

exports.readKvF = async(req,res) => {
                            try {

                                const {datey} = req.body;

                                const startDate = new Date(datey);
                                startDate.setHours(0, 0, 0, 0);
                                const endDate = new Date(datey);
                                endDate.setHours(23, 59, 59, 999);

                                const existData = await Data.find({createdAt:{
                                    $gte:startDate,
                                    $lte:endDate,    
                                }});
                              
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


exports.ProductData = async(req,res) => {
                    try {

                        const {start,end,product} = req.body;

                        const startDate = new Date(start);
                        startDate.setHours(0, 0, 0, 0);
                        const endDate = new Date(end);
                        endDate.setHours(23, 59, 59, 999);

                        const existData = await Data.find({
                        createdAt:{
                            $gte:startDate,
                            $lte:endDate
                        },
                        dataList:{ $elemMatch: { productName:product.name ,buyerName:product.buyer}},
                         });

                            if(!existData.length){
                             return res.status(404).json({
                             message:"Data Doesn't Exists",
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
                                  
                         
exports.readLeft = async(req,res) => {
                            try {
                            
                                const startDate = new Date();

                                startDate.setHours(0, 0, 0, 0);

                                const endDate = new Date(startDate - 14 * 24 * 60 * 60 * 1000);

                                const existData = await Data.find({createdAt:{
                            $gte:endDate,
                            $lte:startDate
                        }}).sort({"createdAt": -1});

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
     
        
