/*
 * tradeAnalysisService.js - Trade Analysis Service
 * 
 * Uses weighted scoring algorithm combining recent performance and projections
 * 
 * Design Pattern: Singleton - Single instance handles all trade calculations
 * SOLID: Single Responsibility - Only handles trade value calculations and comparisons
 */

const db = require('../config/database');

class TradeAnalysisService {
  /*
   * Calculate a player's trade value based on performance data
   */
  async getPlayerValue(playerId, currentWeek, season, scoringType = 'standard') {
    try {
      console.log(`\n=== Getting value for player ${playerId}, Week ${currentWeek}, Season ${season}, Scoring: ${scoringType} ===`);
      const pointsColumn = scoringType === 'ppr' ? 'fantasy_points_ppr' : 'fantasy_points';
      const projectedColumn = scoringType === 'ppr' ? 'projected_points_ppr' : 'projected_points';

      // Get last 3 weeks of actual performance
      const [recentPerformance] = await db.query(
        `SELECT ${pointsColumn} as points, week_number, player_name
         FROM player_rankings
         WHERE player_id = ? 
           AND season = ? 
           AND week_number < ?
           AND week_number >= ?
           AND ${pointsColumn} IS NOT NULL
         ORDER BY week_number DESC
         LIMIT 3`,
        [playerId, season, currentWeek, currentWeek - 5]
      );

      console.log(`Recent performance (${recentPerformance.length} weeks):`, recentPerformance);

      // Get next week projection
      const [projection] = await db.query(
        `SELECT ${projectedColumn} as projected_points
         FROM player_rankings
         WHERE player_id = ? 
           AND season = ? 
           AND week_number = ?`,
        [playerId, season, currentWeek]
      );

       console.log(`Projection for week ${currentWeek}:`, projection);

      // Calculate average of recent performance
      let recentAvg = 0;
      if (recentPerformance.length > 0) {
        const total = recentPerformance.reduce((sum, week) => {
          const points = parseFloat(week.points) || 0;
          return sum + points;
        }, 0);
        recentAvg = total / recentPerformance.length;
      }

      console.log(`Recent average: ${recentAvg}`);

      // Get projected points for next week
      const projectedPoints = projection.length > 0 ? (parseFloat(projection[0].projected_points) || 0) : 0;

      console.log(`Projected points: ${projectedPoints}`);

      // Weighted average: 60% recent performance, 40% projection
      const playerValue = (recentAvg * 0.6) + (projectedPoints * 0.4);

      console.log(`Base player value: ${playerValue}`);

      // Get player name from recent performance or fall back to players table
      let playerName = 'Unknown';
      let position = null;
      
      if (recentPerformance.length > 0 && recentPerformance[0].player_name) {
        playerName = recentPerformance[0].player_name;
      }
      
      // Get player details for position factor
      const [playerDetails] = await db.query(
        `SELECT position, player_name FROM players WHERE player_id = ?`,
        [playerId]
      );

      if (playerDetails.length > 0) {
        position = playerDetails[0].position;
        if (!playerName || playerName === 'Unknown') {
          playerName = playerDetails[0].player_name;
        }
      }
      console.log(`Player: ${playerName}, Position: ${position}`);

      // Apply position scarcity factor
      const positionMultiplier = this.getPositionMultiplier(position);
      const adjustedValue = playerValue * positionMultiplier;

      console.log(`Position multiplier: ${positionMultiplier}, Adjusted value: ${adjustedValue}`);

      return {
        playerId,
        playerName,
        recentAvg,
        projectedPoints,
        baseValue: playerValue,
        adjustedValue,
        position,
        weeksAnalyzed: recentPerformance.length
      };
    } catch (error) {
      console.error('Error getting player value:', error);
      throw error;
    }
  }

  /*
   * Position scarcity multiplier - reflects real-world value differences
   * RBs are most scarce, kickers most replaceable
   */
  getPositionMultiplier(position) {
    const multipliers = {
      'QB': 1.0,   // QBs are plentiful
      'RB': 1.4,   // RBs are scarce and valuable
      'WR': 1.3,   // WRs are moderately valuable
      'TE': 1.2,   // Top TEs are scarce
      'K': 0.5,    // Kickers are replaceable
      'DEF': 0.7   // Defenses are somewhat replaceable
    };
    return multipliers[position] || 1.0;
  }

