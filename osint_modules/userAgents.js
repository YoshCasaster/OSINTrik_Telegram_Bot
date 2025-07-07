const userAgents = {
  browsers: {
    chrome: [
      "Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2228.0 Safari/537.36",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2227.1 Safari/537.36",
      // ...more Chrome user agents
    ],
    firefox: [
      "Mozilla/5.0 (Windows NT 6.1; WOW64; rv:40.0) Gecko/20100101 Firefox/40.1",
      "Mozilla/5.0 (Windows NT 6.3; rv:36.0) Gecko/20100101 Firefox/36.0",
      // ...more Firefox user agents
    ],
    opera: [
      "Opera/9.80 (X11; Linux i686; Ubuntu/14.10) Presto/2.12.388 Version/12.16",
      "Opera/9.80 (Windows NT 6.0) Presto/2.12.388 Version/12.14",
      // ...more Opera user agents
    ],
    safari: [
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_3) AppleWebKit/537.75.14 (KHTML, like Gecko) Version/7.0.3 Safari/7046A194A",
      "Mozilla/5.0 (iPad; CPU OS 6_0 like Mac OS X) AppleWebKit/536.26 (KHTML, like Gecko) Version/6.0 Mobile/10A5355d Safari/8536.25",
      // ...more Safari user agents
    ]
  }
};

class UserAgentManager {
  static getRandomUserAgent(browser = 'chrome') {
    const agents = userAgents.browsers[browser.toLowerCase()];
    if (!agents) {
      return userAgents.browsers.chrome[0]; // Default fallback
    }
    return agents[Math.floor(Math.random() * agents.length)];
  }
}

module.exports = UserAgentManager;