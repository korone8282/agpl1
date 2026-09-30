require("dotenv").config();
const Product = require('../models/productModel');
const Dispatch = require('../models/dispatchModel')
const Data = require('../models/dataModel')

exports.createProduct = async(req,res) => {
try {
    const{name} = req.body;
    const {buyer} = req.params;

    if(!name||!buyer){
        return res.json({error:"Name is required"});
    }

    const existProduct = await Product.find({buyer:buyer,name:name});

    if(existProduct.length){
      return res.status(500).json({
            message:"Product already exists",
        });
    }

    const newProduct = await Product.create({
        buyer,
        name,
    })

    for(let i=0; i<12;i++){
        newProduct.pouches.push({
            month:i+1,
            stock:0,
            remain:0,
        })
        newProduct.dispatched.push({
            month:i+1,
            dispatch:0,
            balance:0,
        })
    }

    await newProduct.save();

    res.status(200).json({
        success:true,
        data:newProduct,
        message:"Product created"
    });


} catch (error) {
    console.log(error);
    res.status(400).json({
        message:error
    })
}
}

exports.updateProduct = async(req,res) => {
    try {
   
        const {updatedName} = req.body;
        const {productId} = req.params;
 
        if(!updatedName){
            return res.json({error:"Name is required"});
        }
        
        const existProduct = await Product.findOne({_id:productId});

        if(!existProduct){
          return res.status(500).json({
                message:"Product doesn't exists",
            });
        }

        existProduct.name = updatedName;
        const updatedProduct = await existProduct.save();


        res.status(200).json({
            success:true,
            data:updatedProduct,
            message:"Category updated"
        });
    
    } catch (error) {
        console.log(error);
        res.status(400).json({
            message:error
        })
    }
    }

exports.deleteProduct = async(req,res) => {
        try {

            const {productId} = req.params;
       
        const existProduct = await Product.findOne({_id:productId});
    
        if(!existProduct){
          return res.status(500).json({
                message:"category doesn't exists",
            });
        }   
            
             await Product.findOneAndDelete({_id:productId});
            
            res.status(200).json({
                success:true,
                message:"Product deleted"
            });
        
        } catch (error) {
            console.log(error);
            res.status(400).json({
                message:error
            })
        }
        }

exports.productList = async(req,res) => {
            try {
    
                const products = await Product.find({});

                res.status(200).json({
                    success:true,
                    data:products,    
                });
            
            } catch (error) {
                console.log(error);
                res.status(400).json({
                    message:error
                })
            }
            }

exports.readProduct = async(req,res) => {
                try {
                      
                const existProduct = await Product.findOne({_id:req.params.id});
            
                if(!existProduct){
                  return res.status(500).json({
                        message:"Product doesn't exists",
                    });
                }
                    
            
                    res.status(200).json({
                        success:true,
                        data:existProduct,
                    });
                
                } catch (error) {
                    console.log(error);
                    res.status(400).json({
                        message:error
                    })
                }
                }


