const express = require('express');
const router = express.Router();
const rankingsController = require('../controllers/rankingsController');
const { authenticate } = require('../middleware/auth');

// Sync rankings from API (you may want to protect this route)
router.post('/sync', rankingsController.syncRankings);

// Get rankings from database
router.get('/', rankingsController.getRankings);

// Sync projections from API
router.post('/sync-projections', rankingsController.syncProjections);

// Sync future week (weeks that haven't been played yet)
router.post('/sync-future-week', rankingsController.syncFutureWeek);
module.exports = router;