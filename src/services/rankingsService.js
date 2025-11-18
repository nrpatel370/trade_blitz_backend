const db = require('../config/database');
const externalApiService = require('./externalApiService');

class RankingsService {
  // Sync fantasy rankings from API to database
  async syncFantasyRankings(week, seasonType = 'REG') {
    try {
      console.log(`Starting sync for week ${week}...`);
      
      // Fetch data from API
      const statsData = await externalApiService.fetchFantasyStatsByWeek(week, seasonType);
      
      if (!statsData || statsData.length === 0) {
        console.log('No stats data received from API');
        return { success: false, message: 'No data received from API' };
      }

      console.log(`Received ${statsData.length} player stats from API`);

      let playersInserted = 0;
      let rankingsInserted = 0;
      let errors = 0;

      for (const stat of statsData) {
        try {
          // First, ensure player exists in players table
          const [existingPlayer] = await db.query(
            'SELECT player_id FROM players WHERE external_player_id = ?',
            [stat.PlayerID]
          );

          let playerId;

          if (existingPlayer.length === 0) {
            // Insert new player
            const [playerResult] = await db.query(
              `INSERT INTO players (external_player_id, player_name, team_name, position) 
               VALUES (?, ?, ?, ?)`,
              [stat.PlayerID, stat.Name, stat.Team, stat.Position]
            );
            playerId = playerResult.insertId;
            playersInserted++;
          } else {
            playerId = existingPlayer[0].player_id;
          }

          // Insert or update ranking
          await db.query(
            `INSERT INTO player_rankings 
             (player_id, game_id, season_type, season, week_number, team_name, opponent, 
              player_name, position, fantasy_points, fantasy_points_ppr, 
              fantasy_points_fanduel, fantasy_points_yahoo, fantasy_points_draftkings, is_game_over)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
             fantasy_points = VALUES(fantasy_points),
             fantasy_points_ppr = VALUES(fantasy_points_ppr),
             fantasy_points_fanduel = VALUES(fantasy_points_fanduel),
             fantasy_points_yahoo = VALUES(fantasy_points_yahoo),
             fantasy_points_draftkings = VALUES(fantasy_points_draftkings),
             is_game_over = VALUES(is_game_over),
             last_updated = CURRENT_TIMESTAMP`,
            [
              playerId,
              stat.GameID,
              seasonType,
              stat.Season,
              stat.Week,
              stat.Team,
              stat.Opponent,
              stat.Name,
              stat.Position,
              stat.FantasyPoints || 0,
              stat.FantasyPointsPPR || 0,
              stat.FantasyPointsFanDuel || 0,
              stat.FantasyPointsYahoo || 0,
              stat.FantasyPointsDraftKings || 0,
              stat.IsGameOver || false
            ]
          );
          rankingsInserted++;
        } catch (error) {
          console.error(`Error processing player ${stat.Name}:`, error.message);
          errors++;
        }
      }

      console.log(`Sync complete: ${playersInserted} players added, ${rankingsInserted} rankings synced, ${errors} errors`);

      return {
        success: true,
        playersInserted,
        rankingsInserted,
        errors,
        message: `Successfully synced ${rankingsInserted} rankings for week ${week}`
      };
    } catch (error) {
      console.error('Error syncing fantasy rankings:', error);
      throw error;
    }
  }

  // Get rankings from database
  async getRankingsFromDatabase(week, season, scoringType = 'standard') {
    try {
      const pointsColumn = scoringType === 'ppr' ? 'fantasy_points_ppr' : 'fantasy_points';
      
      const [rankings] = await db.query(
        `SELECT 
          pr.ranking_id,
          pr.player_name,
          pr.position,
          pr.team_name,
          pr.opponent,
          pr.fantasy_points,
          pr.fantasy_points_ppr,
          pr.is_game_over,
          p.age,
          @rank := @rank + 1 AS \`rank\`
         FROM player_rankings pr
         JOIN players p ON pr.player_id = p.player_id
         CROSS JOIN (SELECT @rank := 0) r
         WHERE pr.week_number = ? AND pr.season = ?
         ORDER BY ${pointsColumn} DESC`,
        [week, season]
      );

      return rankings;
    } catch (error) {
      console.error('Error fetching rankings from database:', error);
      throw error;
    }
  }
}

module.exports = new RankingsService();