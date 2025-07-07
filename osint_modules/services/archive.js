const axios = require('axios');
const UserAgentManager = require('../userAgents');

class ArchiveChecker {
  constructor() {
    this.name = "Archive";
    this.domain = "archive.org";
    this.method = "register";
    this.frequentRateLimit = false;
  }

  async check(email) {
    try {
      const headers = {
        'User-Agent': UserAgentManager.getRandomUserAgent('chrome'),
        'Accept': '*/*',
        'Accept-Language': 'en,en-US;q=0.5',
        'Content-Type': 'multipart/form-data; boundary=---------------------------',
        'Origin': 'https://archive.org',
        'Connection': 'keep-alive',
        'Referer': 'https://archive.org/account/signup'
      };

      const response = await axios.post(
        'https://archive.org/account/signup',
        `-----------------------------
Content-Disposition: form-data; name="input_name"

username
-----------------------------
Content-Disposition: form-data; name="input_value"

${email}
-----------------------------
Content-Disposition: form-data; name="input_validator"

true
-----------------------------
Content-Disposition: form-data; name="submit_by_js"

true
-----------------------------`,
        { headers }
      );

      return {
        name: this.name,
        domain: this.domain,
        method: this.method,
        frequent_rate_limit: this.frequentRateLimit,
        rate_limit: false,
        exists: response.data.includes('is already taken.'),
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
        exists: false,
        email_recovery: null,
        phone_number: null,
        others: null
      };
    }
  }
}

module.exports = ArchiveChecker;