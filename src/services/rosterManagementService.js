const db = require('../config/database');

class RosterManagementService {
  // Define roster structure
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

  // Create roster with empty position slots
  async createRosterWithSlots(userId, rosterName, leagueFormat) {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();

      // Create roster
      const [rosterResult] = await connection.query(
        'INSERT INTO rosters (user_id, roster_name, league_format) VALUES (?, ?, ?)',
        [userId, rosterName, leagueFormat]
      );

      const rosterId = rosterResult.insertId;

      // Create empty position slots
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
      await connection.rollback();
      connection.release();
      throw error;
    }
  }

  // Get roster with all position slots
  async getRosterWithPositions(rosterId, userId) {
    try {
      // Verify ownership
      const [rosters] = await db.query(
        'SELECT * FROM rosters WHERE roster_id = ? AND user_id = ?',
        [rosterId, userId]
      );

      if (rosters.length === 0) {
        throw new Error('Roster not found');
      }

      const roster = rosters[0];

      // Get all position slots with players
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

  // Add player to roster slot
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

      // Get player details
      const [players] = await db.query(
        'SELECT * FROM players WHERE player_id = ?',
        [playerId]
      );

      if (players.length === 0) {
        throw new Error('Player not found');
      }

      const player = players[0];

      // Validate position for slot
      const structure = this.getRosterStructure();
      const slotConfig = structure.find(s => s.slot === positionSlot);

      if (!slotConfig) {
        throw new Error('Invalid position slot');
      }

      // Validate player position for slot
      if (slotConfig.position === 'FLEX') {
        // FLEX can be RB, WR, or TE
        if (!['RB', 'WR', 'TE'].includes(player.position)) {
          throw new Error('FLEX position must be RB, WR, or TE');
        }
      } else if (slotConfig.position !== player.position) {
        throw new Error(`Player position ${player.position} does not match slot ${slotConfig.position}`);
      }

      // Check if player is already in this roster
      const [existingPosition] = await db.query(
        'SELECT * FROM roster_positions WHERE roster_id = ? AND player_id = ?',
        [rosterId, playerId]
      );

      if (existingPosition.length > 0) {
        throw new Error('Player already in roster');
      }

      // Update position slot
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

  // Remove player from roster slot
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

      // Remove player from slot (set to NULL)
      await db.query(
        'UPDATE roster_positions SET player_id = NULL WHERE roster_id = ? AND position_slot = ?',
        [rosterId, positionSlot]
      );

      return {
        success: true,
        message: 'Player removed from roster'
      };
    } catch (error) {
      throw error;
    }
  }

  // Delete roster
  async deleteRoster(rosterId, userId) {
    try {
      const [result] = await db.query(
        'DELETE FROM rosters WHERE roster_id = ? AND user_id = ?',
        [rosterId, userId]
      );

      if (result.affectedRows === 0) {
        throw new Error('Roster not found');
      }

      return {
        success: true,
        message: 'Roster deleted successfully'
      };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new RosterManagementService();