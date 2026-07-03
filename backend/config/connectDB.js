const mongoose = require('mongoose');
require('dotenv').config();

const dbConnect = async() =>{
    await mongoose.connect(process.env.MONGO_URI)
    .then(console.log('mongoose connected'))
    .catch((e)=>{
        console.log(e.message,e);
        process.exit(1);
    })
}

module.exports = dbConnect;
