require("dotenv").config();
const Container = require('../models/containerModel');
const Data = require('../models/dataModel');

exports.createData = async(req,res) => {
    try {
        let list = [];
        let type = 'Export';
        let priority = 1;

        if (Array.isArray(req.body)) {
            list = req.body;
        } else if (req.body && typeof req.body === 'object') {
            list = req.body.list || req.body.arr || [];
            if (req.body.type) type = req.body.type;
            if (req.body.priority !== undefined && req.body.priority !== null && req.body.priority !== '') {
                priority = Number(req.body.priority) || 1;
            }
        }

        const {name} = req.params;
        const containerName = (req.body && req.body.name) ? req.body.name : name;

        if(!list.length){
            return res.status(400).json({
                message:"Empty Entry Submitted",
            });
        }
    
        const newData = await Container.create({
            name: containerName,
            type: type === 'Domestic' ? 'Domestic' : 'Export',
            priority: Number(priority) || 1,
            list: list,
        });
    
        res.status(200).json({
            success:true,
            data:newData,
            message:"Data created"
        });
    } catch (error) {
        console.log(error);
        res.status(400).json({
            message: error?.message || error
        });
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

exports.updateContainer = async(req,res) => {
    try {
        const { exportId } = req.params;
        const { priority, type, name } = req.body;
        const updateFields = {};
        if (priority !== undefined && priority !== null && priority !== '') {
            updateFields.priority = Number(priority) || 1;
        }
        if (type) {
            updateFields.type = type === 'Domestic' ? 'Domestic' : 'Export';
        }
        if (name) {
            updateFields.name = name;
        }

        const updated = await Container.findByIdAndUpdate(exportId, updateFields, { new: true });
        if (!updated) {
            return res.status(404).json({ message: "Container not found" });
        }
        res.status(200).json({ success: true, data: updated, message: "Container updated" });
    } catch (error) {
        console.log(error);
        res.status(400).json({ message: error?.message || error });
    }
};
