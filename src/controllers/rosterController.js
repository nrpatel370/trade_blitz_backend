const db = require('../config/database');
const rosterManagementService = require('../services/rosterManagementService');

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

// Create new roster with position slots
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

    const result = await rosterManagementService.createRosterWithSlots(
      req.userId,
      rosterName,
      leagueFormat || 'Half-PPR'
    );

    res.status(201).json(result);
  } catch (error) {
    console.error('Create roster error:', error);
    res.status(500).json({ error: 'Failed to create roster' });
  }
};

// Get roster by ID with positions
exports.getRosterById = async (req, res) => {
  try {
    const result = await rosterManagementService.getRosterWithPositions(
      req.params.id,
      req.userId
    );

    res.json(result);
  } catch (error) {
    console.error('Get roster error:', error);
    if (error.message === 'Roster not found') {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to fetch roster' });
  }
};

// Update roster metadata
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
    const result = await rosterManagementService.deleteRoster(
      req.params.id,
      req.userId
    );

    res.json(result);
  } catch (error) {
    console.error('Delete roster error:', error);
    if (error.message === 'Roster not found') {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to delete roster' });
  }
};

// Add player to roster slot
exports.addPlayerToSlot = async (req, res) => {
  try {
    const { positionSlot, playerId } = req.body;

    const result = await rosterManagementService.addPlayerToSlot(
      req.params.id,
      req.userId,
      positionSlot,
      playerId
    );

    res.json(result);
  } catch (error) {
    console.error('Add player to slot error:', error);
    res.status(400).json({ error: error.message });
  }
};

// Remove player from roster slot
exports.removePlayerFromSlot = async (req, res) => {
  try {
    const { positionSlot } = req.body;

    const result = await rosterManagementService.removePlayerFromSlot(
      req.params.id,
      req.userId,
      positionSlot
    );

    res.json(result);
  } catch (error) {
    console.error('Remove player from slot error:', error);
    res.status(400).json({ error: error.message });
  }
};

// Get roster structure (for frontend to know available slots)
exports.getRosterStructure = (req, res) => {
  const structure = rosterManagementService.getRosterStructure();
  res.json({ structure });
};