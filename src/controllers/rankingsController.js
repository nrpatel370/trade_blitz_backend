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

// Get rankings from database
exports.getRankings = async (req, res) => {
  try {
    const { 
      week = 10, 
      season = 2025,
      scoringType = 'standard' 
    } = req.query;

    const rankings = await rankingsService.getRankingsFromDatabase(
      parseInt(week),
      parseInt(season),
      scoringType
    );

    res.json({
      week: parseInt(week),
      season: parseInt(season),
      scoringType,
      count: rankings.length,
      rankings
    });
  } catch (error) {
    console.error('Get rankings error:', error);
    res.status(500).json({ error: 'Failed to fetch rankings' });
  }
};