  /*
   * Main trade analysis method, compares total value of both sides
   */
  async analyzeTrade(playersGiving, playersReceiving, currentWeek, season, scoringType = 'standard') {
    try {
      console.log('\n========== TRADE ANALYSIS START ==========');
      console.log('Players Giving:', playersGiving);
      console.log('Players Receiving:', playersReceiving);
      console.log('Week:', currentWeek, 'Season:', season, 'Scoring:', scoringType);
      // Get values for all players giving away
      console.log('\n--- GIVING VALUES ---');
      const givingValues = await Promise.all(
        playersGiving.map(playerId => this.getPlayerValue(playerId, currentWeek, season, scoringType))
      );

      givingValues.forEach(v => {
        console.log(`${v.playerName}: ${v.adjustedValue.toFixed(1)} pts`);
      });


      // Get values for all players receiving
      const receivingValues = await Promise.all(
        playersReceiving.map(playerId => this.getPlayerValue(playerId, currentWeek, season, scoringType))
      );

      console.log('\n--- RECEIVING VALUES ---');
      receivingValues.forEach(v => {
        console.log(`${v.playerName}: ${v.adjustedValue.toFixed(1)} pts`);
      });

      // Calculate totals
      const givingTotal = givingValues.reduce((sum, p) => sum + p.adjustedValue, 0);
      const receivingTotal = receivingValues.reduce((sum, p) => sum + p.adjustedValue, 0);

      console.log('\n--- TOTALS ---');
      console.log(`Giving Total: ${givingTotal.toFixed(1)}`);
      console.log(`Receiving Total: ${receivingTotal.toFixed(1)}`);

      // Calculate difference and percentage
      const difference = receivingTotal - givingTotal;
      const percentDifference = givingTotal > 0 ? (difference / givingTotal) * 100 : 0;

      console.log(`Difference: ${difference.toFixed(1)} (${percentDifference.toFixed(1)}%)`);

      // Determine grade
      let grade, recommendation;
      if (percentDifference >= 20) {
        grade = 'A+';
        recommendation = 'Excellent trade! You\'re receiving significantly more value. This trade would greatly strengthen your roster.';
      } else if (percentDifference >= 10) {
        grade = 'A';
        recommendation = 'Great trade! You\'re getting good value in return. This should improve your team\'s overall performance.';
      } else if (percentDifference >= 0) {
        grade = 'B';
        recommendation = 'Fair trade. You\'re getting slightly better value or breaking even. Consider your roster needs and bye weeks.';
      } else if (percentDifference >= -10) {
        grade = 'C';
        recommendation = 'Slight loss in value. If this fills a critical roster need, it might still be worth considering.';
      } else if (percentDifference >= -20) {
        grade = 'D';
        recommendation = 'Not recommended. You\'re giving up more value than you\'re receiving. Try to negotiate for better players or additional assets.';
      } else {
        grade = 'F';
        recommendation = 'Poor trade! You\'re losing significant value. It\'s strongly recommended to reject this trade.';
      }

      // Generate detailed analysis
      const analysis = this.generateDetailedAnalysis(
        givingValues,
        receivingValues,
        givingTotal,
        receivingTotal,
        percentDifference
      );

      return {
        grade,
        recommendation,
        analysis,
        givingValues,
        receivingValues,
        givingTotal: givingTotal.toFixed(1),
        receivingTotal: receivingTotal.toFixed(1),
        difference: difference.toFixed(1),
        percentDifference: percentDifference.toFixed(1)
      };
    } catch (error) {
      console.error('Error analyzing trade:', error);
      throw error;
    }
  }

  /*
   * Builds analysis explaining trade impact
   */
  generateDetailedAnalysis(givingValues, receivingValues, givingTotal, receivingTotal, percentDiff) {
    let analysis = [];

    // Overall value assessment
    if (percentDiff > 0) {
      analysis.push(`You're gaining approximately ${Math.abs(percentDiff).toFixed(1)}% value in this trade.`);
    } else {
      analysis.push(`You're losing approximately ${Math.abs(percentDiff).toFixed(1)}% value in this trade.`);
    }

    // Position breakdown
    const givingPositions = this.groupByPosition(givingValues);
    const receivingPositions = this.groupByPosition(receivingValues);

    // Analyze position changes
    const positionChanges = [];
    const allPositions = new Set([...Object.keys(givingPositions), ...Object.keys(receivingPositions)]);
    
    allPositions.forEach(pos => {
      const giving = givingPositions[pos] || 0;
      const receiving = receivingPositions[pos] || 0;
      if (giving > 0 || receiving > 0) {
        if (receiving > giving) {
          positionChanges.push(`Strengthening ${pos} position (+${(receiving - giving).toFixed(1)} pts)`);
        } else if (giving > receiving) {
          positionChanges.push(`Weakening ${pos} position (-${(giving - receiving).toFixed(1)} pts)`);
        }
      }
    });

    if (positionChanges.length > 0) {
      analysis.push(positionChanges.join('. '));
    }

    // Trade type analysis
    if (givingValues.length > receivingValues.length) {
      analysis.push(`Trading depth for a star player. Make sure you have adequate bench depth.`);
    } else if (receivingValues.length > givingValues.length) {
      analysis.push(`Acquiring multiple players. Consider your roster space and bye weeks.`);
    }

    return analysis.join(' ');
  }

  // Group players by position
  groupByPosition(playerValues) {
    const grouped = {};
    playerValues.forEach(p => {
      if (!grouped[p.position]) {
        grouped[p.position] = 0;
      }
      grouped[p.position] += p.adjustedValue;
    });
    return grouped;
  }
}

module.exports = new TradeAnalysisService();