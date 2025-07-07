const axios = require('axios');
const UserAgentManager = require('../userAgents');

class GithubChecker {
  constructor() {
    this.name = "GitHub";
    this.domain = "github.com";
    this.method = "register";
    this.frequentRateLimit = false;
  }

  async getAuthTokens(html) {
    const tokenRegex = /<auto-check src="\/signup_check\/username[\s\S]*?value="([\S]+)"[\s\S]*<auto-check src="\/signup_check\/email[\s\S]*?value="([\S]+)"/;
    const matches = html.match(tokenRegex);
    return matches ? matches[1] : null;
  }

  async check(email) {
    try {
      const headers = {
        'User-Agent': UserAgentManager.getRandomUserAgent('chrome'),
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.5',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Origin': 'https://github.com',
        'Connection': 'keep-alive',
        'Referer': 'https://github.com/join'
      };

      // First request to get authenticity token
      const joinResponse = await axios.get('https://github.com/join', { headers });
      const authToken = await this.getAuthTokens(joinResponse.data);

      if (!authToken) {
        throw new Error('Could not extract authentication token');
      }

      // Check email request
      const checkResponse = await axios.post(
        'https://github.com/signup_check/email',
        {
          value: email,
          authenticity_token: authToken
        },
        { headers }
      );

      if (checkResponse.data.includes('Your browser did something unexpected.')) {
        return {
          name: this.name,
          domain: this.domain,
          method: this.method,
          frequent_rate_limit: this.frequentRateLimit,
          rate_limit: true,
          exists: null,
          email_recovery: null,
          phone_number: null,
          others: null
        };
      }

      if (checkResponse.status === 422) {
        return {
          name: this.name,
          domain: this.domain,
          method: this.method,
          frequent_rate_limit: this.frequentRateLimit,
          rate_limit: false,
          exists: true,
          email_recovery: null,
          phone_number: null,
          others: null
        };
      }

      if (checkResponse.status === 200) {
        return {
          name: this.name,
          domain: this.domain,
          method: this.method,
          frequent_rate_limit: this.frequentRateLimit,
          rate_limit: false,
          exists: false,
          email_recovery: null,
          phone_number: null,
          others: null
        };
      }

      return {
        name: this.name,
        domain: this.domain,
        method: this.method,
        frequent_rate_limit: this.frequentRateLimit,
        rate_limit: true,
        exists: null,
        email_recovery: null,
        phone_number: null,
        others: null
      };

    } catch (error) {
      return {
        name: this.name,
        domain: this.domain,
        method: this.method,
        frequent_rate_limit: this.frequentRateLimit,
        rate_limit: true,
        exists: null,
        email_recovery: null,
        phone_number: null,
        others: null
      };
    }
  }
}

module.exports = GithubChecker;