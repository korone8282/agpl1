require("dotenv").config();
const Product = require('../models/productModel');
const Dispatch = require('../models/dispatchModel');
const Data = require('../models/dataModel');
const UniversalPouch = require('../models/universalPouchModel');

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


function normStr(s) {
    return String(s || '').trim().toLowerCase();
}

exports.updateDispProduct = async(req,res) => {
                try {
                      
                const existProduct = await Product.findOne({_id:req.params.id});
                    
                const {buyer,box,dispatched,issue,month,product} = req.body;

                const days = [31,29,31,30,31,30,31,31,30,31,30,31];
                const mIdx = Number(month) - 1;
                const startDate = new Date(Date.UTC(2026, mIdx, 1, 0, 0, 0, 0));
                const endDate = new Date(Date.UTC(2026, mIdx, days[mIdx] || 31, 23, 59, 59, 999));

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
                    existProduct.dispatched[month-1].balance = ( existData.reduce((acc,obj)=> acc+(obj.dataList || []).filter(item=>normStr(item.productName) === normStr(product) && normStr(item.buyerName) === normStr(buyer) ).reduce( (accumulator, obj) => accumulator + (Number(obj.pouchPacked) || 0),0),0) -  existProduct.dispatched[month-1].dispatch ) 
            
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


function normalizePackSize(val) {
    if (!val && val !== 0) return '';
    const s = String(val).trim().toLowerCase();
    const num = parseFloat(s.replace(/[^0-9.]/g, ''));
    if (isNaN(num) || num <= 0) return s;
    if (s.includes('kg') || num < 5) {
        // e.g. 0.14 kg -> 140g, 0.25 -> 250g
        const grams = Math.round(num * 1000);
        return `${grams}g`;
    }
    const grams = Math.round(num);
    return `${grams}g`;
}

function sumFillingUsage(existData, productName, buyerName, pouchType = 'exclusive', packSize = '') {
    let filled = 0;
    let waste = 0;
    const pNorm = normStr(productName);
    const bNorm = normStr(buyerName);
    const sizeNorm = normalizePackSize(packSize);

    existData
        .filter((doc) => doc.sectionMain === "Filling")
        .forEach((doc) => {
            (doc.dataList || []).forEach((item) => {
                if (pouchType === 'universal' && sizeNorm) {
                    // Universal pouch deduction: deducted based on pack size whatever the product
                    const itemSize = normalizePackSize(item.packSize);
                    const itemBuyerNorm = normStr(item.buyerName);
                    // Match buyer if specified for buyer-specific shared packaging (e.g. Buyer C fixed 140g packaging)
                    const buyerMatch = !bNorm || itemBuyerNorm === bNorm || bNorm === 'universal' || bNorm === 'general';
                    if (itemSize === sizeNorm && buyerMatch) {
                        filled += Number(item.pouchQuantity) || 0;
                        waste += Number(item.empty) || 0;
                    }
                } else {
                    // Exclusive pouch deduction: using buyer name and product name (no changes)
                    if (normStr(item.productName) === pNorm && normStr(item.buyerName) === bNorm) {
                        filled += Number(item.pouchQuantity) || 0;
                        waste += Number(item.empty) || 0;
                    }
                }
            });
        });
    return { filled, waste };
}

exports.updatePouches = async(req,res) => {
    try {
        const existProduct = await Product.findOne({_id:req.params.id});
        const {buyer,pouches,month,product,mode,date} = req.body;
        const monthIndex = Number(month) - 1;
        const qty = parseInt(pouches, 10);

        if(!existProduct){
            return res.status(500).json({ message:"Product doesn't exist" });
        }

        if (pouches === undefined || pouches === null || pouches === "") {
            return res.status(400).json({ message:"Pouch count is required" });
        }

        if (Number.isNaN(qty)) {
            return res.status(400).json({ message: "Invalid pouch count" });
        }

        const days = [31,29,31,30,31,30,31,31,30,31,30,31];
        const startDate = new Date(Date.UTC(2026, monthIndex, 1, 0, 0, 0, 0));
        const endDate = new Date(Date.UTC(2026, monthIndex, days[monthIndex] || 31, 23, 59, 59, 999));

        const existData = await Data.find({
            createdAt: { $gte: startDate, $lte: endDate }
        });

        const isUniversal = existProduct.pouchType === 'universal' && existProduct.packSize;
        const targetSize = normalizePackSize(existProduct.packSize);

        // Find all sibling products if this is a shared universal pouch
        const sharedProducts = isUniversal
            ? await Product.find({
                pouchType: 'universal',
                $or: [
                    { packSize: existProduct.packSize },
                    { packSize: targetSize }
                ],
                ...(existProduct.buyer ? { buyer: existProduct.buyer } : {})
            })
            : [existProduct];

        for (const prod of sharedProducts) {
            const pouchMonth = prod.pouches[monthIndex];
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
                pouchMonth.stock = qty;
            }

            const { filled, waste } = sumFillingUsage(
                existData,
                prod.name,
                prod.buyer,
                prod.pouchType,
                prod.packSize
            );

            const prevBalance = monthIndex === 0
                ? 0
                : (Number(prod.pouches[monthIndex - 1]?.remain) || 0);
            pouchMonth.remain = prevBalance + (Number(pouchMonth.stock) || 0) - filled - waste;
            await prod.save();
        }

        // Also sync UniversalPouch record if universal
        if (isUniversal) {
            let uPouch = await UniversalPouch.findOne({
                packSize: targetSize,
                buyer: existProduct.buyer || ''
            });
            if (!uPouch) {
                uPouch = new UniversalPouch({
                    name: `Universal ${targetSize} Pouch`,
                    packSize: targetSize,
                    buyer: existProduct.buyer || '',
                    pouches: UniversalPouch.createDefaultMonths()
                });
            }
            const uMonth = uPouch.pouches[monthIndex];
            uMonth.stock = existProduct.pouches[monthIndex].stock;
            uMonth.entries = existProduct.pouches[monthIndex].entries;
            uMonth.remain = existProduct.pouches[monthIndex].remain;
            await uPouch.save();
        }

        res.status(200).json({ success: true });
    } catch (error) {
        console.log(error);
        res.status(400).json({ message: error.message || error });
    }
};

exports.updaterOne = async(req,res) => {
    try {
        const existProduct = await Product.find({});
        const startOfYear = new Date(Date.UTC(2026, 0, 1, 0, 0, 0, 0));
        const endOfYear = new Date(Date.UTC(2026, 11, 31, 23, 59, 59, 999));

        const allYearData = await Data.find({
            createdAt: {
                $gte: startOfYear,
                $lte: endOfYear
            }
        });

        const docsByMonth = Array.from({ length: 12 }, () => []);
        for (const doc of allYearData) {
            const mIdx = new Date(doc.createdAt).getUTCMonth();
            if (mIdx >= 0 && mIdx < 12) {
                docsByMonth[mIdx].push(doc);
            }
        }

        for (let index = 0; index < existProduct.length; index++) {
            const newProduct = existProduct[index];
            const pNorm = normStr(newProduct.name);
            const bNorm = normStr(newProduct.buyer);

            for (let mIdx = 0; mIdx < 12; mIdx++) {
                const existData = docsByMonth[mIdx];
                const packedSum = existData.reduce(
                    (acc, obj) =>
                        acc +
                        (obj.dataList || [])
                            .filter((item) => normStr(item.productName) === pNorm && normStr(item.buyerName) === bNorm)
                            .reduce((accumulator, obj) => accumulator + (Number(obj.pouchPacked) || 0), 0),
                    0
                );

                newProduct.dispatched[mIdx].balance =
                    packedSum - (newProduct.dispatched[mIdx]?.dispatch ? Number(newProduct.dispatched[mIdx].dispatch) : 0);

                const { filled, waste } = sumFillingUsage(
                    existData,
                    newProduct.name,
                    newProduct.buyer,
                    newProduct.pouchType,
                    newProduct.packSize
                );
                const stock = Number(newProduct.pouches[mIdx]?.stock) || 0;
                const prevBalance = mIdx === 0 ? 0 : (Number(newProduct.pouches[mIdx - 1]?.remain) || 0);
                newProduct.pouches[mIdx].remain = prevBalance + stock - filled - waste;
            }
        }

        await Promise.all(existProduct.map((p) => p.save()));

        res.status(200).json({ success: true });
    } catch (error) {
        console.log(error);
        res.status(400).json({ message: error.message || error });
    }
};

exports.getPouchSummary = async (req, res) => {
    try {
        const month = Number(req.query.month) || (new Date().getMonth() + 1);
        const monthIndex = month - 1;

        const days = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
        const startDate = new Date(Date.UTC(2026, monthIndex, 1, 0, 0, 0, 0));
        const endDate = new Date(Date.UTC(2026, monthIndex, days[monthIndex] || 31, 23, 59, 59, 999));

        const existData = await Data.find({
            createdAt: { $gte: startDate, $lte: endDate }
        });

        const products = await Product.find({});
        const productSummaries = products.map((p) => {
            const pouchMonth = p.pouches?.[monthIndex] || { stock: 0, remain: 0, entries: [] };
            const prevBalance = monthIndex === 0 ? 0 : (Number(p.pouches?.[monthIndex - 1]?.remain) || 0);
            const stockIn = Number(pouchMonth.stock) || 0;
            const { filled, waste } = sumFillingUsage(existData, p.name, p.buyer, p.pouchType, p.packSize);
            const currentBalance = prevBalance + stockIn - filled - waste;

            return {
                _id: p._id,
                name: p.name,
                buyer: p.buyer,
                pouchType: p.pouchType || 'exclusive',
                packSize: p.packSize || '',
                universalPouchName: p.universalPouchName || '',
                stockIn,
                prevBalance,
                filled,
                waste,
                currentBalance,
                remain: currentBalance,
                entries: pouchMonth.entries || []
            };
        });

        const universalPoolsMap = new Map();
        productSummaries.forEach((ps) => {
            if (ps.pouchType === 'universal' && ps.packSize) {
                const normSize = normalizePackSize(ps.packSize);
                const poolKey = `${normStr(ps.buyer)}_${normSize}`;
                if (!universalPoolsMap.has(poolKey)) {
                    universalPoolsMap.set(poolKey, {
                        poolKey,
                        buyer: ps.buyer,
                        packSize: normSize,
                        name: `Universal ${normSize} Pouch (${ps.buyer})`,
                        stockIn: ps.stockIn,
                        prevBalance: ps.prevBalance,
                        filled: ps.filled,
                        waste: ps.waste,
                        currentBalance: ps.currentBalance,
                        products: [ps.name]
                    });
                } else {
                    const existing = universalPoolsMap.get(poolKey);
                    if (!existing.products.includes(ps.name)) {
                        existing.products.push(ps.name);
                    }
                }
            }
        });

        res.status(200).json({
            success: true,
            month,
            products: productSummaries,
            universalPools: Array.from(universalPoolsMap.values())
        });
    } catch (error) {
        console.error('getPouchSummary error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.updatePouchConfig = async (req, res) => {
    try {
        const { id } = req.params;
        const { pouchType, packSize, universalPouchName } = req.body;

        const product = await Product.findById(id);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        if (pouchType && ['exclusive', 'universal'].includes(pouchType)) {
            product.pouchType = pouchType;
        }
        if (packSize !== undefined) {
            product.packSize = normalizePackSize(packSize);
        }
        if (universalPouchName !== undefined) {
            product.universalPouchName = universalPouchName;
        }

        await product.save();
        res.status(200).json({ success: true, message: 'Pouch configuration updated', data: product });
    } catch (error) {
        console.error('updatePouchConfig error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.updateUniversalPouch = async (req, res) => {
    try {
        const { packSize, buyer, pouches, month, mode, date } = req.body;
        const monthIndex = Number(month) - 1;
        const qty = parseInt(pouches, 10);
        const normSize = normalizePackSize(packSize);

        if (!normSize) {
            return res.status(400).json({ success: false, message: 'Pack size is required' });
        }

        const days = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
        const startDate = new Date(Date.UTC(2026, monthIndex, 1, 0, 0, 0, 0));
        const endDate = new Date(Date.UTC(2026, monthIndex, days[monthIndex] || 31, 23, 59, 59, 999));

        const existData = await Data.find({
            createdAt: { $gte: startDate, $lte: endDate }
        });

        let uPouch = await UniversalPouch.findOne({
            packSize: normSize,
            ...(buyer ? { buyer: buyer } : {})
        });
        if (!uPouch) {
            uPouch = new UniversalPouch({
                name: `Universal ${normSize} Pouch`,
                packSize: normSize,
                buyer: buyer || '',
                pouches: UniversalPouch.createDefaultMonths()
            });
        }

        const uMonth = uPouch.pouches[monthIndex];
        if (!Array.isArray(uMonth.entries)) uMonth.entries = [];

        if (mode === 'add') {
            if (!date) return res.status(400).json({ success: false, message: 'Date is required to add pouches' });
            uMonth.stock = (Number(uMonth.stock) || 0) + qty;
            uMonth.entries.push({ date, quantity: qty });
        } else {
            uMonth.stock = qty;
        }

        const { filled, waste } = sumFillingUsage(existData, '', buyer, 'universal', normSize);
        const prevBalance = monthIndex === 0 ? 0 : (Number(uPouch.pouches[monthIndex - 1]?.remain) || 0);
        uMonth.remain = prevBalance + (Number(uMonth.stock) || 0) - filled - waste;
        await uPouch.save();

        const query = {
            pouchType: 'universal',
            $or: [{ packSize: normSize }, { packSize: packSize }]
        };
        if (buyer) query.buyer = buyer;
        const matchingProducts = await Product.find(query);

        for (const prod of matchingProducts) {
            prod.pouches[monthIndex].stock = uMonth.stock;
            prod.pouches[monthIndex].entries = uMonth.entries;
            prod.pouches[monthIndex].remain = uMonth.remain;
            await prod.save();
        }

        res.status(200).json({ success: true, message: 'Universal pouch updated', data: uPouch });
    } catch (error) {
        console.error('updateUniversalPouch error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

