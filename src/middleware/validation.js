/*
 * validation.js - Request Validation Middleware
 * 
 * Provides input validation and sanitization for API endpoints
 * Uses express-validator for declarative validation rules
 * 
 * SOLID: Single Responsibility - Only handles input validation
 * SOLID: Open/Closed - Easy to add new validators without modifying existing ones
 */

const { body, validationResult } = require('express-validator');

/*
 * Generic validation error checker
 * Can be used after custom validation chains
 */
exports.validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

/*
 * Registration validation rules
 * Validates: username (3-50 chars, alphanumeric), email, password (6+ chars)
 */
exports.validateRegistration = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be between 3 and 50 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  body('email')
    .trim()
    .isEmail()
    .withMessage('Invalid email address')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('firstName')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('First name must be less than 50 characters'),
  body('lastName')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Last name must be less than 50 characters'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

/**
 * Login validation rules
 * Validates: email format, password not empty
 */
exports.validateLogin = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('Invalid email address')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

/**
 * User profile update validation rules
 * All fields optional, validates format when provided
 */
exports.validateUserUpdate = [
  body('firstName')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('First name must be less than 50 characters'),
  body('lastName')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Last name must be less than 50 characters'),
  body('email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Invalid email address')
    .normalizeEmail(),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

/*
 * Roster creation/update validation rules
 */
exports.validateRoster = [
  body('rosterName')
    .trim()
    .notEmpty()
    .withMessage('Roster name is required')
    .isLength({ max: 100 })
    .withMessage('Roster name must be less than 100 characters'),
  body('leagueFormat')
    .optional()
    .isIn(['PPR', 'Half-PPR', 'Standard'])
    .withMessage('Invalid league format'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];