const express = require('express');
const router = express.Router();
const feedbackController = require('../controllers/feedbackController');
const { optionalAuth } = require('../middleware/auth');

// POST /api/feedback - Submit feedback (auth optional)
router.post('/', optionalAuth, feedbackController.submitFeedback);

// GET /api/feedback - Get all feedback (could add admin auth later)
router.get('/', feedbackController.getAllFeedback);

module.exports = router;
