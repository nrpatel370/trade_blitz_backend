const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate } = require('../middleware/auth');
const { validateUserUpdate } = require('../middleware/validation');

router.get('/profile', authenticate, userController.getProfile);
router.put('/profile', authenticate, validateUserUpdate, userController.updateProfile);
router.put('/profile-icon', authenticate, userController.updateProfileIcon);

module.exports = router;