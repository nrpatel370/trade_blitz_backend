const axios = require('axios');

class ExternalApiService {
  constructor() {
    this.apiKey = process.env.SPORTSDATA_API_KEY;
    this.baseUrl = process.env.SPORTSDATA_API_URL;
    this.currentSeason = process.env.CURRENT_NFL_SEASON || '2025';
  }

  // Fetch fantasy game stats by week
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

  // Helper to get player age (you may need another API endpoint for this)
  // For now, we'll return null and handle it separately
  calculateAge(birthDate) {
    if (!birthDate) return null;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  }
}

module.exports = new ExternalApiService();