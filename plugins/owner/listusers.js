const { isOwner } = require('../../core/owner');

module.exports = {
  name: 'listusers',
  desc: 'Lihat daftar semua user (khusus owner)',
  category: 'owner',
  async run(ctx, { db }) {
    const senderId = ctx.senderId;
    
    // Check if the user is the owner
    if (!isOwner(senderId)) {
      return ctx.reply('⚠️ Maaf, fitur ini hanya untuk owner bot!');
    }
    
    // Get all users
    const data = db.list();
    const users = data.user;
    
    if (Object.keys(users).length === 0) {
      return ctx.reply('❌ Belum ada user yang terdaftar!');
    }
    
    // Format user data
    let userList = '𝐃𝐚𝐟𝐭𝐚𝐫 𝐔𝐬𝐞𝐫 𝐎𝐒𝐈𝐍𝐓𝐫𝐢𝐱\n\n';
    let index = 1;
    
    for (const [userId, user] of Object.entries(users)) {
      const status = user.register ? '✅ Terdaftar' : '❌ Belum Terdaftar';
      const isPremium = user.premium?.status ? '⭐ Premium' : '🔹 Regular';
      const isBanned = user.banned?.status ? '🚫 Banned' : '✅ Active';
      
      userList += `${index}. ${user.name}\n`;
      userList += `   ID: ${userId}\n`;
      userList += `   Status: ${status}\n`;
      userList += `   Tipe: ${isPremium}\n`;
      userList += `   Akun: ${isBanned}\n`;
      userList += `   Limit: ${user.limit}\n\n`;
      
      index++;
    }
    
    userList += `Total User: ${Object.keys(users).length}`;
    
    return ctx.reply(userList);
  }
};
