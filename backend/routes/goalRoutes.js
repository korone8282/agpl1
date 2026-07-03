const express = require('express');
const router = express.Router();
const {createGoal ,updateGoal,deleteGoal,goalList} = require('../controllers/goal');

router.route("/").post(createGoal);
router.post("/:goalId",updateGoal);
router.delete("/:goalId",deleteGoal);
router.get("/:date",goalList);

module.exports = router;