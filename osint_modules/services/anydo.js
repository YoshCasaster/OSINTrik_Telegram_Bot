const axios = require('axios');
const UserAgentManager = require('../userAgents');

class AnydoChecker {
  constructor() {
    this.name = "Any.do";
    this.domain = "any.do";
    this.method = "login";
    this.frequentRateLimit = true;
  }

  async check(email) {
    try {
      const headers = {
        'User-Agent': UserAgentManager.getRandomUserAgent('chrome'),
        'Accept': '*/*',
        'Accept-Language': 'en,en-US;q=0.5',
        'Referer': 'https://desktop.any.do/',
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Platform': '3',
        'Origin': 'https://desktop.any.do/',
        'Connection': 'keep-alive'
      };

      const data = { email };

      const response = await axios.post(
        'https://sm-prod2.any.do/check_email',
        data,
        { headers }
      );

      if (response.status === 200) {
        return {
          name: this.name,
          domain: this.domain,
          method: this.method,
          frequent_rate_limit: this.frequentRateLimit,
          rate_limit: false,
          exists: response.data.user_exists === true,
          email_recovery: null,
          phone_number: null,
          others: null
        };
      }

      throw new Error('Invalid response');

    } catch (error) {
      return {
        name: this.name,
        domain: this.domain,
        method: this.method,
        frequent_rate_limit: this.frequentRateLimit,
        rate_limit: true,
        exists: false,
        email_recovery: null,
        phone_number: null,
        others: null
      };
    }
  }
}

module.exports = AnydoChecker;