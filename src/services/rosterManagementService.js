/*
 * rosterManagementService.js - Roster Management Service
 * 
 * Design Pattern: Singleton Service
 * - Single instance exported for use across the application
 * - Encapsulates all roster-related business logic
 * 
 * Single Responsibility: Only handles roster operations (CRUD, player slots)
 * Open/Closed: Can add new roster features without modifying existing methods
 */

const db = require('../config/database');

class RosterManagementService {
  /*
   * Returns the standard fantasy football roster structure
   */
  getRosterStructure() {
    return [
      { slot: 'QB1', position: 'QB', label: 'Quarterback' },
      { slot: 'RB1', position: 'RB', label: 'Running Back 1' },
      { slot: 'RB2', position: 'RB', label: 'Running Back 2' },
      { slot: 'WR1', position: 'WR', label: 'Wide Receiver 1' },
      { slot: 'WR2', position: 'WR', label: 'Wide Receiver 2' },
      { slot: 'TE1', position: 'TE', label: 'Tight End' },
      { slot: 'FLEX1', position: 'FLEX', label: 'Flex (RB/WR/TE)' },
      { slot: 'K1', position: 'K', label: 'Kicker' },
      { slot: 'DEF1', position: 'DEF', label: 'Defense' }
    ];
  }

  /*
   * Creates a new roster with empty position slots
   */
  async createRosterWithSlots(userId, rosterName, leagueFormat) {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();

      // Create the roster record
      const [rosterResult] = await connection.query(
        'INSERT INTO rosters (user_id, roster_name, league_format) VALUES (?, ?, ?)',
        [userId, rosterName, leagueFormat]
      );

      const rosterId = rosterResult.insertId;

      // Create empty slot for each position in the roster structure
      const structure = this.getRosterStructure();
      for (const slot of structure) {
        await connection.query(
          'INSERT INTO roster_positions (roster_id, position_slot, player_id) VALUES (?, ?, NULL)',
          [rosterId, slot.slot]
        );
      }

      await connection.commit();
      connection.release();

      return {
        success: true,
        rosterId,
        message: 'Roster created successfully'
      };
    } catch (error) {
      // Rollback on any error to maintain data integrity
      await connection.rollback();
      connection.release();
      throw error;
    }
  }

  /*
   * Retrieves a roster with all position slots and player details
   */
  async getRosterWithPositions(rosterId, userId) {
    try {
      // Verify the user owns this roster
      const [rosters] = await db.query(
        'SELECT * FROM rosters WHERE roster_id = ? AND user_id = ?',
        [rosterId, userId]
      );

      if (rosters.length === 0) {
        throw new Error('Roster not found');
      }

      const roster = rosters[0];

      // Get all position slots with player info (LEFT JOIN for empty slots)
      const [positions] = await db.query(
        `SELECT 
          rp.roster_position_id,
          rp.position_slot,
          rp.player_id,
          p.player_name,
          p.team_name,
          p.position,
          p.age
        FROM roster_positions rp
        LEFT JOIN players p ON rp.player_id = p.player_id
        WHERE rp.roster_id = ?
        ORDER BY 
          FIELD(rp.position_slot, 'QB1', 'RB1', 'RB2', 'WR1', 'WR2', 'TE1', 'FLEX1', 'K1', 'DEF1')`,
        [rosterId]
      );

      return {
        roster,
        positions
      };
    } catch (error) {
      throw error;
    }
  }

  /*
   * Adds a player to a specific roster slot
   */
  async addPlayerToSlot(rosterId, userId, positionSlot, playerId) {
    try {
      // Verify ownership
      const [rosters] = await db.query(
        'SELECT * FROM rosters WHERE roster_id = ? AND user_id = ?',
        [rosterId, userId]
      );

      if (rosters.length === 0) {
        throw new Error('Roster not found');
      }

      // Get player details to validate position
      const [players] = await db.query(
        'SELECT * FROM players WHERE player_id = ?',
        [playerId]
      );

      if (players.length === 0) {
        throw new Error('Player not found');
      }

      const player = players[0];

      // Find the slot configuration to validate position
      const structure = this.getRosterStructure();
      const slotConfig = structure.find(s => s.slot === positionSlot);

      if (!slotConfig) {
        throw new Error('Invalid position slot');
      }

      // Validate player position matches slot requirements
      if (slotConfig.position === 'FLEX') {
        // FLEX accepts RB, WR, or TE
        if (!['RB', 'WR', 'TE'].includes(player.position)) {
          throw new Error('FLEX position must be RB, WR, or TE');
        }
      } else if (slotConfig.position !== player.position) {
        throw new Error(`Player position ${player.position} does not match slot ${slotConfig.position}`);
      }

      // Check player isn't already on this roster
      const [existingPosition] = await db.query(
        'SELECT * FROM roster_positions WHERE roster_id = ? AND player_id = ?',
        [rosterId, playerId]
      );

      if (existingPosition.length > 0) {
        throw new Error('Player already in roster');
      }

      // Add player to the slot
      await db.query(
        'UPDATE roster_positions SET player_id = ? WHERE roster_id = ? AND position_slot = ?',
        [playerId, rosterId, positionSlot]
      );

      return {
        success: true,
        message: 'Player added to roster'
      };
    } catch (error) {
      throw error;
    }
  }

  /*
   * Removes a player from a roster slot (sets slot to empty)
   */
  async removePlayerFromSlot(rosterId, userId, positionSlot) {
    try {
      // Verify ownership
      const [rosters] = await db.query(
        'SELECT * FROM rosters WHERE roster_id = ? AND user_id = ?',
        [rosterId, userId]
      );

      if (rosters.length === 0) {
        throw new Error('Roster not found');
      }

      // Set player_id to NULL to clear the slot
      await db.query(
        'UPDATE roster_positions SET player_id = NULL WHERE roster_id = ? AND position_slot = ?',
        [rosterId, positionSlot]
      );

      return { success: true, message: 'Player removed from roster' };
    } catch (error) {
      throw error;
    }
  }

  /*
   * Deletes an entire roster and all its position slots
   * Cascade delete handles removing roster_positions automatically
   */
  async deleteRoster(rosterId, userId) {
    try {
      const [result] = await db.query(
        'DELETE FROM rosters WHERE roster_id = ? AND user_id = ?',
        [rosterId, userId]
      );

      if (result.affectedRows === 0) {
        throw new Error('Roster not found');
      }

      return { success: true, message: 'Roster deleted successfully' };
    } catch (error) {
      throw error;
    }
  }
}

// Export singleton instance
module.exports = new RosterManagementService();