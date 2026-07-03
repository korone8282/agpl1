require("dotenv").config();
const Data = require('../models/dataModel');

exports.readGraph = async(req,res) => {
    try {
 
        const {month} = req.params;

        const arr = [];

        let flag = 0;
 
        for(let i=1;i<32;i++){

            const start = new Date(`2026-${month}-${i}`);
            start.setHours(0, 0, 0, 0);
            const end = new Date(`2026-${month}-${i}`);
            end.setHours(23, 59, 59, 999);

            const existData = await Data.find({createdAt:{
                $gte:start,
                $lte:end
            }});

            existData.length ? ( arr.push(existData), flag = 1 ) : arr.push([])

        }

        if(!flag){
            return res.status(404).json({
                message:"data doesn't exists",
                })
        }
                    
         res.status(200).json({
            success:true,
            data:arr,
        })
                
        } catch (error) {
            console.log(error);
            res.status(400).json({
             message:error
        })
                }
         }

exports.monthlyGraph = async(req,res) => {
            try {
                
                const days = [31,29,31,30,31,30,31,31,30,31,30,31];

                const arr = [];

                let flag = 0;

                for(let i=1;i<13;i++){
 
                const startDate = new Date(`2026-${i}-01`);
                startDate.setHours(0, 0, 0, 0);
                const endDate = new Date(`2026-${i}-${days[i-1]}`);
                endDate.setHours(23, 59, 59, 999);

                const existData = await Data.find({createdAt:{
                    $gte:startDate,
                    $lte:endDate
                } });

                existData.length ? ( arr.push(existData), flag =1  ) : arr.push([])

                }

                if(!flag){
                    return res.status(404).json({
                        message:"data doesn't exists",
                        })
                }

                 res.status(200).json({
                    success:true,
                    data:arr,
                })
                        
                } catch (error) {
                    console.log(error);
                    res.status(400).json({
                     message:error
                })
                        }
                }
