const { OWNER_ID } = require('../bot.config');

/**
 * Checks if a user can use a feature that requires limits
 * @param {Object} ctx - Telegraf context
 * @param {Object} db - Database instance
 * @param {number} requiredLimit - Amount of limit required for the feature
 * @returns {Object} - Object with status and message
 */
async function checkLimitAndPermission(ctx, db, requiredLimit) {
  const senderId = ctx.senderId;
  const data = db.list();
  const user = data.user[senderId];

  // Check if user is the owner - owners have unlimited access
  if (String(senderId) === String(OWNER_ID)) {
    return { 
      canUse: true, 
      isOwner: true,
      user: user
    };
  }

  // Check if user is registered
  if (!user || !user.register) {
    return {
      canUse: false,
      message: `🧩 Kamu belum terdaftar!\nKetik /register dulu ya~`
    };
  }

  // Check if user has enough limit
  if (user.limit < requiredLimit) {
    return {
      canUse: false,
      message: `⛔ Limit kamu tidak cukup!\nDibutuhkan ${requiredLimit} limit, kamu hanya punya ${user.limit} limit.\n\n┏━━━『 BELI LIMIT 』━━━┓\n🧩1 Limit   = 💵 Rp. 1.000\n🧩5 Limit   = 💵 Rp. 3.000\n🧩10 Limit  = 💵 Rp. 5.000\n🧩20 Limit  = 💵 Rp. 15.000\n🧩50 Limit  = 💵 Rp. 30.000\n🧩100 Limit = 💵 Rp. 50.000\n🧩150 Limit = 💵 Rp. 75.000\n🧩200 Limit = 💵 Rp. 100.000\n┗━━━━━━━━━━━━━━━━━┛`,
      extra: {
        reply_markup: {
          inline_keyboard: [
            [{ text: '💰 Beli Limit', url: 'https://t.me/Toretinyy' }]
          ]
        },
        parse_mode: 'Markdown'
      }
    };
  }

  return {
    canUse: true,
    isOwner: false,
    user: user
  };
}

/**
 * Reduces user limit after using a feature
 * @param {Object} user - User object
 * @param {Object} db - Database instance
 * @param {number} amount - Amount of limit to reduce
 * @returns {string} - Message about limit reduction
 */
async function reduceLimit(user, db, amount) {
  if (!user) return '';
  
  const oldLimit = user.limit;
  user.limit -= amount;
  await db.save();
  
  return `\n\n💫 *Limit kamu:* ${user.limit} (-${amount})`;
}

module.exports = {
  checkLimitAndPermission,
  reduceLimit,
  isOwner: (userId) => String(userId) === String(OWNER_ID)
};
