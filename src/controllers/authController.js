// ===== src/controllers/authController.js =====
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const crypto = require('crypto');

// Register new user
exports.register = async (req, res) => {
  try {
    const { username, email, password, firstName, lastName } = req.body;

    // Check if user exists
    const [existingUsers] = await db.query(
      'SELECT * FROM users WHERE email = ? OR username = ?',
      [email, username]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user
    const [result] = await db.query(
      'INSERT INTO users (username, email, password_hash, first_name, last_name) VALUES (?, ?, ?, ?, ?)',
      [username, email, hashedPassword, firstName, lastName]
    );

    // Create JWT token
    const token = jwt.sign(
      { userId: result.insertId },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    // Create session (R-0008: persistent login)
    const sessionId = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await db.query(
      'INSERT INTO sessions (session_id, user_id, expires_at) VALUES (?, ?, ?)',
      [sessionId, result.insertId, expiresAt]
    );

    res.status(201).json({
      message: 'User registered successfully',
      token,
      sessionId,
      user: {
        userId: result.insertId,
        username,
        email,
        firstName,
        lastName
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
};

// Login user
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const [users] = await db.query(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = users[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Create JWT token
    const token = jwt.sign(
      { userId: user.user_id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    // Create or update session (R-0008: persistent login)
    const sessionId = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // Delete old sessions for this user
    await db.query('DELETE FROM sessions WHERE user_id = ?', [user.user_id]);

    // Create new session
    await db.query(
      'INSERT INTO sessions (session_id, user_id, expires_at) VALUES (?, ?, ?)',
      [sessionId, user.user_id, expiresAt]
    );

    res.json({
      message: 'Login successful',
      token,
      sessionId,
      user: {
        userId: user.user_id,
        username: user.username,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        profileIcon: user.profile_icon
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
};

// Logout user
exports.logout = async (req, res) => {
  try {
    const { sessionId } = req.body;

    if (sessionId) {
      await db.query('DELETE FROM sessions WHERE session_id = ?', [sessionId]);
    }

    res.json({ message: 'Logout successful' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
};

// Verify session (R-0008: check if session is still valid)
exports.verifySession = async (req, res) => {
  try {
    const sessionId = req.headers['x-session-id'];
    const token = req.headers.authorization?.split(' ')[1];

    if (!sessionId && !token) {
      return res.status(401).json({ valid: false, error: 'No session found' });
    }

    // Verify JWT token
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Check if session exists and is valid
        if (sessionId) {
          const [sessions] = await db.query(
            'SELECT * FROM sessions WHERE session_id = ? AND user_id = ? AND expires_at > NOW()',
            [sessionId, decoded.userId]
          );

          if (sessions.length === 0) {
            return res.status(401).json({ valid: false, error: 'Invalid session' });
          }
        }

        // Get user data
        const [users] = await db.query(
          'SELECT user_id, username, email, first_name, last_name, profile_icon FROM users WHERE user_id = ?',
          [decoded.userId]
        );

        if (users.length === 0) {
          return res.status(401).json({ valid: false, error: 'User not found' });
        }

        res.json({
          valid: true,
          user: {
            userId: users[0].user_id,
            username: users[0].username,
            email: users[0].email,
            firstName: users[0].first_name,
            lastName: users[0].last_name,
            profileIcon: users[0].profile_icon
          }
        });
      } catch (jwtError) {
        return res.status(401).json({ valid: false, error: 'Invalid token' });
      }
    } else {
      return res.status(401).json({ valid: false, error: 'No token provided' });
    }
  } catch (error) {
    console.error('Session verification error:', error);
    res.status(500).json({ valid: false, error: 'Verification failed' });
  }
};