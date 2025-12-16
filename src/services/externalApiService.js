/*
 * externalApiService.js - External API Integration Service
 * 
 * Handles all communication with SportsData.io NFL API
 * Fetches real-time stats, projections, and player data
 * 
 * Design Pattern: Singleton - Single instance manages all API calls
 * SOLID: Single Responsibility - Only handles external API communication
 * SOLID: Dependency Inversion - Abstracts external API behind service interface
 */

const axios = require('axios');

class ExternalApiService {
  /*
   * Initialize API configuration from environment variables
   * API key and base URL must be set in .env file
   */
  constructor() {
    this.apiKey = process.env.SPORTSDATA_API_KEY;
    this.baseUrl = process.env.SPORTSDATA_API_URL;
    this.currentSeason = process.env.CURRENT_NFL_SEASON || '2025';
  }

  /*
   * Fetch actual fantasy point totals for a specific week
   */
  async fetchFantasyStatsByWeek(week, seasonType = 'REG') {
    try {
      const url = `${this.baseUrl}/FantasyGameStatsByWeek/${this.currentSeason}${seasonType}/${week}`;
      
      console.log(`Fetching fantasy stats from: ${url}`);
      
      const response = await axios.get(url, {
        params: { key: this.apiKey }
      });

      return response.data;
    } catch (error) {
      console.error('Error fetching fantasy stats:', error.message);
      throw new Error('Failed to fetch fantasy stats from SportsData API');
    }
  }

  /*
   * Fetch projected fantasy points for upcoming week
   */
  async fetchFantasyProjectionsByWeek(week, seasonType = 'REG') {
    try {
      // Use the projections endpoint (separate from stats endpoint)
      const url = `https://api.sportsdata.io/v3/nfl/projections/json/PlayerGameProjectionStatsByWeek/${this.currentSeason}${seasonType}/${week}`;
      
      console.log(`Fetching fantasy projections from: ${url}`);
      
      const response = await axios.get(url, {
        params: { key: this.apiKey }
      });

      return response.data;
    } catch (error) {
      console.error('Error fetching fantasy projections:', error.message);
      throw new Error('Failed to fetch fantasy projections from SportsData API');
    }
  }

  /*
   * Calculate player age from birthdate
   * Useful for dynasty league valuations (younger players more valuable)
   */
  calculateAge(birthDate) {
    if (!birthDate) return null;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    // Adjust if birthday hasn't occurred yet this year
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  }
}

module.exports = new ExternalApiService();