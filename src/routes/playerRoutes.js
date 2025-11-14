const express = require('express');
const router = express.Router();
const playerController = require('../controllers/playerController');

router.get('/rankings', playerController.getPlayerRankings);
router.get('/search', playerController.searchPlayers);
router.get('/best-performers', playerController.getBestPerformers);
router.get('/worst-performers', playerController.getWorstPerformers);

module.exports = router;

