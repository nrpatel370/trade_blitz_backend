/*
 * authRoutes.js - Authentication Routes
 * 
 * Defines API endpoints for user authentication operations
 * All routes prefixed with /api/auth (set in app.js)
 * 
 * Routes:
 * POST /register - Create new user account
 * POST /login    - Authenticate existing user
 * POST /logout   - End user session
 * GET  /verify   - Check if current session is valid
 */

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { validateRegistration, validateLogin } = require('../middleware/validation');

// Public routes - no auth required
router.post('/register', validateRegistration, authController.register);
router.post('/login', validateLogin, authController.login);
router.post('/logout', authController.logout);
router.get('/verify', authController.verifySession);

module.exports = router;