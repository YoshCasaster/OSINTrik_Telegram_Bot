const axios = require('axios');
const UserAgentManager = require('../userAgents');

class DiscordChecker {
  constructor() {
    this.name = "Discord";
    this.domain = "discord.com";
    this.method = "register";
    this.frequentRateLimit = false;
  }

  async check(email) {
    try {
      const headers = {
        'User-Agent': UserAgentManager.getRandomUserAgent('firefox'),
        'Accept': '*/*',
        'Accept-Language': 'en-US',
        'Content-Type': 'application/json',
        'Origin': 'https://discord.com',
        'Connection': 'keep-alive'
      };

      const data = {
        fingerprint: "",
        email: email,
        username: this.generateRandomString(20),
        password: this.generateRandomString(20),
        invite: null,
        consent: true,
        date_of_birth: "",
        gift_code_sku_id: null,
        captcha_key: null
      };

      const response = await axios.post(
        'https://discord.com/api/v8/auth/register',
        data,
        { headers }
      );

      if (response.data.code) {
        try {
          if (response.data.errors?.email?._errors[0]?.code === "EMAIL_ALREADY_REGISTERED") {
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
        } catch (error) {
          // Error parsing response
          return this.getRateLimitResponse();
        }
      }

      // Check for captcha requirement
      if (response.data.captcha_key?.[0] === "captcha-required") {
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

      // Default case - account doesn't exist
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

    } catch (error) {
      return this.getRateLimitResponse();
    }
  }

  getRateLimitResponse() {
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

module.exports = DiscordChecker;