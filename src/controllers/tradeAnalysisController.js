const tradeAnalysisService = require('../services/tradeAnalysisService');

// Analyze trade
exports.analyzeTrade = async (req, res) => {
  try {
    const { playersGiving, playersReceiving, currentWeek, season, scoringType } = req.body;

    // Validate input
    if (!playersGiving || !Array.isArray(playersGiving) || playersGiving.length === 0) {
      return res.status(400).json({ error: 'Players giving away is required' });
    }

    if (!playersReceiving || !Array.isArray(playersReceiving) || playersReceiving.length === 0) {
      return res.status(400).json({ error: 'Players receiving is required' });
    }

    if (!currentWeek || !season) {
      return res.status(400).json({ error: 'Current week and season are required' });
    }

    const result = await tradeAnalysisService.analyzeTrade(
      playersGiving,
      playersReceiving,
      currentWeek,
      season,
      scoringType || 'standard'
    );

    res.json(result);
  } catch (error) {
    console.error('Trade analysis error:', error);
    res.status(500).json({ error: 'Failed to analyze trade' });
  }
};