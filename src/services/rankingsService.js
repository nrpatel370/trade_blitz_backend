/*
 * rankingsService.js - Player Rankings Service
 * 
 * Manages syncing NFL fantasy data from external API to local database
 * 
 * Design Pattern: Singleton - Single instance manages all rankings operations
 * SOLID: Single Responsibility - Only handles ranking data sync and retrieval
 * SOLID: Dependency Inversion - Depends on externalApiService abstraction
 */

const db = require('../config/database');
const externalApiService = require('./externalApiService');

class RankingsService {
  /*
   * Sync actual fantasy stats from SportsData API for a completed week
   */
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

  /*
   * Update projections for players who already have ranking records
   */
  async syncFantasyProjections(week, seasonType = 'REG') {
    try {
      console.log(`Starting projections sync for week ${week}...`);
      
      // Fetch projections from API
      const projectionsData = await externalApiService.fetchFantasyProjectionsByWeek(week, seasonType);
      
      if (!projectionsData || projectionsData.length === 0) {
        console.log('No projections data received from API');
        return { success: false, message: 'No projections data received from API' };
      }

      console.log(`Received ${projectionsData.length} player projections from API`);

      let projectionsUpdated = 0;
      let playersNotFound = 0;
      let errors = 0;

      for (const projection of projectionsData) {
        try {
          // Try to find player by external ID first
          let [existingPlayer] = await db.query(
            'SELECT player_id FROM players WHERE external_player_id = ?',
            [projection.PlayerID]
          );

          // If not found by ID, try by name and team
          if (existingPlayer.length === 0) {
            [existingPlayer] = await db.query(
              'SELECT player_id FROM players WHERE player_name = ? AND team_name = ?',
              [projection.Name, projection.Team]
            );
          }

          if (existingPlayer.length === 0) {
            console.log(`Player ${projection.Name} (ID: ${projection.PlayerID}) not found in database, skipping projection`);
            playersNotFound++;
            continue;
          }

          const playerId = existingPlayer[0].player_id;

          // Check if ranking exists for this player/week
          const [existingRanking] = await db.query(
            'SELECT ranking_id FROM player_rankings WHERE player_id = ? AND week_number = ? AND season = ?',
            [playerId, projection.Week, projection.Season]
          );

          if (existingRanking.length === 0) {
            console.log(`No ranking record found for ${projection.Name} for week ${projection.Week}, skipping`);
            continue;
          }

          // Update projected points in player_rankings
          const [result] = await db.query(
            `UPDATE player_rankings 
             SET projected_points = ?,
                 projected_points_ppr = ?,
                 last_updated = CURRENT_TIMESTAMP
             WHERE player_id = ? AND week_number = ? AND season = ?`,
            [
              projection.FantasyPoints || 0,
              projection.FantasyPointsPPR || 0,
              playerId,
              projection.Week,
              projection.Season
            ]
          );
          
          if (result.affectedRows > 0) {
            projectionsUpdated++;
            console.log(`Updated projections for ${projection.Name}: ${projection.FantasyPoints} pts`);
          }
        } catch (error) {
          console.error(`Error processing projection for ${projection.Name}:`, error.message);
          errors++;
        }
      }

      console.log(`Projections sync complete: ${projectionsUpdated} projections updated, ${playersNotFound} players not found, ${errors} errors`);

      return {
        success: true,
        projectionsUpdated,
        playersNotFound,
        errors,
        message: `Successfully synced ${projectionsUpdated} projections for week ${week}`
      };
    } catch (error) {
      console.error('Error syncing fantasy projections:', error);
      throw error;
    }
  }

