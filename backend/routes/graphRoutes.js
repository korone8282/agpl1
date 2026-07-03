const express = require('express');
const router = express.Router();

const {readGraph,monthlyGraph} = require('../controllers/graph');


router.get("/List",monthlyGraph);
router.get("/:month",readGraph); 
 
 



module.exports = router;