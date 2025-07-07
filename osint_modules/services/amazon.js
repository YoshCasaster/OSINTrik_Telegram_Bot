const axios = require('axios');
const cheerio = require('cheerio');
const UserAgentManager = require('../userAgents');

class AmazonChecker {
  constructor() {
    this.name = "Amazon";
    this.domain = "amazon.com";
    this.method = "login";
    this.frequentRateLimit = false;
  }

  async check(email) {
    try {
      const headers = {
        'User-Agent': UserAgentManager.getRandomUserAgent('firefox'),
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.5'
      };

      // Get login page and extract form data
      const loginUrl = "https://www.amazon.com/ap/signin?openid.pape.max_auth_age=0&openid.return_to=https%3A%2F%2Fwww.amazon.com%2F%3F_encoding%3DUTF8%26ref_%3Dnav_ya_signin&openid.identity=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0%2Fidentifier_select&openid.assoc_handle=usflex&openid.mode=checkid_setup&openid.claimed_id=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0%2Fidentifier_select&openid.ns=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0&";
      
      const loginPageResponse = await axios.get(loginUrl, { headers });
      const $ = cheerio.load(loginPageResponse.data);
      
      // Extract form data
      const formData = {};
      $('form input').each((i, elem) => {
        const name = $(elem).attr('name');
        const value = $(elem).attr('value');
        if (name && value) {
          formData[name] = value;
        }
      });

      // Add email to form data
      formData.email = email;

      // Submit login form
      const loginResponse = await axios.post('https://www.amazon.com/ap/signin/', 
        new URLSearchParams(formData),
        { 
          headers: {
            ...headers,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      // Check response for password missing alert
      const $response = cheerio.load(loginResponse.data);
      const passwordMissingAlert = $response('#auth-password-missing-alert').length > 0;

      return {
        name: this.name,
        domain: this.domain,
        method: this.method,
        frequent_rate_limit: this.frequentRateLimit,
        rate_limit: false,
        exists: passwordMissingAlert,
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

module.exports = AmazonChecker;