  /*
   * Create ranking records for future weeks using projections
   */
  async syncFutureWeekProjections(week, seasonType = 'REG') {
    try {
      console.log(`Starting future week projections sync for week ${week}...`);
      
      // Fetch projections from API
      const projectionsData = await externalApiService.fetchFantasyProjectionsByWeek(week, seasonType);
      
      if (!projectionsData || projectionsData.length === 0) {
        console.log('No projections data received from API');
        return { success: false, message: 'No projections data received from API' };
      }

      console.log(`Received ${projectionsData.length} player projections from API`);

      let playersInserted = 0;
      let rankingsInserted = 0;
      let errors = 0;

      for (const projection of projectionsData) {
        try {
          // Filter only fantasy-relevant positions
          const fantasyPositions = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF'];
          if (!fantasyPositions.includes(projection.Position)) {
            continue;
          }

          // First, ensure player exists in players table
          const [existingPlayer] = await db.query(
            'SELECT player_id FROM players WHERE external_player_id = ?',
            [projection.PlayerID]
          );

          let playerId;

          if (existingPlayer.length === 0) {
            // Insert new player
            const [playerResult] = await db.query(
              `INSERT INTO players (external_player_id, player_name, team_name, position) 
               VALUES (?, ?, ?, ?)`,
              [projection.PlayerID, projection.Name, projection.Team, projection.Position]
            );
            playerId = playerResult.insertId;
            playersInserted++;
          } else {
            playerId = existingPlayer[0].player_id;
          }

          // Insert or update ranking with projected points
          // Set fantasy_points to NULL for future weeks, will be filled when actual stats sync
          await db.query(
            `INSERT INTO player_rankings 
             (player_id, game_id, season_type, season, week_number, team_name, opponent, 
              player_name, position, fantasy_points, fantasy_points_ppr, 
              projected_points, projected_points_ppr, is_game_over)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
             projected_points = VALUES(projected_points),
             projected_points_ppr = VALUES(projected_points_ppr),
             team_name = VALUES(team_name),
             opponent = VALUES(opponent),
             player_name = VALUES(player_name),
             position = VALUES(position),
             last_updated = CURRENT_TIMESTAMP`,
            [
              playerId,                              // 1
              projection.GameKey,                    // 2
              seasonType,                            // 3
              projection.Season,                     // 4
              projection.Week,                       // 5
              projection.Team,                       // 6
              projection.Opponent,                   // 7
              projection.Name,                       // 8
              projection.Position,                   // 9
              // fantasy_points = NULL (in SQL)      // 10
              // fantasy_points_ppr = NULL (in SQL)  // 11
              projection.FantasyPoints || 0,         // 12 - projected_points
              projection.FantasyPointsPPR || 0,      // 13 - projected_points_ppr
              false                                  // 14 - is_game_over
            ]
          );
          rankingsInserted++;
        } catch (error) {
          console.error(`Error processing projection for ${projection.Name}:`, error.message);
          errors++;
        }
      }

      console.log(`Future week sync complete: ${playersInserted} players added, ${rankingsInserted} rankings synced, ${errors} errors`);

      return {
        success: true,
        playersInserted,
        rankingsInserted,
        errors,
        message: `Successfully synced ${rankingsInserted} projections for future week ${week}`
      };
    } catch (error) {
      console.error('Error syncing future week projections:', error);
      throw error;
    }
  }

  /*
   * Retrieve player rankings from database with sorting and filtering
   */
 async getRankingsFromDatabase(week, season, scoringType = 'standard', sortBy = 'points', sortOrder = 'desc', teamFilter = null) {
    try {
      // Determine which column to sort by
      let sortColumn;
      switch(sortBy) {
        case 'rank':
        case 'points':
          sortColumn = scoringType === 'ppr' ? 'fantasy_points_ppr' : 'fantasy_points';
          break;
        case 'team':
          sortColumn = 'team_name';
          break;
        case 'projected':
          sortColumn = scoringType === 'ppr' ? 'projected_points_ppr' : 'projected_points';
          break;
        default:
          sortColumn = scoringType === 'ppr' ? 'fantasy_points_ppr' : 'fantasy_points';
      }

      // Build WHERE clause
      let whereClause = 'WHERE pr.week_number = ? AND pr.season = ?';
      const queryParams = [week, season];

      if (teamFilter) {
        whereClause += ' AND pr.team_name = ?';
        queryParams.push(teamFilter);
      }

      // Build ORDER BY clause - handle nulls for projected points
      const orderDirection = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
      const nullHandling = sortBy === 'projected' ? `${sortColumn} IS NULL, ` : '';
      
      const query = `
        SELECT 
          pr.ranking_id,
          pr.player_name,
          pr.position,
          pr.team_name,
          pr.opponent,
          pr.fantasy_points,
          pr.fantasy_points_ppr,
          pr.projected_points,
          pr.projected_points_ppr,
          pr.is_game_over,
          p.age
        FROM player_rankings pr
        LEFT JOIN players p ON pr.player_id = p.player_id
        ${whereClause}
        ORDER BY ${nullHandling}${sortColumn} ${orderDirection}`;

      const [rankings] = await db.query(query, queryParams);

      // Add rank in JavaScript
      const rankedResults = rankings.map((player, index) => ({
        ...player,
        rank: index + 1
      }));

      return rankedResults;
    } catch (error) {
      console.error('Error fetching rankings from database:', error);
      throw error;
    }
  }
}

module.exports = new RankingsService();