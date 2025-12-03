const express = require('express');
const router = express.Router();
const rosterController = require('../controllers/rosterController');
const { authenticate } = require('../middleware/auth');
const { validateRoster } = require('../middleware/validation');

router.get('/', authenticate, rosterController.getRosters);
router.post('/', authenticate, validateRoster, rosterController.createRoster);
router.get('/structure', rosterController.getRosterStructure); // Get roster structure
router.get('/:id', authenticate, rosterController.getRosterById);
router.put('/:id', authenticate, validateRoster, rosterController.updateRoster);
router.delete('/:id', authenticate, rosterController.deleteRoster);
router.post('/:id/add-player', authenticate, rosterController.addPlayerToSlot);
router.post('/:id/remove-player', authenticate, rosterController.removePlayerFromSlot);

module.exports = router;

