const rankingsService = require('../services/rankingsService');

// Sync rankings from API to database
exports.syncRankings = async (req, res) => {
  try {
    const { week, seasonType = 'REG' } = req.body;

    if (!week) {
      return res.status(400).json({ error: 'Week number is required' });
    }

    const result = await rankingsService.syncFantasyRankings(week, seasonType);

    res.json(result);
  } catch (error) {
    console.error('Sync rankings error:', error);
    res.status(500).json({ error: 'Failed to sync rankings' });
  }
};

// Sync projections from API to database
exports.syncProjections = async (req, res) => {
  try {
    const { week, seasonType = 'REG' } = req.body;

    if (!week) {
      return res.status(400).json({ error: 'Week number is required' });
    }

    const result = await rankingsService.syncFantasyProjections(week, seasonType);

    res.json(result);
  } catch (error) {
    console.error('Sync projections error:', error);
    res.status(500).json({ error: 'Failed to sync projections' });
  }
};

// Get rankings from database
exports.getRankings = async (req, res) => {
  try {
    const { 
      week = 10, 
      season = 2025,
      scoringType = 'standard',
      sortBy = 'points',
      sortOrder = 'desc',
      team = null
    } = req.query;

    const rankings = await rankingsService.getRankingsFromDatabase(
      parseInt(week),
      parseInt(season),
      scoringType,
      sortBy,
      sortOrder,
      team
    );

    res.json({
      week: parseInt(week),
      season: parseInt(season),
      scoringType,
      sortBy,
      sortOrder,
      team,
      count: rankings.length,
      rankings
    });
  } catch (error) {
    console.error('Get rankings error:', error);
    res.status(500).json({ error: 'Failed to fetch rankings' });
  }
};

// Sync future week projections (for weeks that haven't been played)
exports.syncFutureWeek = async (req, res) => {
  try {
    const { week, seasonType = 'REG' } = req.body;

    if (!week) {
      return res.status(400).json({ error: 'Week number is required' });
    }

    const result = await rankingsService.syncFutureWeekProjections(week, seasonType);

    res.json(result);
  } catch (error) {
    console.error('Sync future week error:', error);
    res.status(500).json({ error: 'Failed to sync future week' });
  }
};