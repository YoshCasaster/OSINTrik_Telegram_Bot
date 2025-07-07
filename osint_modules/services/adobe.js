const axios = require('axios');
const UserAgentManager = require('../userAgents');

class AdobeChecker {
  constructor() {
    this.name = "Adobe";
    this.domain = "adobe.com";
    this.method = "password recovery";
    this.frequentRateLimit = false;
  }

  async check(email) {
    try {
      // First request to get authentication state
      const headers = {
        'User-Agent': UserAgentManager.getRandomUserAgent('chrome'),
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.5',
        'X-IMS-CLIENTID': 'adobedotcom2',
        'Content-Type': 'application/json;charset=utf-8',
        'Origin': 'https://auth.services.adobe.com',
        'Connection': 'keep-alive'
      };

      const data = {
        username: email,
        accountType: "individual"
      };

      const authResponse = await axios.post(
        'https://auth.services.adobe.com/signin/v1/authenticationstate',
        data,
        { headers }
      );

      // Check for error code in response
      if (authResponse.data.errorCode) {
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

      // Add authentication state to headers
      headers['X-IMS-Authentication-State'] = authResponse.data.id;

      // Second request to get recovery info
      const challengeResponse = await axios.get(
        'https://auth.services.adobe.com/signin/v2/challenges',
        {
          headers,
          params: {
            purpose: 'passwordRecovery'
          }
        }
      );

      return {
        name: this.name,
        domain: this.domain,
        method: this.method,
        frequent_rate_limit: this.frequentRateLimit,
        rate_limit: false,
        exists: true,
        email_recovery: challengeResponse.data.secondaryEmail || null,
        phone_number: challengeResponse.data.securityphone_number || null,
        others: null
      };

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

module.exports = AdobeChecker;