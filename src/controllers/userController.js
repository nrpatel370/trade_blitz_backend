const db = require('../config/database');

// Get user profile (R-0006)
exports.getProfile = async (req, res) => {
  try {
    const [users] = await db.query(
      'SELECT user_id, username, email, first_name, last_name, profile_icon, created_at FROM users WHERE user_id = ?',
      [req.userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = users[0];

    // Get user's rosters
    const [rosters] = await db.query(
      'SELECT roster_id, roster_name, league_format, created_at FROM rosters WHERE user_id = ? ORDER BY created_at DESC',
      [req.userId]
    );

    res.json({
      user: {
        userId: user.user_id,
        username: user.username,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        profileIcon: user.profile_icon,
        createdAt: user.created_at
      },
      rosters
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
};

// Update user profile (R-0012, R-0013)
exports.updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, email } = req.body;
    const updates = {};
    const params = [];

    if (firstName !== undefined) {
      updates.first_name = firstName;
      params.push(firstName);
    }
    if (lastName !== undefined) {
      updates.last_name = lastName;
      params.push(lastName);
    }
    if (email !== undefined) {
      // Check if email is already taken by another user
      const [existingUsers] = await db.query(
        'SELECT user_id FROM users WHERE email = ? AND user_id != ?',
        [email, req.userId]
      );
      if (existingUsers.length > 0) {
        return res.status(400).json({ error: 'Email already in use' });
      }
      updates.email = email;
      params.push(email);
    }

    if (params.length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }

    const setClause = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    params.push(req.userId);

    await db.query(
      `UPDATE users SET ${setClause} WHERE user_id = ?`,
      params
    );

    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

// Update profile icon (R-0014, R-0015)
exports.updateProfileIcon = async (req, res) => {
  try {
    const { profileIcon } = req.body;

    if (!profileIcon) {
      return res.status(400).json({ error: 'Profile icon is required' });
    }

    await db.query(
      'UPDATE users SET profile_icon = ? WHERE user_id = ?',
      [profileIcon, req.userId]
    );

    res.json({ 
      message: 'Profile icon updated successfully',
      profileIcon 
    });
  } catch (error) {
    console.error('Update profile icon error:', error);
    res.status(500).json({ error: 'Failed to update profile icon' });
  }
};