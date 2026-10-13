const express = require('express');
const router = express.Router();
const {createData, 
       readAll, 
       deleteExport, 
       readExport, 
       readData,
       updateContainer} = require('../controllers/container');

router.get("/list",readAll);
router.route("/:name").post(createData);
router.put("/update/:exportId", updateContainer);
router.delete("/:exportId",deleteExport);
router.get("/:exportId",readExport);
router.put("/read",readData);

module.exports = router;