module.exports = {
  name: 'cekchatid',
  desc: 'Cek ID dari grup atau channel',
  category: 'utility',
  async run(ctx, { db }) {
    // Get chat information
    const chat = ctx.chat;
    const chatId = chat.id;
    const chatTitle = chat.title || 'Private Chat';
    const chatType = chat.type;
    const chatUsername = chat.username ? `@${chat.username}` : 'Tidak ada';
    
    // Format the message
    const message = `
📌 *INFO CHAT*

👥 Nama      : ${chatTitle}
🆔 Chat ID   : ${chatId}
🔹 Tipe      : ${formatChatType(chatType)}
🌐 Username  : ${chatUsername}
    `.trim();
    
    await ctx.reply(message, { parse_mode: 'Markdown' });
  }
};

/**
 * Format chat type for better readability
 * @param {string} type - Chat type from Telegram API
 * @returns {string} - Formatted chat type
 */
function formatChatType(type) {
  switch (type) {
    case 'private':
      return 'Chat Pribadi';
    case 'group':
      return 'Grup';
    case 'supergroup':
      return 'Supergrup';
    case 'channel':
      return 'Channel';
    default:
      return type;
  }
}
