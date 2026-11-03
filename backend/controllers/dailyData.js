require("dotenv").config();
const Data = require('../models/dataModel');

// Helper: parse any date string ("YYYY-MM-DD", "DD-MM-YYYY", day number, or Date) into Noon UTC (12:00:00.000Z)
// so it never shifts to the previous or next day across UTC / IST / US timezones.
function parseCalendarDate(input, fallbackMonth) {
    const now = new Date();
    const defaultYear = 2026;
    const defaultMonth = Number(fallbackMonth) || (now.getMonth() + 1);

    if (!input) {
        return {
            year: defaultYear,
            month: defaultMonth,
            day: now.getDate()
        };
    }

    const str = String(input).trim();
    // Match YYYY-MM-DD
    const ymd = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (ymd) {
        return {
            year: Number(ymd[1]),
            month: Number(ymd[2]),
            day: Number(ymd[3])
        };
    }

    // Match DD-MM-YYYY or DD/MM/YYYY
    const dmy = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
    if (dmy) {
        return {
            year: Number(dmy[3]),
            month: Number(dmy[2]),
            day: Number(dmy[1])
        };
    }

    // Plain day-of-month number (e.g. "17")
    if (/^\d{1,2}$/.test(str)) {
        return {
            year: defaultYear,
            month: defaultMonth,
            day: Number(str)
        };
    }

    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) {
        return {
            year: parsed.getUTCFullYear(),
            month: parsed.getUTCMonth() + 1,
            day: parsed.getUTCDate()
        };
    }

    return {
        year: defaultYear,
        month: defaultMonth,
        day: now.getDate()
    };
}

function getDayBoundsUTC(year, month, day) {
    const start = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
    const end = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
    const noon = new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));
    return { start, end, noon };
}

exports.createData = async(req,res) => {
try {

    const {string,dayTime} = req.params;

    const dataItems = req.body;
    const section = string.split("_")[0];
    const rawDatePart = string.split("_").slice(1).join("_");
    const { year, month, day } = parseCalendarDate(rawDatePart);
    const { start, end, noon: newdate } = getDayBoundsUTC(year, month, day);

     if(!dataItems.length){
       return res.status(400).json({
            message:"Empty Entry Submitted",
        })
     }

     const existData = await Data.find({
        createdAt: { $gte: start, $lte: end },
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
        const parsed = parseCalendarDate(date, month);
        const targetMonth = Number(month) || parsed.month;
        const { start, end } = getDayBoundsUTC(parsed.year || 2026, targetMonth, parsed.day);

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

function escapeRegex(str) {
    return String(str || '').trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildTrimmedRegex(str) {
    return new RegExp(`^\\s*${escapeRegex(str)}\\s*$`, 'i');
}

exports.readBuyerData = async(req,res) => {
    try {

        const {start,end,buyer} = req.body;

        if(!start||!end||!buyer){
            return res.status(400).json({
                success:false,
                data:"no data found"
    
            })
         }
    
        const sParsed = parseCalendarDate(start);
        const eParsed = parseCalendarDate(end);
        const startDate = getDayBoundsUTC(sParsed.year, sParsed.month, sParsed.day).start;
        const endDate = getDayBoundsUTC(eParsed.year, eParsed.month, eParsed.day).end;

        const existData = await Data.find({createdAt:{
            $gte:startDate,
            $lte:endDate
        },dataList:{ $elemMatch: { buyerName: buildTrimmedRegex(buyer) } } });

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
                const m = Number(month);
                const startDate = new Date(Date.UTC(2026, m - 1, 1, 0, 0, 0, 0));
                const endDate = new Date(Date.UTC(2026, m - 1, days[m - 1], 23, 59, 59, 999));

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
                  
                        const sParsed = parseCalendarDate(start);
                        const eParsed = parseCalendarDate(end);
                        const startDate = getDayBoundsUTC(sParsed.year, sParsed.month, sParsed.day).start;
                        const endDate = getDayBoundsUTC(eParsed.year, eParsed.month, eParsed.day).end;
                
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

                                const parsed = parseCalendarDate(datey);
                                const { start: startDate, end: endDate } = getDayBoundsUTC(parsed.year, parsed.month, parsed.day);

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

                        if (!start || !end || !product || (!product.name && !product.buyer)) {
                            return res.status(400).json({
                                message: "Missing date range or product/buyer selection",
                            });
                        }

                        const sParsed = parseCalendarDate(start);
                        const eParsed = parseCalendarDate(end);
                        const startDate = getDayBoundsUTC(sParsed.year, sParsed.month, sParsed.day).start;
                        const endDate = getDayBoundsUTC(eParsed.year, eParsed.month, eParsed.day).end;

                        const elemMatchQuery = {};
                        if (product.buyer && String(product.buyer).trim()) {
                            elemMatchQuery.buyerName = buildTrimmedRegex(product.buyer);
                        }
                        if (product.name && String(product.name).trim() && String(product.name).trim().toUpperCase() !== 'ALL') {
                            elemMatchQuery.productName = buildTrimmedRegex(product.name);
                        }

                        const existData = await Data.find({
                            createdAt: {
                                $gte: startDate,
                                $lte: endDate
                            },
                            dataList: { $elemMatch: elemMatchQuery },
                        }).sort({ createdAt: 1 });

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
                            
                                const now = new Date();
                                const upperDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));
                                const lowerDate = new Date(upperDate.getTime() - 14 * 24 * 60 * 60 * 1000);
                                lowerDate.setUTCHours(0, 0, 0, 0);

                                const existData = await Data.find({createdAt:{
                                    $gte:lowerDate,
                                    $lte:upperDate
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
     
        
