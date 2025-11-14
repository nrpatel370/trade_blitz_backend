// ===== src/controllers/rosterController.js =====
const db = require('../config/database');

// Get all rosters for user
exports.getRosters = async (req, res) => {
  try {
    const [rosters] = await db.query(
      'SELECT roster_id, roster_name, league_format, created_at, updated_at FROM rosters WHERE user_id = ? ORDER BY created_at DESC',
      [req.userId]
    );

    res.json({ rosters });
  } catch (error) {
    console.error('Get rosters error:', error);
    res.status(500).json({ error: 'Failed to fetch rosters' });
  }
};

// Create new roster
exports.createRoster = async (req, res) => {
  try {
    const { rosterName, leagueFormat } = req.body;

    // Check roster limit (5 max)
    const [existingRosters] = await db.query(
      'SELECT COUNT(*) as count FROM rosters WHERE user_id = ?',
      [req.userId]
    );

    if (existingRosters[0].count >= 5) {
      return res.status(400).json({ error: 'Maximum of 5 rosters allowed per user' });
    }

    const [result] = await db.query(
      'INSERT INTO rosters (user_id, roster_name, league_format) VALUES (?, ?, ?)',
      [req.userId, rosterName, leagueFormat || 'Half-PPR']
    );

    res.status(201).json({
      message: 'Roster created successfully',
      roster: {
        rosterId: result.insertId,
        rosterName,
        leagueFormat: leagueFormat || 'Half-PPR'
      }
    });
  } catch (error) {
    console.error('Create roster error:', error);
    res.status(500).json({ error: 'Failed to create roster' });
  }
};

// Get roster by ID
exports.getRosterById = async (req, res) => {
  try {
    const [rosters] = await db.query(
      'SELECT * FROM rosters WHERE roster_id = ? AND user_id = ?',
      [req.params.id, req.userId]
    );

    if (rosters.length === 0) {
      return res.status(404).json({ error: 'Roster not found' });
    }

    res.json({ roster: rosters[0] });
  } catch (error) {
    console.error('Get roster error:', error);
    res.status(500).json({ error: 'Failed to fetch roster' });
  }
};

// Update roster (R-0009, R-0011)
exports.updateRoster = async (req, res) => {
  try {
    const { rosterName, leagueFormat } = req.body;

    // Verify ownership
    const [rosters] = await db.query(
      'SELECT * FROM rosters WHERE roster_id = ? AND user_id = ?',
      [req.params.id, req.userId]
    );

    if (rosters.length === 0) {
      return res.status(404).json({ error: 'Roster not found' });
    }

    await db.query(
      'UPDATE rosters SET roster_name = ?, league_format = ? WHERE roster_id = ?',
      [rosterName, leagueFormat || rosters[0].league_format, req.params.id]
    );

    res.json({ message: 'Roster updated successfully' });
  } catch (error) {
    console.error('Update roster error:', error);
    res.status(500).json({ error: 'Failed to update roster' });
  }
};

// Delete roster
exports.deleteRoster = async (req, res) => {
  try {
    const [result] = await db.query(
      'DELETE FROM rosters WHERE roster_id = ? AND user_id = ?',
      [req.params.id, req.userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Roster not found' });
    }

    res.json({ message: 'Roster deleted successfully' });
  } catch (error) {
    console.error('Delete roster error:', error);
    res.status(500).json({ error: 'Failed to delete roster' });
  }
};

// Get players in roster
exports.getRosterPlayers = async (req, res) => {
  try {
    const [players] = await db.query(`
      SELECT p.player_id, p.player_name, p.team_name, p.position, rp.added_at
      FROM roster_players rp
      JOIN players p ON rp.player_id = p.player_id
      JOIN rosters r ON rp.roster_id = r.roster_id
      WHERE rp.roster_id = ? AND r.user_id = ?
      ORDER BY p.position, p.player_name
    `, [req.params.id, req.userId]);

    res.json({ players });
  } catch (error) {
    console.error('Get roster players error:', error);
    res.status(500).json({ error: 'Failed to fetch roster players' });
  }
};

// Add player to roster (R-0010)
exports.addPlayerToRoster = async (req, res) => {
  try {
    const { playerId } = req.body;

    // Verify roster ownership
    const [rosters] = await db.query(
      'SELECT * FROM rosters WHERE roster_id = ? AND user_id = ?',
      [req.params.id, req.userId]
    );

    if (rosters.length === 0) {
      return res.status(404).json({ error: 'Roster not found' });
    }

    // Check if player already in roster
    const [existing] = await db.query(
      'SELECT * FROM roster_players WHERE roster_id = ? AND player_id = ?',
      [req.params.id, playerId]
    );

    if (existing.length > 0) {
      return res.status(400).json({ error: 'Player already in roster' });
    }

    await db.query(
      'INSERT INTO roster_players (roster_id, player_id) VALUES (?, ?)',
      [req.params.id, playerId]
    );

    res.status(201).json({ message: 'Player added to roster successfully' });
  } catch (error) {
    console.error('Add player to roster error:', error);
    res.status(500).json({ error: 'Failed to add player to roster' });
  }
};

// Remove player from roster (R-0010)
exports.removePlayerFromRoster = async (req, res) => {
  try {
    // Verify roster ownership
    const [rosters] = await db.query(
      'SELECT * FROM rosters WHERE roster_id = ? AND user_id = ?',
      [req.params.id, req.userId]
    );

    if (rosters.length === 0) {
      return res.status(404).json({ error: 'Roster not found' });
    }

    const [result] = await db.query(
      'DELETE FROM roster_players WHERE roster_id = ? AND player_id = ?',
      [req.params.id, req.params.playerId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Player not found in roster' });
    }

    res.json({ message: 'Player removed from roster successfully' });
  } catch (error) {
    console.error('Remove player from roster error:', error);
    res.status(500).json({ error: 'Failed to remove player from roster' });
  }
};