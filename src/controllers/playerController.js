// ===== src/controllers/playerController.js =====
const db = require('../config/database');

// Get player rankings
exports.getPlayerRankings = async (req, res) => {
  try {
    const { 
      rankingType = 'weekly', 
      week, 
      season = new Date().getFullYear(),
      format = 'Half-PPR',
      position 
    } = req.query;

    let query = `
      SELECT 
        p.player_id,
        p.player_name,
        p.team_name,
        p.position,
        pr.rank_position,
        pr.projected_points,
        pr.ranking_type,
        pr.week_number,
        pr.season_year
      FROM player_rankings pr
      JOIN players p ON pr.player_id = p.player_id
      WHERE pr.ranking_type = ?
        AND pr.season_year = ?
        AND pr.format_type = ?
    `;

    const params = [rankingType, season, format];

    if (rankingType === 'weekly' && week) {
      query += ' AND pr.week_number = ?';
      params.push(week);
    }

    if (position) {
      query += ' AND p.position = ?';
      params.push(position);
    }

    query += ' ORDER BY pr.rank_position ASC';

    const [rankings] = await db.query(query, params);

    res.json({ 
      rankings,
      filters: {
        rankingType,
        week: week || null,
        season,
        format,
        position: position || 'all'
      }
    });
  } catch (error) {
    console.error('Get player rankings error:', error);
    res.status(500).json({ error: 'Failed to fetch player rankings' });
  }
};

// Search players (for adding to roster - R-0010)
exports.searchPlayers = async (req, res) => {
  try {
    const { query, position, limit = 20 } = req.query;

    if (!query || query.length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters' });
    }

    let sql = `
      SELECT 
        player_id,
        player_name,
        team_name,
        position
      FROM players
      WHERE player_name LIKE ?
    `;

    const params = [`%${query}%`];

    if (position) {
      sql += ' AND position = ?';
      params.push(position);
    }

    sql += ' ORDER BY player_name ASC LIMIT ?';
    params.push(parseInt(limit));

    const [players] = await db.query(sql, params);

    res.json({ players });
  } catch (error) {
    console.error('Search players error:', error);
    res.status(500).json({ error: 'Failed to search players' });
  }
};

// Get best performers from last week (R-0004)
exports.getBestPerformers = async (req, res) => {
  try {
    const { limit = 10, position } = req.query;
    
    // Get current week and season
    const currentYear = new Date().getFullYear();
    
    // For demo purposes, you'll need to track the current NFL week
    // This would typically come from your external API
    const currentWeek = req.query.week || 1;

    let query = `
      SELECT 
        p.player_id,
        p.player_name,
        p.team_name,
        p.position,
        wp.actual_points,
        wp.week_number,
        wp.performance_rank
      FROM weekly_performances wp
      JOIN players p ON wp.player_id = p.player_id
      WHERE wp.week_number = ?
        AND wp.season_year = ?
    `;

    const params = [currentWeek, currentYear];

    if (position) {
      query += ' AND p.position = ?';
      params.push(position);
    }

    query += ' ORDER BY wp.actual_points DESC LIMIT ?';
    params.push(parseInt(limit));

    const [performers] = await db.query(query, params);

    res.json({ 
      bestPerformers: performers,
      week: currentWeek,
      season: currentYear
    });
  } catch (error) {
    console.error('Get best performers error:', error);
    res.status(500).json({ error: 'Failed to fetch best performers' });
  }
};

// Get worst performers from last week (R-0005)
exports.getWorstPerformers = async (req, res) => {
  try {
    const { limit = 10, position } = req.query;
    
    const currentYear = new Date().getFullYear();
    const currentWeek = req.query.week || 1;

    let query = `
      SELECT 
        p.player_id,
        p.player_name,
        p.team_name,
        p.position,
        wp.actual_points,
        wp.week_number,
        wp.performance_rank
      FROM weekly_performances wp
      JOIN players p ON wp.player_id = p.player_id
      WHERE wp.week_number = ?
        AND wp.season_year = ?
    `;

    const params = [currentWeek, currentYear];

    if (position) {
      query += ' AND p.position = ?';
      params.push(position);
    }

    query += ' ORDER BY wp.actual_points ASC LIMIT ?';
    params.push(parseInt(limit));

    const [performers] = await db.query(query, params);

    res.json({ 
      worstPerformers: performers,
      week: currentWeek,
      season: currentYear
    });
  } catch (error) {
    console.error('Get worst performers error:', error);
    res.status(500).json({ error: 'Failed to fetch worst performers' });
  }
};