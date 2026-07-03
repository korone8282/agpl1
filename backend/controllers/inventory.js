require("dotenv").config();
const Inventory = require('../models/inventoryModel');
const Report = require('../models/reportModel')

exports.readInventory = async(req,res) => {
    try {
                                    
                  
        const existData = await Inventory.find({});

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


exports.addInventory = async(req,res) => {
    try {
                                    
        const{pDate,name,unit,stock,rate,equipment,section,lDate} = req.body;

        if(!name||!stock){
            return res.status(500).json({
                message:"Fill rate,unit,equipment etc.",
            });
        }
    
        const existItem = await Inventory.findOne({name:name});

        if(existItem){
          return res.status(500).json({
                message:"item already exists",
            });
        }

        const newItem = await Inventory.create({
            pDate,
            name,
            unit,
            stock,
            rate,
            quant:stock,
            equipment,
            section,
            lDate,
        })
                                                
                res.status(200).json({
                    success:true,
                    data:newItem
                })
                                                    
                    } catch (error) {
                        console.log(error);
                        res.status(400).json({
                        message:error
                                })
                                    }
                                            }


exports.deleteInventory = async(req,res) => {
    try {
                                    
        const {inventoryId} = req.params;
       
        const existItem = await Inventory.findOne({_id:inventoryId});

        if(!existItem){
          return res.status(500).json({
                message:"category doesn't exists",
            });
        }   
            
             await Inventory.findOneAndDelete({_id:inventoryId});
                                                
                res.status(200).json({
                    success:true,
                })
                                                    
                    } catch (error) {
                        console.log(error);
                        res.status(400).json({
                        message:error
                                })
                                    }
                                            }


exports.updateInventory = async(req,res) => {
    try {
                                
        const{pDate,name,unit,stock,rate,equipment,section,lDate} = req.body;
        const {inventoryId} = req.params;
        
        const existItem = await Inventory.findOne({_id:inventoryId});

        if(!existItem){
          return res.status(500).json({
                message:"category doesn't exists",
            });
        }

        if(stock && !section && !lDate && !equipment){
            return res.status(500).json({
                  message:"Fill Section Equipment and Last Issue Date",
              });
          }
 
        if(existItem.stock>stock){

          await Report.create({
                pDate: lDate,
                name: existItem.name,
                unit: existItem.unit,
                count: existItem.stock-stock,
                rate: existItem.rate,
                equipment: equipment || existItem.equipment,
                section: section || existItem.section,
            })
        }
        
        existItem.name = name || existItem.name;
        existItem.unit= unit || existItem.unit;
        existItem.stock = stock || existItem.stock;
        existItem.rate = rate || existItem.rate;
        existItem.equipment= equipment || existItem.equipment;
        existItem.pDate = pDate || existItem.pDate;
        existItem.section = section || existItem.section;
        existItem.lDate = lDate || existItem.lDate;

        const updatedItem = await existItem.save();
                          
                res.status(200).json({
                    success:true,
                    data:updatedItem,
                })
                                                    
                    } catch (error) {
                        console.log(error);
                        res.status(400).json({
                        message:error
                                })
                                    }
                                            }


exports.readReport = async(req,res) => {
    try {                         
                  
        const {start,end} = req.body;
                    
        const startDate = new Date(start);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(end);
        endDate.setHours(23, 59, 59, 999);

        const existData = await Report.find({ 
        pDate:{
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
