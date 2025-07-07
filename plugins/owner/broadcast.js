const { isOwner } = require('../../core/owner');

module.exports = {
  name: 'broadcast',
  desc: 'Kirim pesan ke semua user (khusus owner)',
  category: 'owner',
  async run(ctx, { db }) {
    const senderId = ctx.senderId;
    
    // Check if the user is the owner
    if (!isOwner(senderId)) {
      return ctx.reply('⚠️ Maaf, fitur ini hanya untuk owner bot!');
    }
    
    // Get command arguments
    const args = ctx.message.text.split(' ').slice(1);
    const message = args.join(' ');
    
    if (!message) {
      return ctx.reply('❌ Format salah! Gunakan: /broadcast <pesan>');
    }
    
    // Get all users
    const data = db.list();
    const users = data.user;
    
    if (Object.keys(users).length === 0) {
      return ctx.reply('❌ Belum ada user yang terdaftar!');
    }
    
    // Send status message
    const statusMsg = await ctx.reply(`🔄 Memulai broadcast ke ${Object.keys(users).length} user...`);
    
    let successCount = 0;
    let failCount = 0;
    
    // Format the broadcast message
    const broadcastMsg = `
📢 *BROADCAST MESSAGE*

${message}

🤖 *Dari:* Owner OSINTrix Bot
⏰ *Waktu:* ${new Date().toLocaleString('id-ID')}
    `.trim();
    
    // Send message to all users
    for (const [userId, user] of Object.entries(users)) {
      if (user.register) {
        try {
          await ctx.telegram.sendMessage(userId, broadcastMsg, { 
            parse_mode: 'Markdown',
            disable_web_page_preview: true
          });
          successCount++;
          
          // Update status every 10 users
          if (successCount % 10 === 0) {
            await ctx.telegram.editMessageText(
              ctx.chat.id,
              statusMsg.message_id,
              null,
              `🔄 Broadcast sedang berjalan...\n✅ Terkirim: ${successCount}\n❌ Gagal: ${failCount}`
            );
          }
          
          // Add a small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          console.error(`Failed to send broadcast to ${userId}:`, error);
          failCount++;
        }
      }
    }
    
    // Send final status
    return ctx.reply(`✅ Broadcast selesai!\n\n• Total user: ${Object.keys(users).length}\n• Terkirim: ${successCount}\n• Gagal: ${failCount}`);
  }
};
