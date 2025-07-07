const axios = require('axios');
const AboutMeChecker = require('./services/aboutme');
const AdobeChecker = require('./services/adobe');
const AmazonChecker = require('./services/amazon');
const AnydoChecker = require('./services/anydo');
const ArchiveChecker = require('./services/archive');
const DiscordChecker = require('./services/discord');
const GithubChecker = require('./services/github');

class EmailChecker {
  constructor() {
    // Initialize service checkers
    this.services = {
      aboutme: new AboutMeChecker(),
      adobe: new AdobeChecker(),
      amazon: new AmazonChecker(),
      anydo: new AnydoChecker(),
      archive: new ArchiveChecker(),
      discord: new DiscordChecker(),
      github: new GithubChecker()
    };

    // Additional services that don't have checkers yet
    this.pendingServices = {
      'instagram': 'instagram.com',
      'spotify': 'spotify.com',
      'twitter': 'twitter.com'
    };
  }

  async checkEmail(email) {
    const results = [];
    
    for (const [serviceName, service] of Object.entries(this.services)) {
      try {
        const result = await service.check(email);
        if (result.exists === true) {
          results.push({
            service: serviceName,
            domain: result.domain,
            method: result.method
          });
        }
        // Add delay between checks
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.error(`Error checking ${serviceName}:`, error);
      }
    }
    
    return results;
  }
}

module.exports = EmailChecker;