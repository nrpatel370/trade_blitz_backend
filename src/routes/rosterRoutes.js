/**
 * rosterRoutes.js - Roster Management Routes
 * 
 * Defines API endpoints for fantasy roster CRUD operations
 * All routes prefixed with /api/rosters (set in app.js)
 * 
 * Routes:
 * GET    /           - Get all rosters for logged-in user
 * POST   /           - Create new roster
 * GET    /structure  - Get standard roster position structure (public)
 * GET    /:id        - Get specific roster with players
 * PUT    /:id        - Update roster name/format
 * DELETE /:id        - Delete roster
 * POST   /:id/add-player    - Add player to position slot
 * POST   /:id/remove-player - Remove player from slot
 */

const express = require('express');
const router = express.Router();
const rosterController = require('../controllers/rosterController');
const { authenticate } = require('../middleware/auth');
const { validateRoster } = require('../middleware/validation');

// Protected routes - require valid JWT token
router.get('/', authenticate, rosterController.getRosters);
router.post('/', authenticate, validateRoster, rosterController.createRoster);
router.get('/structure', rosterController.getRosterStructure); // Public - no auth needed
router.get('/:id', authenticate, rosterController.getRosterById);
router.put('/:id', authenticate, validateRoster, rosterController.updateRoster);
router.delete('/:id', authenticate, rosterController.deleteRoster);
router.post('/:id/add-player', authenticate, rosterController.addPlayerToSlot);
router.post('/:id/remove-player', authenticate, rosterController.removePlayerFromSlot);

module.exports = router;