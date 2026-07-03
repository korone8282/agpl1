const express = require('express');
const router = express.Router();
const {createData, 
       readAll, 
       deleteExport, 
       readExport, 
       readData} = require('../controllers/container');

router.get("/list",readAll);
router.route("/:name").post(createData);
router.delete("/:exportId",deleteExport);
router.get("/:exportId",readExport);
router.put("/read",readData);

module.exports = router;