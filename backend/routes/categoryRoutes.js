const express = require('express');
const router = express.Router();
const {authorization,authAdmin} = require('../middlewares/authorization');
const {createCategory ,updateCategory,deleteCategory,categoryList,readCategory} = require('../controllers/category');

router.route("/").post(authorization,authAdmin,createCategory);
router.post("/:categoryId",authorization,authAdmin,updateCategory);
router.delete("/:categoryId",authorization,authAdmin,deleteCategory);
router.get("/categories",categoryList);
router.get("/:id",authorization,readCategory);

module.exports = router;