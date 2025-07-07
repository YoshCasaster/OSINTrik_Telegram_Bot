const { OWNER_ID } = require('../bot.config');

/**
 * Check if a user is the owner of the bot
 * @param {string|number} userId - Telegram user ID to check
 * @returns {boolean} - True if user is owner, false otherwise
 */
function isOwner(userId) {
  // Convert both IDs to strings for comparison to avoid type mismatches
  return String(userId) === String(OWNER_ID);
}

module.exports = { isOwner };
