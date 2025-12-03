const express = require('express');
const router = express.Router();
const tradeAnalysisController = require('../controllers/tradeAnalysisController');
const { authenticate } = require('../middleware/auth');

// Analyze trade
router.post('/analyze', authenticate, tradeAnalysisController.analyzeTrade);

module.exports = router;