const express = require('express');
const router = express.Router();
const rankingsController = require('../controllers/rankingsController');
const { authenticate } = require('../middleware/auth');

// Sync rankings from API (you may want to protect this route)
router.post('/sync', rankingsController.syncRankings);

// Get rankings from database
router.get('/', rankingsController.getRankings);

module.exports = router;