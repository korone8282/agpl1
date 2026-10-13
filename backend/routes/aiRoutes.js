const express = require('express');
const router = express.Router();
const { chatWithAi, getDynamicSuggestions, submitFeedback, getQuickStats } = require('../controllers/aiController');

router.post('/chat', chatWithAi);
router.get('/suggestions', getDynamicSuggestions);
router.post('/feedback', submitFeedback);
router.get('/quick-stats', getQuickStats);

module.exports = router;
