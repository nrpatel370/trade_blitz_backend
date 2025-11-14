// ===== src/routes/rosterRoutes.js =====
const express = require('express');
const router = express.Router();
const rosterController = require('../controllers/rosterController');
const { authenticate } = require('../middleware/auth');
const { validateRoster } = require('../middleware/validation');

router.get('/', authenticate, rosterController.getRosters);
router.post('/', authenticate, validateRoster, rosterController.createRoster);
router.get('/:id', authenticate, rosterController.getRosterById);
router.put('/:id', authenticate, validateRoster, rosterController.updateRoster);
router.delete('/:id', authenticate, rosterController.deleteRoster);
router.get('/:id/players', authenticate, rosterController.getRosterPlayers);
router.post('/:id/players', authenticate, rosterController.addPlayerToRoster);
router.delete('/:id/players/:playerId', authenticate, rosterController.removePlayerFromRoster);

module.exports = router;