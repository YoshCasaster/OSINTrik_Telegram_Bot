module.exports = {
  name: 'cekid',
  desc: 'Cek ID Telegram kamu atau orang lain',
  category: 'utility',
  async run(ctx, { db }) {
    // Check if this is a reply to another message
    if (ctx.message.reply_to_message) {
      const repliedMsg = ctx.message.reply_to_message;
      const user = repliedMsg.from;
      
      if (user) {
        const userId = user.id;
        const firstName = user.first_name || '';
        const lastName = user.last_name || '';
        const fullName = lastName ? `${firstName} ${lastName}` : firstName;
        const username = user.username ? `@${user.username}` : 'Tidak ada';
        
        // Format the message
        const message = `
📌 *INFO USER DARI PESAN YANG DIBALAS*

👤 Nama      : ${fullName}
🆔 User ID   : ${userId}
🌐 UserName : ${username}
        `.trim();
        
        return ctx.reply(message, { parse_mode: 'Markdown' });
      }
    }
    
    // Check if this is a forwarded message
    if (ctx.message.forward_from) {
      const user = ctx.message.forward_from;
      const userId = user.id;
      const firstName = user.first_name || '';
      const lastName = user.last_name || '';
      const fullName = lastName ? `${firstName} ${lastName}` : firstName;
      const username = user.username ? `@${user.username}` : 'Tidak ada';
      
      // Format the message
      const message = `
📌 *INFO USER DARI PESAN YANG DITERUSKAN*

👤 Nama      : ${fullName}
🆔 User ID   : ${userId}
🌐 UserName : ${username}
      `.trim();
      
      return ctx.reply(message, { parse_mode: 'Markdown' });
    }
    
    // If no reply or forward, show the sender's info
    const user = ctx.from;
    const userId = user.id;
    const firstName = user.first_name || '';
    const lastName = user.last_name || '';
    const fullName = lastName ? `${firstName} ${lastName}` : firstName;
    const username = user.username ? `@${user.username}` : 'Tidak ada';
    
    // Format the message
    const message = `
📌 *INFO USER KAMU*

👤 Nama      : ${fullName}
🆔 User ID   : ${userId}
🌐 UserName : ${username}
    `.trim();
    
    await ctx.reply(message, { parse_mode: 'Markdown' });
  }
};
