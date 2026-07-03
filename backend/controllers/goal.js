require("dotenv").config();
const Goal = require('../models/goalModel');

exports.createGoal = async(req,res) => {
try {
    const{
    buyerName,
    fname,
    batchNum,
    pouchSize,
    pouchGoal,
    day,
    date,
} = req.body;

if(!buyerName||!fname||!batchNum||!pouchSize||!pouchGoal||!date||!day){
    return res.status(500).json({
        message:"Fill All Blanks",
    });
}

    const newDate = new Date(date);

    const newGoal = await Goal.create({
        buyerName,
        fname,
        batchNum,
        pouchSize,
        pouchGoal,
        pouchPacked : 0,
        day,
        createdAt:newDate
    });

    res.status(200).json({
        success:true,
        data:newGoal,
        message:"Goal created"
    });


} catch (error) {
    console.log(error);
    res.status(400).json({
        message:error
    })
}
}

exports.updateGoal = async(req,res) => {
    try {
        const {
            buyerName,
            fname,
            batchNum,
            pouchSize,
            pouchGoal,
            pouchPacked,
            day,
        } = req.body;

        const {goalId} = req.params;
        
        const existGoal = await Goal.findOne({_id:goalId});

        if(!existGoal){
          return res.status(500).json({
                message:"Goal doesn't exists",
            });
        }
        
        existGoal.buyerName = buyerName || existGoal.buyerName;
        existGoal.fname = fname || existGoal.fname;
        existGoal.batchNum = batchNum || existGoal.batchNum;
        existGoal.pouchSize = pouchSize || existGoal.pouchSize;
        existGoal.pouchGoal = pouchGoal || existGoal.pouchGoal;
        existGoal.pouchPacked = pouchPacked || existGoal.pouchPacked;
        existGoal.day = day || existGoal.day;

        const updatedGoal = await existGoal.save();


        res.status(200).json({
            success:true,
            data:updatedGoal,
            message:"Goal updated"
        });
    
    } catch (error) {
        console.log(error);
        res.status(400).json({
            message:error
        })
    }
    }

exports.deleteGoal = async(req,res) => {
        try {

            const {goalId} = req.params;
       
        const existGoal = await Goal.findOne({_id:goalId});
    
        if(!existGoal){
          return res.status(500).json({
                message:"goal doesn't exists",
            });
        }   
            
             await Goal.findOneAndDelete({_id:goalId});
            
            res.status(200).json({
                success:true,
                message:"Goal deleted"
            });
        
        } catch (error) {
            console.log(error);
            res.status(400).json({
                message:error
            })
        }
        }

exports.goalList = async(req,res) => {
            try {

            const {date} = req.params;

            const startDate = new Date(date);
            startDate.setHours(0, 0, 0, 0);
            const endDate = new Date(date);
            endDate.setHours(23, 59, 59, 999);
        
            const existData = await Goal.find({createdAt:{
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
                });
            
            } catch (error) {
                console.log(error);
                res.status(400).json({
                    message:error
                })
            }
            }
