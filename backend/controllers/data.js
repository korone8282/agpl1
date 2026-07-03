require('dotenv').config();
const Data = require('../models/dataModel');

exports.createData = async (event) => {
  try {
    const { string, dayTime } = event.pathParameters || {};
    const dataItems = JSON.parse(event.body || '[]');
    const section = string ? string.split('_')[0] : '';
    const newdate = string ? new Date(string.split('_')[1]) : new Date();
    if (!dataItems.length) {
      return { statusCode: 400, body: JSON.stringify({ message: 'Empty Entry Submitted' }) };
    }
    const existData = await Data.find({ createdAt: newdate, sectionMain: section, dayTime });
    if (existData.length) {
      return { statusCode: 404, body: JSON.stringify({ message: 'Data for this date already exists' }) };
    }
    const newData = await Data.create({
      sectionMain: section,
      dataList: dataItems,
      dayTime,
      createdAt: newdate,
    });
    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, data: newData, message: 'Data created' }),
    };
  } catch (error) {
    console.log(error);
    return { statusCode: 400, body: JSON.stringify({ message: error.message }) };
  }
};

exports.readData = async (event) => {
  try {
    const { date, month } = event.pathParameters || {};
    const start = new Date(`2026-${month}-${date}`);
    start.setHours(0, 0, 0, 0);
    const end = new Date(`2026-${month}-${date}`);
    end.setHours(23, 59, 59, 999);
    const existData = await Data.find({ createdAt: { $gte: start, $lte: end } });
    if (!existData.length) {
      return { statusCode: 404, body: JSON.stringify({ message: "data doesn't exists" }) };
    }
    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, data: existData }),
    };
  } catch (error) {
    console.log(error);
    return { statusCode: 400, body: JSON.stringify({ message: error.message }) };
  }
};

exports.deleteData = async (event) => {
  try {
    const { id } = event.pathParameters || {};
    const data = await Data.findById(id);
    if (!data) {
      return { statusCode: 404, body: JSON.stringify({ success: false, data: 'no product exists' }) };
    }
    await Data.findOneAndDelete({ _id: id });
    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, message: 'data successfully deleted' }),
    };
  } catch (error) {
    console.log(error);
    return { statusCode: 500, body: JSON.stringify({ success: false, data: error.message }) };
  }
};

exports.readBuyerData = async (event) => {
  try {
    const { start, end, buyer } = JSON.parse(event.body || '{}');
    if (!start || !end || !buyer) {
      return { statusCode: 400, body: JSON.stringify({ success: false, data: 'no data found' }) };
    }
    const startDate = new Date(start);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(end);
    endDate.setHours(23, 59, 59, 999);
    const existData = await Data.find({
      createdAt: { $gte: startDate, $lte: endDate },
      dataList: { $elemMatch: { buyerName: buyer } },
    });
    if (!existData.length) {
      return { statusCode: 404, body: JSON.stringify({ message: "data doesn't exists" }) };
    }
    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, data: existData }),
    };
  } catch (error) {
    console.log(error);
    return { statusCode: 400, body: JSON.stringify({ message: error.message }) };
  }
};

exports.readMonthlyData = async (event) => {
  try {
    const { month } = event.pathParameters || {};
    const days = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    const startDate = new Date(`2026-${month}-01`);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(`2026-${month}-${days[month - 1]}`);
    endDate.setHours(23, 59, 59, 999);
    const existData = await Data.find({ createdAt: { $gte: startDate, $lte: endDate } });
    if (!existData.length) {
      return { statusCode: 404, body: JSON.stringify({ message: "data doesn't exists" }) };
    }
    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, data: existData }),
    };
  } catch (error) {
    console.log(error);
    return { statusCode: 400, body: JSON.stringify({ message: error.message }) };
  }
};

exports.readDvN = async (event) => {
  try {
    const { start, end } = JSON.parse(event.body || '{}');
    const startDate = new Date(start);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(end);
    endDate.setHours(23, 59, 59, 999);
    const existData = await Data.find({ createdAt: { $gte: startDate, $lte: endDate } }).sort({ createdAt: -1 });
    if (!existData.length) {
      return { statusCode: 404, body: JSON.stringify({ message: "data doesn't exists" }) };
    }
    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, data: existData }),
    };
  } catch (error) {
    console.log(error);
    return { statusCode: 400, body: JSON.stringify({ message: error.message }) };
  }
};

exports.readKvF = async (event) => {
  try {
    const { datey } = JSON.parse(event.body || '{}');
    const startDate = new Date(datey);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(datey);
    endDate.setHours(23, 59, 59, 999);
    const existData = await Data.find({ createdAt: { $gte: startDate, $lte: endDate } });
    if (!existData.length) {
      return { statusCode: 404, body: JSON.stringify({ message: "data doesn't exists" }) };
    }
    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, data: existData }),
    };
  } catch (error) {
    console.log(error);
    return { statusCode: 400, body: JSON.stringify({ message: error.message }) };
  }
};

exports.ProductData = async (event) => {
  try {
    const { start, end, product } = JSON.parse(event.body || '{}');
    const startDate = new Date(start);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(end);
    endDate.setHours(23, 59, 59, 999);
    const existData = await Data.find({
      createdAt: { $gte: startDate, $lte: endDate },
      dataList: { $elemMatch: { productName: product.name, buyerName: product.buyer } },
    });
    if (!existData.length) {
      return { statusCode: 404, body: JSON.stringify({ message: "Data Doesn't Exists" }) };
    }
    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, data: existData }),
    };
  } catch (error) {
    console.log(error);
    return { statusCode: 400, body: JSON.stringify({ message: error.message }) };
  }
};

exports.readLeft = async (event) => {
  try {
    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(startDate - 14 * 24 * 60 * 60 * 1000);
    const existData = await Data.find({ createdAt: { $gte: endDate, $lte: startDate } }).sort({ createdAt: -1 });
    if (!existData.length) {
      return { statusCode: 404, body: JSON.stringify({ message: "data doesn't exists" }) };
    }
    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, data: existData }),
    };
  } catch (error) {
    console.log(error);
    return { statusCode: 400, body: JSON.stringify({ message: error.message }) };
  }
};
