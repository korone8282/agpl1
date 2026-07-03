const express = require('express');
require('dotenv').config();
const cookieParser = require('cookie-parser');
const dbConnect = require('./config/connectDB');
const userRoutes = require('./routes/userRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const productRoutes = require('./routes/productRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const dataRoutes = require('./routes/dataRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const goalRoutes = require('./routes/goalRoutes');
const dispatchRoutes = require('./routes/dispatchRoutes');
const exportRoutes = require('./routes/exportRoutes');
const graphRoutes = require('./routes/graphRoutes');
const cors = require('cors');
const path = require('path');
dbConnect();

const app = express();
app.use(cookieParser());
app.use(express.json());
app.use(
	cors({
		origin: "https://acpl1.netlify.app",
		credentials: true,
	})
);
app.use(express.urlencoded({ extended: true }));

__dirname = path.resolve();

app.use('/api/users',userRoutes);
app.use('/api/category',categoryRoutes);
app.use('/api/product',productRoutes);
app.use("/api/uploads",uploadRoutes);
app.use("/api/goal",goalRoutes)
app.use("/api/data",dataRoutes);
app.use("/api/inventory",inventoryRoutes);
app.use("/api/dispatch",dispatchRoutes);
app.use("/api/export",exportRoutes);
app.use("/api/graph",graphRoutes);
app.use("/uploads",express.static(path.join(__dirname + '/uploads')));

port = 4000||process.env.PORT;

app.get("/", (req, res) => {
	return res.json({
		success: true,
		message: "Your server is up and running ...",
	});
});

app.listen(port,()=>{	
    console.log(`listening at port: ${port}`);
});

