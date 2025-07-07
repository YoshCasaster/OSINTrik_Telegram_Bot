const axios = require('axios');
const UserAgentManager = require('../userAgents');

class AboutMeChecker {
  constructor() {
    this.name = "About Me";
    this.domain = "about.me";
    this.method = "register";
    this.frequentRateLimit = false;
  }

  async check(email) {
    try {
      // Get initial token
      const userAgent = UserAgentManager.getRandomUserAgent('firefox');
      const tokenResponse = await axios.get("https://about.me/signup", {
        headers: {
          'User-Agent': userAgent
        }
      });

      // Extract auth token
      const authToken = tokenResponse.data.split(',"AUTH_TOKEN":"')[1].split('"')[0];

      // Setup headers
      const headers = {
        'User-Agent': userAgent,
        'Accept': 'application/json, text/javascript, */*; q=0.01',
        'Accept-Language': 'en-US,en;q=0.5',
        'X-Auth-Token': authToken,
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'Origin': 'https://about.me',
        'Connection': 'keep-alive'
      };

      // Prepare registration data
      const data = {
        user_name: "",
        first_name: "",
        last_name: "",
        allowed_features: [],
        email_address: email,
        honeypot: "",
        layout: { version: 1, id: "layout", color: "305B90" },
        signup: { id: "signup", step: "email", method: "email" }
      };

      // Make registration request
      const response = await axios.post('https://about.me/n/signup', data, {
        headers: headers
      });

      // Process response
      return {
        name: this.name,
        domain: this.domain,
        method: this.method,
        frequent_rate_limit: this.frequentRateLimit,
        rate_limit: false,
        exists: response.status === 409,
        email_recovery: null,
        phone_number: null,
        others: null
      };

    } catch (error) {
      // Handle different error cases
      if (error.response?.status === 409) {
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

      // Rate limit or other error
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

module.exports = AboutMeChecker;