exports.updateDispProduct = async(req,res) => {
                try {
                      
                const existProduct = await Product.findOne({_id:req.params.id});
                    
                const {buyer,box,dispatched,issue,month,product} = req.body;

                const days = [31,29,31,30,31,30,31,31,30,31,30,31];
                    
                const startDate = new Date(`2026-${month}-01`);
                startDate.setHours(0, 0, 0, 0);
                const endDate = new Date(`2026-${month}-${days[month-1]}`);
                endDate.setHours(23, 59, 59, 999);

                const existData = await Data.find({createdAt:{
                    $gte:startDate,
                    $lte:endDate
                } });

                if(!existProduct){
                  return res.status(500).json({
                        message:"Product doesn't exists",
                    });
                }

                if(dispatched && issue && box){

                    existProduct.dispatched[month-1].dispatch = parseInt(dispatched) + (existProduct.dispatched[month-1].dispatch || 0);
                    existProduct.dispatched[month-1].balance = ( existData.reduce((acc,obj)=> acc+obj.dataList.filter(item=>item.productName === product && item.buyerName === buyer ).reduce( (accumulator, obj) => accumulator + obj.pouchPacked,0),0) -  existProduct.dispatched[month-1].dispatch ) 
            
                       await Dispatch.create({
                            buyerName:buyer,
                            productName:existProduct.name,
                            pouchDispatched:dispatched,
                            box,
                            lDate:issue,
                        })
                    
                    await existProduct.save();
                    }
                
                    res.status(200).json({
                        success:true,
                        message:"updateDispProduct"
                    });
                
                } catch (error) {
                    console.log(error);
                    res.status(400).json({
                        message:error
                    })
                }
                }


                exports.updatePouches = async(req,res) => {
                    try {
                          
                    const existProduct = await Product.findOne({_id:req.params.id});
                        
                    const {buyer,pouches,month,product,mode,date} = req.body;
                    const monthIndex = Number(month) - 1;
                    const qty = parseInt(pouches, 10);
    
                    const days = [31,29,31,30,31,30,31,31,30,31,30,31];
                        
                    const startDate = new Date(`2026-${month}-01`);
                    startDate.setHours(0, 0, 0, 0);
                    const endDate = new Date(`2026-${month}-${days[monthIndex]}`);
                    endDate.setHours(23, 59, 59, 999);
    
                    const existData = await Data.find({createdAt:{
                        $gte:startDate,
                        $lte:endDate
                    } });
    
                    if(!existProduct){
                      return res.status(500).json({
                            message:"Product doesn't exists",
                        });
                    }
    
                    if (pouches === undefined || pouches === null || pouches === "") {
                      return res.status(400).json({
                            message:"Pouch count is required",
                        });
                    }
    
                    if (Number.isNaN(qty)) {
                      return res.status(400).json({ message: "Invalid pouch count" });
                    }
    
                        const { filled, waste } = sumFillingUsage(existData, product, buyer);
                        const pouchMonth = existProduct.pouches[monthIndex];
                        if (!Array.isArray(pouchMonth.entries)) {
                            pouchMonth.entries = [];
                        }
    
                        if (mode === "add") {
                            if (!date) {
                              return res.status(400).json({ message: "Date is required to add pouches" });
                            }
                            pouchMonth.stock = (Number(pouchMonth.stock) || 0) + qty;
                            pouchMonth.entries.push({ date, quantity: qty });
                        } else {
                            // Update sets total Pouches (IN) for the month
                            pouchMonth.stock = qty;
                        }
    
                        // Ending balance = previous month's remain + stock - filled - waste
                        const prevBalance = monthIndex === 0
                            ? 0
                            : (Number(existProduct.pouches[monthIndex - 1]?.remain) || 0);
                        pouchMonth.remain = prevBalance + (Number(pouchMonth.stock) || 0) - filled - waste;
                        
                        await existProduct.save();
                    
                        res.status(200).json({
                            success:true,
                        });
                    
                    } catch (error) {
                        console.log(error);
                        res.status(400).json({
                            message:error
                        })
                    }
                    }

exports.updaterOne = async(req,res) => {
                try {
                   
                const existProduct = await Product.find({ });

                const days = [31,29,31,30,31,30,31,31,30,31,30,31];

                for(let i=1; i<13;i++){

                    const startDate = new Date(`2026-${i}-01`);
                    startDate.setHours(0, 0, 0, 0);
                    const endDate = new Date(`2026-${i}-${days[i-1]}`);
                    endDate.setHours(23, 59, 59, 999);

                    const existData = await Data.find({createdAt:{
                        $gte:startDate,
                        $lte:endDate
                    } });
 

                for(let index=0; index < existProduct.length ;index++){

                const newProduct = existProduct[index];

                newProduct.dispatched[i-1].balance = ( existData.reduce((acc,obj)=> acc+obj.dataList.filter(item=>item.productName === newProduct.name && item.buyerName === newProduct.buyer).reduce( (accumulator, obj) => accumulator + obj.pouchPacked,0),0) -  ( newProduct.dispatched[i-1].dispatch ? newProduct.dispatched[i-1].dispatch : 0 ))  
                   
                newProduct.pouches[i-1].remain = ((newProduct.pouches[i-1].stock ? newProduct.pouches[i-1].stock : 0) -  (existData.reduce((acc,obj)=> acc+obj.dataList.filter(item=>item.productName === newProduct.name && item.buyerName === newProduct.buyer).reduce( (accumulator, obj) => accumulator + obj.pouchQuantity,0),0) + existData.reduce((acc,obj)=> acc+obj.dataList.filter(item=>item.productName === newProduct.name && item.buyerName === newProduct.buyer).reduce( (accumulator, obj) => accumulator + obj.empty,0),0)))  

                await newProduct.save();

                    }     
                }

                    res.status(200).json({
                        success:true,
                    });
                
                } catch (error) {
                    console.log(error);
                    res.status(400).json({
                        message:error
                    })
                }
                }

