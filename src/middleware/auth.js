/*
 * auth.js - Authentication Middleware
 * 
 * Provides two authentication strategies:
 * 1. optionalAuth - Allows anonymous access but attaches userId if token present
 * 2. authenticate - Requires valid token, blocks unauthorized requests
 */

const jwt = require('jsonwebtoken');
const db = require('../config/database');

/*
 * Optional authentication middleware
 * Sets userId on request if valid token exists, but doesn't block anonymous users
 */
exports.optionalAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (token) {
      // Token exists, try to verify and attach userId
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.userId = decoded.userId;
    }
    next();
  } catch (error) {
    // Token invalid or expired - continue as anonymous user
    next();
  }
};

/*
 * Required authentication middleware
 * Blocks requests without valid JWT token
 */
exports.authenticate = async (req, res, next) => {
  try {
    // Extract token from Authorization header
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Verify JWT signature and expiration
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // If session ID provided, verify session is still active in database
    const sessionId = req.headers['x-session-id'];
    if (sessionId) {
      const [sessions] = await db.query(
        'SELECT * FROM sessions WHERE session_id = ? AND user_id = ? AND expires_at > NOW()',
        [sessionId, decoded.userId]
      );

      if (sessions.length === 0) {
        return res.status(401).json({ error: 'Session expired' });
      }
    }

    // Attach userId to request for use in controllers
    req.userId = decoded.userId;
    next();
  } catch (error) {
    // Handle specific JWT errors with appropriate messages
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    console.error('Authentication error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};
