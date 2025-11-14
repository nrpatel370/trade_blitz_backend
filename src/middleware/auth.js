// ===== src/middleware/auth.js =====
const jwt = require('jsonwebtoken');
const db = require('../config/database');

exports.authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Verify JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Optional: Verify session is still active
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

    // Attach user ID to request
    req.userId = decoded.userId;
    next();
  } catch (error) {
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
