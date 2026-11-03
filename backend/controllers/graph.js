require("dotenv").config();
const Data = require('../models/dataModel');

exports.readGraph = async(req,res) => {
    try {
        const {month} = req.params;
        const m = Number(month);
        const daysInMonth = new Date(Date.UTC(2026, m, 0)).getUTCDate();

        const startOfMonth = new Date(Date.UTC(2026, m - 1, 1, 0, 0, 0, 0));
        const endOfMonth = new Date(Date.UTC(2026, m - 1, daysInMonth, 23, 59, 59, 999));

        const allDocs = await Data.find({
            createdAt: {
                $gte: startOfMonth,
                $lte: endOfMonth
            }
        });

        if (!allDocs.length) {
            return res.status(404).json({
                message: "data doesn't exists",
            });
        }

        const arr = Array.from({ length: 31 }, () => []);
        for (const doc of allDocs) {
            const d = new Date(doc.createdAt).getUTCDate();
            if (d >= 1 && d <= 31) {
                arr[d - 1].push(doc);
            }
        }

        res.status(200).json({
            success: true,
            data: arr,
        });
    } catch (error) {
        console.log(error);
        res.status(400).json({
            message: error
        });
    }
};

exports.monthlyGraph = async(req,res) => {
    try {
        const startOfYear = new Date(Date.UTC(2026, 0, 1, 0, 0, 0, 0));
        const endOfYear = new Date(Date.UTC(2026, 11, 31, 23, 59, 59, 999));

        const allDocs = await Data.find({
            createdAt: {
                $gte: startOfYear,
                $lte: endOfYear
            }
        });

        if (!allDocs.length) {
            return res.status(404).json({
                message: "data doesn't exists",
            });
        }

        const arr = Array.from({ length: 12 }, () => []);
        for (const doc of allDocs) {
            const mIdx = new Date(doc.createdAt).getUTCMonth();
            if (mIdx >= 0 && mIdx < 12) {
                arr[mIdx].push(doc);
            }
        }

        res.status(200).json({
            success: true,
            data: arr,
        });
    } catch (error) {
        console.log(error);
        res.status(400).json({
            message: error
        });
    }
};
